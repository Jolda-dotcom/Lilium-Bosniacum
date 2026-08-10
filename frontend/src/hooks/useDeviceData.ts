import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { showTransientStatusMessage } from "../utils/app";
import type {
  Device,
  DeviceHistoryEntry,
  DiscoveredDevice,
  Group,
  ToastMessage,
} from "../types/app";

interface UseDeviceDataOptions {
  baseUrl: string;
  auditDeviceFilter: string;
  auditGroupFilter: string;
  auditPage: number;
  auditPageSize: number;
  devices: Device[];
  setDevices: Dispatch<SetStateAction<Device[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setDeviceHistory: Dispatch<SetStateAction<Record<number, DeviceHistoryEntry[]>>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLastRefresh: Dispatch<SetStateAction<string>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  setDiscoveryLoading: Dispatch<SetStateAction<boolean>>;
  setDiscoveredDevices: Dispatch<SetStateAction<DiscoveredDevice[]>>;
  setSelectedDiscoveredDevices: Dispatch<SetStateAction<Set<string>>>;
  setShowDiscoveryModal: (open: boolean) => void;
  showToast: (type: "info" | "success" | "error", title: string, message: string) => void;
  showMessage: (title: string, message: string) => void;
  loadAuditLogs: (deviceId?: string, groupId?: string, page?: number, pageSize?: number) => Promise<void>;
}

type DeviceApiShape = Device & { power_state?: string };

export function useDeviceData({
  baseUrl,
  auditDeviceFilter,
  auditGroupFilter,
  auditPage,
  auditPageSize,
  devices,
  setDevices,
  setGroups,
  setDeviceHistory,
  setLoading,
  setLastRefresh,
  setStatusMessage,
  setDiscoveryLoading,
  setDiscoveredDevices,
  setSelectedDiscoveredDevices,
  setShowDiscoveryModal,
  showToast,
  showMessage,
  loadAuditLogs,
}: UseDeviceDataOptions) {
  const devicesRef = useRef<Device[]>([]);
  const forcedOffIdsRef = useRef<Set<number>>(new Set());
  const initialLoadRef = useRef(false);

  const recordDeviceEvent = useCallback(
    (device: Device, note: string) => {
      setDeviceHistory((prevHistory) => {
        const existing = prevHistory[device.id] || [];
        const now = new Date();
        const entry = {
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
    },
    [setDeviceHistory]
  );

  const resolvePowerStateWithForcedOff = useCallback(
    (
      incoming: {
        id: number;
        powerState?: string;
        power_state?: string;
        status?: string;
      },
      fallback?: Device
    ) => {
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
    },
    []
  );

  const loadDevices = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/devices`, { credentials: 'include' });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || response.statusText || "Failed to load devices.");
      }
      const data = (await response.json()) as DeviceApiShape[];
      const mappedDevices = data.map((device) => {
        const current = devicesRef.current.find((d) => d.id === device.id);
        const resolvedPowerState = resolvePowerStateWithForcedOff(device, current);
        return {
          ...device,
          brand: device.brand || "generic",
          powerState: resolvedPowerState,
          selected: false,
        };
      });
      setDevices(mappedDevices);
      mappedDevices.forEach((device) => {
        recordDeviceEvent(device, `Automatska provjera statusa: ${device.status}`);
      });
    } catch (error) {
      console.error("Učitavanje uređaja nije uspjelo:", error);
      setDevices([]);
      showToast("error", "Greška", "Učitavanje uređaja nije uspjelo.");
    }
  }, [baseUrl, recordDeviceEvent, resolvePowerStateWithForcedOff, setDevices, showToast]);

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/groups`, { credentials: 'include' });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || response.statusText || "Failed to load groups.");
      }
      const data = await response.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ucitavanje grupa nije uspjelo:", error);
      setGroups([]);
      showToast("error", "Greška", "Učitavanje grupa nije uspjelo.");
    }
  }, [baseUrl, setGroups, showToast]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadDevices(),
      loadGroups(),
      loadAuditLogs(auditDeviceFilter, auditGroupFilter, auditPage, auditPageSize),
    ]);
    setLoading(false);
    setLastRefresh(new Date().toLocaleTimeString());
    showTransientStatusMessage(setStatusMessage, "Status osvježen", 2000);
  }, [auditDeviceFilter, auditGroupFilter, auditPage, auditPageSize, loadAuditLogs, loadDevices, loadGroups, setLastRefresh, setLoading, setStatusMessage]);

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

  return {
    forcedOffIdsRef,
    devicesRef,
    refreshAll,
    loadDevices,
    loadGroups,
    recordDeviceEvent,
    resolvePowerStateWithForcedOff,
    setShowDiscoveryModal,
    setDiscoveryLoading,
    setSelectedDiscoveredDevices,
    setDiscoveredDevices,
    setStatusMessage,
  };
}
