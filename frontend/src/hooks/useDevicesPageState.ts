import { useState, type Dispatch, type SetStateAction } from 'react';
import type {
  Device,
  DeviceHistoryEntry,
  DeviceSchedule,
  Group,
  MessageModalState,
} from '../types/app';

export type DevicesPageStateProps = {
  devices: Device[];
  groups: Group[];
  search: string;
  setSearch: (value: string) => void;
  groupFilter: number | null;
  setGroupFilter: (value: number | null) => void;
  registrationFrom: string;
  setRegistrationFrom: (value: string) => void;
  registrationTo: string;
  setRegistrationTo: (value: string) => void;
  selectedDevice: Device | null;
  handleClearSelection: () => void;
  handleRestartSelected: () => void;
  handleDeleteSelected: () => void;
  openAssignGroupModal: () => void;
  loading: boolean;
  filteredDevices: Device[];
  toggleDevice: (id: number) => void;
  formatPowerText: (value: string) => string;
  formatStatusText: (value: string) => string;
  handleViewDevice: (id: number) => void;
  setEditingId: (id: number | null) => void;
  setDeviceName: (value: string) => void;
  setDeviceIp: (value: string) => void;
  setDeviceMac: (value: string) => void;
  setModalGroupId: (value: number | null) => void;
  setShowModal: (value: boolean) => void;
  handleOpenAuditForDevice: (id: number) => void;
  handleRestartDevice: (id: number) => void;
  setPendingDelete: (id: number | null) => void;
  setShowDeleteConfirm: (value: boolean) => void;
  showDeleteConfirm: boolean;
  cancelDelete: () => void;
  confirmDelete: () => void;
  showAssignGroupModal: boolean;
  setShowAssignGroupModal: (value: boolean) => void;
  selectedAssignGroupId: number | null;
  setSelectedAssignGroupId: (value: number | null) => void;
  assignGroupToSelected: () => void;
  messageModal: MessageModalState | null;
  setMessageModal: (value: MessageModalState | null) => void;
  closeMessageModal: () => void;
  handleMessageConfirm: () => void;
  selectedDeviceHistory: DeviceHistoryEntry[];
  volumeValue: string;
  setVolumeValue: (value: string) => void;
  launchTarget: string;
  setLaunchTarget: (value: string) => void;
  detailTab: 'info' | 'schedule';
  setDetailTab: (value: 'info' | 'schedule') => void;
  getDeviceSchedules: (deviceId: number) => DeviceSchedule[];
  getAvailableActionsForDevice: (device: Device | null) => Array<{ value: string; label: string }>;
  getActionLabel: (action: string) => string;
  handleToggleSchedule: (schedule: DeviceSchedule) => void;
  fetchScheduleLogs: (schedule: DeviceSchedule) => void;
  handleTriggerSchedule: (schedule: DeviceSchedule) => void;
  handleEditSchedule: (schedule: DeviceSchedule) => void;
  handleDeleteSchedule: (scheduleId: number) => void;
  setShowScheduleBuilder: (value: boolean) => void;
  handlePowerOnDevice: (id: number) => void;
  handlePowerOffDevice: (id: number) => void;
  handleSendDeviceAction: (id: number, action: string, params?: Record<string, unknown>) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  powerFilter: string;
  setPowerFilter: (value: string) => void;
  activityFilter: string;
  setActivityFilter: (value: string) => void;
};

