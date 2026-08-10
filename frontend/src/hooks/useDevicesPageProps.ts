import type { Device, DeviceHistoryEntry, DeviceSchedule, Group, MessageModalState } from '../types/app';

export type UseDevicesPageBaseState = {
  devices: Device[];
  groups: Group[];
  search: string;
  setSearch: (value: string) => void;
  groupFilter: number | null;
  setGroupFilter: (value: number | null) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  powerFilter: string;
  setPowerFilter: (value: string) => void;
  activityFilter: string;
  setActivityFilter: (value: string) => void;
  registrationFrom: string;
  setRegistrationFrom: (value: string) => void;
  registrationTo: string;
  setRegistrationTo: (value: string) => void;
  loading: boolean;
  setEditingId: (value: number | null) => void;
  setDeviceName: (value: string) => void;
  setDeviceIp: (value: string) => void;
  setDeviceMac: (value: string) => void;
  setModalGroupId: (value: number | null) => void;
  setShowModal: (value: boolean) => void;
  setPendingDelete: (value: number | null) => void;
  setShowDeleteConfirm: (value: boolean) => void;
  showDeleteConfirm: boolean;
  showAssignGroupModal: boolean;
  setShowAssignGroupModal: (value: boolean) => void;
  selectedAssignGroupId: number | null;
  setSelectedAssignGroupId: (value: number | null) => void;
  messageModal: MessageModalState | null;
  setMessageModal: (value: MessageModalState | null) => void;
  closeMessageModal: () => void;
  volumeValue: string;
  setVolumeValue: (value: string) => void;
  launchTarget: string;
  setLaunchTarget: (value: string) => void;
  detailTab: 'info' | 'schedule';
  setDetailTab: (value: 'info' | 'schedule') => void;
  deviceSchedules: Record<number, DeviceSchedule[]>;
  setShowScheduleBuilder: (value: boolean) => void;
};

export type UseDevicesPageDeviceHooks = {
  selectedDevice: Device | null;
  handleClearSelection: () => void;
  handleRestartSelected: () => void;
  handleDeleteSelected: () => void;
  openAssignGroupModal: () => void;
  filteredDevices: Device[];
  toggleDevice: (id: number) => void;
  handleViewDevice: (id: number) => void;
  handleOpenAuditForDevice: (id: number) => void;
  handleRestartDevice: (id: number) => void;
  cancelDelete: () => void;
  confirmDelete: () => void;
  assignGroupToSelected: () => void;
  handleMessageConfirm: () => void;
  selectedDeviceHistory: DeviceHistoryEntry[];
  handleToggleSchedule: (schedule: DeviceSchedule) => void;
  fetchScheduleLogs: (schedule: DeviceSchedule) => void;
  handleTriggerSchedule: (schedule: DeviceSchedule) => void;
  handleSaveScheduleBuilder: () => void;
  handleEditSchedule: (schedule: DeviceSchedule) => void;
  handleDeleteSchedule: (scheduleId: number) => void;
  handlePowerOnDevice: (id: number) => void;
  handlePowerOffDevice: (id: number) => void;
  handleSendDeviceAction: (id: number, action: string, params?: Record<string, unknown>) => void;
};

export type UseDevicesPagePropsOptions = {
  baseState: UseDevicesPageBaseState;
  deviceHooks: UseDevicesPageDeviceHooks;
  formatPowerText: (value: string) => string;
  formatStatusText: (value: string) => string;
  getAvailableActionsForDevice: (device: Device | null) => Array<{ value: string; label: string }>;
  getActionLabel: (action: string) => string;
};

