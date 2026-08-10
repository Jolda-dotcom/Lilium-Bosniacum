import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import type { FC } from 'react';
import type { Device, Group } from '../types/app';

type DevicesToolbarProps = {
  toolbarProps: {
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
    groups: Group[];
    statusFilter: string;
    setStatusFilter: (value: string) => void;
    powerFilter: string;
    setPowerFilter: (value: string) => void;
    activityFilter: string;
    setActivityFilter: (value: string) => void;
  };
};

export const DevicesToolbar: FC<DevicesToolbarProps> = ({
  toolbarProps: {
    search,
    setSearch,
    groupFilter,
    setGroupFilter,
    registrationFrom,
    setRegistrationFrom,
    registrationTo,
    setRegistrationTo,
    selectedDevice,
    handleClearSelection,
    handleRestartSelected,
    handleDeleteSelected,
    openAssignGroupModal,
    loading,
    filteredDevices,
    groups,
    statusFilter,
    setStatusFilter,
    powerFilter,
    setPowerFilter,
    activityFilter,
    setActivityFilter,
  },
}) => (
  <>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
      <TextField
        id="device-search"
        name="deviceSearch"
        variant="outlined"
        size="small"
        placeholder="Pretraži uređaj..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ minWidth: 260, '& .MuiInputBase-root': { height: 42 } }}
      />
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <Select
          value={groupFilter ?? ''}
          onChange={(e) => setGroupFilter(e.target.value ? Number(e.target.value) : null)}
        >
          <MenuItem value="">Sve grupe</MenuItem>
          <MenuItem value="-1">Bez grupe</MenuItem>
          {groups?.map((group) => (
            <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select value={statusFilter ?? 'all'} onChange={(e) => setStatusFilter(e.target.value)}>
          <MenuItem value="all">Sve statuse</MenuItem>
          <MenuItem value="online">Samo online</MenuItem>
          <MenuItem value="offline">Samo offline</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select value={powerFilter ?? 'all'} onChange={(e) => setPowerFilter(e.target.value)}>
          <MenuItem value="all">Sve napajanja</MenuItem>
          <MenuItem value="on">Samo upaljeni</MenuItem>
          <MenuItem value="off">Samo ugašeni</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <Select value={activityFilter ?? 'all'} onChange={(e) => setActivityFilter(e.target.value)}>
          <MenuItem value="all">Sve aktivnosti</MenuItem>
          <MenuItem value="active24h">Aktivni 24h</MenuItem>
          <MenuItem value="active7d">Aktivni 7d</MenuItem>
          <MenuItem value="inactive7d">Neaktivni {'>'} 7d</MenuItem>
          <MenuItem value="inactive30d">Neaktivni {'>'} 30d</MenuItem>
        </Select>
      </FormControl>
      <TextField type="date" size="small" value={registrationFrom ?? ''} onChange={(e) => setRegistrationFrom(e.target.value)} sx={{ width: 180 }} />
      <TextField type="date" size="small" value={registrationTo ?? ''} onChange={(e) => setRegistrationTo(e.target.value)} sx={{ width: 180 }} />
      {selectedDevice && <Button variant="outlined" onClick={handleClearSelection}>Zatvori detalje</Button>}
    </Box>

    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
      <Button variant="outlined" color="warning" onClick={handleRestartSelected}>
        Restart označenih
      </Button>
      <Button variant="outlined" color="error" onClick={handleDeleteSelected}>
        Obriši odabrane
      </Button>
      <Button variant="contained" onClick={openAssignGroupModal}>
        Dodaj u grupu
      </Button>
    </Box>
  </>
);
