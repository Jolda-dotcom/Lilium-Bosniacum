const cron = require("node-cron");
const { getAsync, allAsync } = require("./database");
const { executeScheduleAction } = require("./device-actions");

const scheduledTasks = new Map();

const registerScheduleTask = (schedule) => {
  if (!cron.validate(schedule.cron)) {
    console.warn(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron}`);
    return;
  }

  const existingTask = scheduledTasks.get(schedule.id);
  if (existingTask) {
    existingTask.stop();
  }

  const task = cron.schedule(schedule.cron, async () => {
    console.log(`🔔 Running schedule ${schedule.id} for device ${schedule.device_id}: ${schedule.action}`);
    try {
      await executeScheduleAction(schedule.id);
    } catch (error) {
      console.error(`Schedule ${schedule.id} failed:`, error);
    }
  });

  scheduledTasks.set(schedule.id, task);
};

const removeScheduleTask = (scheduleId) => {
  const task = scheduledTasks.get(scheduleId);
  if (task) {
    task.stop();
    scheduledTasks.delete(scheduleId);
  }
};

const reloadScheduleTask = async (scheduleId) => {
  try {
    const schedule = await getAsync(
      `SELECT * FROM device_schedules WHERE id = ? AND enabled = 1`,
      [scheduleId]
    );

    removeScheduleTask(scheduleId);

    if (schedule) {
      registerScheduleTask(schedule);
    }
  } catch (error) {
    console.error(`Failed to reload schedule ${scheduleId}:`, error);
  }
};

const loadScheduleTasks = async () => {
  const schedules = await allAsync(`SELECT * FROM device_schedules WHERE enabled = 1`);
  schedules.forEach(registerScheduleTask);
};

const resetAllScheduleTasks = () => {
  for (const [scheduleId, task] of scheduledTasks.entries()) {
    try {
      task.stop();
    } catch {
      // ignore task stop errors
    }
    scheduledTasks.delete(scheduleId);
  }
};

module.exports = {
  registerScheduleTask,
  removeScheduleTask,
  reloadScheduleTask,
  loadScheduleTasks,
  resetAllScheduleTasks,
};
