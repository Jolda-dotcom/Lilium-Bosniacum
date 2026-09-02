const crypto = require("crypto");
const { runAsync, getAsync, allAsync } = require("./database");

const SESSION_NAME = process.env.SESSION_NAME || "connect.sid";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

const hashPassword = (password, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString("hex");
  }
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }
  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) {
      return false;
    }
    const [, salt, hash] = parts;
    try {
      const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
      return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hash, "hex"));
    } catch {
      return false;
    }
  }
  const legacyHash = crypto.createHash("sha256").update(String(password)).digest("hex");
  return legacyHash === storedHash;
};

const normalizeUserRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const createUser = async ({ username, password, role = "viewer", isActive = 1 }) => {
  const passwordHash = hashPassword(password);
  const result = await runAsync(
    `INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, ?)`,
    [username, passwordHash, role, isActive]
  );
  return {
    id: result.lastID,
    username,
    role,
    is_active: isActive,
  };
};

const getUserByUsername = async (username) =>
  getAsync(`SELECT * FROM users WHERE username = ?`, [username]);

const getUserById = async (id) =>
  getAsync(`SELECT id, username, role, is_active, created_at, updated_at FROM users WHERE id = ?`, [id]);

const listUsers = async () =>
  allAsync(`SELECT id, username, role, is_active, created_at, updated_at FROM users ORDER BY username COLLATE NOCASE`);

const updateUserPassword = async (id, password) => {
  const passwordHash = hashPassword(password);
  await runAsync(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, id]);
};

const deleteUser = async (id) =>
  runAsync(`DELETE FROM users WHERE id = ?`, [id]);

const ensureDefaultAdmin = async () => {
  const existingAdmin = await getUserByUsername(DEFAULT_ADMIN_USERNAME);
  if (!existingAdmin) {
    await createUser({
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
      role: "admin",
      isActive: 1,
    });
    console.log(`Created default admin user: ${DEFAULT_ADMIN_USERNAME}`);
  }
};

const requireAuth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden" });
};

module.exports = {
  SESSION_NAME,
  SESSION_SECRET,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
  hashPassword,
  verifyPassword,
  normalizeUserRow,
  createUser,
  getUserByUsername,
  getUserById,
  listUsers,
  updateUserPassword,
  deleteUser,
  ensureDefaultAdmin,
  requireAuth,
  requireAdmin,
};
