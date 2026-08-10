import type { BackupInfo, DiagnosticsSummary, HealthSummary } from '../types/app';

export type UseSettingsPagePropsOptions = {
  baseState: {
    backendUrl: string;
    setBackendUrl: (value: string) => void;
    schedulerOn: boolean;
    setSchedulerOn: (value: boolean) => void;
    healthLoading: boolean;
    healthSummary: HealthSummary | null;
    backupLoading: boolean;
    backupList: BackupInfo[];
    selectedBackup: string;
    setSelectedBackup: (value: string) => void;
    diagnosticsLoading: boolean;
    diagnostics: DiagnosticsSummary | null;
  };
  loadHealthSummary: () => Promise<void>;
  loadBackups: () => Promise<void>;
  loadDiagnostics: () => Promise<void>;
  handleCreateBackup: () => Promise<void>;
  handleRestoreBackup: () => Promise<void>;
  handleRunMaintenanceNow: () => Promise<void>;
  handleShowDiagnosticsSnapshot: () => void;
  handleDownloadDiagnosticsSnapshot: () => void;
  showMessage: (title: string, message: string) => void;
};

export function buildSettingsProps(options: UseSettingsPagePropsOptions) {
  const {
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
  } = options;

  return {
    backendUrl: baseState.backendUrl,
    setBackendUrl: baseState.setBackendUrl,
    schedulerOn: baseState.schedulerOn,
    setSchedulerOn: baseState.setSchedulerOn,
    loadHealthSummary,
    healthLoading: baseState.healthLoading,
    healthSummary: baseState.healthSummary,
    handleCreateBackup,
    backupLoading: baseState.backupLoading,
    loadBackups,
    backupList: baseState.backupList,
    selectedBackup: baseState.selectedBackup,
    setSelectedBackup: baseState.setSelectedBackup,
    handleRestoreBackup,
    handleRunMaintenanceNow,
    diagnosticsLoading: baseState.diagnosticsLoading,
    loadDiagnostics,
    handleShowDiagnosticsSnapshot,
    handleDownloadDiagnosticsSnapshot,
    diagnostics: baseState.diagnostics,
    showMessage,
  };
}
