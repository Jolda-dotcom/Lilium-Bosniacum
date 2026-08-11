const express = require("express");
const router = express.Router();
const { runAsync, allAsync, getAsync, writeAuditLog } = require("../lib/database");
const { listBackups, createDatabaseBackup, restoreDatabaseFromBackup, runMaintenanceCycle } = require("../lib/maintenance");
const { loadScheduleTasks } = require("../lib/schedule-service");
const { isLikelyValidMac, normalizeMacToColon } = require("../lib/device-store");

router.get("/system/backups", async (req, res) => {
  try {
    const backups = listBackups();
    res.json({
      backups,
      count: backups.length,
      backupDir: require("path").join(__dirname, "..", "backups"),
      maxBackups: Number(process.env.MAX_BACKUP_FILES || 40),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/system/backups", async (req, res) => {
  try {
    const label = req.body?.label || "manual";
    const backup = await createDatabaseBackup(label);
    await writeAuditLog({
      action: "system:backup:create",
      status: "success",
      source: "manual-backup",
      details: { fileName: backup.fileName },
    });

    res.json({
      success: true,
      backup,
      backups: listBackups(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/system/backups/restore", async (req, res) => {
  try {
    const fileName = req.body?.fileName;
    if (!fileName) {
      return res.status(400).json({ error: "fileName is required." });
    }

    await restoreDatabaseFromBackup(fileName, loadScheduleTasks);
    await writeAuditLog({
      action: "system:backup:restore",
      status: "success",
      source: "manual-restore",
      details: { fileName },
    });

    res.json({
      success: true,
      restoredFrom: fileName,
      backups: listBackups(),
    });
  } catch (error) {
    await writeAuditLog({
      action: "system:backup:restore",
      status: "failed",
      source: "manual-restore",
      details: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

router.get("/system/maintenance", async (req, res) => {
  try {
    const backups = listBackups();
    const invalidMacRows = await allAsync(`SELECT id, name, ip, mac FROM devices ORDER BY id ASC`);
    const invalidMacDevices = invalidMacRows.filter((row) => !isLikelyValidMac(normalizeMacToColon(row.mac)));

    res.json({
      timestamp: new Date().toISOString(),
      backups: {
        count: backups.length,
        latest: backups[0] || null,
      },
      invalidMacDevices,
      recommendations: [
        "Napravite backup prije većih promjena.",
        "Provjerite restart flow za barem jedan LG/webOS uređaj sedmično.",
        "Pratite audit log za ponavljane failed akcije.",
      ],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/system/maintenance/run", async (req, res) => {
  try {
    const trigger = req.body?.trigger || "manual-api";
    const result = await runMaintenanceCycle(trigger);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