export function useDevicesPageState(props: DevicesPageStateProps) {
  const [devicePage, setDevicePage] = useState(1);
  const pageSize = 10;

  const totalDevicePages = Math.max(1, Math.ceil(props.filteredDevices.length / pageSize));
  const currentPage = Math.max(1, Math.min(devicePage, totalDevicePages));
  const paginatedDevices = props.filteredDevices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toolbarProps = {
    search: props.search,
    setSearch: props.setSearch,
    groupFilter: props.groupFilter,
    setGroupFilter: props.setGroupFilter,
    registrationFrom: props.registrationFrom,
    setRegistrationFrom: props.setRegistrationFrom,
    registrationTo: props.registrationTo,
    setRegistrationTo: props.setRegistrationTo,
    selectedDevice: props.selectedDevice,
    handleClearSelection: props.handleClearSelection,
    handleRestartSelected: props.handleRestartSelected,
    handleDeleteSelected: props.handleDeleteSelected,
    openAssignGroupModal: props.openAssignGroupModal,
    loading: props.loading,
    filteredDevices: props.filteredDevices,
    groups: props.groups,
    statusFilter: props.statusFilter,
    setStatusFilter: props.setStatusFilter,
    powerFilter: props.powerFilter,
    setPowerFilter: props.setPowerFilter,
    activityFilter: props.activityFilter,
    setActivityFilter: props.setActivityFilter,
  };

  const tableProps = {
    loading: props.loading,
    filteredDevices: props.filteredDevices,
    paginatedDevices,
    toggleDevice: props.toggleDevice,
    formatPowerText: props.formatPowerText,
    formatStatusText: props.formatStatusText,
    handleViewDevice: props.handleViewDevice,
    onEditDevice: (device: Device) => {
      props.setEditingId(device.id);
      props.setDeviceName(device.name);
      props.setDeviceIp(device.ip);
      props.setDeviceMac(device.mac);
      props.setModalGroupId(device.groupId ?? null);
      props.setShowModal(true);
    },
    handleOpenAuditForDevice: props.handleOpenAuditForDevice,
    handleRestartDevice: props.handleRestartDevice,
    onDeleteDevice: (id: number) => {
      props.setPendingDelete(id);
      props.setShowDeleteConfirm(true);
    },
  };

  const detailsProps = props.selectedDevice
    ? {
        selectedDevice: props.selectedDevice,
        selectedDeviceHistory: props.selectedDeviceHistory,
        detailTab: props.detailTab,
        setDetailTab: props.setDetailTab,
        handlePowerOnDevice: props.handlePowerOnDevice,
        handlePowerOffDevice: props.handlePowerOffDevice,
        handleRestartDevice: props.handleRestartDevice,
        handleSendDeviceAction: props.handleSendDeviceAction,
        volumeValue: props.volumeValue,
        setVolumeValue: props.setVolumeValue,
        launchTarget: props.launchTarget,
        setLaunchTarget: props.setLaunchTarget,
        getDeviceSchedules: props.getDeviceSchedules,
        getActionLabel: props.getActionLabel,
        handleToggleSchedule: props.handleToggleSchedule,
        fetchScheduleLogs: props.fetchScheduleLogs,
        handleTriggerSchedule: props.handleTriggerSchedule,
        handleEditSchedule: props.handleEditSchedule,
        handleDeleteSchedule: props.handleDeleteSchedule,
        setShowScheduleBuilder: props.setShowScheduleBuilder,
      }
    : undefined;

  const dialogsProps = {
    showDeleteConfirm: props.showDeleteConfirm,
    setShowDeleteConfirm: props.setShowDeleteConfirm,
    cancelDelete: props.cancelDelete,
    confirmDelete: props.confirmDelete,
    showAssignGroupModal: props.showAssignGroupModal,
    setShowAssignGroupModal: props.setShowAssignGroupModal,
    selectedAssignGroupId: props.selectedAssignGroupId,
    groups: props.groups,
    setSelectedAssignGroupId: props.setSelectedAssignGroupId,
    assignGroupToSelected: props.assignGroupToSelected,
    messageModal: props.messageModal,
    setMessageModal: props.setMessageModal,
    closeMessageModal: props.closeMessageModal,
    handleMessageConfirm: props.handleMessageConfirm,
  };

  return {
    toolbarProps,
    tableProps,
    detailsProps,
    dialogsProps,
    paginatedDevices,
    totalDevicePages,
    currentPage,
    setDevicePage,
  };
}
