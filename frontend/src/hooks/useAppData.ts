import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { showTransientStatusMessage } from "../utils/app";
import type { AuditLogEntry, BackupInfo, Device, DeviceHistoryEntry, DiagnosticsSummary, DiscoveredDevice, Group, HealthSummary, ToastMessage } from "../types/app";

interface UseAppDataOptions {
  baseUrl: string;
  activePage: string;
  auditDeviceFilter: string;
  auditGroupFilter: string;
  auditPage: number;
  auditPageSize: number;
  selectedBackup: string;
  devices: Device[];
  setDevices: Dispatch<SetStateAction<Device[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setDeviceHistory: Dispatch<SetStateAction<Record<number, DeviceHistoryEntry[]>>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setAuditTotalCount: Dispatch<SetStateAction<number>>;
  setAuditLoading: Dispatch<SetStateAction<boolean>>;
  setAuditPage: Dispatch<SetStateAction<number>>;
  setHealthSummary: Dispatch<SetStateAction<HealthSummary | null>>;
  setHealthLoading: Dispatch<SetStateAction<boolean>>;
  setBackupList: Dispatch<SetStateAction<BackupInfo[]>>;
  setBackupLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedBackup: Dispatch<SetStateAction<string>>;
  diagnostics: DiagnosticsSummary | null;
  setDiagnostics: Dispatch<SetStateAction<DiagnosticsSummary | null>>;
  setDiagnosticsLoading: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLastRefresh: Dispatch<SetStateAction<string>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  setDiscoveryLoading: Dispatch<SetStateAction<boolean>>;
  setDiscoveredDevices: Dispatch<SetStateAction<DiscoveredDevice[]>>;
  setSelectedDiscoveredDevices: Dispatch<SetStateAction<Set<string>>>;
  setShowDiscoveryModal: (value: boolean) => void;
  setToastMessages: Dispatch<SetStateAction<ToastMessage[]>>;
  showToast: (type: "info" | "success" | "error", title: string, message: string) => void;
  showMessage: (title: string, message: string) => void;
}

type DeviceApiShape = Device & { power_state?: string };

export function useAppData(options: UseAppDataOptions) {
  const {
    baseUrl,
    activePage,
    auditDeviceFilter,
    auditGroupFilter,
    auditPage,
    auditPageSize,
    selectedBackup,
    devices,
    setDevices,
    setGroups,
    setDeviceHistory,
    setAuditLogs,
    setAuditTotalCount,
    setAuditLoading,
    setAuditPage,
    setHealthSummary,
    setHealthLoading,
    setBackupList,
    setBackupLoading,
    setSelectedBackup,
    diagnostics,
    setDiagnostics,
    setDiagnosticsLoading,
    setLoading,
    setLastRefresh,
    setStatusMessage,
    setDiscoveryLoading,
    setDiscoveredDevices,
    setSelectedDiscoveredDevices,
    setShowDiscoveryModal,
    setToastMessages,
    showToast,
    showMessage,
  } = options;

  const devicesRef = useRef<Device[]>([]);
  const initialLoadRef = useRef(false);
  const forcedOffIdsRef = useRef<Set<number>>(new Set());
  const diagnosticsAlertCountRef = useRef(0);

  const recordDeviceEvent = useCallback((device: Device, note: string) => {
    setDeviceHistory((prevHistory) => {
      const existing = prevHistory[device.id] || [];
      const now = new Date();
      const entry: DeviceHistoryEntry = {
        timestamp: now.toLocaleTimeString(),
        time: now.getTime(),
        status: device.status,
        note,
      };
      return {
        ...prevHistory,
        [device.id]: [entry, ...existing].slice(0, 10),
      };
    });
  }, [setDeviceHistory]);

  const resolvePowerStateWithForcedOff = useCallback((incoming: { id: number; powerState?: string; power_state?: string; status?: string }, fallback?: Device) => {
    const rawPower = incoming.powerState || incoming.power_state || fallback?.powerState || "Off";
    const normalizedPower = String(rawPower).toLowerCase();
    const normalizedStatus = String(incoming.status || fallback?.status || "").toLowerCase();
    const confirmedBackOn = normalizedPower === "on" && normalizedStatus === "online";
    if (forcedOffIdsRef.current.has(incoming.id)) {
      if (confirmedBackOn) {
        forcedOffIdsRef.current.delete(incoming.id);
        return "On";
      }
      return "Off";
    }
    return normalizedPower === "on" ? "On" : "Off";
  }, []);

  const loadAuditLogs = useCallback(async (deviceId?: string, groupId?: string, page = auditPage, pageSize = auditPageSize) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      if (deviceId && deviceId !== "all") params.set("deviceId", deviceId);
      if (groupId && groupId !== "all") params.set("groupId", groupId);
      const response = await fetch(`${baseUrl}/audit-logs?${params.toString()}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const total = typeof data?.total === "number" ? data.total : items.length;
      setAuditLogs(items);
      setAuditTotalCount(total);
      setAuditPage(page);
    } catch (error) {
      console.error("Učitavanje audit loga nije uspjelo:", error);
      setAuditLogs([]);
      setAuditTotalCount(0);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditPageSize, baseUrl, setAuditLoading, setAuditLogs, setAuditPage, setAuditTotalCount]);

  const loadHealthSummary = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await fetch(`${baseUrl}/health/summary`);
      if (!response.ok) throw new Error(`Health HTTP ${response.status}`);
      const data = await response.json();
      setHealthSummary(data);
    } catch (error) {
      console.error("Health summary load failed:", error);
      setHealthSummary(null);
    } finally {
      setHealthLoading(false);
    }
  }, [baseUrl, setHealthLoading, setHealthSummary]);

  const loadBackups = useCallback(async () => {
    setBackupLoading(true);
    try {
      const response = await fetch(`${baseUrl}/system/backups`);
      if (!response.ok) throw new Error(`Backup list HTTP ${response.status}`);
      const data = await response.json();
      const backups = Array.isArray(data?.backups) ? data.backups : [];
      setBackupList(backups);
      if (backups.length > 0 && !selectedBackup) setSelectedBackup(backups[0].name);
    } catch (error) {
      console.error("Backup list load failed:", error);
      setBackupList([]);
    } finally {
      setBackupLoading(false);
    }
  }, [baseUrl, selectedBackup, setBackupList, setBackupLoading, setSelectedBackup]);

  const loadDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/system/diagnostics`);
      if (!response.ok) throw new Error(`Diagnostics HTTP ${response.status}`);
      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      console.error("Diagnostics load failed:", error);
      setDiagnostics(null);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [baseUrl, setDiagnostics, setDiagnosticsLoading]);

  const loadDevices = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/devices`);
      const data = (await response.json()) as DeviceApiShape[];
      const mappedDevices = data.map((device) => {
        const current = devicesRef.current.find((d) => d.id === device.id);
        const resolvedPowerState = resolvePowerStateWithForcedOff(device, current);
        return { ...device, brand: device.brand || "generic", powerState: resolvedPowerState, selected: false };
      });
      setDevices(mappedDevices);
      mappedDevices.forEach((device) => recordDeviceEvent(device, `Automatska provjera statusa: ${device.status}`));
    } catch (error) {
      console.error("Učitavanje uređaja nije uspjelo:", error);
    }
  }, [baseUrl, recordDeviceEvent, resolvePowerStateWithForcedOff, setDevices]);

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/groups`);
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Ucitavanje grupa nije uspjelo:", error);
    }
  }, [baseUrl, setGroups]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadDevices(), loadGroups(), loadAuditLogs(auditDeviceFilter, auditGroupFilter), loadHealthSummary()]);
    setLoading(false);
    setLastRefresh(new Date().toLocaleTimeString());
    showTransientStatusMessage(setStatusMessage, "Status osvježen", 2000);
  }, [auditDeviceFilter, auditGroupFilter, loadAuditLogs, loadDevices, loadGroups, loadHealthSummary, setLastRefresh, setLoading, setStatusMessage]);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      await loadDevices();
      setLastRefresh(new Date().toLocaleTimeString());
      showTransientStatusMessage(setStatusMessage, "Automatsko osvježenje statusa", 2000);
    }, 12000);
    return () => window.clearInterval(interval);
  }, [loadDevices, setLastRefresh, setStatusMessage]);

  useEffect(() => {
    if (activePage === "settings") {
      const timer = window.setTimeout(() => {
        void loadHealthSummary();
        void loadBackups();
        void loadDiagnostics();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [activePage, loadBackups, loadDiagnostics, loadHealthSummary]);

  useEffect(() => {
    if (!diagnostics) return;
    const threshold = diagnostics.config.runtimeIssueAlertThreshold ?? 8;
    const issueCount = Array.isArray(diagnostics.runtimeIssues) ? diagnostics.runtimeIssues.length : 0;
    if (issueCount >= threshold && issueCount !== diagnosticsAlertCountRef.current) {
      diagnosticsAlertCountRef.current = issueCount;
      showToast("error", "Diagnostics upozorenje", `Backend je zabilježio ${issueCount} runtime issue zapisa (prag ${threshold}). Pokreni maintenance i provjeri snapshot.`);
    }
    if (issueCount < threshold) diagnosticsAlertCountRef.current = issueCount;
  }, [diagnostics, showToast]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let keepTrying = true;
    let cleanupRequested = false;
    const wsUrl = baseUrl.replace(/^http/, "ws");
    let didOpen = false;
    const connect = async () => {
      try {
        const healthResponse = await fetch(`${baseUrl}/health/summary`, { cache: "no-store" });
        if (!healthResponse.ok) throw new Error(`Health check failed with status ${healthResponse.status}`);
      } catch (e) {
        if (!keepTrying) return;
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** reconnectAttempts, 30000));
        console.warn("WS backend not ready, retrying...", e);
        return;
      }
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          didOpen = true;
          reconnectAttempts = 0;
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "device:update" && msg.device) {
              const dev = msg.device;
              const current = devicesRef.current.find((x) => x.id === dev.id);
              const resolvedPowerState = resolvePowerStateWithForcedOff(dev, current);
              setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, ...dev, powerState: resolvedPowerState } : d)));
              recordDeviceEvent({ ...(current || dev), powerState: resolvedPowerState }, "State updated from server");
            } else if (msg.type === "devices:init" && Array.isArray(msg.devices)) {
              setDevices(msg.devices.map((raw: unknown) => {
                const d = raw as DeviceApiShape;
                const current = devicesRef.current.find((x) => x.id === d.id);
                const resolvedPowerState = resolvePowerStateWithForcedOff(d, current);
                return { ...d, powerState: resolvedPowerState };
              }));
            }
          } catch (e) {
            console.error("WS message parse error", e);
          }
        };
        ws.onclose = () => {
          if (cleanupRequested) return;
          if (!didOpen) return;
          if (!keepTrying) return;
          reconnectAttempts += 1;
          reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** reconnectAttempts, 30000));
        };
        ws.onerror = (e) => {
          if (cleanupRequested) return;
          if (!didOpen) return;
          console.error("WS error", e);
        };
      } catch (e) {
        console.error("WS init failed", e);
        if (keepTrying) {
          reconnectAttempts += 1;
          reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** reconnectAttempts, 30000));
        }
      }
    };
    connect();
    return () => {
      keepTrying = false;
      cleanupRequested = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        try { ws.close(); } catch (e) { console.warn("WS cleanup failed", e); }
      }
    };
  }, [baseUrl, recordDeviceEvent, resolvePowerStateWithForcedOff, setDevices]);

  const handleRunMaintenanceNow = useCallback(async () => {
    try {
      setDiagnosticsLoading(true);
      const response = await fetch(`${baseUrl}/system/maintenance/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "manual-ui" }) });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || response.statusText);
      }
      showToast("success", "Maintenance", "Sedmično održavanje je pokrenuto ručno i završeno.");
      await Promise.all([loadHealthSummary(), loadBackups(), loadDiagnostics(), refreshAll()]);
    } catch (error) {
      console.error("Manual maintenance run failed:", error);
      showToast("error", "Maintenance", `Pokretanje održavanja nije uspjelo: ${String((error as Error)?.message || error)}`);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [baseUrl, loadBackups, loadDiagnostics, loadHealthSummary, refreshAll, setDiagnosticsLoading, showToast]);

  const handleShowDiagnosticsSnapshot = useCallback(() => {
    if (!diagnostics) {
      showMessage("Diagnostics", "Diagnostics podaci nisu učitani.");
      return;
    }
    const snapshot = JSON.stringify(diagnostics, null, 2);
    showMessage("Diagnostics snapshot", snapshot);
  }, [diagnostics, showMessage]);

  const handleDownloadDiagnosticsSnapshot = useCallback(() => {
    if (!diagnostics) {
      showMessage("Diagnostics", "Diagnostics podaci nisu učitani.");
      return;
    }
    const snapshot = JSON.stringify(diagnostics, null, 2);
    const blob = new Blob([snapshot], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `diagnostics-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", "Diagnostics", "Diagnostics snapshot je preuzet kao JSON fajl.");
  }, [diagnostics, showToast, showMessage]);

  const handleCreateBackup = useCallback(async () => {
    try {
      setBackupLoading(true);
      const response = await fetch(`${baseUrl}/system/backups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "manual-ui" }) });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || response.statusText);
      }
      showToast("success", "Backup", "Backup baze je uspješno kreiran.");
      await loadBackups();
    } catch (error) {
      console.error("Create backup failed:", error);
      showToast("error", "Backup", `Backup nije uspio: ${String((error as Error)?.message || error)}`);
    } finally {
      setBackupLoading(false);
    }
  }, [baseUrl, loadBackups, setBackupLoading, showToast]);

  const handleRestoreBackup = useCallback(async () => {
    if (!selectedBackup) {
      showToast("info", "Restore", "Odaberi backup za restore.");
      return;
    }
    const confirmed = window.confirm(`Restore iz backupa ${selectedBackup} će prepisati trenutno stanje baze. Nastaviti?`);
    if (!confirmed) return;
    try {
      setBackupLoading(true);
      const response = await fetch(`${baseUrl}/system/backups/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: selectedBackup }) });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || response.statusText);
      }
      showToast("success", "Restore", "Restore je završen. Osvježavam stanje...");
      await refreshAll();
      await loadBackups();
    } catch (error) {
      console.error("Restore backup failed:", error);
      showToast("error", "Restore", `Restore nije uspio: ${String((error as Error)?.message || error)}`);
    } finally {
      setBackupLoading(false);
    }
  }, [baseUrl, loadBackups, refreshAll, selectedBackup, setBackupLoading, showToast]);

  return {
    forcedOffIdsRef,
    refreshAll,
    loadDevices,
    loadGroups,
    loadHealthSummary,
    loadBackups,
    loadDiagnostics,
    handleRunMaintenanceNow,
    handleShowDiagnosticsSnapshot,
    handleDownloadDiagnosticsSnapshot,
    handleCreateBackup,
    handleRestoreBackup,
    recordDeviceEvent,
    resolvePowerStateWithForcedOff,
    setToastMessages,
    showToast,
    showMessage,
    setShowDiscoveryModal,
    setDiscoveryLoading,
    setSelectedDiscoveredDevices,
    setDiscoveredDevices,
    setStatusMessage,
  };
}
