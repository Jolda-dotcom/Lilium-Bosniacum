const express = require("express");
const router = express.Router();
const { runAsync, allAsync, getAsync, safeJsonParse } = require("../lib/database");
const { executeWithRetryAndRollback } = require("../lib/device-actions");

router.get("/scenes", async (req, res) => {
  try {
    const scenes = await allAsync(`SELECT * FROM scenes ORDER BY name COLLATE NOCASE`);
    res.json(
      scenes.map((scene) => ({
        ...scene,
        enabled: scene.enabled === 1,
        steps: safeJsonParse(scene.steps_json, []),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/scenes", async (req, res) => {
  try {
    const { name, description, targetType, targetId, steps, enabled } = req.body;
    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "Scene requires name and non-empty steps array." });
    }

    const result = await runAsync(
      `INSERT INTO scenes (name, description, target_type, target_id, steps_json, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        targetType || "group",
        targetId ?? null,
        JSON.stringify(steps),
        enabled === false ? 0 : 1,
      ]
    );

    const scene = await getAsync(`SELECT * FROM scenes WHERE id = ?`, [result.lastID]);
    res.json({ ...scene, enabled: scene.enabled === 1, steps: safeJsonParse(scene.steps_json, []) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/scenes/:id", async (req, res) => {
  try {
    const { name, description, targetType, targetId, steps, enabled } = req.body;
    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "Scene requires name and non-empty steps array." });
    }

    await runAsync(
      `UPDATE scenes SET name = ?, description = ?, target_type = ?, target_id = ?, steps_json = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        description || null,
        targetType || "group",
        targetId ?? null,
        JSON.stringify(steps),
        enabled === false ? 0 : 1,
        req.params.id,
      ]
    );

    const scene = await getAsync(`SELECT * FROM scenes WHERE id = ?`, [req.params.id]);
    if (!scene) {
      return res.status(404).json({ error: "Scene is not found." });
    }
    res.json({ ...scene, enabled: scene.enabled === 1, steps: safeJsonParse(scene.steps_json, []) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/scenes/:id", async (req, res) => {
  try {
    await runAsync(`DELETE FROM scenes WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/scenes/:id/execute", async (req, res) => {
  try {
    const scene = await getAsync(`SELECT * FROM scenes WHERE id = ?`, [req.params.id]);
    if (!scene) {
      return res.status(404).json({ error: "Scene not found." });
    }
    if (scene.enabled !== 1) {
      return res.status(400).json({ error: "Scene is disabled." });
    }

    const steps = safeJsonParse(scene.steps_json, []);
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "Scene has no steps." });
    }

    let devices = [];
    if (scene.target_type === "device") {
      const one = await getAsync(`SELECT * FROM devices WHERE id = ?`, [scene.target_id]);
      devices = one ? [one] : [];
    } else if (scene.target_type === "group") {
      devices = await allAsync(`SELECT * FROM devices WHERE group_id = ? ORDER BY name COLLATE NOCASE`, [scene.target_id]);
    } else {
      devices = await allAsync(`SELECT * FROM devices ORDER BY name COLLATE NOCASE`);
    }

    if (!devices.length) {
      return res.status(400).json({ error: "No devices resolved for scene target." });
    }

    const results = [];
    for (const device of devices) {
      const deviceSteps = [];
      let ok = true;
      for (const step of steps) {
        try {
          const action = step.action;
          const params = step.params || {};
          const result = await executeWithRetryAndRollback({
            device,
            action,
            params,
            retryCount: Number(step.retryCount ?? 1),
            retryDelayMs: Number(step.retryDelayMs ?? 1000),
            rollbackOnFail: Boolean(step.rollbackOnFail ?? false),
            source: "scene",
            groupId: scene.target_type === "group" ? scene.target_id : null,
            entityType: "scene",
            entityId: scene.id,
          });
          deviceSteps.push({ action, status: "success", attempts: result.attempts });
          if (step.delayMs && Number(step.delayMs) > 0) {
            await new Promise((resolve) => setTimeout(resolve, Number(step.delayMs)));
          }
        } catch (stepError) {
          ok = false;
          deviceSteps.push({ action: step.action, status: "failed", error: stepError.message });
          if (!step.continueOnError) {
            break;
          }
        }
      }

      results.push({
        deviceId: device.id,
        deviceName: device.name,
        success: ok,
        steps: deviceSteps,
      });
    }

    await writeAuditLog({
      entityType: "scene",
      entityId: scene.id,
      action: "scene:execute",
      status: results.every((r) => r.success) ? "success" : "partial",
      source: "scene",
      groupId: scene.target_type === "group" ? scene.target_id : null,
      details: { devices: results.length },
    });

    res.json({
      sceneId: scene.id,
      name: scene.name,
      targetType: scene.target_type,
      targetId: scene.target_id,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
