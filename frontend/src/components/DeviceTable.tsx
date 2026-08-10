import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import type { FC } from 'react';
import type { Device } from '../types/app';

interface DeviceTableProps {
  tableProps: {
    loading: boolean;
    filteredDevices: Device[];
    paginatedDevices: Device[];
    toggleDevice: (id: number) => void;
    formatPowerText: (value: string) => string;
    formatStatusText: (value: string) => string;
    handleViewDevice: (id: number) => void;
    onEditDevice: (device: Device) => void;
    handleOpenAuditForDevice: (id: number) => void;
    handleRestartDevice: (id: number) => void;
    onDeleteDevice: (id: number) => void;
  };
}

export const DeviceTable: FC<DeviceTableProps> = ({
  tableProps: {
    loading,
    filteredDevices,
    paginatedDevices,
    toggleDevice,
    formatPowerText,
    formatStatusText,
    handleViewDevice,
    onEditDevice,
    handleOpenAuditForDevice,
    handleRestartDevice,
    onDeleteDevice,
  },
}) => (
  <TableContainer>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox" />
          <TableCell>Naziv</TableCell>
          <TableCell>Marka</TableCell>
          <TableCell>IP Adresa</TableCell>
          <TableCell>MAC Adresa</TableCell>
          <TableCell>Grupa</TableCell>
          <TableCell>Registracija</TableCell>
          <TableCell>Aktivnost</TableCell>
          <TableCell>Napajanje</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Akcije</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredDevices.length === 0 ? (
          <TableRow>
            <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Nema uređaja za prikaz.
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          paginatedDevices.map((device) => (
            <TableRow key={device.id} hover>
              <TableCell padding="checkbox">
                <Checkbox size="small" checked={device.selected} onChange={() => toggleDevice(device.id)} sx={{ padding: '6px' }} />
              </TableCell>
              <TableCell>{device.name}</TableCell>
              <TableCell>{device.brand || 'generic'}</TableCell>
              <TableCell>{device.ip}</TableCell>
              <TableCell>{device.mac}</TableCell>
              <TableCell>{device.groupName || '-'}</TableCell>
              <TableCell>{device.created_at ? new Date(device.created_at).toLocaleDateString() : '-'}</TableCell>
              <TableCell>{device.last_active_at ? new Date(device.last_active_at).toLocaleDateString() : '-'}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={formatPowerText(device.powerState)}
                  color={device.powerState === 'On' ? 'success' : 'default'}
                  variant={device.powerState === 'On' ? 'filled' : 'outlined'}
                />
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={formatStatusText(device.status)}
                  color={device.status === 'Online' ? 'success' : 'error'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Tooltip title="Pogledaj">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDevice(device.id)}
                      sx={(theme) =>
                        theme.palette.mode === 'light'
                          ? {
                              color: 'text.primary',
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                              '&:hover': { bgcolor: 'action.hover' },
                            }
                          : {}
                      }
                    >
                      <VisibilityOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Uredi">
                    <IconButton
                      size="small"
                      onClick={() => onEditDevice(device)}
                      sx={(theme) =>
                        theme.palette.mode === 'light'
                          ? {
                              color: 'text.primary',
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                              '&:hover': { bgcolor: 'action.hover' },
                            }
                          : {}
                      }
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Audit log">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenAuditForDevice(device.id)}
                      sx={(theme) =>
                        theme.palette.mode === 'light'
                          ? {
                              color: 'text.primary',
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                              '&:hover': { bgcolor: 'action.hover' },
                            }
                          : {}
                      }
                    >
                      <DescriptionOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Restart">
                    <IconButton
                      size="small"
                      onClick={() => handleRestartDevice(device.id)}
                      sx={(theme) =>
                        theme.palette.mode === 'light'
                          ? {
                              color: 'text.primary',
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                              '&:hover': { bgcolor: 'action.hover' },
                            }
                          : {}
                      }
                    >
                      <RestartAltOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Obriši">
                    <IconButton
                      size="small"
                      onClick={() => onDeleteDevice(device.id)}
                      sx={(theme) =>
                        theme.palette.mode === 'light'
                          ? {
                              color: theme.palette.error.main,
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' },
                            }
                          : {}
                      }
                    >
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </TableContainer>
);
