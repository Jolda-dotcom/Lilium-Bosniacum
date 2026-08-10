import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import type { DiscoveredDevice, Group, ToastMessage } from '../types/app';
import DeviceEditorModal from './DeviceEditorModal';
import DeviceDiscoveryModal from './DeviceDiscoveryModal';
import ScheduleBuilderModal from './ScheduleBuilderModal';
import ToastContainer from './ToastContainer';

interface AppGlobalUIProps {
  loading: boolean;
  statusMessage: string;
  showModal: boolean;
  editingId: number | null;
  deviceName: string;
  deviceIp: string;
  deviceMac: string;
  deviceBrand: string;
  modalGroupId: number | null;
  groups: Group[];
  onDeviceNameChange: (value: string) => void;
  onDeviceIpChange: (value: string) => void;
  onDeviceMacChange: (value: string) => void;
  onDeviceBrandChange: (value: string) => void;
  onModalGroupIdChange: (value: number | null) => void;
  onModalClose: () => void;
  onOpenDiscovery: () => void;
  onSave: () => void;
  showDiscoveryModal: boolean;
  discoveryLoading: boolean;
  discoveredDevices: DiscoveredDevice[];
  selectedDiscoveredDevices: Set<string>;
  onDiscoveryClose: () => void;
  onRetryDiscovery: () => void;
  onAddDiscoveredDevices: () => void;
  onSelectionChange: (nextSelection: Set<string>) => void;
  showScheduleBuilder: boolean;
  onScheduleBuilderClose: () => void;
  onScheduleBuilderSave: (schedule: { hour: number; minute: number; days: number[]; cron: string }) => Promise<void>;
  onScheduleCronChange: (cron: string) => void;
  scheduleCron: string;
  scheduleActionLabel: string;
  selectedDeviceName: string;
  toastMessages: ToastMessage[];
  onRemoveToast: (id: string) => void;
}

export default function AppGlobalUI({
  loading,
  statusMessage,
  showModal,
  editingId,
  deviceName,
  deviceIp,
  deviceMac,
  deviceBrand,
  modalGroupId,
  groups,
  onDeviceNameChange,
  onDeviceIpChange,
  onDeviceMacChange,
  onDeviceBrandChange,
  onModalGroupIdChange,
  onModalClose,
  onOpenDiscovery,
  onSave,
  showDiscoveryModal,
  discoveryLoading,
  discoveredDevices,
  selectedDiscoveredDevices,
  onDiscoveryClose,
  onRetryDiscovery,
  onAddDiscoveredDevices,
  onSelectionChange,
  showScheduleBuilder,
  onScheduleBuilderClose,
  onScheduleBuilderSave,
  onScheduleCronChange,
  scheduleCron,
  scheduleActionLabel,
  selectedDeviceName,
  toastMessages,
  onRemoveToast,
}: AppGlobalUIProps) {
  return (
    <>
      <Snackbar
        open={loading}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 1.5, sm: 2 } }}
      >
        <Alert
          severity="info"
          icon={<CircularProgress size={16} color="inherit" />}
          sx={{ width: '100%' }}
        >
          Osvježavanje...
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(statusMessage)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: loading ? 9 : 1.5, sm: loading ? 10 : 2 } }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          {statusMessage}
        </Alert>
      </Snackbar>

      <DeviceEditorModal
        isOpen={showModal}
        editingId={editingId}
        deviceName={deviceName}
        deviceIp={deviceIp}
        deviceMac={deviceMac}
        deviceBrand={deviceBrand}
        modalGroupId={modalGroupId}
        groups={groups}
        onDeviceNameChange={onDeviceNameChange}
        onDeviceIpChange={onDeviceIpChange}
        onDeviceMacChange={onDeviceMacChange}
        onDeviceBrandChange={onDeviceBrandChange}
        onModalGroupIdChange={onModalGroupIdChange}
        onClose={onModalClose}
        onOpenDiscovery={onOpenDiscovery}
        onSave={onSave}
      />

      <DeviceDiscoveryModal
        isOpen={showDiscoveryModal}
        discoveryLoading={discoveryLoading}
        discoveredDevices={discoveredDevices}
        selectedDiscoveredDevices={selectedDiscoveredDevices}
        onClose={onDiscoveryClose}
        onRetryDiscovery={onRetryDiscovery}
        onAddSelected={onAddDiscoveredDevices}
        onSelectionChange={onSelectionChange}
      />

      <ScheduleBuilderModal
        isOpen={showScheduleBuilder}
        onClose={onScheduleBuilderClose}
        onSave={onScheduleBuilderSave}
        onCronChange={onScheduleCronChange}
        currentCron={scheduleCron}
        action={scheduleActionLabel}
        deviceName={selectedDeviceName}
      />

      <ToastContainer messages={toastMessages} onRemove={onRemoveToast} />
    </>
  );
}
