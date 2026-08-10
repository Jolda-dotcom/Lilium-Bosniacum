import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Device, DeviceHistoryEntry, DiscoveredDevice, Group, MessageModalState } from "../types/app";
import type { NavigateFunction } from "react-router-dom";

type RecentDeviceEvent = DeviceHistoryEntry & {
  deviceId: number;
  deviceName: string;
};

interface UseDevicesPageOptions {
  devices: Device[];
  deviceHistory: Record<number, DeviceHistoryEntry[]>;
  groups: Group[];
  selectedDeviceId: number | null;
  search: string;
  groupFilter: number | null;
  statusFilter: string;
  powerFilter: string;
  activityFilter: string;
  registrationFrom: string;
  registrationTo: string;
  showDiscoveryModal: boolean;
  discoveryLoading: boolean;
  discoveredDevices: DiscoveredDevice[];
  messageModal: MessageModalState | null;
  auditPageSize: number;
  navigate: NavigateFunction;
  loadAuditLogs: (deviceId?: string, groupId?: string, page?: number, pageSize?: number) => Promise<void>;
  setAuditDeviceFilter: React.Dispatch<React.SetStateAction<string>>;
  setAuditGroupFilter: React.Dispatch<React.SetStateAction<string>>;
  setAuditPage: React.Dispatch<React.SetStateAction<number>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDiscoveryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedDeviceId: React.Dispatch<React.SetStateAction<number | null>>;
  closeMessageModal: () => void;
  handleStartDiscovery: () => Promise<void>;
  showMessage: (title: string, message: string) => void;
}

interface UseDevicesPageResult {
  selectedDevice: Device | null;
  filteredDevices: Device[];
  selectedDeviceHistory: DeviceHistoryEntry[];
  recentDeviceEvents: RecentDeviceEvent[];
  groupStatusSummary: Array<Group & { onlineCount: number; offlineCount: number }>;
  handleOpenDiscovery: () => void;
  handleOpenAuditForDevice: (deviceId: number) => Promise<void>;
  handleOpenAuditForGroup: (groupId: number) => Promise<void>;
  handleClearSelection: () => void;
  handleMessageConfirm: () => Promise<void>;
}

