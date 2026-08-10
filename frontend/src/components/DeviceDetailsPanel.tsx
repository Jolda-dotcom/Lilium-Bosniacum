import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { Device, DeviceHistoryEntry, DeviceSchedule } from '../types/app';

export type DeviceDetailsPanelProps = {
  detailsProps: {
    selectedDevice: Device;
    selectedDeviceHistory: DeviceHistoryEntry[];
    detailTab: 'info' | 'schedule';
    setDetailTab: (value: 'info' | 'schedule') => void;
    handlePowerOnDevice: (id: number) => void;
    handlePowerOffDevice: (id: number) => void;
    handleRestartDevice: (id: number) => void;
    handleSendDeviceAction: (id: number, action: string, params?: Record<string, unknown>) => void;
    volumeValue: string;
    setVolumeValue: (value: string) => void;
    launchTarget: string;
    setLaunchTarget: (value: string) => void;
    getDeviceSchedules: (deviceId: number) => DeviceSchedule[];
    getActionLabel: (action: string) => string;
    handleToggleSchedule: (schedule: DeviceSchedule) => void;
    fetchScheduleLogs: (schedule: DeviceSchedule) => void;
    handleTriggerSchedule: (schedule: DeviceSchedule) => void;
    handleEditSchedule: (schedule: DeviceSchedule) => void;
    handleDeleteSchedule: (scheduleId: number) => void;
    setShowScheduleBuilder: (value: boolean) => void;
  };
};

export const DeviceDetailsPanel: FC<DeviceDetailsPanelProps> = ({
  detailsProps: {
    selectedDevice,
    selectedDeviceHistory,
    detailTab,
    setDetailTab,
    handlePowerOnDevice,
    handlePowerOffDevice,
    handleRestartDevice,
    handleSendDeviceAction,
    volumeValue,
    setVolumeValue,
    launchTarget,
    setLaunchTarget,
    getDeviceSchedules,
    getActionLabel,
    handleToggleSchedule,
    fetchScheduleLogs,
    handleTriggerSchedule,
    handleEditSchedule,
    handleDeleteSchedule,
    setShowScheduleBuilder,
  },
}) => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>Detalji uređaja</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2.5 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">Naziv</Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedDevice.name}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">IP adresa</Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedDevice.ip}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">MAC adresa</Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedDevice.mac}</Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
      <Button variant="contained" color="success" onClick={() => handlePowerOnDevice(selectedDevice.id)}>Uključi uređaj</Button>
      <Button variant="contained" color="error" onClick={() => handlePowerOffDevice(selectedDevice.id)}>Isključi uređaj</Button>
      <Button variant="outlined" color="warning" onClick={() => handleRestartDevice(selectedDevice.id)}>Restart uređaja</Button>
      {(['webos', 'samsung'].includes((selectedDevice.brand || '').toLowerCase())) && (
        <>
          <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'mute')}>Mute</Button>
          <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'unmute')}>Unmute</Button>
          <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'volumeUp')}>Vol+</Button>
          <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'volumeDown')}>Vol-</Button>
          <TextField type="number" size="small" value={volumeValue} onChange={(e) => setVolumeValue(e.target.value)} placeholder="0-100" sx={{ width: 120 }} />
          <Button
            variant="outlined"
            disabled={volumeValue?.trim?.() === '' || Number.isNaN(Number(volumeValue)) || Number(volumeValue) < 0 || Number(volumeValue) > 100}
            onClick={() => handleSendDeviceAction(selectedDevice.id, 'setVolume', { volume: Number(volumeValue) })}
          >
            Postavi volumen
          </Button>
          <TextField size="small" value={launchTarget} onChange={(e) => setLaunchTarget(e.target.value)} placeholder="App ID ili URL" sx={{ minWidth: 220 }} />
          <Button variant="outlined" disabled={!launchTarget?.trim?.()} onClick={() => handleSendDeviceAction(selectedDevice.id, 'launchApp', { target: launchTarget.trim() })}>
            Otvori aplikaciju
          </Button>
        </>
      )}
    </Box>
    <Tabs
      value={detailTab}
      onChange={(_event, value: 'info' | 'schedule') => setDetailTab(value)}
      sx={{ mt: 2.5, mb: 2 }}
    >
      <Tab value="info" label="Informacije" />
      <Tab value="schedule" label="Raspored" />
    </Tabs>
    {detailTab === 'info' ? (
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Posljednji zapisi</Typography>
        {selectedDeviceHistory?.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Nema zapisa za ovaj uređaj.</Typography>
        ) : (
          <List dense>
            {selectedDeviceHistory?.map((entry, index) => (
              <ListItem key={`${selectedDevice.id}-${index}`}>
                <ListItemText primary={`${entry.timestamp} - ${entry.status}`} secondary={entry.note} />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    ) : (
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Raspored za {selectedDevice.name}</Typography>
        {getDeviceSchedules(selectedDevice.id)?.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Nema spremljenih rasporeda.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {getDeviceSchedules(selectedDevice.id).map((schedule) => (
              <Paper key={schedule.id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{schedule.cron}</Typography>
                <Typography variant="caption" color="text.secondary">{getActionLabel(schedule.action)}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Button size="small" variant={schedule.enabled ? 'contained' : 'outlined'} onClick={() => handleToggleSchedule(schedule)}>{schedule.enabled ? 'On' : 'Off'}</Button>
                  <Button size="small" variant="outlined" onClick={() => fetchScheduleLogs(schedule)}>Logovi</Button>
                  <Button size="small" variant="outlined" onClick={() => handleTriggerSchedule(schedule)}>Pokreni</Button>
                  <Button size="small" variant="outlined" onClick={() => handleEditSchedule(schedule)}>Uredi</Button>
                  <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteSchedule(schedule.id)}>Obriši</Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => setShowScheduleBuilder(true)}>Koristi vizualni raspored</Button>
        </Box>
      </Box>
    )}
  </Paper>
);
