const express = require("express");
const router = express.Router();
const { allAsync } = require("../lib/database");
const { discoverLGTVs } = require("../device-discovery");
const { resolveMacFromArp } = require("../lib/device-store");

router.get("/devices/discover", async (req, res) => {
  const traceId = `disc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const startedAt = Date.now();

  try {
    console.log(
      `[Server][${traceId}] Discovery request started. ip=${req.ip || "unknown"}, ua=${req.get("user-agent") || "unknown"}, clickId=${req.query.clickId || "n/a"}, clientAttempt=${req.query.clientAttempt || "n/a"}`
    );
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Discovery-Trace-Id", traceId);

    let discoveredDevices = [];
    try {
      discoveredDevices = await discoverLGTVs(5000, { traceId: `${traceId}-run1` });
    } catch (firstDiscoveryError) {
      console.warn(
        `[Server][${traceId}] First discovery attempt failed, retrying once:`,
        firstDiscoveryError?.message || firstDiscoveryError
      );
      discoveredDevices = await discoverLGTVs(5000, { traceId: `${traceId}-run2` });
    }

    const existingIPs = new Set();
    const existingDevices = await allAsync(`SELECT ip FROM devices`);
    existingDevices.forEach((d) => {
      existingIPs.add(d.ip);
    });

    console.log(`[Server][${traceId}] Attempting to resolve MAC addresses for discovered devices...`);
    const devicesWithMac = discoveredDevices.map((device) => ({ ...device }));

    const macResolutionPromises = devicesWithMac
      .filter((d) => !d.mac)
      .map(async (device) => {
        try {
          const macPromise = resolveMacFromArp(device.ip);
          const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve(null), 1500)
          );
          const resolvedMac = await Promise.race([macPromise, timeoutPromise]);

          if (resolvedMac) {
            device.mac = resolvedMac;
            console.log(`[Server][${traceId}] Resolved MAC for ${device.ip}: ${resolvedMac}`);
          }
        } catch (e) {
          console.warn(`[Server][${traceId}] Failed to resolve MAC for ${device.ip}:`, e?.message);
        }
      });

    const macResolutionTimeout = new Promise((resolve) => setTimeout(resolve, 3000));
    await Promise.race([
      Promise.allSettled(macResolutionPromises),
      macResolutionTimeout,
    ]);

    const devicesWithStatus = devicesWithMac.map((device) => ({
      ...device,
      already_added: existingIPs.has(device.ip),
    }));

    const elapsedMs = Date.now() - startedAt;
    console.log(
      `[Server][${traceId}] Discovery complete in ${elapsedMs}ms. Found ${discoveredDevices.length} TV devices`
    );

    res.json({
      success: true,
      traceId,
      count: devicesWithStatus.length,
      devices: devicesWithStatus,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[Server][${traceId}] Discovery error after ${elapsedMs}ms:`, error);
    res.status(500).json({
      success: false,
      traceId,
      error: error.message,
      devices: [],
    });
  }
});

module.exports = router;
