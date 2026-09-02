const os = require("os");
const WebSocket = require("ws");
const ping = require("ping");
const { runAsync, allAsync, getAsync, execAsync } = require("./database");
const { queryDevicePowerState } = require("../tv-adapter");

const getNormalizedBrand = (device) => (device?.brand || "").trim().toLowerCase();

const normalizeMacToColon = (mac) => {
  if (!mac || typeof mac !== "string") {
    return null;
  }

  const compact = mac.trim().replace(/-/g, ":").toUpperCase();
  return compact;
};

const findMacInTextForIp = (text, ip) => {
  if (!text || !ip) {
    return null;
  }

  const escapedIp = ip.replace(/\./g, "\\.");
  const lineRegex = new RegExp(`${escapedIp}\\s+([0-9a-fA-F:-]{17})`, "i");
  const lineMatch = text.match(lineRegex);
  if (lineMatch && lineMatch[1]) {
    return normalizeMacToColon(lineMatch[1]);
  }

  const genericMatch = text.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
  return genericMatch ? normalizeMacToColon(genericMatch[0]) : null;
};

const resolveMacFromArp = async (ip) => {
  if (!ip) {
    return null;
  }

  const platform = os.platform();
  const commands = platform === "win32"
    ? [`arp -a ${ip}`, "arp -a"]
    : [`arp -an ${ip}`, "arp -an"];

  for (const command of commands) {
    try {
      const { stdout } = await execAsync(command);
      const found = findMacInTextForIp(stdout || "", ip);
      if (found) {
        return found;
      }
    } catch {
      // try next command
    }
  }

  return null;
};

const isLikelyValidMac = (mac) => {
  if (!mac || typeof mac !== "string") {
    return false;
  }

  const normalized = mac.trim().toLowerCase();
  const macPattern = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/;
  if (!macPattern.test(normalized)) {
    return false;
  }

  const onlyHex = normalized.replace(/[:-]/g, "");
  if (onlyHex === "000000000000" || onlyHex === "ffffffffffff") {
    return false;
  }

  return true;
};

const ensureValidDeviceMac = async (ip, mac) => {
  const normalizedInputMac = normalizeMacToColon(mac);
  if (isLikelyValidMac(normalizedInputMac)) {
    return { ok: true, mac: normalizedInputMac, source: "input" };
  }

  const discoveredMac = await resolveMacFromArp(ip);
  if (isLikelyValidMac(discoveredMac)) {
    return { ok: true, mac: normalizeMacToColon(discoveredMac), source: "arp" };
  }

  const ipParts = ip.split(".").map((p) => parseInt(p).toString(16).padStart(2, "0"));
  const fallbackMac = `02:${ipParts.join(":")}`;

  return {
    ok: true,
    mac: fallbackMac,
    source: "fallback",
    reason: "MAC nije pronađen, koristi se privremena vrijednost. Ažuriraj MAC kada je TV dostupan.",
  };
};

const selfHealDeviceMac = async (device, contextLabel = "device-action") => {
  if (!device) {
    return null;
  }

  const normalizedCurrent = normalizeMacToColon(device.mac);
  if (isLikelyValidMac(normalizedCurrent)) {
    device.mac = normalizedCurrent;
    return normalizedCurrent;
  }

  const discoveredMac = await resolveMacFromArp(device.ip);
  if (isLikelyValidMac(discoveredMac)) {
    const normalizedDiscovered = normalizeMacToColon(discoveredMac);
    await runAsync(`UPDATE devices SET mac = ? WHERE id = ?`, [normalizedDiscovered, device.id]);
    device.mac = normalizedDiscovered;
    console.log(`${contextLabel}: updated MAC for ${device.name} to ${normalizedDiscovered}`);
    return normalizedDiscovered;
  }

  console.warn(`${contextLabel}: invalid MAC (${device.mac}) and ARP recovery failed for ${device.name}`);
  return null;
};

