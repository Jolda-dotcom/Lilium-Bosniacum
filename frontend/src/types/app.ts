export interface Device {
  id: number;
  name: string;
  ip: string;
  mac: string;
  brand: string;
  status: string;
  powerState: string;
  selected: boolean;
  groupId: number | null;
  groupName?: string | null;
  created_at?: string;
  last_active_at?: string;
}

export interface Group {
  id: number;
  name: string;
  deviceCount: number;
}

export interface DeviceHistoryEntry {
  timestamp: string;
  time: number;
  status: string;
  note: string;
}

export type ScheduleActionParams = Record<string, unknown>;

export interface ScheduleActionSequenceItem {
  action: string;
  params?: ScheduleActionParams;
  delayMs?: number;
  waitForReadyMs?: number;
  settleMs?: number;
}

export type ScheduleActionSequence = ScheduleActionSequenceItem[];

export interface DeviceSchedule {
  id: number;
  device_id: number;
  cron: string;
  action: string;
  action_params: ScheduleActionParams;
  description: string | null;
  enabled: boolean;
}

export interface MessageModalState {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<void> | void;
}

export interface DiscoveredDevice {
  ip: string;
  name?: string;
  mac?: string;
  brand?: string;
  already_added?: boolean;
}

export type ToastType = "info" | "success" | "error";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

export interface AuditLogEntry {
  id: number;
  entity_type: string | null;
  entity_id: number | null;
  device_id: number | null;
  group_id: number | null;
  schedule_id: number | null;
  action: string;
  status: string;
  source: string | null;
  details: unknown;
  created_at: string;
}

export interface HealthSummary {
  timestamp: string;
  devices: {
    total: number;
    online: number;
    offline: number;
    powerOn: number;
    powerOff: number;
  };
  schedules24h: {
    total: number;
    success: number;
    failed: number;
    successRate: number | null;
  };
  recentFailures: AuditLogEntry[];
}

export interface BackupInfo {
  name: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticsSummary {
  timestamp: string;
  config: {
    weeklyMaintenanceCron: string;
    autoBackupIntervalMs: number;
    macSelfHealIntervalMs: number;
    maxBackups: number;
    runtimeIssueAlertThreshold: number;
  };
  lastMaintenance: {
    timestamp: string;
    trigger: string;
    backupFile: string | null;
    repairedMacs: number;
    unresolvedMacs: number;
    dbOptimizeOk: boolean;
    status: string;
    error?: string;
  } | null;
  maintenanceHistory: Array<Record<string, unknown>>;
  runtimeIssues: Array<Record<string, unknown>>;
  recentFailedAudit: Array<Record<string, unknown>>;
}
