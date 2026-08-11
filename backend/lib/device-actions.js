const { runAsync, getAsync, safeJsonParse, writeAuditLog } = require("./database");
const { getNormalizedBrand } = require("./device-store");
const {
  powerOnDevice,
  sendWebosRestart,
  powerOffDevice,
  queryDevicePowerState,
  wakeDevice,
  launchWebosApp,
  setWebosMute,
  adjustWebosVolume,
  setWebosVolume,
  setSamsungMute,
  adjustSamsungVolume,
  setSamsungVolume,
} = require("../tv-adapter");

let wss = null;

const setWebSocketServer = (server) => {
  wss = server;
};

const broadcastDeviceState = async (deviceId) => {
  try {
    if (!wss) return;
    const device = await getAsync(`SELECT * FROM devices WHERE id = ?`, [deviceId]);
    if (!device) return;
    const payload = JSON.stringify({ type: 'device:update', device });
    wss.clients.forEach((client) => {
      if (client.readyState === require('ws').OPEN) {
        try { client.send(payload); } catch (e) {}
      }
    });
  } catch (e) {
    console.error('broadcastDeviceState error:', e);
  }
};

const resolveRollbackStep = (action, params = {}) => {
  switch (action) {
    case "poweron":
      return { action: "poweroff", action_params: {} };
    case "poweroff":
      return { action: "poweron", action_params: {} };
    case "restart":
      return { action: "poweroff", action_params: {} };
    case "mute":
      return { action: "unmute", action_params: {} };
    case "unmute":
      return { action: "mute", action_params: {} };
    case "volumeUp":
      return { action: "volumeDown", action_params: {} };
    case "volumeDown":
      return { action: "volumeUp", action_params: {} };
    case "setVolume":
      if (typeof params.rollbackVolume === "number") {
        return { action: "setVolume", action_params: { volume: params.rollbackVolume } };
      }
      return null;
    default:
      return null;
  }
};

const executeDeviceAction = async (device, action, params = {}) => {
  const brand = getNormalizedBrand(device);

  switch (action) {
    case "poweron": {
      const ok = await powerOnDevice(device);
      if (!ok) {
        throw new Error("Power on did not confirm");
      }
      await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
      return { success: true };
    }
    case "poweroff": {
      const result = await powerOffDevice(device);
      if (!result.success) {
        throw new Error(result.reason || "Power off failed");
      }
      await runAsync(`UPDATE devices SET power_state = 'Off' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
      return { success: true, method: result.method };
    }
    case "restart": {
      const ok = await wakeDevice(device.mac);
      if (!ok) {
        throw new Error("Restart wake signal failed");
      }
      await runAsync(`UPDATE devices SET status = 'Online', power_state = 'On' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
      return { success: true };
    }
    case "launchApp": {
      const target = params.target || params.appId || params.uri;
      if (!target) {
        throw new Error("launchApp requires target");
      }
      const ok = await launchWebosApp(device.ip, target);
      if (!ok) {
        throw new Error("launchApp failed");
      }
      return { success: true };
    }
    case "mute": {
      const ok = brand === "samsung" ? await setSamsungMute(device.ip, true) : await setWebosMute(device.ip, true);
      if (!ok) {
        throw new Error("Mute failed");
      }
      return { success: true };
    }
    case "unmute": {
      const ok = brand === "samsung" ? await setSamsungMute(device.ip, false) : await setWebosMute(device.ip, false);
      if (!ok) {
        throw new Error("Unmute failed");
      }
      return { success: true };
    }
    case "volumeUp": {
      const ok = brand === "samsung" ? await adjustSamsungVolume(device.ip, "Up") : await adjustWebosVolume(device.ip, "Up");
      if (!ok) {
        throw new Error("Volume up failed");
      }
      return { success: true };
    }
    case "volumeDown": {
      const ok = brand === "samsung" ? await adjustSamsungVolume(device.ip, "Down") : await adjustWebosVolume(device.ip, "Down");
      if (!ok) {
        throw new Error("Volume down failed");
      }
      return { success: true };
    }
    case "setVolume": {
      if (brand === "samsung") {
        throw new Error("Samsung uređaji trenutno ne podržavaju precizno setVolume.");
      }
      if (typeof params.volume !== "number") {
        throw new Error("setVolume requires numeric volume");
      }
      const ok = await setWebosVolume(device.ip, params.volume);
      if (!ok) {
        throw new Error("setVolume failed");
      }
      return { success: true };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

const executeWithRetryAndRollback = async ({
  device,
  action,
  params = {},
  retryCount = 1,
  retryDelayMs = 1000,
  rollbackOnFail = false,
  source = "api",
  scheduleId = null,
  groupId = null,
  entityType = "device",
  entityId = null,
}) => {
  const attempts = Math.max(1, Number(retryCount || 0) + 1);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await executeDeviceAction(device, action, params);
      await writeAuditLog({
        entityType,
        entityId: entityId ?? device.id,
        deviceId: device.id,
        groupId,
        scheduleId,
        action,
        status: "success",
        source,
        details: { attempt, attempts, params },
      });
      return { success: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      await writeAuditLog({
        entityType,
        entityId: entityId ?? device.id,
        deviceId: device.id,
        groupId,
        scheduleId,
        action,
        status: "failed-attempt",
        source,
        details: { attempt, attempts, error: error.message, params },
      });
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, Number(retryDelayMs) || 1000));
      }
    }
  }

  if (rollbackOnFail) {
    const rollbackStep = resolveRollbackStep(action, params);
    if (rollbackStep) {
      try {
        await executeDeviceAction(device, rollbackStep.action, rollbackStep.action_params || {});
        await writeAuditLog({
          entityType,
          entityId: entityId ?? device.id,
          deviceId: device.id,
          groupId,
          scheduleId,
          action: `${action}:rollback`,
          status: "success",
          source,
          details: { rollbackAction: rollbackStep.action },
        });
      } catch (rollbackError) {
        await writeAuditLog({
          entityType,
          entityId: entityId ?? device.id,
          deviceId: device.id,
          groupId,
          scheduleId,
          action: `${action}:rollback`,
          status: "failed",
          source,
          details: { rollbackAction: rollbackStep.action, error: rollbackError.message },
        });
      }
    }
  }

  throw lastError || new Error(`Action failed after ${attempts} attempts.`);
};

