const net = require("net");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const wol = require("wake_on_lan");
const ping = require("ping");
const SamsungRemote = require("samsung-remote");
const { sendWebosPowerOff } = require("./power-off-tv");

const CLIENT_KEY_FILE = path.join(__dirname, "webos-client-key.txt");
const POWER_QUERY_TIMEOUT_MS = 4000;

const normalizeBrand = (brand) => {
  if (!brand || typeof brand !== "string") {
    return "generic";
  }
  return brand.trim().toLowerCase();
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

const readWebosClientKey = () => {
  if (process.env.WEBOS_CLIENT_KEY) {
    return process.env.WEBOS_CLIENT_KEY.trim();
  }

  try {
    if (fs.existsSync(CLIENT_KEY_FILE)) {
      return fs.readFileSync(CLIENT_KEY_FILE, "utf8").trim();
    }
  } catch {
    return null;
  }

  return null;
};

const sendWebosRequest = async (ip, payload, permissions = []) =>
  new Promise((resolve) => {
    if (!ip) {
      return resolve(false);
    }

    const clientKey = readWebosClientKey();
    const ws = new WebSocket(`wss://${ip}:3001`, {
      rejectUnauthorized: false,
      handshakeTimeout: 5000,
    });

    const manifest = {
      manifestVersion: 1,
      appVersion: "1.0",
      signed: {
        appId: "com.node.tv-scheduler",
        vendorId: "nodejs",
        timestamp: new Date().toISOString(),
      },
      permissions: permissions.length ? permissions : ["CONTROL_POWER", "CONTROL_AUDIO", "LAUNCH", "LAUNCH_WEBAPP"],
    };

    const handleClose = () => resolve(false);
    const timeout = setTimeout(handleClose, 10000);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "register",
          id: "register_0",
          payload: {
            pairingType: "PROMPT",
            manifest,
            ...(clientKey ? { "client-key": clientKey } : {}),
          },
        })
      );
    });

    ws.on("message", (message) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === "registered") {
          ws.send(JSON.stringify(payload));
          return;
        }

        if (msg.type === "response" || msg.type === "error") {
          clearTimeout(timeout);
          ws.close();
          resolve(msg.type !== "error");
        }
      } catch {
        // ignore invalid JSON
      }
    });

    ws.on("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });

const launchWebosApp = async (ip, target) => {
  if (!target) {
    return false;
  }

  return sendWebosRequest(
    ip,
    {
      type: "request",
      id: "launch_app",
      uri: "ssap://system.launcher/open",
      payload: { target },
    },
    ["CONTROL_POWER", "LAUNCH", "LAUNCH_WEBAPP"]
  );
};

const setWebosMute = async (ip, muted) => {
  return sendWebosRequest(
    ip,
    {
      type: "request",
      id: "set_mute",
      uri: "ssap://audio/setMute",
      payload: { mute: muted },
    },
    ["CONTROL_AUDIO"]
  );
};

const adjustWebosVolume = async (ip, direction) => {
  if (!ip) {
    return false;
  }

  const uri = direction === "Up" ? "ssap://audio/volumeUp" : "ssap://audio/volumeDown";
  return sendWebosRequest(
    ip,
    {
      type: "request",
      id: `volume_${direction.toLowerCase()}`,
      uri,
      payload: {},
    },
    ["CONTROL_AUDIO"]
  );
};

const setWebosVolume = async (ip, volume) => {
  if (!ip || typeof volume !== "number") {
    return false;
  }

  return sendWebosRequest(
    ip,
    {
      type: "request",
      id: "set_volume",
      uri: "ssap://audio/setVolume",
      payload: { volume },
    },
    ["CONTROL_AUDIO"]
  );
};

const wakeDevice = async (mac, options = {}) =>
  new Promise((resolve) => {
    if (!isLikelyValidMac(mac)) {
      return resolve(false);
    }

    try {
      const wakeOptions = {
        port: 9,
        ...(options.address ? { address: options.address } : {}),
      };
      wol.wake(mac, wakeOptions, (err) => {
        resolve(!err);
      });
    } catch {
      resolve(false);
    }
  });

const pingDevice = async (ip) => {
  if (!ip) {
    return false;
  }

  try {
    const result = await ping.promise.probe(ip, {
      timeout: 2,
    });
    return result.alive;
  } catch {
    return false;
  }
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

      }
      resolve(value);
    };

    const timeout = setTimeout(() => finish(null), POWER_QUERY_TIMEOUT_MS);

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
          const payload = data.payload || data;
          const state = payload.state || payload.powerState || "";
          if (typeof state === "string") {
            const normalized = state.toLowerCase();
            if (normalized.includes("active") || normalized.includes("on")) {
              finish("On");
              return;
            }
            if (normalized.includes("inactive") || normalized.includes("off")) {
              finish("Off");
              return;
            }
          }
        }
      } catch {

      }
    });

    ws.on("error", () => finish(null));
    ws.on("close", () => finish(null));
  });
};

