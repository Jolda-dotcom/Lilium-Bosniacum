const express = require("express");
const router = express.Router();
const {
  getUserByUsername,
  createUser,
  listUsers,
  normalizeUserRow,
  updateUserPassword,
  deleteUser,
  verifyPassword,
  SESSION_NAME,
  requireAuth,
  requireAdmin,
} = require("../lib/auth");

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const user = await getUserByUsername(username);
    if (!user || user.is_active !== 1 || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    return res.json({ authenticated: true, user: req.session.user });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Login failed." });
  }
});

router.post("/auth/logout", (req, res) => {
  if (!req.session) {
    return res.json({ authenticated: false, user: null });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed." });
    }
    res.clearCookie(SESSION_NAME);
    return res.json({ authenticated: false, user: null });
  });
});

router.get("/auth/status", (req, res) => {
  const hasSessionCookie = typeof req.headers.cookie === "string" && req.headers.cookie.split(";").some((cookie) => cookie.trim().startsWith(`${SESSION_NAME}=`));

  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user, sessionCookie: hasSessionCookie });
  }

  return res.json({ authenticated: false, user: null, sessionCookie: hasSessionCookie });
});

router.get("/auth/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await listUsers();
    return res.json(users.map(normalizeUserRow));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/auth/users", requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Username, password, and role are required." });
  }

  try {
    const existing = await getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already exists." });
    }
    const created = await createUser({ username, password, role });
    return res.status(201).json(normalizeUserRow(created));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/auth/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  try {
    await deleteUser(userId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put("/auth/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const { password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ error: "Invalid user ID or password." });
  }

  try {
    await updateUserPassword(userId, password);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
