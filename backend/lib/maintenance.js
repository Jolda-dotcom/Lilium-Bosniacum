const { runAsync, allAsync, escapeSqlString, ensureBackupDirectory, BACKUP_DIR, MAX_BACKUP_FILES, writeAuditLog } = require("./database");
const { repairInvalidDeviceMacs } = require("./device-store");

const runtimeIssues = [];
const maintenanceHistory = [];
const MAX_MAINTENANCE_HISTORY = Number(process.env.MAX_MAINTENANCE_HISTORY || 40);
const RUNTIME_ISSUE_ALERT_THRESHOLD = Number(process.env.RUNTIME_ISSUE_ALERT_THRESHOLD || 8);

const trimArray = (arr, max) => {
  if (arr.length <= max) {
    return;
  }
  arr.splice(0, arr.length - max);
};

const recordRuntimeIssue = (kind, payload = {}) => {
  runtimeIssues.push({
    timestamp: new Date().toISOString(),
    kind,
    ...payload,
  });
  trimArray(runtimeIssues, Number(process.env.MAX_RUNTIME_ISSUES || 80));
};

const isSafeBackupName = (name) => {
  return typeof name === "string" && /^[a-zA-Z0-9._-]+\.db$/.test(name);
};

const listBackups = () => {
  ensureBackupDirectory();
  const files = require("fs")
    .readdirSync(BACKUP_DIR)
    .filter((name) => isSafeBackupName(name))
    .map((name) => {
      const fullPath = require("path").join(BACKUP_DIR, name);
      const stat = require("fs").statSync(fullPath);
      return {
        name,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return files;
};

const pruneOldBackups = () => {
  const backups = listBackups();
  if (backups.length <= MAX_BACKUP_FILES) {
    return;
  }
  const toDelete = backups.slice(MAX_BACKUP_FILES);
  toDelete.forEach((backup) => {
    try {
      require("fs").unlinkSync(require("path").join(BACKUP_DIR, backup.name));
    } catch (error) {
      console.warn(`Failed to delete old backup ${backup.name}:`, error.message);
    }
  });
};

const createDatabaseBackup = async (label = "manual") => {
  ensureBackupDirectory();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sanitizedLabel = String(label || "manual").toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 24);
  const fileName = `backup-${stamp}-${sanitizedLabel}.db`;
  const backupPath = require("path").join(BACKUP_DIR, fileName);
  const escapedPath = escapeSqlString(backupPath);

  await runAsync(`VACUUM INTO '${escapedPath}'`);
  pruneOldBackups();

  return {
    fileName,
    path: backupPath,
  };
};

const resetAllScheduleTasks = (resetFn) => {
  if (typeof resetFn === "function") {
    resetFn();
  }
};

const restoreDatabaseFromBackup = async (fileName, resetFn) => {
  ensureBackupDirectory();
  if (!isSafeBackupName(fileName)) {
    throw new Error("Invalid backup file name.");
  }

  const backupPath = require("path").join(BACKUP_DIR, fileName);
  if (!require("fs").existsSync(backupPath)) {
    throw new Error("Backup file not found.");
  }

  const escapedPath = escapeSqlString(backupPath);
  const copyOrder = ["groups", "devices", "device_schedules", "schedule_runs", "audit_logs", "scenes"];
  const deleteOrder = [...copyOrder].reverse();

  await runAsync("PRAGMA foreign_keys = OFF");
  await runAsync(`ATTACH DATABASE '${escapedPath}' AS restore_db`);

  let txOpen = false;
  try {
    await runAsync("BEGIN TRANSACTION");
    txOpen = true;

    for (const tableName of deleteOrder) {
      await runAsync(`DELETE FROM ${tableName}`);
    }

    for (const tableName of copyOrder) {
      await runAsync(`INSERT INTO ${tableName} SELECT * FROM restore_db.${tableName}`);
    }

    await runAsync("COMMIT");
    txOpen = false;
  } catch (error) {
    if (txOpen) {
      try {
        await runAsync("ROLLBACK");
      } catch {
        // ignore rollback failures
      }
    }
    throw error;
  } finally {
    try {
      await runAsync("DETACH DATABASE restore_db");
    } catch {
      // ignore detach failures
    }
    try {
      await runAsync("PRAGMA foreign_keys = ON");
    } catch {
      // ignore pragma reset failures
    }
  }

  resetAllScheduleTasks(resetFn);
  await resetFn?.();
};

const runMaintenanceCycle = async (trigger = "manual") => {
  const startedAt = new Date().toISOString();
  const maintenanceLabel = `maintenance-${String(trigger || "manual").toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;

  let backup = null;
  let macRepair = { repaired: 0, unresolved: 0 };
  let dbOptimizeOk = true;
  try {
    macRepair = await repairInvalidDeviceMacs(`maintenance-mac-heal:${trigger}`);
    backup = await createDatabaseBackup(maintenanceLabel);

    try {
      await runAsync("PRAGMA optimize");
    } catch (optError) {
      dbOptimizeOk = false;
      recordRuntimeIssue("maintenance-db-optimize-failed", { message: optError.message });
    }

    const summary = {
      timestamp: startedAt,
      trigger,
      backupFile: backup?.fileName || null,
      repairedMacs: macRepair.repaired,
      unresolvedMacs: macRepair.unresolved,
      dbOptimizeOk,
      status: "success",
    };

    maintenanceHistory.push(summary);
    trimArray(maintenanceHistory, MAX_MAINTENANCE_HISTORY);

    await writeAuditLog({
      action: "system:maintenance:run",
      status: "success",
      source: `maintenance-${trigger}`,
      details: summary,
    });

    return summary;
  } catch (error) {
    const failed = {
      timestamp: startedAt,
      trigger,
      backupFile: backup?.fileName || null,
      repairedMacs: macRepair.repaired,
      unresolvedMacs: macRepair.unresolved,
      dbOptimizeOk,
      status: "failed",
      error: error.message,
    };
    maintenanceHistory.push(failed);
    trimArray(maintenanceHistory, MAX_MAINTENANCE_HISTORY);
    recordRuntimeIssue("maintenance-cycle-failed", { message: error.message, trigger });
    await writeAuditLog({
      action: "system:maintenance:run",
      status: "failed",
      source: `maintenance-${trigger}`,
      details: failed,
    });
    throw error;
  }
};

module.exports = {
  runtimeIssues,
  maintenanceHistory,
  RUNTIME_ISSUE_ALERT_THRESHOLD,
  listBackups,
  createDatabaseBackup,
  restoreDatabaseFromBackup,
  runMaintenanceCycle,
  resetAllScheduleTasks,
};