export function buildDevicesProps(options: UseDevicesPagePropsOptions) {
  const {
    baseState,
    deviceHooks,
    formatPowerText,
    formatStatusText,
    getAvailableActionsForDevice,
    getActionLabel,
  } = options;

  return {
    devices: baseState.devices,
    groups: baseState.groups,
    search: baseState.search,
    setSearch: baseState.setSearch,
    groupFilter: baseState.groupFilter,
    setGroupFilter: baseState.setGroupFilter,
    statusFilter: baseState.statusFilter,
    setStatusFilter: baseState.setStatusFilter,
    powerFilter: baseState.powerFilter,
    setPowerFilter: baseState.setPowerFilter,
    activityFilter: baseState.activityFilter,
    setActivityFilter: baseState.setActivityFilter,
    registrationFrom: baseState.registrationFrom,
    setRegistrationFrom: baseState.setRegistrationFrom,
    registrationTo: baseState.registrationTo,
    setRegistrationTo: baseState.setRegistrationTo,
    selectedDevice: deviceHooks.selectedDevice,
    handleClearSelection: deviceHooks.handleClearSelection,
    handleRestartSelected: deviceHooks.handleRestartSelected,
    handleDeleteSelected: deviceHooks.handleDeleteSelected,
    openAssignGroupModal: deviceHooks.openAssignGroupModal,
    loading: baseState.loading,
    filteredDevices: deviceHooks.filteredDevices,
    toggleDevice: deviceHooks.toggleDevice,
    formatPowerText,
    formatStatusText,
    handleViewDevice: deviceHooks.handleViewDevice,
    setEditingId: baseState.setEditingId,
    setDeviceName: baseState.setDeviceName,
    setDeviceIp: baseState.setDeviceIp,
    setDeviceMac: baseState.setDeviceMac,
    setModalGroupId: baseState.setModalGroupId,
    setShowModal: baseState.setShowModal,
    handleOpenAuditForDevice: deviceHooks.handleOpenAuditForDevice,
    handleRestartDevice: deviceHooks.handleRestartDevice,
    setPendingDelete: baseState.setPendingDelete,
    setShowDeleteConfirm: baseState.setShowDeleteConfirm,
    showDeleteConfirm: baseState.showDeleteConfirm,
    cancelDelete: deviceHooks.cancelDelete,
    confirmDelete: deviceHooks.confirmDelete,
    showAssignGroupModal: baseState.showAssignGroupModal,
    setShowAssignGroupModal: baseState.setShowAssignGroupModal,
    selectedAssignGroupId: baseState.selectedAssignGroupId,
    setSelectedAssignGroupId: baseState.setSelectedAssignGroupId,
    assignGroupToSelected: deviceHooks.assignGroupToSelected,
    messageModal: baseState.messageModal,
    setMessageModal: baseState.setMessageModal,
    closeMessageModal: baseState.closeMessageModal,
    handleMessageConfirm: deviceHooks.handleMessageConfirm,
    selectedDeviceHistory: deviceHooks.selectedDeviceHistory,
    volumeValue: baseState.volumeValue,
    setVolumeValue: baseState.setVolumeValue,
    launchTarget: baseState.launchTarget,
    setLaunchTarget: baseState.setLaunchTarget,
    detailTab: baseState.detailTab,
    setDetailTab: baseState.setDetailTab,
    getDeviceSchedules: (deviceId: number) => baseState.deviceSchedules[deviceId] || [],
    getAvailableActions: getAvailableActionsForDevice,
    getActionLabel,
    handleToggleSchedule: deviceHooks.handleToggleSchedule,
    fetchScheduleLogs: deviceHooks.fetchScheduleLogs,
    handleTriggerSchedule: deviceHooks.handleTriggerSchedule,
    handleSaveScheduleBuilder: deviceHooks.handleSaveScheduleBuilder,
    handleEditSchedule: deviceHooks.handleEditSchedule,
    handleDeleteSchedule: deviceHooks.handleDeleteSchedule,
    setShowScheduleBuilder: baseState.setShowScheduleBuilder,
    handlePowerOnDevice: deviceHooks.handlePowerOnDevice,
    handlePowerOffDevice: deviceHooks.handlePowerOffDevice,
    handleSendDeviceAction: deviceHooks.handleSendDeviceAction,
  };
}
