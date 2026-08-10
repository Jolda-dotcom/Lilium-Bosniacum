import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type {
  Device,
  DeviceHistoryEntry,
  DeviceSchedule,
  Group,
  MessageModalState,
} from '../types/app';
import { DeviceSummaryCards } from './DevicesSections';
import { DeviceDialogs } from './DeviceDialogs';
import { DeviceDetailsPanel } from './DeviceDetailsPanel';
import { DevicesToolbar } from './DevicesToolbar';
import { DeviceTable } from './DeviceTable';
import { useDevicesPageState } from '../hooks/useDevicesPageState';

interface Props {
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
}

const Devices: FC<Props> = (props) => {
  const { devices, filteredDevices, loading, selectedDevice } = props;

  const {
    toolbarProps,
    tableProps,
    detailsProps,
    dialogsProps,
    paginatedDevices,
    totalDevicePages,
    currentPage,
    setDevicePage,
  } = useDevicesPageState(props);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Uređaji
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pronađi uređaje brzo, upravljaj grupama i primjeni postavke u nekoliko klikova.
        </Typography>
      </Box>

      <DeviceSummaryCards devices={devices} />

      <DevicesToolbar toolbarProps={toolbarProps} />

      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 3 }}>
            <CircularProgress size={22} />
            <Typography variant="body2">Učitavanje...</Typography>
          </Box>
        ) : (
          <DeviceTable tableProps={tableProps} />
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {filteredDevices.length > 0 ? `Prikazano ${paginatedDevices.length} od ${filteredDevices.length} uređaja` : 'Nema uređaja'}
        </Typography>
        <Pagination
          count={totalDevicePages}
          page={currentPage}
          onChange={(_event, value) => setDevicePage(Math.max(1, Math.min(totalDevicePages, value)))}
          siblingCount={1}
          boundaryCount={1}
          color="primary"
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Box>

      {selectedDevice && detailsProps && <DeviceDetailsPanel detailsProps={detailsProps} />}

      <DeviceDialogs dialogsProps={dialogsProps} />
    </Container>
  );
};

export default Devices;
