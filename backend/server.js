const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const WebSocket = require("ws");
const cron = require("node-cron");

const {
  initDatabase,
  ensureBackupDirectory,
  ensureSessionDirectory,
  allAsync,
} = require("./lib/database");
const {
  runMaintenanceCycle,
  createDatabaseBackup,
} = require("./lib/maintenance");
const {
  loadScheduleTasks,
} = require("./lib/schedule-service");
const { repairInvalidDeviceMacs } = require("./lib/device-store");
const { setWebSocketServer } = require("./lib/device-actions");
const { ensureDefaultAdmin } = require("./lib/auth");
const authRoutes = require("./routes/auth");
const auditRoutes = require("./routes/audit");
const diagnosticsRoutes = require("./routes/diagnostics");
const discoveryRoutes = require("./routes/discovery");
const devicesRoutes = require("./routes/devices");
const groupsRoutes = require("./routes/groups");
const scenesRoutes = require("./routes/scenes");
const systemRoutes = require("./routes/system");

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_NAME = process.env.SESSION_NAME || "connect.sid";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
const API_RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 600);
const CONTROL_RATE_LIMIT_MAX = Number(process.env.CONTROL_RATE_LIMIT_MAX || 120);
const AUTO_BACKUP_INTERVAL_MS = Number(process.env.AUTO_BACKUP_INTERVAL_MS || 24 * 60 * 60 * 1000);
const WEEKLY_MAINTENANCE_CRON = process.env.WEEKLY_MAINTENANCE_CRON || "0 4 * * 0";
const MAC_SELF_HEAL_INTERVAL_MS = Number(process.env.MAC_SELF_HEAL_INTERVAL_MS || 15 * 60 * 1000);

const rateLimiterStore = new Map();

app.disable("x-powered-by");

const buildRateLimitKey = (req, scope) => `${scope}:${req.ip || "unknown"}`;

const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, value] of rateLimiterStore.entries()) {
    if (value.resetAt <= now) {
      rateLimiterStore.delete(key);
    }
  }
};

const createRateLimitMiddleware = ({ scope, maxRequests, windowMs }) => (req, res, next) => {
  const now = Date.now();
  const key = buildRateLimitKey(req, scope);
  const existing = rateLimiterStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimiterStore.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  existing.count += 1;
  if (existing.count > maxRequests) {
    res.status(429).json({ error: "Rate limit exceeded." });
    return;
  }

  return next();
};

const applySecurityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
};

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Discovery-Click-Id",
      "X-Discovery-Client-Attempt",
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: "100kb" }));
ensureSessionDirectory();
app.use(
  session({
    name: SESSION_NAME,
    secret: SESSION_SECRET,
    store: new SQLiteStore({
      dir: path.join(__dirname, "sessions"),
      db: "sessions.sqlite",
      concurrentDB: true,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);
app.use(applySecurityHeaders);
app.use(
  createRateLimitMiddleware({
    scope: "api",
    maxRequests: API_RATE_LIMIT_MAX,
    windowMs: API_RATE_LIMIT_WINDOW_MS,
  })
);
app.use((req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return createRateLimitMiddleware({
      scope: "control",
      maxRequests: CONTROL_RATE_LIMIT_MAX,
      windowMs: API_RATE_LIMIT_WINDOW_MS,
    })(req, res, next);
  }
  return next();
});

app.use((req, res, next) => {
  try {
    console.log(`REQ --> ${req.method} ${req.originalUrl}`);
  } catch (e) {
    // ignore logging issues
  }
  next();
});

app.get('/__routes', (req, res) => {
  if (process.env.ENABLE_DEBUG_ROUTES !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const routes = [];
    app._router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        routes.push({ path: layer.route.path, methods });
      }
    });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'failed to list routes' });
  }
});

app.use(authRoutes);
app.use(auditRoutes);
app.use(diagnosticsRoutes);
app.use(discoveryRoutes);
app.use(devicesRoutes);
app.use(groupsRoutes);
app.use(scenesRoutes);
app.use(systemRoutes);

app.use((err, req, res, next) => {
  console.error('Express error:', err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err?.message || "Internal server error" });
});

const startServer = async () => {
  await initDatabase();
  await ensureDefaultAdmin();
  ensureBackupDirectory();

  cleanupRateLimitStore();
  await runMaintenanceCycle("startup");

  setInterval(() => {
    repairInvalidDeviceMacs("periodic-mac-watchdog").catch((error) => {
      console.error("periodic-mac-watchdog failed:", error.message);
    });
    cleanupRateLimitStore();
  }, MAC_SELF_HEAL_INTERVAL_MS);

  setInterval(() => {
    createDatabaseBackup("auto")
      .then((created) => {
        console.log(`auto-backup: created ${created.fileName}`);
      })
      .catch((error) => {
        console.error("auto-backup failed:", error.message);
      });
  }, AUTO_BACKUP_INTERVAL_MS);

  if (cron.validate(WEEKLY_MAINTENANCE_CRON)) {
    cron.schedule(WEEKLY_MAINTENANCE_CRON, () => {
      runMaintenanceCycle("weekly-cron")
        .then((summary) => {
          console.log(`weekly-maintenance: ok backup=${summary.backupFile}`);
        })
        .catch((error) => {
          console.error("weekly-maintenance failed:", error.message);
        });
    });
  } else {
    console.warn(`Invalid WEEKLY_MAINTENANCE_CRON: ${WEEKLY_MAINTENANCE_CRON}`);
  }

  await loadScheduleTasks();

  try {
    const routes = [];
    app._router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        routes.push(`${methods} ${layer.route.path}`);
      }
    });
    console.log('Registered routes:\n' + routes.join('\n'));
  } catch (e) {
    // ignore route listing errors
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Backend radi na http://localhost:${PORT}`);
  });

  const wss = new WebSocket.Server({ server });
  setWebSocketServer(wss);
  wss.on("connection", async (socket) => {
    try {
      console.log("WebSocket client connected");
      const devices = await allAsync(`SELECT * FROM devices`);
      socket.send(JSON.stringify({ type: "devices:init", devices }));
    } catch (e) {
      // ignore send errors
    }
  });
};

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});
