import { useState } from "react";
import type {
  AuditLogEntry,
  BackupInfo,
  Device,
  DeviceHistoryEntry,
  DeviceSchedule,
  DiagnosticsSummary,
  DiscoveredDevice,
  Group,
  HealthSummary,
  MessageModalState,
  ScheduleActionSequence,
  ToastMessage,
} from "../types/app";

export function useAppShellState() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const [deviceMac, setDeviceMac] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("generic");
  const [modalGroupId, setModalGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [deviceHistory, setDeviceHistory] = useState<Record<number, DeviceHistoryEntry[]>>({});
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [deviceSchedules, setDeviceSchedules] = useState<Record<number, DeviceSchedule[]>>({});
  const [scheduleCron, setScheduleCron] = useState("0 7 * * *");
  const [scheduleAction, setScheduleAction] = useState("poweron");
  const [scheduleUseTime, setScheduleUseTime] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleTarget, setScheduleTarget] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleSequence, setScheduleSequence] = useState<ScheduleActionSequence>([]);
  const [currentStepAction, setCurrentStepAction] = useState("poweron");
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "schedule">("info");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [powerFilter, setPowerFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [registrationFrom, setRegistrationFrom] = useState("");
  const [registrationTo, setRegistrationTo] = useState("");
  const [backendUrl, setBackendUrl] = useState("");
  const [schedulerOn, setSchedulerOn] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditDeviceFilter, setAuditDeviceFilter] = useState<string>("all");
  const [auditGroupFilter, setAuditGroupFilter] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(10);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [selectedAssignGroupId, setSelectedAssignGroupId] = useState<number | null>(null);
  const [volumeValue, setVolumeValue] = useState("100");
  const [launchTarget, setLaunchTarget] = useState("");
  const [messageModal, setMessageModal] = useState<MessageModalState | null>(null);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [selectedDiscoveredDevices, setSelectedDiscoveredDevices] = useState<Set<string>>(new Set());
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSummary | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  return {
    showModal, setShowModal,
    editingId, setEditingId,
    deviceName, setDeviceName,
    deviceIp, setDeviceIp,
    deviceMac, setDeviceMac,
    deviceBrand, setDeviceBrand,
    modalGroupId, setModalGroupId,
    search, setSearch,
    devices, setDevices,
    groups, setGroups,
    groupName, setGroupName,
    deviceHistory, setDeviceHistory,
    selectedDeviceId, setSelectedDeviceId,
    deviceSchedules, setDeviceSchedules,
    scheduleCron, setScheduleCron,
    scheduleAction, setScheduleAction,
    scheduleUseTime, setScheduleUseTime,
    scheduleTime, setScheduleTime,
    scheduleTarget, setScheduleTarget,
    scheduleDescription, setScheduleDescription,
    scheduleEnabled, setScheduleEnabled,
    scheduleSequence, setScheduleSequence,
    currentStepAction, setCurrentStepAction,
    editingScheduleId, setEditingScheduleId,
    detailTab, setDetailTab,
    groupFilter, setGroupFilter,
    statusFilter, setStatusFilter,
    powerFilter, setPowerFilter,
    activityFilter, setActivityFilter,
    registrationFrom, setRegistrationFrom,
    registrationTo, setRegistrationTo,
    backendUrl, setBackendUrl,
    schedulerOn, setSchedulerOn,
    statusMessage, setStatusMessage,
    toastMessages, setToastMessages,
    auditLogs, setAuditLogs,
    auditLoading, setAuditLoading,
    auditDeviceFilter, setAuditDeviceFilter,
    auditGroupFilter, setAuditGroupFilter,
    auditPage, setAuditPage,
    auditPageSize,
    auditTotalCount, setAuditTotalCount,
    loading, setLoading,
    lastRefresh, setLastRefresh,
    pendingDelete, setPendingDelete,
    showDeleteConfirm, setShowDeleteConfirm,
    showAssignGroupModal, setShowAssignGroupModal,
    selectedAssignGroupId, setSelectedAssignGroupId,
    volumeValue, setVolumeValue,
    launchTarget, setLaunchTarget,
    messageModal, setMessageModal,
    showScheduleBuilder, setShowScheduleBuilder,
    showDiscoveryModal, setShowDiscoveryModal,
    discoveredDevices, setDiscoveredDevices,
    discoveryLoading, setDiscoveryLoading,
    selectedDiscoveredDevices, setSelectedDiscoveredDevices,
    healthSummary, setHealthSummary,
    healthLoading, setHealthLoading,
    backupList, setBackupList,
    backupLoading, setBackupLoading,
    selectedBackup, setSelectedBackup,
    diagnostics, setDiagnostics,
    diagnosticsLoading, setDiagnosticsLoading,
  };
}