const executeScheduleAction = async (scheduleId) => {
  const schedule = await getAsync(
    `SELECT * FROM device_schedules WHERE id = ?`,
    [scheduleId]
  );

  if (!schedule || schedule.enabled !== 1) {
    return;
  }

  const device = await getAsync(`SELECT * FROM devices WHERE id = ?`, [schedule.device_id]);
  if (!device) {
    console.warn(`Schedule ${scheduleId} references missing device ${schedule.device_id}`);
    return;
  }

  const actionParams = safeJsonParse(schedule.action_params, {});
  let runRowId = null;
  try {
    const r = await runAsync(`INSERT INTO schedule_runs (schedule_id, status, details) VALUES (?, ?, ?)`, [scheduleId, 'running', null]);
    runRowId = r.lastID;
  } catch (e) {
    // ignore logging errors
  }

  const defaultRetryCount = Number(actionParams.retryCount ?? 1);
  const defaultRetryDelayMs = Number(actionParams.retryDelayMs ?? 1000);
  const defaultRollbackOnFail = Boolean(actionParams.rollbackOnFail);

  if (Array.isArray(actionParams.sequence) && actionParams.sequence.length > 0) {
    const stepResults = [];
    for (const step of actionParams.sequence) {
      const act = step.action;
      const params = step.params || {};
      try {
        const retryCount = Number(step.retryCount ?? defaultRetryCount);
        const retryDelayMs = Number(step.retryDelayMs ?? defaultRetryDelayMs);
        const rollbackOnFail = Boolean(step.rollbackOnFail ?? defaultRollbackOnFail);

        const result = await executeWithRetryAndRollback({
          device,
          action: act,
          params,
          retryCount,
          retryDelayMs,
          rollbackOnFail,
          source: "schedule",
          scheduleId,
          entityType: "schedule",
          entityId: scheduleId,
        });
        stepResults.push({ action: act, status: "success", attempts: result.attempts });

        if (step.delayMs && Number(step.delayMs) > 0) {
          await new Promise((resolve) => setTimeout(resolve, Number(step.delayMs)));
        }
      } catch (err) {
        console.error(`Error executing step ${act} for schedule ${scheduleId}:`, err);
        stepResults.push({ action: act, status: "failed", error: String(err) });
        if (!step.continueOnError) {
          try {
            if (runRowId) {
              await runAsync(
                `UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`,
                ["failed", JSON.stringify({ failedStep: act, results: stepResults }), runRowId]
              );
            }
          } catch (e) {}
          return;
        }
      }
    }

    try {
      if (runRowId) {
        await runAsync(
          `UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`,
          ["success", JSON.stringify({ sequence: actionParams.sequence, results: stepResults }), runRowId]
        );
      }
    } catch (e) {}
    return;
  }

  try {
    await executeWithRetryAndRollback({
      device,
      action: schedule.action,
      params: actionParams,
      retryCount: defaultRetryCount,
      retryDelayMs: defaultRetryDelayMs,
      rollbackOnFail: defaultRollbackOnFail,
      source: "schedule",
      scheduleId,
      entityType: "schedule",
      entityId: scheduleId,
    });
  } catch (error) {
    if (runRowId) {
      try {
        await runAsync(
          `UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`,
          ["failed", JSON.stringify({ action: schedule.action, error: error.message }), runRowId]
        );
      } catch (e) {}
    }
    throw error;
  }

  try {
    if (runRowId) await runAsync(`UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`, ['success', JSON.stringify({ action: schedule.action, params: actionParams }), runRowId]);
  } catch (e) {}
};

module.exports = {
  setWebSocketServer,
  broadcastDeviceState,
  executeDeviceAction,
  executeWithRetryAndRollback,
  executeScheduleAction,
};
