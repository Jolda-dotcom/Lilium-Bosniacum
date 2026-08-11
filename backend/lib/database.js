const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_FILE = path.join(__dirname, "..", "data.db");
const JSON_FILE = path.join(__dirname, "..", "devices.json");
const BACKUP_DIR = path.join(__dirname, "..", "backups");
const SESSION_DIR = path.join(__dirname, "..", "sessions");
const MAX_BACKUP_FILES = Number(process.env.MAX_BACKUP_FILES || 40);

const db = new sqlite3.Database(DB_FILE);

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

const safeJsonParse = (value, fallback = {}) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const escapeSqlString = (value) => String(value).replace(/'/g, "''");

const execAsync = (command) =>
  new Promise((resolve, reject) => {
    const { exec } = require("child_process");
    exec(command, { timeout: 7000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

const ensureBackupDirectory = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

const ensureSessionDirectory = () => {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
};

const initDatabase = async () => {
  await runAsync("PRAGMA foreign_keys = ON");

  await runAsync(
    `CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      mac TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT 'generic',
      status TEXT NOT NULL DEFAULT 'Offline',
      power_state TEXT NOT NULL DEFAULT 'Off',
      group_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE SET NULL
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS device_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      cron TEXT NOT NULL,
      action TEXT NOT NULL,
      action_params TEXT,
      description TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS schedule_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(schedule_id) REFERENCES device_schedules(id) ON DELETE CASCADE
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT,
      entity_id INTEGER,
      device_id INTEGER,
      group_id INTEGER,
      schedule_id INTEGER,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      target_type TEXT NOT NULL DEFAULT 'group',
      target_id INTEGER,
      steps_json TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const existingColumns = await allAsync(`PRAGMA table_info(devices)`);
  if (!existingColumns.some((column) => column.name === "brand")) {
    await runAsync(`ALTER TABLE devices ADD COLUMN brand TEXT NOT NULL DEFAULT 'generic'`);
  }
  if (!existingColumns.some((column) => column.name === "power_state")) {
    await runAsync(`ALTER TABLE devices ADD COLUMN power_state TEXT NOT NULL DEFAULT 'Off'`);
  }
  if (!existingColumns.some((column) => column.name === "last_active_at")) {
    await runAsync(`ALTER TABLE devices ADD COLUMN last_active_at TEXT`);
    try {
      await runAsync(`UPDATE devices SET last_active_at = CURRENT_TIMESTAMP WHERE last_active_at IS NULL`);
    } catch (e) {
      // ignore if update fails
    }
  }

  const row = await getAsync("SELECT COUNT(*) AS count FROM devices");
  if (row?.count === 0) {
    try {
      const data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
      for (const device of data) {
        await runAsync(
          `INSERT OR IGNORE INTO devices (id, name, ip, mac, brand, status, power_state) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            device.id,
            device.name,
            device.ip,
            device.mac,
            device.brand || "generic",
            device.status || "Offline",
            device.powerState || device.power_state || "Off",
          ]
        );
      }
      console.log("Seeded SQLite from devices.json because devices table was empty.");
    } catch (error) {
      console.log("No JSON seed performed:", error.message);
    }
  } else {
    console.log("Skipping devices.json seed because SQLite already has devices.");
  }
};

const writeAuditLog = async ({
  entityType = null,
  entityId = null,
  deviceId = null,
  groupId = null,
  scheduleId = null,
  action,
  status,
  source = null,
  details = null,
}) => {
  try {
    await runAsync(
      `INSERT INTO audit_logs (entity_type, entity_id, device_id, group_id, schedule_id, action, status, source, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        deviceId,
        groupId,
        scheduleId,
        action,
        status,
        source,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (error) {
    console.warn("Failed to write audit log:", error.message);
  }
};

module.exports = {
  db,
  DB_FILE,
  JSON_FILE,
  BACKUP_DIR,
  SESSION_DIR,
  MAX_BACKUP_FILES,
  runAsync,
  allAsync,
  getAsync,
  safeJsonParse,
  escapeSqlString,
  execAsync,
  ensureBackupDirectory,
  ensureSessionDirectory,
  initDatabase,
  writeAuditLog,
};
