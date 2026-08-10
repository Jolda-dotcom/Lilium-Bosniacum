import type { Device, DeviceHistoryEntry, Group } from "../types/app";

type ActivityFilter = "all" | "active24h" | "active7d" | "inactive7d" | "inactive30d";

export function filterDevices(
  device: Device,
  search: string,
  groupFilter: number | null,
  statusFilter: string,
  powerFilter: string,
  activityFilter: ActivityFilter,
  registrationFrom: string,
  registrationTo: string
) {
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
}

export function getSelectedDeviceHistory(
  deviceHistory: Record<number, DeviceHistoryEntry[]>,
  selectedDevice: Device | null
) {
  return selectedDevice ? deviceHistory[selectedDevice.id] || [] : [];
}

export function getRecentDeviceEvents(
  deviceHistory: Record<number, DeviceHistoryEntry[]>,
  devices: Device[]
) {
  return Object.entries(deviceHistory)
    .flatMap(([deviceId, entries]) =>
      entries.map((entry) => ({
        deviceId: Number(deviceId),
        ...entry,
        deviceName: devices.find((device) => device.id === Number(deviceId))?.name || `Uređaj ${deviceId}`,
      }))
    )
    .sort((a, b) => b.time - a.time)
    .slice(0, 4);
}

export function getGroupStatusSummary(groups: Group[], devices: Device[]) {
  return groups.map((group) => {
    const members = devices.filter((device) => device.groupId === group.id);
    const onlineCount = members.filter((device) => device.status === "Online").length;
    return {
      ...group,
      onlineCount,
      offlineCount: members.length - onlineCount,
    };
  });
}
