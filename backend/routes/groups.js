const express = require("express");
const router = express.Router();
const { runAsync, allAsync, writeAuditLog, getAsync } = require("../lib/database");
const { ensureValidDeviceMac } = require("../lib/device-store");
const { buildRestartProfile } = require("../restart-profile");
const { wakeDevice, powerOffDevice, sendWebosRestart } = require("../tv-adapter");
const { broadcastDeviceState } = require("../lib/device-actions");

router.get("/groups", async (req, res) => {
  try {
    const groups = await allAsync(
      `SELECT g.id, g.name, COUNT(d.id) AS deviceCount
       FROM groups g
       LEFT JOIN devices d ON d.group_id = g.id
       GROUP BY g.id
       ORDER BY g.name COLLATE NOCASE`
    );

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/groups", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Group name is required." });
    }

    const result = await runAsync(`INSERT INTO groups (name) VALUES (?)`, [name]);
    const group = await getAsync(
      `SELECT id, name, 0 AS deviceCount FROM groups WHERE id = ?`,
      [result.lastID]
    );

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/groups/:id", async (req, res) => {
  try {
    const { name } = req.body;

    await runAsync(`UPDATE groups SET name = ? WHERE id = ?`, [
      name,
      req.params.id,
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/groups/:id/devices", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const { deviceIds } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: "No device IDs provided." });
    }

    const placeholders = deviceIds.map(() => "?").join(",");
    await runAsync(
      `UPDATE devices SET group_id = ? WHERE id IN (${placeholders})`,
      [groupId, ...deviceIds]
    );

    res.json({ success: true, assigned: deviceIds.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/groups/:id/restart", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const devices = await allAsync(`SELECT * FROM devices WHERE group_id = ?`, [
      groupId,
    ]);

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:restart",
      status: "running",
      source: "manual-group-restart",
      details: { deviceCount: devices.length },
    });

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
            console.warn(`Group restart flow failed for ${device.name}: returned false`);
          }
        }).catch((e) => console.error(`Group restart error for ${device.name}:`, e));
      } else {
        wakeDevice(device.mac).then(async (ok) => {
          if (ok) await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
        });
      }
    }

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:restart",
      status: "success",
      source: "manual-group-restart",
      details: { deviceCount: devices.length },
    });
  } catch (error) {
    const groupId = Number(req.params.id);
    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:restart",
      status: "failed",
      source: "manual-group-restart",
      details: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.post("/groups/:id/poweroff", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const devices = await allAsync(`SELECT * FROM devices WHERE group_id = ?`, [
      groupId,
    ]);

    const results = await Promise.all(
      devices.map(async (device) => {
        const result = await powerOffDevice(device);
        const newState = result.success ? "Off" : device.power_state || device.powerState || "Off";
        await runAsync(
          `UPDATE devices SET power_state = ?, status = 'Offline' WHERE id = ?`,
          [newState, device.id]
        );
        return {
          id: device.id,
          name: device.name,
          success: result.success,
          reason: result.reason,
          method: result.method,
        };
      })
    );

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweroff",
      status: results.every((r) => r.success) ? "success" : "partial",
      source: "manual-group-poweroff",
      details: {
        deviceCount: devices.length,
        successCount: results.filter((r) => r.success).length,
      },
    });

    res.json({ results });
  } catch (error) {
    const groupId = Number(req.params.id);
    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweroff",
      status: "failed",
      source: "manual-group-poweroff",
      details: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.post("/groups/:id/poweron", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const devices = await allAsync(`SELECT * FROM devices WHERE group_id = ?`, [
      groupId,
    ]);

    const results = await Promise.all(
      devices.map(async (device) => {
        const poweredOn = await wakeDevice(device.mac);
        if (poweredOn) {
          await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
        }
        return {
          id: device.id,
          name: device.name,
          poweredOn,
        };
      })
    );

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweron",
      status: results.every((r) => r.poweredOn) ? "success" : "partial",
      source: "manual-group-poweron",
      details: {
        deviceCount: devices.length,
        successCount: results.filter((r) => r.poweredOn).length,
      },
    });

    res.json({ results });
  } catch (error) {
    const groupId = Number(req.params.id);
    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweron",
      status: "failed",
      source: "manual-group-poweron",
      details: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