const checkTcpPort = async (ip, port, timeoutMs = 2000) =>
  new Promise((resolve) => {
    if (!ip) {
      return resolve(false);
    }

    const socket = net.createConnection({ host: ip, port, timeout: timeoutMs });
    let resolved = false;

    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(value);
    };

    socket.on("connect", () => finish(true));
    socket.on("error", () => finish(false));
    socket.on("timeout", () => finish(false));
  });

const sendSamsungPowerOff = async (ip) =>
  new Promise((resolve) => {
    if (!ip) {
      return resolve(false);
    }

    try {
      const remote = new SamsungRemote({
        ip,
        host: { ip: "127.0.0.1", mac: "00:00:00:00", name: "NodeJS Samsung Remote" },
      });

      remote.send("KEY_POWEROFF", (error) => {
        if (!error) {
          return resolve(true);
        }

        remote.send("KEY_POWER", (fallbackError) => {
          resolve(!fallbackError);
        });
      });
    } catch {
      resolve(false);
    }
  });

const sendSamsungKey = async (ip, key) =>
  new Promise((resolve) => {
    if (!ip || !key) {
      return resolve(false);
    }

    try {
      const remote = new SamsungRemote({
        ip,
        host: { ip: "127.0.0.1", mac: "00:00:00:00", name: "NodeJS Samsung Remote" },
      });

      remote.send(key, (error) => {
        resolve(!error);
      });
    } catch {
      resolve(false);
    }
  });

const setSamsungMute = async (ip, muted) => {
  if (!ip) {
    return false;
  }

  // Samsung remotes typically toggle mute with KEY_MUTE.
  return muted ? sendSamsungKey(ip, "KEY_MUTE") : sendSamsungKey(ip, "KEY_MUTE");
};

const adjustSamsungVolume = async (ip, direction) => {
  if (!ip) {
    return false;
  }

  const key = direction === "Up" ? "KEY_VOLUP" : "KEY_VOLDOWN";
  return sendSamsungKey(ip, key);
};

const setSamsungVolume = async (ip, volume) => {
  if (!ip || typeof volume !== "number") {
    return false;
  }

  return false;
};

const querySamsungPowerState = async (ip) => {
  const portOpen = await checkTcpPort(ip, 55000, 2000);
  if (portOpen) {
    return "On";
  }

  const alive = await ping.promise.probe(ip, { timeout: 2 });
  return alive ? "On" : "Off";
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getWakeTargets = (ip) => {
  const targets = new Set(["255.255.255.255"]);
  if (typeof ip === "string") {
    const parts = ip.trim().split(".");
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
      targets.add(`${parts[0]}.${parts[1]}.${parts[2]}.255`);
    }
  }
  return Array.from(targets);
};

const wakeDeviceAcrossTargets = async (mac, ip, logPrefix = "") => {
  const targets = getWakeTargets(ip);
  let anySent = false;

  for (const target of targets) {
    const sent = await wakeDevice(mac, { address: target });
    anySent = anySent || sent;
    if (logPrefix) {
      console.log(`${logPrefix} WoL target=${target} sent=${sent}`);
    }
    await delay(250);
  }

  return anySent;
};

