const { Client } = require("node-ssdp");
const { URL } = require("url");

const detectBrand = (location = "", serverHeader = "", usn = "", deviceType = "") => {
  const haystack = `${location} ${serverHeader} ${usn} ${deviceType}`.toLowerCase();

  if (haystack.includes("samsung") || haystack.includes("tizen")) {
    return "samsung";
  }

  if (haystack.includes("lg") || haystack.includes("webos") || haystack.includes("lge")) {
    return "lg";
  }

  return "generic";
};

const isLikelyTV = (location = "", serverHeader = "", usn = "", deviceType = "") => {
  const haystack = `${location} ${serverHeader} ${usn} ${deviceType}`.toLowerCase();
  return /tv|television|smart tv|webos|tizen|roku|samsung|lge|lg/.test(haystack);
};

const getDeviceName = (brand, ip) => {
  if (brand === "samsung") {
    return `Samsung TV (${ip})`;
  }

  if (brand === "lg") {
    return `LG TV (${ip})`;
  }

  return `TV (${ip})`;
};

/**
 * Discover TVs on the network using SSDP
 * Returns array of discovered devices with IP, MAC (if available), and UPnP info
 */
const discoverLGTVs = async (timeoutMs = 5000, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const traceId = options.traceId || `disc-${Date.now()}`;
      const discovered = new Map(); // Use Map to avoid duplicates by IP
      const client = new Client();
      let resolved = false;
      const startedAt = Date.now();
      let responseCount = 0;
      let firstResponseAt = null;

      const stopAndReject = (error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          client.stop();
        } catch (e) {}
        reject(error);
      };

      // Set a timeout to stop searching and return results
      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        try {
          client.stop();
        } catch (e) {
          console.log("[Discovery] Error stopping client:", e.message);
        }
        const elapsedMs = Date.now() - startedAt;
        console.log(
          `[Discovery][${traceId}] Timeout reached after ${elapsedMs}ms. SSDP responses=${responseCount}, TVs=${discovered.size}`
        );
        resolve(Array.from(discovered.values()));
      }, timeoutMs);

      client.on("response", (headers, statusCode, rinfo) => {
        try {
          responseCount += 1;
          if (!firstResponseAt) {
            firstResponseAt = Date.now();
            console.log(
              `[Discovery][${traceId}] First SSDP response after ${firstResponseAt - startedAt}ms from ${rinfo?.address || "unknown"}`
            );
          }

          const location = headers.LOCATION;
          const serverHeader = headers.SERVER || "";
          const usn = headers.USN || "";
          const deviceType = headers["DEVICE-TYPE"] || headers.ST || "Unknown TV";

          if (!location || !isLikelyTV(location, serverHeader, usn, deviceType)) {
            return;
          }

          // Extract IP from LOCATION URL (e.g., http://192.168.1.100:1234/...)
          let ip = null;
          try {
            const url = new URL(location);
            ip = url.hostname;
          } catch {
            return;
          }

          // Avoid duplicates
          if (discovered.has(ip)) {
            return;
          }

          const st = headers.ST || "";
          const brand = detectBrand(location, serverHeader, usn, deviceType);

          console.log(`[Discovery][${traceId}] Found ${brand} device at ${ip}: ${st}`);

          discovered.set(ip, {
            ip,
            name: getDeviceName(brand, ip),
            brand,
            location,
            serverHeader,
            usn,
            deviceType,
            discovered_at: new Date().toISOString(),
            mac: null, // MAC can be attempted to be retrieved via ARP, but often not available in SSDP
          });
        } catch (error) {
          console.error("[Discovery] Error processing response:", error.message);
        }
      });

      client.on("error", (error) => {
        const elapsedMs = Date.now() - startedAt;
        console.error(
          `[Discovery][${traceId}] SSDP Client error after ${elapsedMs}ms:`,
          error.message
        );
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          client.stop();
        } catch (e) {}
        console.warn(
          `[Discovery][${traceId}] Resolving with partial results after SSDP error. responses=${responseCount}, TVs=${discovered.size}`
        );
        resolve(Array.from(discovered.values()));
      });

      const searchTargets = [
        "ssdp:all",
        "urn:schemas-upnp-org:device:MediaRenderer:1",
      ];

      const startSearch = (attempt = 1) => {
        try {
          console.log(`[Discovery][${traceId}] Starting SSDP search (attempt ${attempt})...`);
          for (const target of searchTargets) {
            console.log(`[Discovery][${traceId}] -> search target: ${target}`);
            client.search(target);
          }
        } catch (error) {
          console.error(`[Discovery][${traceId}] Error starting SSDP search (attempt ${attempt}):`, error.message);
          if (attempt < 3) {
            const retryDelay = 350 * attempt;
            setTimeout(() => startSearch(attempt + 1), retryDelay);
            return;
          }
          stopAndReject(error);
        }
      };

      // Let sockets initialize before first search; this avoids first-click failures on some systems.
      setTimeout(() => startSearch(1), 150);
    } catch (error) {
      console.error("[Discovery] Unexpected error:", error.message);
      reject(error);
    }
  });
};

module.exports = {
  discoverLGTVs,
};
