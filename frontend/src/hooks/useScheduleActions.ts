import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Device, DeviceSchedule, ScheduleActionParams, ScheduleActionSequence } from "../types/app";
import { getAvailableActionsForDevice } from "../utils/schedule";

interface UseScheduleActionsOptions {
  baseUrl: string;
  selectedDevice: Device | null;
  selectedDeviceId: number | null;
  scheduleAction: string;
  scheduleSequence: ScheduleActionSequence;
  scheduleDescription: string;
  scheduleEnabled: boolean;
  scheduleTarget: string;
  setDeviceSchedules: Dispatch<SetStateAction<Record<number, DeviceSchedule[]>>>;
  setDetailTab: Dispatch<SetStateAction<"info" | "schedule">>;
  setScheduleCron: Dispatch<SetStateAction<string>>;
  setScheduleAction: Dispatch<SetStateAction<string>>;
  setScheduleTarget: Dispatch<SetStateAction<string>>;
  setScheduleDescription: Dispatch<SetStateAction<string>>;
  setScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  setScheduleSequence: Dispatch<SetStateAction<ScheduleActionSequence>>;
  setScheduleUseTime: Dispatch<SetStateAction<boolean>>;
  setScheduleTime: Dispatch<SetStateAction<string>>;
  setEditingScheduleId: Dispatch<SetStateAction<number | null>>;
  showMessage: (title: string, message: string) => void;
}

