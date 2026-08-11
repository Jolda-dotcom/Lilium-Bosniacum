const express = require("express");
const router = express.Router();
const { allAsync, getAsync, safeJsonParse } = require("../lib/database");

router.get("/audit-logs", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 10)));
    const offset = (page - 1) * limit;
    const params = [];
    const filters = [];

    if (req.query.entityType) {
      filters.push("entity_type = ?");
      params.push(String(req.query.entityType));
    }
    if (req.query.entityId) {
      filters.push("entity_id = ?");
      params.push(Number(req.query.entityId));
    }
    if (req.query.deviceId) {
      filters.push("device_id = ?");
      params.push(Number(req.query.deviceId));
    }
    if (req.query.groupId) {
      filters.push("group_id = ?");
      params.push(Number(req.query.groupId));
    }
    if (req.query.scheduleId) {
      filters.push("schedule_id = ?");
      params.push(Number(req.query.scheduleId));
    }
    if (req.query.status) {
      filters.push("status = ?");
      params.push(String(req.query.status));
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const totalResult = await getAsync(`SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`, params);
    const rows = await allAsync(
      `SELECT * FROM audit_logs ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      items: rows.map((row) => ({ ...row, details: safeJsonParse(row.details, null) })),
      total: Number(totalResult?.total || 0),
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