const sendWebosRestart = async (ip, mac, profile = {}) => {
  const restartProfile = {
    initialDelayMs: Number(profile.initialDelayMs ?? 20000),
    maxAttempts: Number(profile.maxAttempts ?? 8),
    burstCount: Number(profile.burstCount ?? 3),
    burstPauseMs: Number(profile.burstPauseMs ?? 400),
    postWakePingDelayMs: Number(profile.postWakePingDelayMs ?? 6000),
    betweenAttemptsDelayMs: Number(profile.betweenAttemptsDelayMs ?? 7000),
    failedWakeBackoffMs: Number(profile.failedWakeBackoffMs ?? 5000),
  };

  const logPrefix = `[RestartFlow ip=${ip || "n/a"} mac=${mac || "n/a"}]`;
  console.log(`${logPrefix} start profile=${JSON.stringify(restartProfile)}`);

  // First try native reboot. If supported by TV firmware, this avoids WoL entirely.
  const rebooted = await sendWebosRequest(
    ip,
    {
      type: "request",
      id: "restart_reboot",
      uri: "ssap://system/reboot",
      payload: {},
    },
    ["CONTROL_POWER"]
  );
  console.log(`${logPrefix} directRebootAck=${rebooted}`);
  if (rebooted) {
    return true;
  }

  if (!isLikelyValidMac(mac)) {
    console.log(`${logPrefix} abort: invalid MAC for WoL fallback`);
    return false;
  }

  // Step 1: Turn off via webOS.
  const turnedOff = await sendWebosRequest(
    ip,
    {
      type: "request",
      id: "restart_turnoff",
      uri: "ssap://system/turnOff",
      payload: {},
    },
    ["CONTROL_POWER"]
  );
  console.log(`${logPrefix} turnOffAck=${turnedOff}`);

  if (!turnedOff) {
    // Some TVs execute turnOff but fail to send a clean response/ack.
    // Continue with wake sequence anyway instead of aborting restart.
    console.log(`${logPrefix} warning: no turnOff ack, continuing with fallback wake sequence`);
  }

  // Step 2: Give TV time to fully power down before sending WoL.
  // Some LG/webOS models keep NIC in transition longer than expected.
  await delay(restartProfile.initialDelayMs);
  console.log(`${logPrefix} shutdown wait complete`);

  // Step 3: WoL can be missed while NIC is transitioning during shutdown,
  // so retry over a longer window before declaring restart failed.
  const maxAttempts = restartProfile.maxAttempts;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`${logPrefix} attempt=${attempt}/${maxAttempts} begin`);

    // Send a small burst each attempt to improve delivery reliability.
    let wakeSent = false;
    for (let burst = 0; burst < restartProfile.burstCount; burst += 1) {
      const sent = await wakeDeviceAcrossTargets(mac, ip, `${logPrefix} attempt=${attempt} burst=${burst + 1}`);
      wakeSent = wakeSent || sent;
      console.log(`${logPrefix} attempt=${attempt} burst=${burst + 1} sentAny=${sent}`);
      await delay(restartProfile.burstPauseMs);
    }

    if (!wakeSent) {
      console.log(`${logPrefix} attempt=${attempt} no WoL send confirmed`);
      await delay(restartProfile.failedWakeBackoffMs);
      continue;
    }

    if (!ip) {
      console.log(`${logPrefix} attempt=${attempt} success (no IP to verify)`);
      return true;
    }

    await delay(restartProfile.postWakePingDelayMs);
    const alive = await pingDevice(ip);
    console.log(`${logPrefix} attempt=${attempt} pingAlive=${alive}`);
    if (alive) {
      console.log(`${logPrefix} success`);
      return true;
    }

    if (attempt < maxAttempts) {
      await delay(restartProfile.betweenAttemptsDelayMs);
    }
  }

  console.log(`${logPrefix} failed after ${maxAttempts} attempts`);
  return false;
};

const powerOnDevice = async (device) => {
  const brand = normalizeBrand(device.brand);
  const ip = device.ip;
  const mac = device.mac;

  if (brand === "lg" || brand === "webos") {
    return wakeDevice(mac);
  }

  if (brand === "samsung") {
    const alive = await pingDevice(ip);
    if (alive) {
      return true;
    }
    return wakeDevice(mac);
  }

  return wakeDevice(mac);
};

const powerOffDevice = async (device) => {
  const brand = normalizeBrand(device.brand);
  const ip = device.ip;

  if (brand === "lg" || brand === "webos") {
    const result = await sendWebosPowerOff(ip);
    return result ? { success: true, method: "webos" } : { success: false, reason: "WebOS connection failed" };
  }

  if (brand === "samsung") {
    const alive = await pingDevice(ip);
    if (!alive) {
      return { success: false, reason: "Samsung TV nije dostižan (ping failed)" };
    }
    const result = await sendSamsungPowerOff(ip);
    return result ? { success: true, method: "samsung" } : { success: false, reason: "Samsung power command failed" };
  }

  if (brand === "generic") {
    // Try webOS first, then fallback to WoL poweroff attempt
    const webosResult = await sendWebosPowerOff(ip);
    if (webosResult) {
      return { success: true, method: "webos" };
    }
    
    // Fallback: check if device is reachable via ping, then try WoL-based poweroff
    const alive = await pingDevice(ip);
    if (!alive) {
      return { success: false, reason: "Uređaj nije dostižan (ping failed)" };
    }
    
    return { success: false, reason: "WebOS nije dostupan, ali TV je dostižan. Probaj WoL ili ručno gašenje." };
  }

  return { success: false, reason: "Unknown device brand" };
};

const queryDevicePowerState = async (device) => {
  const brand = normalizeBrand(device.brand);
  const ip = device.ip;

  if (brand === "lg" || brand === "webos") {
    const state = await queryWebosPowerState(ip);
    if (state) {
      return state;
    }
  }

  if (brand === "samsung") {
    return querySamsungPowerState(ip);
  }

  const alive = await pingDevice(ip);
  return alive ? "On" : "Off";
};

module.exports = {
  normalizeBrand,
  isLikelyValidMac,
  wakeDevice,
  pingDevice,
  powerOnDevice,
  powerOffDevice,
  queryDevicePowerState,
  sendWebosPowerOff,
  sendWebosRestart,
  launchWebosApp,
  setWebosMute,
  adjustWebosVolume,
  setWebosVolume,
  setSamsungMute,
  adjustSamsungVolume,
  setSamsungVolume,
};