import type { Dispatch, RefObject, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import type {
  AuditLogEntry,
  Device,
  DeviceHistoryEntry,
  DeviceSchedule,
  DiscoveredDevice,
  Group,
  MessageModalState,
  ScheduleActionSequence,
} from "../../types/app";

export type ToastType = "info" | "success" | "error";

export type ShowToastFn = (type: ToastType, title: string, message: string) => void;
export type ShowMessageFn = (title: string, message: string) => void;
export type ShowConfirmFn = (
  title: string,
  message: string,
  onConfirm: () => Promise<void> | void,
  confirmText?: string,
  cancelText?: string
) => void;

export interface UseDeviceActionsOptions {
  baseUrl: string;
  devices: Device[];
  groups: Group[];
  discoveredDevices: DiscoveredDevice[];
  selectedDiscoveredDevices: Set<string>;
  refreshAll: () => Promise<void>;
  loadGroups: () => Promise<void>;
  recordDeviceEvent: (device: Device, note: string) => void;
  showToast: ShowToastFn;
  showMessage: ShowMessageFn;
  showConfirm: ShowConfirmFn;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  setDevices: Dispatch<SetStateAction<Device[]>>;
  setDiscoveryLoading: Dispatch<SetStateAction<boolean>>;
  setDiscoveredDevices: Dispatch<SetStateAction<DiscoveredDevice[]>>;
  setSelectedDiscoveredDevices: Dispatch<SetStateAction<Set<string>>>;
  setShowDiscoveryModal: Dispatch<SetStateAction<boolean>>;
  groupName: string;
  setGroupName: Dispatch<SetStateAction<string>>;
  selectedAssignGroupId: number | null;
  setSelectedAssignGroupId: Dispatch<SetStateAction<number | null>>;
  setShowAssignGroupModal: Dispatch<SetStateAction<boolean>>;
  forcedOffIdsRef: RefObject<Set<number>>;
  editingId: number | null;
  deviceName: string;
  deviceIp: string;
  deviceMac: string;
  deviceBrand: string;
  modalGroupId: number | null;
  selectedDeviceId: number | null;
  pendingDelete: number | null;
  showModal: boolean;
  showDiscoveryModal: boolean;
  messageModal: MessageModalState | null;
  setEditingId: Dispatch<SetStateAction<number | null>>;
  setDeviceName: Dispatch<SetStateAction<string>>;
  setDeviceIp: Dispatch<SetStateAction<string>>;
  setDeviceMac: Dispatch<SetStateAction<string>>;
  setDeviceBrand: Dispatch<SetStateAction<string>>;
  setModalGroupId: Dispatch<SetStateAction<number | null>>;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setSelectedDeviceId: Dispatch<SetStateAction<number | null>>;
  setPendingDelete: Dispatch<SetStateAction<number | null>>;
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setMessageModal: Dispatch<SetStateAction<MessageModalState | null>>;
  setDetailTab: Dispatch<SetStateAction<"info" | "schedule">>;
  scheduleAction: string;
  scheduleSequence: ScheduleActionSequence;
  scheduleDescription: string;
  scheduleEnabled: boolean;
  scheduleTarget: string;
  setDeviceSchedules: Dispatch<SetStateAction<Record<number, DeviceSchedule[]>>>;
  setScheduleCron: Dispatch<SetStateAction<string>>;
  setScheduleAction: Dispatch<SetStateAction<string>>;
  setScheduleTarget: Dispatch<SetStateAction<string>>;
  setScheduleDescription: Dispatch<SetStateAction<string>>;
  setScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  setScheduleSequence: Dispatch<SetStateAction<ScheduleActionSequence>>;
  setScheduleUseTime: Dispatch<SetStateAction<boolean>>;
  setScheduleTime: Dispatch<SetStateAction<string>>;
  setEditingScheduleId: Dispatch<SetStateAction<number | null>>;
  navigate: (path: string) => void;
  loadAuditLogs: (deviceId?: string, groupId?: string, page?: number, pageSize?: number) => Promise<void>;
  auditPageSize: number;
  deviceHistory: Record<number, DeviceHistoryEntry[]>;
  search: string;
  groupFilter: number | null;
  statusFilter: string;
  powerFilter: string;
  activityFilter: string;
  registrationFrom: string;
  registrationTo: string;
  discoveryLoading: boolean;
  setAuditDeviceFilter: Dispatch<SetStateAction<string>>;
  setAuditGroupFilter: Dispatch<SetStateAction<string>>;
  setAuditPage: Dispatch<SetStateAction<number>>;
  closeMessageModal: () => void;
}
