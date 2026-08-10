import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppTheme } from "./useAppTheme";
import { getActivePage, normalizeBackendUrl } from "../utils/app";
import { useAppShellState } from "./useAppShellState";
import { useAppDialogs } from "./useAppDialogs";
import { useAuditData } from "./useAuditData";
import { useSystemData } from "./useSystemData";
import { useRealtimeDeviceSync } from "./useRealtimeDeviceSync";
import { useDeviceData } from "./useDeviceData";
import { useAppContainerDeviceHooks } from "./useAppContainerDeviceHooks";
import { buildPageProps } from "./useAppPageProps";
import PageFallback from "../components/PageFallback";
import { createAppTheme } from "../theme";
import { formatPowerText, formatStatusText } from "../utils/device";
import { getActionLabel, getAvailableActionsForDevice, isCronValid } from "../utils/schedule";

export function useAppContainerState() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = getActivePage(location.pathname);
  const { theme, toggleTheme } = useAppTheme("dark");
  const baseState = useAppShellState();

  const { removeToast, showToast, showMessage, showConfirm, closeMessageModal } = useAppDialogs({
    setToastMessages: baseState.setToastMessages,
    setMessageModal: baseState.setMessageModal,
    setStatusMessage: baseState.setStatusMessage,
  });

  const normalizedBaseUrl = normalizeBackendUrl(baseState.backendUrl);

  const { loadAuditLogs } = useAuditData({
    baseUrl: normalizedBaseUrl,
    auditPage: baseState.auditPage,
    auditPageSize: baseState.auditPageSize,
    setAuditLogs: baseState.setAuditLogs,
    setAuditTotalCount: baseState.setAuditTotalCount,
    setAuditLoading: baseState.setAuditLoading,
    setAuditPage: baseState.setAuditPage,
  });

  const {
    forcedOffIdsRef,
    devicesRef,
    refreshAll,
    loadDevices,
    loadGroups,
    recordDeviceEvent,
    resolvePowerStateWithForcedOff,
    setShowDiscoveryModal: setDiscoveryModalOpen,
    setDiscoveryLoading: setDiscoveryLoadingState,
    setSelectedDiscoveredDevices: setDiscoveredSelection,
    setDiscoveredDevices: setDiscoveredDevicesState,
    setStatusMessage: setCurrentStatusMessage,
  } = useDeviceData({
    baseUrl: normalizedBaseUrl,
    auditDeviceFilter: baseState.auditDeviceFilter,
    auditGroupFilter: baseState.auditGroupFilter,
    auditPage: baseState.auditPage,
    auditPageSize: baseState.auditPageSize,
    devices: baseState.devices,
    setDevices: baseState.setDevices,
    setGroups: baseState.setGroups,
    setDeviceHistory: baseState.setDeviceHistory,
    setLoading: baseState.setLoading,
    setLastRefresh: baseState.setLastRefresh,
    setStatusMessage: baseState.setStatusMessage,
    setDiscoveryLoading: baseState.setDiscoveryLoading,
    setDiscoveredDevices: baseState.setDiscoveredDevices,
    setSelectedDiscoveredDevices: baseState.setSelectedDiscoveredDevices,
    setShowDiscoveryModal: baseState.setShowDiscoveryModal,
    showToast,
    showMessage,
    loadAuditLogs,
  });

  const {
    loadHealthSummary,
    loadBackups,
    loadDiagnostics,
    handleRunMaintenanceNow,
    handleShowDiagnosticsSnapshot,
    handleDownloadDiagnosticsSnapshot,
    handleCreateBackup,
    handleRestoreBackup,
  } = useSystemData({
    baseUrl: normalizedBaseUrl,
    activePage,
    diagnostics: baseState.diagnostics,
    selectedBackup: baseState.selectedBackup,
    setHealthSummary: baseState.setHealthSummary,
    setHealthLoading: baseState.setHealthLoading,
    setBackupList: baseState.setBackupList,
    setBackupLoading: baseState.setBackupLoading,
    setSelectedBackup: baseState.setSelectedBackup,
    setDiagnostics: baseState.setDiagnostics,
    setDiagnosticsLoading: baseState.setDiagnosticsLoading,
    refreshAll,
    showToast,
    showMessage,
    showConfirm,
  });

  useRealtimeDeviceSync({
    baseUrl: normalizedBaseUrl,
    setDevices: baseState.setDevices,
    devicesRef,
    setLastRefresh: baseState.setLastRefresh,
    setStatusMessage: setCurrentStatusMessage,
    recordDeviceEvent,
    resolvePowerStateWithForcedOff,
  });

  const deviceHooks = useAppContainerDeviceHooks({
    baseUrl: normalizedBaseUrl,
    ...baseState,
    navigate,
    loadAuditLogs,
    showToast,
    showMessage,
    showConfirm,
    refreshAll,
    loadGroups,
    recordDeviceEvent,
    forcedOffIdsRef,
    setDiscoveryModalOpen,
    closeMessageModal,
  });

  const { dashboardProps, groupsProps, auditProps, settingsProps, devicesProps } = buildPageProps({
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
  });

  useEffect(() => {
    if (activePage !== "settings") return;
    void loadHealthSummary();
    void loadBackups();
    void loadDiagnostics();
  }, [activePage, loadBackups, loadDiagnostics, loadHealthSummary]);

  const muiTheme = createAppTheme(theme);
  const pageFallback = <PageFallback />;

  return {
    activePage,
    theme,
    toggleTheme,
    muiTheme,
    pageFallback,
    appLayoutProps: {
      theme,
      toggleTheme,
      loading: baseState.loading,
      refreshAll,
      handlePowerOnAll: deviceHooks.handlePowerOnAll,
      handlePowerOffAll: deviceHooks.handlePowerOffAll,
      handleOpenModal: deviceHooks.handleOpenModal,
      lastRefresh: baseState.lastRefresh,
    },
    pageContentProps: {
      activePage,
      pageFallback,
      dashboardProps,
      groupsProps,
      auditProps,
      settingsProps,
      devicesProps,
    },
    globalUIProps: {
      loading: baseState.loading,
      statusMessage: baseState.statusMessage,
      showModal: baseState.showModal,
      editingId: baseState.editingId,
      deviceName: baseState.deviceName,
      deviceIp: baseState.deviceIp,
      deviceMac: baseState.deviceMac,
      deviceBrand: baseState.deviceBrand,
      modalGroupId: baseState.modalGroupId,
      groups: baseState.groups,
      onDeviceNameChange: baseState.setDeviceName,
      onDeviceIpChange: baseState.setDeviceIp,
      onDeviceMacChange: baseState.setDeviceMac,
      onDeviceBrandChange: baseState.setDeviceBrand,
      onModalGroupIdChange: baseState.setModalGroupId,
      onModalClose: () => baseState.setShowModal(false),
      onOpenDiscovery: deviceHooks.handleOpenDiscovery,
      onSave: deviceHooks.handleSave,
      showDiscoveryModal: baseState.showDiscoveryModal,
      discoveryLoading: baseState.discoveryLoading,
      discoveredDevices: baseState.discoveredDevices,
      selectedDiscoveredDevices: baseState.selectedDiscoveredDevices,
      onDiscoveryClose: deviceHooks.closeDiscoveryModal,
      onRetryDiscovery: deviceHooks.handleStartDiscovery,
      onAddDiscoveredDevices: deviceHooks.handleAddDiscoveredDevices,
      onSelectionChange: baseState.setSelectedDiscoveredDevices,
      showScheduleBuilder: baseState.showScheduleBuilder,
      onScheduleBuilderClose: () => baseState.setShowScheduleBuilder(false),
      onScheduleBuilderSave: deviceHooks.handleSaveScheduleBuilder,
      onScheduleCronChange: baseState.setScheduleCron,
      scheduleCron: baseState.scheduleCron,
      scheduleActionLabel: getActionLabel(baseState.scheduleAction),
      selectedDeviceName: deviceHooks.selectedDevice?.name || "Uredaj",
      toastMessages: baseState.toastMessages,
      onRemoveToast: removeToast,
    },
  };
}
