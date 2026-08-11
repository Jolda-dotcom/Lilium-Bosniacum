const express = require("express");
const router = express.Router();
const { allAsync, getAsync, safeJsonParse } = require("../lib/database");
const { maintenanceHistory, runtimeIssues } = require("../lib/maintenance");

router.get("/health/summary", async (req, res) => {
  try {
    const totals = await getAsync(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Online' THEN 1 ELSE 0 END) AS online,
        SUM(CASE WHEN status = 'Offline' THEN 1 ELSE 0 END) AS offline,
        SUM(CASE WHEN power_state = 'On' THEN 1 ELSE 0 END) AS powerOn,
        SUM(CASE WHEN power_state = 'Off' THEN 1 ELSE 0 END) AS powerOff
      FROM devices`
    );

    const scheduleStats24h = await getAsync(
      `SELECT
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
        SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS failed,
        COUNT(*) AS total
      FROM schedule_runs
      WHERE datetime(created_at) >= datetime('now', '-1 day')`
    );

    const recentFailures = await allAsync(
      `SELECT * FROM audit_logs
       WHERE status LIKE 'failed%'
       ORDER BY id DESC
       LIMIT 20`
    );

    const lastActions = await allAsync(
      `SELECT d.id AS deviceId, d.name AS deviceName, a.action, a.status, a.created_at
       FROM devices d
       LEFT JOIN audit_logs a ON a.id = (
         SELECT id FROM audit_logs x
         WHERE x.device_id = d.id
         ORDER BY x.id DESC LIMIT 1
       )
       ORDER BY d.name COLLATE NOCASE`
    );

    const success = Number(scheduleStats24h?.success || 0);
    const total = Number(scheduleStats24h?.total || 0);
    const successRate = total > 0 ? Number(((success / total) * 100).toFixed(2)) : null;

    res.json({
      timestamp: new Date().toISOString(),
      devices: {
        total: Number(totals?.total || 0),
        online: Number(totals?.online || 0),
        offline: Number(totals?.offline || 0),
        powerOn: Number(totals?.powerOn || 0),
        powerOff: Number(totals?.powerOff || 0),
      },
      schedules24h: {
        total,
        success,
        failed: Number(scheduleStats24h?.failed || 0),
        successRate,
      },
      lastActions,
      recentFailures: recentFailures.map((row) => ({ ...row, details: safeJsonParse(row.details, null) })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/system/diagnostics", async (req, res) => {
  try {
    const recentFailedAudit = await allAsync(
      `SELECT id, action, status, source, created_at, details
       FROM audit_logs
       WHERE status LIKE 'failed%'
       ORDER BY id DESC
       LIMIT 30`
    );
    const lastMaintenance = maintenanceHistory.length ? maintenanceHistory[maintenanceHistory.length - 1] : null;

    res.json({
      timestamp: new Date().toISOString(),
      config: {
        weeklyMaintenanceCron: process.env.WEEKLY_MAINTENANCE_CRON || "0 4 * * 0",
        autoBackupIntervalMs: Number(process.env.AUTO_BACKUP_INTERVAL_MS || 24 * 60 * 60 * 1000),
        macSelfHealIntervalMs: Number(process.env.MAC_SELF_HEAL_INTERVAL_MS || 15 * 60 * 1000),
        maxBackups: Number(process.env.MAX_BACKUP_FILES || 40),
        runtimeIssueAlertThreshold: Number(process.env.RUNTIME_ISSUE_ALERT_THRESHOLD || 8),
      },
      lastMaintenance,
      maintenanceHistory: maintenanceHistory.slice(-10),
      runtimeIssues: runtimeIssues.slice(-30),
      recentFailedAudit: recentFailedAudit.map((row) => ({
        ...row,
        details: safeJsonParse(row.details, null),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
