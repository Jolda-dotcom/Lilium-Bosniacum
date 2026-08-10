import type {
  Device,
  DeviceHistoryEntry,
  DeviceSchedule,
  Group,
  MessageModalState,
} from '../types/app';
import { buildSettingsProps } from './useSettingsPageProps';
import { buildAuditProps } from './useAuditPageProps';
import { buildDashboardProps } from './useDashboardPageProps';
import { buildGroupsProps } from './useGroupsPageProps';
import { buildDevicesProps } from './useDevicesPageProps';

export type UseAppPagePropsOptions = {
  baseState: any;
  deviceHooks: any;
  loadAuditLogs: () => Promise<void>;
  loadHealthSummary: () => Promise<void>;
  loadBackups: () => Promise<void>;
  loadDiagnostics: () => Promise<void>;
  handleCreateBackup: () => Promise<void>;
  handleRestoreBackup: () => Promise<void>;
  handleRunMaintenanceNow: () => Promise<void>;
  handleShowDiagnosticsSnapshot: () => void;
  handleDownloadDiagnosticsSnapshot: () => void;
  showMessage: (title: string, message: string) => void;
  formatPowerText: (value: string) => string;
  formatStatusText: (value: string) => string;
  getAvailableActionsForDevice: (device: Device | null) => Array<{ value: string; label: string }>;
  getActionLabel: (action: string) => string;
};

export function buildPageProps(options: UseAppPagePropsOptions) {
  const {
    baseState,
    deviceHooks,
    loadAuditLogs,
    loadHealthSummary,
    loadBackups,
    loadDiagnostics,
    handleCreateBackup,
    handleRestoreBackup,
    handleRunMaintenanceNow,
    handleShowDiagnosticsSnapshot,
    handleDownloadDiagnosticsSnapshot,
    showMessage,
    formatPowerText,
    formatStatusText,
    getAvailableActionsForDevice,
    getActionLabel,
  } = options;

  return {
    dashboardProps: buildDashboardProps({
      baseState,
      deviceHooks,
    }),
    groupsProps: buildGroupsProps({
      baseState,
      deviceHooks,
    }),
    auditProps: buildAuditProps({
      baseState,
      loadAuditLogs,
    }),
    settingsProps: buildSettingsProps({
      baseState,
      loadHealthSummary,
      loadBackups,
      loadDiagnostics,
      handleCreateBackup,
      handleRestoreBackup,
      handleRunMaintenanceNow,
      handleShowDiagnosticsSnapshot,
      handleDownloadDiagnosticsSnapshot,
      showMessage,
    }),
    devicesProps: buildDevicesProps({
      baseState,
      deviceHooks,
      formatPowerText,
      formatStatusText,
      getAvailableActionsForDevice,
      getActionLabel,
    }),
  };
}