export function useScheduleActions(options: UseScheduleActionsOptions) {
  const {
    baseUrl,
    selectedDevice,
    selectedDeviceId,
    scheduleAction,
    scheduleSequence,
    scheduleDescription,
    scheduleEnabled,
    scheduleTarget,
    setDeviceSchedules,
    setDetailTab,
    setScheduleCron,
    setScheduleAction,
    setScheduleTarget,
    setScheduleDescription,
    setScheduleEnabled,
    setScheduleSequence,
    setScheduleUseTime,
    setScheduleTime,
    setEditingScheduleId,
    showMessage,
  } = options;

  const loadDeviceSchedules = useCallback(async (deviceId: number) => {
    try {
      const response = await fetch(`${baseUrl}/devices/${deviceId}/schedules`);
      const data = await response.json();
      setDeviceSchedules((prev) => ({ ...prev, [deviceId]: data }));
    } catch (error) {
      console.error("Učitavanje rasporeda nije uspjelo:", error);
      setDeviceSchedules((prev) => ({ ...prev, [deviceId]: [] }));
    }
  }, [baseUrl, setDeviceSchedules]);

  const clearScheduleForm = useCallback(() => {
    setScheduleCron("0 7 * * *");
    setScheduleAction("poweron");
    setScheduleTarget("");
    setScheduleDescription("");
    setScheduleEnabled(true);
    setEditingScheduleId(null);
    setScheduleSequence([]);
    setScheduleUseTime(false);
    setScheduleTime("");
  }, [setEditingScheduleId, setScheduleAction, setScheduleCron, setScheduleDescription, setScheduleEnabled, setScheduleSequence, setScheduleTarget, setScheduleTime, setScheduleUseTime]);

  const handleEditSchedule = useCallback((schedule: DeviceSchedule) => {
    const actionParams = (schedule.action_params ?? {}) as ScheduleActionParams;
    const available = getAvailableActionsForDevice(selectedDevice);
    const supportedAction = available.some((action) => action.value === schedule.action) ? schedule.action : available[0]?.value || "poweron";
    setEditingScheduleId(schedule.id);
    setScheduleCron(schedule.cron);
    setScheduleAction(supportedAction);
    setScheduleTarget(supportedAction === "launchApp" ? (typeof actionParams.target === "string" ? actionParams.target : "") : supportedAction === "setVolume" ? (typeof actionParams.volume === "number" || typeof actionParams.volume === "string" ? String(actionParams.volume) : "") : "");
    setScheduleDescription(schedule.description || "");
    setScheduleEnabled(schedule.enabled);
    setDetailTab("schedule");
    try {
      if (schedule.action === "sequence" && Array.isArray(actionParams.sequence)) {
        setScheduleSequence(actionParams.sequence.map((s) => ({ ...(s as ScheduleActionSequence[0]) })));
      } else {
        setScheduleSequence([]);
      }
    } catch {
      setScheduleSequence([]);
    }
    try {
      const parts = schedule.cron ? schedule.cron.trim().split(/\s+/) : [];
      if (parts.length >= 5 && parts[2] === "*" && parts[3] === "*" && parts[4] === "*") {
        const minute = parts[0];
        const hour = parts[1];
        if (/^\d{1,2}$/.test(minute) && /^\d{1,2}$/.test(hour)) {
          setScheduleUseTime(true);
          setScheduleTime(`${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`);
        }
      }
    } catch {
      // ignore cron parsing errors
    }
  }, [selectedDevice, setDetailTab, setEditingScheduleId, setScheduleAction, setScheduleCron, setScheduleDescription, setScheduleEnabled, setScheduleSequence, setScheduleTarget, setScheduleTime, setScheduleUseTime]);

  const handleDeleteSchedule = useCallback(async (scheduleId: number) => {
    if (!selectedDeviceId) return;
    try {
      await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${scheduleId}`, { method: "DELETE" });
      await loadDeviceSchedules(selectedDeviceId);
      showMessage("Info", "Raspored obrisan.");
    } catch (error) {
      console.error("Brisanje rasporeda nije uspjelo:", error);
      showMessage("Greška", "Greška pri brisanju rasporeda.");
    }
  }, [baseUrl, loadDeviceSchedules, selectedDeviceId, showMessage]);

  const handleToggleSchedule = useCallback(async (schedule: DeviceSchedule) => {
    if (!selectedDeviceId) return;
    try {
      await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cron: schedule.cron, action: schedule.action, action_params: schedule.action_params || {}, description: schedule.description || "", enabled: !schedule.enabled }),
      });
      await loadDeviceSchedules(selectedDeviceId);
    } catch (error) {
      console.error("Ažuriranje rasporeda nije uspjelo:", error);
      showMessage("Greška", "Greška pri ažuriranju rasporeda.");
    }
  }, [baseUrl, loadDeviceSchedules, selectedDeviceId, showMessage]);

  const fetchScheduleLogs = useCallback(async (schedule: DeviceSchedule) => {
    if (!selectedDeviceId) {
      showMessage("Greška", "Nema odabranog uređaja.");
      return;
    }
    const formatScheduleStatus = (status: string) => {
      const normalized = String(status || "").toLowerCase();
      if (normalized === "success") return "Uspješno";
      if (normalized === "failed") return "Neuspješno";
      if (normalized === "running") return "U toku";
      return status || "Nepoznato";
    };
    const formatScheduleDetails = (details: unknown) => {
      if (!details) return "Bez dodatnih detalja.";
      const raw = typeof details === "string" ? details : JSON.stringify(details);
      if (!raw) return "Bez dodatnih detalja.";
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (typeof parsed.error === "string" && parsed.error.trim()) return `Greška: ${parsed.error}`;
        if (typeof parsed.action === "string" && parsed.action.trim()) return `Akcija: ${parsed.action}`;
        if (typeof parsed.step === "string" && parsed.step.trim()) return `Korak: ${parsed.step}`;
        return JSON.stringify(parsed, null, 2);
      } catch {
        return raw;
      }
    };
    const formatScheduleTimestamp = (createdAt: string) => {
      const date = new Date(createdAt);
      return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString();
    };
    try {
      const response = await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${schedule.id}/logs`);
      if (!response.ok) {
        showMessage("Greška", "Ne mogu dohvatiti logove.");
        return;
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        showMessage("Logovi", "Nema zapisa za ovaj raspored.");
        return;
      }
      const text = data.map((run: { created_at?: string; status?: string; details?: unknown }) => `${formatScheduleTimestamp(run.created_at || "")} | ${formatScheduleStatus(run.status || "")}\n${formatScheduleDetails(run.details)}`).join("\n\n");
      showMessage("Logovi rasporeda", text);
    } catch (e) {
      console.error("Dohvat logova nije uspio", e);
      showMessage("Greška", "Dohvat logova nije uspio");
    }
  }, [baseUrl, selectedDeviceId, showMessage]);

  const handleTriggerSchedule = useCallback(async (schedule: DeviceSchedule) => {
    if (!selectedDeviceId) return;
    try {
      const resp = await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${schedule.id}/trigger`, { method: "POST" });
      if (!resp.ok) {
        showMessage("Greška", "Ne mogu pokrenuti raspored.");
        return;
      }
      showMessage("Info", "Raspored je pokrenut (manualni trigger).");
    } catch (e) {
      console.error("Trigger rasporeda nije uspio", e);
      showMessage("Greška", "Trigger rasporeda nije uspio");
    }
  }, [baseUrl, selectedDeviceId, showMessage]);

  const handleSaveScheduleBuilder = useCallback(async (data: {
    hour: number;
    minute: number;
    days: number[];
    cron: string;
    turnOffEnabled?: boolean;
    turnOffHour?: number;
    turnOffMinute?: number;
    turnOffCron?: string;
    afterPowerOnAction?: string;
    afterPowerOnTarget?: string;
  }) => {
    if (!selectedDeviceId) {
      showMessage("Greška", "Nema odabranog uređaja.");
      return;
    }

    const available = getAvailableActionsForDevice(selectedDevice);
    const activeAction = data.afterPowerOnAction || scheduleAction || "poweron";
    if (!available.some((action) => action.value === activeAction)) {
      showMessage("Greška", "Odabrana akcija nije podržana za ovaj uređaj.");
      return;
    }

    const powerOnSteps = activeAction === "poweron" || !activeAction
      ? [{ action: "poweron" }]
      : [
          { action: "poweron" },
          {
            action: activeAction,
            params: activeAction === "launchApp"
              ? { target: (data.afterPowerOnTarget || scheduleTarget || "").trim() }
              : activeAction === "setVolume"
              ? { volume: Number(data.afterPowerOnTarget || scheduleTarget || 0) }
              : {},
          },
        ];

    const schedulePayloads = [] as Array<{ cron: string; action?: string; actions?: Array<Record<string, unknown>>; action_params?: Record<string, unknown>; description: string; enabled: boolean }>;

    schedulePayloads.push({
      cron: data.cron,
      actions: powerOnSteps.map((step) => ({
        action: step.action,
        params: step.params || {},
      })),
      description: scheduleDescription.trim() || `Uključi ${selectedDevice?.name || "uređaj"}`,
      enabled: scheduleEnabled,
    });

    if (data.turnOffEnabled && data.turnOffCron) {
      schedulePayloads.push({
        cron: data.turnOffCron,
        action: "poweroff",
        action_params: {},
        description: scheduleDescription.trim() || `Isključi ${selectedDevice?.name || "uređaj"}`,
        enabled: scheduleEnabled,
      });
    }

    try {
      for (const payload of schedulePayloads) {
        const response = await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showMessage("Greška", errorData?.error || "Neuspješno spremanje rasporeda.");
          return;
        }
      }

      setScheduleCron(data.cron);
      await loadDeviceSchedules(selectedDeviceId);
      clearScheduleForm();
      showMessage("Info", "Raspored je uspješno spremljen!");
    } catch (error) {
      console.error("Greška pri spremanju rasporeda:", error);
      showMessage("Greška", "Greška pri spremanju rasporeda.");
    }
  }, [baseUrl, clearScheduleForm, loadDeviceSchedules, scheduleAction, scheduleDescription, scheduleEnabled, scheduleTarget, selectedDevice, selectedDeviceId, setScheduleCron, showMessage]);

  return { loadDeviceSchedules, clearScheduleForm, handleEditSchedule, handleDeleteSchedule, handleToggleSchedule, fetchScheduleLogs, handleTriggerSchedule, handleSaveScheduleBuilder };
}
