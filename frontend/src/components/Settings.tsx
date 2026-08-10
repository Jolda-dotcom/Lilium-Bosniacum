// React import not required directly in TSX with new JSX runtime
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import type { BackupInfo, DiagnosticsSummary, HealthSummary } from '../types/app';

interface Props {
  backendUrl: string;
  setBackendUrl: (v: string) => void;
  schedulerOn: boolean;
  setSchedulerOn: (v: boolean) => void;
  loadHealthSummary: () => Promise<void> | void;
  healthLoading: boolean;
  healthSummary: HealthSummary | null;
  handleCreateBackup: () => Promise<void> | void;
  backupLoading: boolean;
  loadBackups: () => Promise<void> | void;
  backupList: BackupInfo[];
  selectedBackup: string;
  setSelectedBackup: (v: string) => void;
  handleRestoreBackup: () => Promise<void> | void;
  handleRunMaintenanceNow: () => Promise<void> | void;
  diagnosticsLoading: boolean;
  loadDiagnostics: () => Promise<void> | void;
  handleShowDiagnosticsSnapshot: () => void;
  handleDownloadDiagnosticsSnapshot: () => void;
  diagnostics: DiagnosticsSummary | null;
  showMessage: (title: string, message: string) => void;
}

export default function Settings({ backendUrl, setBackendUrl, schedulerOn, setSchedulerOn, loadHealthSummary, healthLoading, healthSummary, handleCreateBackup, backupLoading, loadBackups, backupList, selectedBackup, setSelectedBackup, handleRestoreBackup, handleRunMaintenanceNow, diagnosticsLoading, loadDiagnostics, handleShowDiagnosticsSnapshot, handleDownloadDiagnosticsSnapshot, diagnostics, showMessage }: Props) {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Postavke
      </Typography>

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Osnovno</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr auto' }, gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Backend URL"
              variant="outlined"
              value={backendUrl}
              onChange={(e) => setBackendUrl((e.target as HTMLInputElement).value)}
            />
            <FormControl size="small">
              <Select
                value={schedulerOn ? "on" : "off"}
                onChange={(e) => setSchedulerOn((e.target as HTMLSelectElement).value === "on")}
                inputProps={{ name: "schedulerStatus", id: "scheduler-status" }}
              >
                <MenuItem value="on">Scheduler uključen</MenuItem>
                <MenuItem value="off">Scheduler isključen</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={() => showMessage("Info", "Postavke spremljene lokalno.")}>Spremi postavke</Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Health pregled</Typography>
          <Button type="button" variant="outlined" onClick={loadHealthSummary} disabled={healthLoading} sx={{ mb: 2 }}>
            {healthLoading ? "Učitavam health..." : "Osvježi health"}
          </Button>
          {healthSummary ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
              <Typography variant="body2">Vrijeme: {new Date(healthSummary.timestamp).toLocaleString()}</Typography>
              <Typography variant="body2">Uređaji online/offline: {healthSummary.devices.online} / {healthSummary.devices.offline}</Typography>
              <Typography variant="body2">Schedule success 24h: {healthSummary.schedules24h.success}/{healthSummary.schedules24h.total} ({healthSummary.schedules24h.successRate ?? 0}%)</Typography>
              <Typography variant="body2">Zadnjih grešaka: {healthSummary.recentFailures.length}</Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Health podaci trenutno nisu dostupni.</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Backup i restore baze</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Button type="button" variant="contained" onClick={handleCreateBackup} disabled={backupLoading}>
              {backupLoading ? "Radim backup..." : "Napravi backup"}
            </Button>
            <Button type="button" variant="outlined" onClick={loadBackups} disabled={backupLoading}>
              Osvježi listu backupa
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <Select
                value={selectedBackup}
                onChange={(e) => setSelectedBackup((e.target as HTMLSelectElement).value)}
                disabled={backupLoading || backupList.length === 0}
                displayEmpty
                inputProps={{ name: "backupSelection", id: "backup-selection" }}
              >
                {backupList.length === 0 ? (
                  <MenuItem value="">Nema backup fajlova</MenuItem>
                ) : (
                  backupList.map((backup) => (
                    <MenuItem key={backup.name} value={backup.name}>
                      {backup.name} ({Math.round(backup.sizeBytes / 1024)} KB)
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Button variant="contained" color="error" onClick={handleRestoreBackup} disabled={backupLoading || !selectedBackup}>
              {backupLoading ? "Restore u toku..." : "Restore odabranog backupa"}
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Automatsko održavanje i brza dijagnostika</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sedmični maintenance se izvršava automatski na backendu. Ovdje možeš ručno pokrenuti maintenance i otvoriti dijagnostički snapshot kad se desi greška.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Button variant="contained" color="success" onClick={handleRunMaintenanceNow} disabled={diagnosticsLoading}>
              {diagnosticsLoading ? "Maintenance radi..." : "Pokreni maintenance sada"}
            </Button>
            <Button variant="outlined" onClick={loadDiagnostics} disabled={diagnosticsLoading}>
              Osvježi diagnostics
            </Button>
            <Button variant="outlined" onClick={handleShowDiagnosticsSnapshot} disabled={!diagnostics}>
              Prikaži diagnostics snapshot
            </Button>
            <Button variant="outlined" onClick={handleDownloadDiagnosticsSnapshot} disabled={!diagnostics}>
              Preuzmi diagnostics JSON
            </Button>
          </Box>

          {diagnostics ? (
            <Box sx={{ mt: 1 }}>
              {diagnostics.runtimeIssues.length >= (diagnostics.config.runtimeIssueAlertThreshold ?? 8) && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Upozorenje: runtime issue count je {diagnostics.runtimeIssues.length}, što prelazi prag {diagnostics.config.runtimeIssueAlertThreshold ?? 8}.
                </Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                <Typography variant="body2">Zadnji maintenance: {diagnostics.lastMaintenance?.timestamp ? new Date(diagnostics.lastMaintenance.timestamp).toLocaleString() : "nema"}</Typography>
                <Typography variant="body2">Trigger: {diagnostics.lastMaintenance?.trigger || "-"}</Typography>
                <Typography variant="body2">Status: {diagnostics.lastMaintenance?.status || "-"}</Typography>
                <Typography variant="body2">Runtime issue zapisa: {diagnostics.runtimeIssues.length}</Typography>
                <Typography variant="body2">Recent failed audit: {diagnostics.recentFailedAudit.length}</Typography>
                <Typography variant="body2">Sedmični cron: {diagnostics.config.weeklyMaintenanceCron}</Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Diagnostics nisu dostupni.
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