const repairInvalidDeviceMacs = async (contextLabel = "mac-watchdog") => {
  const devices = await allAsync(`SELECT id, name, ip, mac FROM devices`);
  let repaired = 0;
  let unresolved = 0;

  for (const device of devices) {
    const normalized = normalizeMacToColon(device.mac);
    if (isLikelyValidMac(normalized)) {
      continue;
    }

    const discoveredMac = await resolveMacFromArp(device.ip);
    if (isLikelyValidMac(discoveredMac)) {
      const finalMac = normalizeMacToColon(discoveredMac);
      await runAsync(`UPDATE devices SET mac = ? WHERE id = ?`, [finalMac, device.id]);
      repaired += 1;
      console.log(`${contextLabel}: repaired MAC for ${device.name} (${device.ip}) => ${finalMac}`);
    } else {
      unresolved += 1;
      console.warn(`${contextLabel}: unresolved invalid MAC for ${device.name} (${device.ip}) current=${device.mac}`);
    }
  }

  if (repaired > 0 || unresolved > 0) {
    console.log(`${contextLabel}: summary repaired=${repaired} unresolved=${unresolved}`);
  }

  return { repaired, unresolved };
};

const pingDevice = async (ip) => {
  try {
    const result = await ping.promise.probe(ip, {
      timeout: 2,
    });
    return result.alive;
  } catch {
    return false;
  }
};

const resolveDeviceStatus = ({ alive, powerState, currentStatus }) => {
  const powerValue = String(powerState || "").trim().toLowerCase();
  const isExplicitlyOff = ["off", "offline", "inactive"].includes(powerValue);
  const isExplicitlyOn = ["on", "online", "active"].includes(powerValue);

  if (isExplicitlyOff) {
    return "Offline";
  }

  if (alive === false) {
    return "Offline";
  }

  if (isExplicitlyOn) {
    return "Online";
  }

  if (currentStatus === "Offline") {
    return "Offline";
  }

  return alive ? "Online" : "Offline";
};

const queryWebosPowerState = async (ip) => {
  if (!ip) {
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const ws = new WebSocket(`ws://${ip}:3000`, {
      handshakeTimeout: 3000,
    });

    const finish = (value) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeout);
      try {
        ws.terminate();
      } catch {
        // ignore
      }
      resolve(value);
    };

    const timeout = setTimeout(() => finish(null), 4000);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "request",
          uri: "ssap://com.webos.service.power/getPowerState",
          id: "powerState",
        })
      );
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.id === "powerState") {
          const mapped = data.payload ? data.payload.state : data.state;
          if (typeof mapped === "string") {
            const value = mapped.toLowerCase();
            if (value.includes("active") || value.includes("on")) {
              finish("On");
              return;
            }
            if (value.includes("inactive") || value.includes("off")) {
              finish("Off");
              return;
            }
          }
        }
      } catch {
        // ignore invalid websocket messages
      }
    });

    ws.on("error", () => finish(null));
    ws.on("close", () => finish(null));
  });
};

const refreshStatus = async (device) => {
  const alive = await pingDevice(device.ip);
  let powerState = device.power_state || device.powerState || "Off";

  if (alive) {
    const queriedState = await queryDevicePowerState(device);
    if (queriedState) {
      powerState = queriedState;
    }
  } else {
    powerState = "Off";
  }

  const status = resolveDeviceStatus({ alive, powerState, currentStatus: device.status });

  if (status !== device.status || powerState !== device.power_state) {
    await runAsync(
      "UPDATE devices SET status = ?, power_state = ?, last_active_at = ? WHERE id = ?",
      [
        status,
        powerState,
        alive ? new Date().toISOString() : device.last_active_at || new Date().toISOString(),
        device.id,
      ]
    );
  } else if (alive && !device.last_active_at) {
    await runAsync(
      "UPDATE devices SET last_active_at = ? WHERE id = ?",
      [new Date().toISOString(), device.id]
    );
  }

  return { ...device, status, power_state: powerState, powerState };
};

module.exports = {
  getNormalizedBrand,
  normalizeMacToColon,
  findMacInTextForIp,
  resolveMacFromArp,
  isLikelyValidMac,
  ensureValidDeviceMac,
  selfHealDeviceMac,
  repairInvalidDeviceMacs,
  resolveDeviceStatus,
  refreshStatus,
};
