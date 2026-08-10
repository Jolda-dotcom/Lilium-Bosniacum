import { useCallback } from "react";
import type { Device, DeviceSchedule, ScheduleActionParams, ScheduleActionSequence } from "../types/app";
import type { SetStateAction } from "react";
import { getAvailableActionsForDevice } from "../utils/schedule";

interface UseScheduleLogicOptions {
  baseUrl: string;
  selectedDevice: Device | null;
  selectedDeviceId: number | null;
  setDeviceSchedules: (value: SetStateAction<Record<number, DeviceSchedule[]>>) => void;
  setDetailTab: (value: "info" | "schedule") => void;
  setScheduleCron: (value: string) => void;
  setScheduleAction: (value: string) => void;
  setScheduleTarget: (value: string) => void;
  setScheduleDescription: (value: string) => void;
  setScheduleEnabled: (value: boolean) => void;
  setScheduleSequence: (value: ScheduleActionSequence) => void;
  setScheduleUseTime: (value: boolean) => void;
  setScheduleTime: (value: string) => void;
  setEditingScheduleId: (value: number | null) => void;
  scheduleAction: string;
  scheduleSequence: ScheduleActionSequence;
  scheduleDescription: string;
  scheduleEnabled: boolean;
  scheduleTarget: string;
  scheduleCron: string;
  showMessage: (title: string, message: string) => void;
}

export function useScheduleLogic(options: UseScheduleLogicOptions) {
  const {
    baseUrl,
    selectedDevice,
    selectedDeviceId,
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
    scheduleAction,
    scheduleSequence,
    scheduleDescription,
    scheduleEnabled,
    scheduleTarget,
    scheduleCron,
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
    const supportedAction = available.some((action) => action.value === schedule.action)
      ? schedule.action
      : available[0]?.value || "poweron";

    setEditingScheduleId(schedule.id);
    setScheduleCron(schedule.cron);
    setScheduleAction(supportedAction);
    setScheduleTarget(
      supportedAction === "launchApp"
        ? typeof actionParams.target === "string"
          ? actionParams.target
          : ""
        : supportedAction === "setVolume"
        ? typeof actionParams.volume === "number" || typeof actionParams.volume === "string"
          ? String(actionParams.volume)
          : ""
        : ""
    );
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
        body: JSON.stringify({
          cron: schedule.cron,
          action: schedule.action,
          action_params: schedule.action_params || {},
          description: schedule.description || "",
          enabled: !schedule.enabled,
        }),
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
      const text = data.map((run: { created_at?: string; status?: string; details?: unknown }) => {
        const when = formatScheduleTimestamp(run.created_at || "");
        const status = formatScheduleStatus(run.status || "");
        const details = formatScheduleDetails(run.details);
        return `${when} | ${status}\n${details}`;
      }).join("\n\n");
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

  const handleSaveScheduleBuilder = useCallback(async (data: { hour: number; minute: number; days: number[]; cron: string }) => {
    if (!selectedDeviceId) {
      showMessage("Greška", "Nema odabranog uređaja.");
      return;
    }

    setScheduleCron(data.cron);
    const available = getAvailableActionsForDevice(selectedDevice);
    if (!available.some((action) => action.value === scheduleAction)) {
      showMessage("Greška", "Odabrana akcija nije podržana za ovaj uređaj.");
      return;
    }

    type ScheduleSavePayload =
      | { cron: string; actions: ScheduleActionSequence; description: string; enabled: boolean }
      | { cron: string; action: string; action_params: ScheduleActionParams; description: string; enabled: boolean };

    let payload: ScheduleSavePayload;
    if (scheduleSequence.length > 0) {
      payload = {
        cron: data.cron,
        actions: scheduleSequence.map((s) => ({ action: s.action, params: s.params || {}, delayMs: s.delayMs || undefined, waitForReadyMs: s.waitForReadyMs || undefined, settleMs: s.settleMs || undefined })),
        description: scheduleDescription.trim(),
        enabled: scheduleEnabled,
      };
    } else {
      payload = {
        cron: data.cron,
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

    try {
      const url = selectedDeviceId
        ? `${baseUrl}/devices/${selectedDeviceId}/schedules${scheduleAction ? "" : ""}`
        : `${baseUrl}/devices/${selectedDeviceId}/schedules`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage("Greška", errorData?.error || "Neuspješno spremanje rasporeda.");
        return;
      }
      await loadDeviceSchedules(selectedDeviceId);
      clearScheduleForm();
      showMessage("Info", "Raspored je uspješno spremljen!");
    } catch (error) {
      console.error("Greška pri spremanju rasporeda:", error);
      showMessage("Greška", "Greška pri spremanju rasporeda.");
    }
  }, [baseUrl, clearScheduleForm, loadDeviceSchedules, scheduleAction, scheduleDescription, scheduleEnabled, scheduleSequence, scheduleTarget, selectedDevice, selectedDeviceId, setScheduleCron, showMessage]);

  return {
    loadDeviceSchedules,
    clearScheduleForm,
    handleEditSchedule,
    handleDeleteSchedule,
    handleToggleSchedule,
    fetchScheduleLogs,
    handleTriggerSchedule,
    handleSaveScheduleBuilder,
  };
}
