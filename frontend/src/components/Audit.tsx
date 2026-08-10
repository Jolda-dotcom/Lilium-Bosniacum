// React import not required directly in TSX with new JSX runtime
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import type { AuditLogEntry, Device, Group } from '../types/app';

interface Props {
  auditDeviceFilter: string;
  setAuditDeviceFilter: (v: string) => void;
  auditGroupFilter: string;
  setAuditGroupFilter: (v: string) => void;
  loadAuditLogs: (deviceId?: string, groupId?: string, page?: number, pageSize?: number) => Promise<void> | void;
  auditLoading: boolean;
  devices: Device[];
  groups: Group[];
  auditLogs: AuditLogEntry[];
  auditPage: number;
  setAuditPage: (v: number) => void;
  auditPageSize: number;
  auditTotalCount: number;
}

export default function Audit({ auditDeviceFilter, setAuditDeviceFilter, auditGroupFilter, setAuditGroupFilter, loadAuditLogs, auditLoading, devices, groups, auditLogs, auditPage, setAuditPage, auditPageSize, auditTotalCount }: Props) {
  const totalPages = Math.max(1, Math.ceil(auditTotalCount / auditPageSize));

  const handleRefresh = () => {
    void loadAuditLogs(auditDeviceFilter, auditGroupFilter, auditPage, auditPageSize);
  };

  const handlePageChange = (_event: unknown, value: number) => {
    setAuditPage(value);
    void loadAuditLogs(auditDeviceFilter, auditGroupFilter, value, auditPageSize);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Audit log
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Pregled akcija po uređaju i grupi: ko je pokrenuo, kada je pokrenuto i kakav je ishod.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <Select
            value={auditDeviceFilter}
            onChange={(e) => {
              const value = String(e.target.value);
              setAuditDeviceFilter(value);
              setAuditPage(1);
              void loadAuditLogs(value, auditGroupFilter, 1, auditPageSize);
            }}
            displayEmpty
            inputProps={{ name: "auditDeviceFilter", id: "audit-device-filter" }}
          >
            <MenuItem value="all">Svi uređaji</MenuItem>
            {devices.map((device) => (
              <MenuItem key={device.id} value={String(device.id)}>
                {device.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <Select
            value={auditGroupFilter}
            onChange={(e) => {
              const value = String(e.target.value);
              setAuditGroupFilter(value);
              setAuditPage(1);
              void loadAuditLogs(auditDeviceFilter, value, 1, auditPageSize);
            }}
            displayEmpty
            inputProps={{ name: "auditGroupFilter", id: "audit-group-filter" }}
          >
            <MenuItem value="all">Sve grupe</MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={String(group.id)}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button type="button" variant="contained" onClick={handleRefresh} disabled={auditLoading}>
          {auditLoading ? "Učitavam..." : "Osvježi audit"}
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vrijeme</TableCell>
                <TableCell>Ko/Izvor</TableCell>
                <TableCell>Akcija</TableCell>
                <TableCell>Uređaj</TableCell>
                <TableCell>Grupa</TableCell>
                <TableCell>Ishod</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    {auditLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={22} />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nema audit zapisa za odabrani filter.
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((entry) => {
                  const deviceName = entry.device_id
                    ? devices.find((d) => d.id === entry.device_id)?.name || `Uređaj ${entry.device_id}`
                    : "-";
                  const groupName = entry.group_id
                    ? groups.find((g) => g.id === entry.group_id)?.name || `Grupa ${entry.group_id}`
                    : "-";
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                      <TableCell>{entry.source || "system"}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{deviceName}</TableCell>
                      <TableCell>{groupName}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={entry.status}
                          color={String(entry.status || '').includes('success') ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {auditTotalCount > 0 ? `Prikazano ${auditLogs.length} od ${auditTotalCount} zapisa` : 'Nema zapisa'}
        </Typography>
        <Pagination
          count={totalPages}
          page={auditPage}
          onChange={handlePageChange}
          siblingCount={1}
          boundaryCount={1}
          color="primary"
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Box>
    </Container>
  );
}
