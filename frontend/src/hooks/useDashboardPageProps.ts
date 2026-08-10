import type { Device, DeviceHistoryEntry, Group } from '../types/app';

export type UseDashboardPagePropsOptions = {
  baseState: {
    devices: Device[];
  };
  deviceHooks: {
    recentDeviceEvents: DeviceHistoryEntry[];
    groupStatusSummary: Array<Group & { onlineCount: number; offlineCount: number }>;
  };
};

export function buildDashboardProps(options: UseDashboardPagePropsOptions) {
  const { baseState, deviceHooks } = options;

  return {
    devices: baseState.devices,
    groupStatusSummary: deviceHooks.groupStatusSummary,
    recentDeviceEvents: deviceHooks.recentDeviceEvents,
  };
}
