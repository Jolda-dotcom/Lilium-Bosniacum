const express = require("express");
const router = express.Router();
const ping = require("ping");
const { runAsync, allAsync, getAsync, writeAuditLog } = require("../lib/database");
const { refreshStatus, ensureValidDeviceMac, selfHealDeviceMac } = require("../lib/device-store");
const { executeWithRetryAndRollback, broadcastDeviceState, executeScheduleAction } = require("../lib/device-actions");
const { registerScheduleTask, removeScheduleTask } = require("../lib/schedule-service");
const { buildRestartProfile } = require("../restart-profile");
const { powerOnAll } = require("../power-on-all");
const { powerOffDevice, powerOnDevice, wakeDevice, queryDevicePowerState, sendWebosRestart } = require("../tv-adapter");

router.get("/devices", async (req, res) => {
  try {
    const devices = await allAsync(
      `SELECT d.*, d.brand, d.power_state AS powerState, g.name AS groupName FROM devices d
       LEFT JOIN groups g ON d.group_id = g.id
       ORDER BY d.name COLLATE NOCASE`
    );

    const refreshed = await Promise.all(devices.map((device) => refreshStatus(device)));
    res.json(refreshed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices", async (req, res) => {
  try {
    const { name, ip, mac, brand, groupId } = req.body;

    if (!name || !ip || !mac) {
      return res.status(400).json({ error: "Missing device fields." });
    }

    const macCheck = await ensureValidDeviceMac(ip, mac);
    if (!macCheck.ok) {
      return res.status(400).json({ error: macCheck.reason });
    }

    const result = await runAsync(
      `INSERT INTO devices (name, ip, mac, brand, status, power_state, group_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, ip, macCheck.mac, brand || "generic", "Offline", "Off", groupId || null]
    );

    const device = await getAsync(
      `SELECT d.*, d.power_state AS powerState, g.name AS groupName FROM devices d
       LEFT JOIN groups g ON d.group_id = g.id WHERE d.id = ?`,
      [result.lastID]
    );

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/devices/:id", async (req, res) => {
  try {
    const { name, ip, mac, brand, groupId } = req.body;

    if (!name || !ip || !mac) {
      return res.status(400).json({ error: "Missing device fields." });
    }

    const macCheck = await ensureValidDeviceMac(ip, mac);
    if (!macCheck.ok) {
      return res.status(400).json({ error: macCheck.reason });
    }

    await runAsync(
      `UPDATE devices SET name = ?, ip = ?, mac = ?, brand = ?, group_id = ? WHERE id = ?`,
      [name, ip, macCheck.mac, brand || "generic", groupId || null, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/devices/:id", async (req, res) => {
  try {
    await runAsync(`DELETE FROM devices WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/:id/ping", async (req, res) => {
  try {
    const device = await getAsync(`SELECT * FROM devices WHERE id = ?`, [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: "Device not found." });
    }

    const alive = await ping.promise.probe(device.ip, { timeout: 2 }).then((result) => result.alive).catch(() => false);
    let powerState = device.power_state || device.powerState || "Off";

    if (alive) {
      const queriedState = await queryDevicePowerState(device);
      if (queriedState) {
        powerState = queriedState;
      }
    } else {
      powerState = "Off";
    }

    const status = require("../lib/device-store").resolveDeviceStatus({
      alive,
      powerState,
      currentStatus: device.status,
    });

    await runAsync(`UPDATE devices SET status = ?, power_state = ? WHERE id = ?`, [
      status,
      powerState,
      device.id,
    ]);

    res.json({ id: device.id, status, powerState });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/:id/poweroff", async (req, res) => {
  try {
    const device = await getAsync("SELECT * FROM devices WHERE id = ?", [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const result = await powerOffDevice(device);
    const newState = "Off";

    await runAsync(`UPDATE devices SET status = 'Offline', power_state = ? WHERE id = ?`, [newState, device.id]);
    try { await broadcastDeviceState(device.id); } catch (e) {}

    console.log(`Power off requested for ${device.name} (${device.ip}) brand=${device.brand} result=${JSON.stringify(result)}`);

    await writeAuditLog({
      entityType: "device",
      entityId: device.id,
      deviceId: device.id,
      action: "poweroff",
      status: result.success ? "success" : "failed",
      source: "manual-poweroff",
      details: { reason: result.reason, method: result.method },
    });

    res.json({
      success: result.success,
      message: result.success ? "Power off completed" : `Power off failed: ${result.reason}`,
      reason: result.reason,
      method: result.method,
      device: device.name,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      reason: "Server error during power off",
    });
  }
});

router.get("/devices/:id/schedules", async (req, res) => {
  console.log(`[SCHEDULE GET] Device ID: ${req.params.id}`);
  try {
    const schedules = await allAsync(
      `SELECT * FROM device_schedules WHERE device_id = ? ORDER BY enabled DESC, id DESC`,
      [req.params.id]
    );

    res.json(
      schedules.map((schedule) => ({
        ...schedule,
        enabled: schedule.enabled === 1,
        action_params: schedule.action_params ? JSON.parse(schedule.action_params) : {},
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/:id/schedules", async (req, res) => {
  console.log(`[SCHEDULE POST] Device ID: ${req.params.id}, Body:`, req.body);
  try {
    const { cron: cronExpression, action, action_params, actions, description, enabled } = req.body;

    const cron = require("node-cron");
    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: "Invalid cron expression." });
    }

    let dbAction = action || null;
    let dbActionParams = action_params || null;

    if (Array.isArray(actions) && actions.length > 0) {
      dbAction = "sequence";
      dbActionParams = { sequence: actions };
    }

    if (!dbAction) {
      return res.status(400).json({ error: "Action or actions sequence is required." });
    }

    const result = await runAsync(
      `INSERT INTO device_schedules (device_id, cron, action, action_params, description, enabled) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        cronExpression,
        dbAction,
        dbActionParams ? JSON.stringify(dbActionParams) : null,
        description || null,
        enabled ? 1 : 0,
      ]
    );

    const schedule = await getAsync(`SELECT * FROM device_schedules WHERE id = ?`, [result.lastID]);
    if (schedule && schedule.enabled === 1) {
      registerScheduleTask(schedule);
    }

    res.json({
      ...schedule,
      enabled: schedule.enabled === 1,
      action_params: schedule.action_params ? JSON.parse(schedule.action_params) : {},
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/devices/:id/schedules/:scheduleId", async (req, res) => {
  try {
    const { cron: cronExpression, action, action_params, actions, description, enabled } = req.body;

    const cron = require("node-cron");
    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: "Invalid cron expression." });
    }

    let dbAction = action || null;
    let dbActionParams = action_params || null;
    if (Array.isArray(actions) && actions.length > 0) {
      dbAction = "sequence";
      dbActionParams = { sequence: actions };
    }

    if (!dbAction) {
      return res.status(400).json({ error: "Action or actions sequence is required." });
    }

    await runAsync(
      `UPDATE device_schedules SET cron = ?, action = ?, action_params = ?, description = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND device_id = ?`,
      [
        cronExpression,
        dbAction,
        dbActionParams ? JSON.stringify(dbActionParams) : null,
        description || null,
        enabled ? 1 : 0,
        req.params.scheduleId,
        req.params.id,
      ]
    );

    const schedule = await getAsync(
      `SELECT * FROM device_schedules WHERE id = ?`,
      [req.params.scheduleId]
    );

    if (schedule) {
      removeScheduleTask(schedule.id);
      if (schedule.enabled === 1) {
        registerScheduleTask(schedule);
      }
    }

    res.json({
      ...schedule,
      enabled: schedule.enabled === 1,
      action_params: schedule.action_params ? JSON.parse(schedule.action_params) : {},
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/devices/:id/schedules/:scheduleId", async (req, res) => {
  try {
    await runAsync(`DELETE FROM device_schedules WHERE id = ? AND device_id = ?`, [
      req.params.scheduleId,
      req.params.id,
    ]);

    removeScheduleTask(Number(req.params.scheduleId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/devices/:id/schedules/:scheduleId/trigger', async (req, res) => {
  try {
    const schedule = await getAsync(`SELECT * FROM device_schedules WHERE id = ? AND device_id = ?`, [req.params.scheduleId, req.params.id]);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found for device' });

    console.log(`Manual trigger requested for schedule ${req.params.scheduleId} on device ${req.params.id}`);
    executeScheduleAction(Number(req.params.scheduleId)).catch((e) => console.error('Error executing manual trigger:', e));

    res.json({ triggered: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/devices/:id/schedules/:scheduleId/logs', async (req, res) => {
  try {
    const rows = await allAsync(`SELECT * FROM schedule_runs WHERE schedule_id = ? ORDER BY id DESC LIMIT 50`, [req.params.scheduleId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/:id/poweron", async (req, res) => {
  try {
    const device = await getAsync("SELECT * FROM devices WHERE id = ?", [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const brand = (device.brand || "").trim().toLowerCase();
    if (brand === "webos" || brand === "lg" || brand === "generic") {
      await selfHealDeviceMac(device, "PowerOn auto-fix");
    }

    const success = await powerOnDevice(device);
    const newState = success ? "On" : device.power_state || device.powerState || "Off";

    if (success) {
      await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
    }

    console.log(`Power on requested for ${device.name} (${device.ip}) brand=${device.brand}`);

    await writeAuditLog({
      entityType: "device",
      entityId: device.id,
      deviceId: device.id,
      action: "poweron",
      status: success ? "success" : "failed",
      source: "manual-poweron",
      details: { confirmed: success },
    });

    res.json({
      success,
      message: success ? "Power on completed" : "Power on request sent but did not confirm.",
      device: device.name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/:id/action", async (req, res) => {
  try {
    const { action, action_params, retryCount, retryDelayMs, rollbackOnFail } = req.body;
    const device = await getAsync("SELECT * FROM devices WHERE id = ?", [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    if (!action || typeof action !== "string") {
      return res.status(400).json({ error: "Action is required." });
    }

    const params = action_params || {};
    const result = await executeWithRetryAndRollback({
      device,
      action,
      params,
      retryCount: Number(retryCount ?? 1),
      retryDelayMs: Number(retryDelayMs ?? 1000),
      rollbackOnFail: Boolean(rollbackOnFail),
      source: "manual-action",
      entityType: "device",
      entityId: device.id,
    });

    res.json({ success: true, action, device: device.name, attempts: result.attempts });
  } catch (error) {
    console.error("Device action failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/:id/restart", async (req, res) => {
  try {
    const device = await getAsync("SELECT * FROM devices WHERE id = ?", [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const brand = (device.brand || "").trim().toLowerCase();
    console.log(`Restart requested for ${device.name} (${device.ip}) brand=${brand}`);

    await writeAuditLog({
      entityType: "device",
      entityId: device.id,
      deviceId: device.id,
      action: "restart",
      status: "running",
      source: "manual-restart",
      details: { brand },
    });

    if (brand === "webos" || brand === "lg") {
      const macCheck = await ensureValidDeviceMac(device.ip, device.mac);
      if (macCheck.ok) {
        device.mac = macCheck.mac;
        if (macCheck.source === "arp") {
          await runAsync(`UPDATE devices SET mac = ? WHERE id = ?`, [macCheck.mac, device.id]);
        }
      }

      const restartProfile = buildRestartProfile(device);

      res.json({ id: device.id, name: device.name, restarted: true, method: "webos" });
      sendWebosRestart(device.ip, device.mac, restartProfile).then(async (restarted) => {
        if (restarted) {
          await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
          try { await broadcastDeviceState(device.id); } catch (e) {}
          await writeAuditLog({
            entityType: "device",
            entityId: device.id,
            deviceId: device.id,
            action: "restart",
            status: "success",
            source: "manual-restart",
            details: { method: "webos" },
          });
          console.log(`Restart flow success for ${device.name}`);
        } else {
          await writeAuditLog({
            entityType: "device",
            entityId: device.id,
            deviceId: device.id,
            action: "restart",
            status: "failed",
            source: "manual-restart",
            details: { method: "webos", reason: "restart flow returned false (check MAC or firmware reboot support)" },
          });
          console.warn(`Restart flow failed for ${device.name}: returned false`);
        }
      }).catch(async (e) => {
        await writeAuditLog({
          entityType: "device",
          entityId: device.id,
          deviceId: device.id,
          action: "restart",
          status: "failed",
          source: "manual-restart",
          details: { method: "webos", error: String(e) },
        });
        console.error("Restart error:", e);
      });
    } else {
      const restarted = await wakeDevice(device.mac);
      if (restarted) {
        await runAsync(`UPDATE devices SET status = 'Online', power_state = 'On' WHERE id = ?`, [device.id]);
        try { await broadcastDeviceState(device.id); } catch (e) {}
      }
      await writeAuditLog({
        entityType: "device",
        entityId: device.id,
        deviceId: device.id,
        action: "restart",
        status: restarted ? "success" : "failed",
        source: "manual-restart",
        details: { method: "wol" },
      });
      res.json({ id: device.id, name: device.name, restarted });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/restart", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No device IDs provided." });
    }

    const placeholders = ids.map(() => "?").join(",");
    const devices = await allAsync(
      `SELECT * FROM devices WHERE id IN (${placeholders})`,
      ids
    );

    res.json({ results: devices.map((d) => ({ id: d.id, name: d.name, restarted: true })) });

    for (const device of devices) {
      const brand = (device.brand || "").trim().toLowerCase();
      if (brand === "webos" || brand === "lg") {
        const macCheck = await ensureValidDeviceMac(device.ip, device.mac);
        if (macCheck.ok) {
          device.mac = macCheck.mac;
          if (macCheck.source === "arp") {
            await runAsync(`UPDATE devices SET mac = ? WHERE id = ?`, [macCheck.mac, device.id]);
          }
        }
        const restartProfile = buildRestartProfile(device);
        sendWebosRestart(device.ip, device.mac, restartProfile).then(async (ok) => {
          if (ok) {
            await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
            try { await broadcastDeviceState(device.id); } catch (e) {}
          } else {
            console.warn(`Restart flow failed for ${device.name}: returned false`);
          }
        }).catch((e) => console.error(`Restart error for ${device.name}:`, e));
      } else {
        wakeDevice(device.mac).then(async (ok) => {
          if (ok) await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/settings", async (req, res) => {
  try {
    const { ids, settings } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No device IDs provided." });
    }

    res.json({ success: true, updated: ids.length, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/poweron-all", async (req, res) => {
  try {
    const results = await powerOnAll();
    await Promise.all(
      results
        .filter((item) => item.poweredOn)
        .map((item) =>
          runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [item.id])
        )
    );
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/devices/poweroff-all", async (req, res) => {
  try {
    const devices = await allAsync(`SELECT * FROM devices`);

    const results = await Promise.all(
      devices.map(async (device) => {
        const result = await powerOffDevice(device);
        const newState = result.success ? "Off" : device.power_state || device.powerState || "Off";

        await runAsync(`UPDATE devices SET power_state = ? WHERE id = ?`, [newState, device.id]);

        return {
          id: device.id,
          name: device.name,
          brand: device.brand || "generic",
          success: result.success,
          reason: result.reason,
          method: result.method,
        };
      })
    );

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
