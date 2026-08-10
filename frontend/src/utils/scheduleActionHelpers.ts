import type { DeviceSchedule, ScheduleActionParams, ScheduleActionSequence } from "../types/app";

export function formatScheduleStatus(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "success") return "Uspješno";
  if (normalized === "failed") return "Neuspješno";
  if (normalized === "running") return "U toku";
  return status || "Nepoznato";
}

export function formatScheduleDetails(details: unknown) {
  if (!details) return "Bez dodatnih detalja.";
  const raw = typeof details === "string" ? details : JSON.stringify(details);
  if (!raw) return "Bez dodatnih detalja.";

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return `Greška: ${parsed.error}`;
    }
    if (typeof parsed.action === "string" && parsed.action.trim()) {
      return `Akcija: ${parsed.action}`;
    }
    if (typeof parsed.step === "string" && parsed.step.trim()) {
      return `Korak: ${parsed.step}`;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export function formatScheduleTimestamp(createdAt: string) {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString();
}

export function buildSchedulePayload(
  scheduleAction: string,
  scheduleSequence: ScheduleActionSequence,
  scheduleDescription: string,
  scheduleEnabled: boolean,
  scheduleTarget: string,
  cron: string
) {
  if (Array.isArray(scheduleSequence) && scheduleSequence.length > 0) {
    return {
      cron,
      actions: scheduleSequence.map((s) => ({
        action: s.action,
        params: s.params || {},
        delayMs: s.delayMs || undefined,
        waitForReadyMs: s.waitForReadyMs || undefined,
        settleMs: s.settleMs || undefined,
      })),
      description: scheduleDescription.trim(),
      enabled: scheduleEnabled,
    };
  }

  return {
    cron,
    action: scheduleAction,
    action_params:
      scheduleAction === "launchApp"
        ? { target: scheduleTarget.trim() }
        : scheduleAction === "setVolume"
        ? { volume: Number(scheduleTarget) }
        : {},
    description: scheduleDescription.trim(),
    enabled: scheduleEnabled,
  };
}

export function mapScheduleActionToTargetValue(
  schedule: DeviceSchedule,
  selectedDevice: { brand?: string } | null
) {
  const actionParams = (schedule.action_params ?? {}) as Record<string, unknown>;
  if (schedule.action === "launchApp") {
    return typeof actionParams.target === "string" ? actionParams.target : "";
  }
  if (schedule.action === "setVolume") {
    if (typeof actionParams.volume === "number" || typeof actionParams.volume === "string") {
      return String(actionParams.volume);
    }
  }
  return "";
}

export function parseCronTime(scheduleCron: string) {
  try {
    const parts = scheduleCron ? scheduleCron.trim().split(/\s+/) : [];
    if (parts.length >= 5 && parts[2] === "*" && parts[3] === "*" && parts[4] === "*") {
      const minute = parts[0];
      const hour = parts[1];
      if (/^\d{1,2}$/.test(minute) && /^\d{1,2}$/.test(hour)) {
        return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
      }
    }
  } catch {
    // ignore parsing errors
  }
  return "";
}