export function useDevicesPage(options: UseDevicesPageOptions): UseDevicesPageResult {
  const {
    devices,
    deviceHistory,
    groups,
    selectedDeviceId,
    search,
    groupFilter,
    statusFilter,
    powerFilter,
    activityFilter,
    registrationFrom,
    registrationTo,
    showDiscoveryModal,
    discoveryLoading,
    discoveredDevices,
    messageModal,
    auditPageSize,
    navigate,
    loadAuditLogs,
    setAuditDeviceFilter,
    setAuditGroupFilter,
    setAuditPage,
    setShowModal,
    setShowDiscoveryModal,
    setSelectedDeviceId,
    closeMessageModal,
    handleStartDiscovery,
    showMessage,
  } = options;

  const discoveryInitiatedRef = useRef(false);

  useEffect(() => {
    if (
      showDiscoveryModal &&
      !discoveryLoading &&
      discoveredDevices.length === 0 &&
      !discoveryInitiatedRef.current
    ) {
      discoveryInitiatedRef.current = true;
      void handleStartDiscovery();
    }

    if (!showDiscoveryModal) {
      discoveryInitiatedRef.current = false;
    }
  }, [showDiscoveryModal, discoveryLoading, discoveredDevices.length, handleStartDiscovery]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) || null,
    [devices, selectedDeviceId]
  );

  const filteredDevices = useMemo(
    () =>
      devices.filter((device) => {
        const matchesSearch =
          device.name.toLowerCase().includes(search.toLowerCase()) ||
          device.ip.includes(search) ||
          device.mac.toLowerCase().includes(search.toLowerCase());

        const matchesGroup =
          groupFilter === null ||
          (groupFilter === -1 ? device.groupId === null : device.groupId === groupFilter);

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "online" && device.status === "Online") ||
          (statusFilter === "offline" && device.status === "Offline");

        const matchesPower =
          powerFilter === "all" ||
          (powerFilter === "on" && device.powerState === "On") ||
          (powerFilter === "off" && device.powerState === "Off");

        const lastActive = device.last_active_at ? new Date(device.last_active_at) : null;
        const now = new Date();
        const matchesActivity = (() => {
          switch (activityFilter) {
            case "active24h":
              return lastActive ? now.getTime() - lastActive.getTime() <= 1000 * 60 * 60 * 24 : false;
            case "active7d":
              return lastActive ? now.getTime() - lastActive.getTime() <= 1000 * 60 * 60 * 24 * 7 : false;
            case "inactive7d":
              return lastActive ? now.getTime() - lastActive.getTime() > 1000 * 60 * 60 * 24 * 7 : true;
            case "inactive30d":
              return lastActive ? now.getTime() - lastActive.getTime() > 1000 * 60 * 60 * 24 * 30 : true;
            default:
              return true;
          }
        })();

        const createdAt = device.created_at ? new Date(device.created_at) : null;
        const fromDate = registrationFrom ? new Date(registrationFrom) : null;
        const toDate = registrationTo ? new Date(registrationTo) : null;
        const matchesRegistrationFrom = !fromDate || (createdAt ? createdAt >= fromDate : false);
        const matchesRegistrationTo = !toDate || (createdAt ? createdAt <= toDate : false);

        return (
          matchesSearch &&
          matchesGroup &&
          matchesStatus &&
          matchesPower &&
          matchesActivity &&
          matchesRegistrationFrom &&
          matchesRegistrationTo
        );
      }),
    [
      devices,
      search,
      groupFilter,
      statusFilter,
      powerFilter,
      activityFilter,
      registrationFrom,
      registrationTo,
    ]
  );

  const selectedDeviceHistory = useMemo(
    () => (selectedDevice ? deviceHistory[selectedDevice.id] || [] : []),
    [deviceHistory, selectedDevice]
  );

  const recentDeviceEvents = useMemo(
    () =>
      Object.entries(deviceHistory)
        .flatMap(([deviceId, entries]) =>
          entries.map((entry) => ({
            deviceId: Number(deviceId),
            ...entry,
            deviceName:
              devices.find((device) => device.id === Number(deviceId))?.name || `Uređaj ${deviceId}`,
          }))
        )
        .sort((a, b) => b.time - a.time)
        .slice(0, 4),
    [deviceHistory, devices]
  );

  const groupStatusSummary = useMemo(
    () =>
      groups.map((group) => {
        const members = devices.filter((device) => device.groupId === group.id);
        const onlineCount = members.filter((device) => device.status === "Online").length;
        return {
          ...group,
          onlineCount,
          offlineCount: members.length - onlineCount,
        };
      }),
    [groups, devices]
  );

  const handleOpenDiscovery = useCallback(() => {
    setShowModal(false);
    setShowDiscoveryModal(true);
  }, [setShowModal, setShowDiscoveryModal]);

  const handleOpenAuditForDevice = useCallback(
    async (deviceId: number) => {
      setAuditDeviceFilter(String(deviceId));
      setAuditGroupFilter("all");
      setAuditPage(1);
      navigate("/audit");
      await loadAuditLogs(String(deviceId), "all", 1, auditPageSize);
    },
    [auditPageSize, loadAuditLogs, navigate, setAuditDeviceFilter, setAuditGroupFilter, setAuditPage]
  );

  const handleOpenAuditForGroup = useCallback(
    async (groupId: number) => {
      setAuditGroupFilter(String(groupId));
      setAuditDeviceFilter("all");
      setAuditPage(1);
      navigate("/audit");
      await loadAuditLogs("all", String(groupId), 1, auditPageSize);
    },
    [auditPageSize, loadAuditLogs, navigate, setAuditDeviceFilter, setAuditGroupFilter, setAuditPage]
  );

  const handleClearSelection = useCallback(() => {
    setAuditDeviceFilter("all");
    if (selectedDeviceId !== null) {
      setSelectedDeviceId(null);
    }
  }, [selectedDeviceId, setAuditDeviceFilter, setSelectedDeviceId]);

  const handleMessageConfirm = useCallback(async () => {
    if (!messageModal?.onConfirm) {
      closeMessageModal();
      return;
    }

    await messageModal.onConfirm();
    closeMessageModal();
  }, [closeMessageModal, messageModal]);

  return {
    selectedDevice,
    filteredDevices,
    selectedDeviceHistory,
    recentDeviceEvents,
    groupStatusSummary,
    handleOpenDiscovery,
    handleOpenAuditForDevice,
    handleOpenAuditForGroup,
    handleClearSelection,
    handleMessageConfirm,
  };
}
