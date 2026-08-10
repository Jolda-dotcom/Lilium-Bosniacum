import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import type { Device, DeviceHistoryEntry, Group } from "../types/app";

type GroupStatusSummary = Group & {
  onlineCount: number;
  offlineCount: number;
};

type GroupHealth = GroupStatusSummary & {
  offlineRatio: number;
};

interface Props {
  devices: Device[];
  groupStatusSummary: GroupStatusSummary[];
  recentDeviceEvents: DeviceHistoryEntry[];
}

export default function Dashboard({ devices, groupStatusSummary, recentDeviceEvents }: Props) {
  const onlineColor = '#4caf50';
  const offlineColor = '#ef4444';

  const unassignedCount = devices.filter((device) => device.groupId === null).length;
  const groupHealth = groupStatusSummary
    .map((group): GroupHealth => ({
      ...group,
      offlineRatio: group.deviceCount ? group.offlineCount / group.deviceCount : 0,
    }))
    .sort((a, b) => b.offlineRatio - a.offlineRatio)
    .slice(0, 4);

  const recentOfflineEvents = recentDeviceEvents.filter((entry) => entry.status === "Offline").length;
  const dashboardInsights = [
    `Najviše offline ima ${groupHealth[0]?.name || "nijedna grupa"} (${groupHealth[0]?.offlineCount || 0}).`,
    `U mreži je ${unassignedCount} uređaja bez grupe.`,
    `Posljednja 4 događaja: ${recentOfflineEvents} offline zapisa.`,
  ];

  const onlineCount = devices.filter((device) => device.status === "Online").length;
  const offlineCount = devices.filter((device) => device.status === "Offline").length;
  const poweredOnCount = devices.filter((device) => device.powerState === "On").length;
  const selectedCount = devices.filter((device) => device.selected).length;

  const healthScore = devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0;
  const healthStatus = healthScore >= 80 ? "excellent" : healthScore >= 60 ? "good" : healthScore >= 40 ? "warning" : "critical";
  const criticalOfflineDevices = devices.filter((device) => device.status === "Offline").slice(0, 3);
  const hasCritical = offlineCount > 0;

  const firstGroup = groupStatusSummary[0];
  const firstGroupHealthPercent = firstGroup && firstGroup.deviceCount ? (firstGroup.onlineCount / firstGroup.deviceCount) * 100 : 0;
  const firstGroupHealthColor =
    firstGroupHealthPercent > 75
      ? 'success.main'
      : firstGroupHealthPercent > 40
      ? 'warning.main'
      : 'error.main';

  const healthColor =
    healthStatus === 'excellent'
      ? 'success.main'
      : healthStatus === 'good'
      ? 'info.main'
      : healthStatus === 'warning'
      ? 'warning.main'
      : 'error.main';

  const deviceLabel = devices.length === 1 ? 'uređaj' : 'uređaja';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, letterSpacing: '0.01em' }}>
        Početna
      </Typography>
      
      {/* Stats Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(auto-fit, minmax(180px, 1fr))' },
          gridAutoRows: 'minmax(96px, auto)',
          gap: 1.25,
          mb: 3,
          alignItems: 'stretch',
        }}
      >
        {/* Total Devices Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Ukupno uređaja
              </Typography>
              <Typography sx={{ fontSize: '1.2rem' }}>📦</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {devices.length}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Sve jedinice
            </Typography>
          </CardContent>
        </Card>

        {/* Online Devices Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Na mreži
              </Typography>
              <Typography sx={{ fontSize: '1.2rem' }}>✅</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: 'success.main' }}>
              {onlineCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Aktivni uređaji
            </Typography>
          </CardContent>
        </Card>

        {/* Offline Devices Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Van mreže
              </Typography>
              <Typography sx={{ fontSize: '1.2rem' }}>⛔</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: 'error.main' }}>
              {offlineCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Nedostupni uređaji
            </Typography>
          </CardContent>
        </Card>

        {/* Powered On Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Uključeno
              </Typography>
              <Typography sx={{ fontSize: '1.2rem' }}>⚡</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: 'warning.main' }}>
              {poweredOnCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Napajanje aktivno
            </Typography>
          </CardContent>
        </Card>

        {/* Selected Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Odabrano
              </Typography>
              <Typography sx={{ fontSize: '1.2rem' }}>🎯</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: 'info.main' }}>
              {selectedCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Trenutno označeno
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {hasCritical && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
            <Typography sx={{ fontSize: '1.25rem' }}>⚠️</Typography>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Kritični uređaji offline
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pogledaj hitno nedostupne uređaje i interveniraj.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            {criticalOfflineDevices.map((device) => (
              <Typography key={device.id} variant="body2">
                • {device.name} ({device.ip})
              </Typography>
            ))}
          </Box>
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2, mb: 3, alignItems: 'flex-start' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Zdravlje mreže
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' }, gap: 2, alignItems: 'center' }}>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: healthColor }}>
                {healthScore}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {healthStatus === 'excellent'
                  ? 'Odlično'
                  : healthStatus === 'good'
                  ? 'Dobro'
                  : healthStatus === 'warning'
                  ? 'Upozorenje'
                  : 'Kritično'}
              </Typography>
            </Box>
            <Box>
              <LinearProgress
                variant="determinate"
                value={healthScore}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  mb: 2,
                  backgroundColor: 'action.disabledBackground',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    backgroundColor: healthColor,
                  },
                }}
              />
              <Typography variant="body2" color="textSecondary">
                {healthStatus === 'excellent' && 'Mreža je stabilna i svi uređaji su dostupni.'}
                {healthStatus === 'good' && 'Većina uređaja radi, ali pazi na manje probleme.'}
                {healthStatus === 'warning' && 'Nekoliko uređaja je van mreže, prati situaciju.'}
                {healthStatus === 'critical' && 'Velik broj uređaja je offline, potreban je hitan pregled.'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 2 }}>
            <Paper
              sx={{
                p: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'light' ? theme.palette.grey[100] : 'background.paper',
                border: (theme) =>
                  theme.palette.mode === 'light' ? '2px solid' : '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'light' ? theme.palette.grey[500] : 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Na mreži
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                {onlineCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {devices.length ? Math.round((onlineCount / devices.length) * 100) : 0}%
              </Typography>
            </Paper>
            <Paper
              sx={{
                p: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'light' ? theme.palette.grey[100] : 'background.paper',
                border: (theme) =>
                  theme.palette.mode === 'light' ? '2px solid' : '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'light' ? theme.palette.grey[500] : 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Van mreže
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                {offlineCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {devices.length ? Math.round((offlineCount / devices.length) * 100) : 0}%
              </Typography>
            </Paper>
          </Box>

          {devices.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto 1fr' }, gap: 2, alignItems: 'center', mt: 3 }}>
              <Box sx={{ position: 'relative', width: 180, height: 180, mx: 'auto' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: `conic-gradient(
                      ${onlineColor} 0deg ${devices.length ? (onlineCount / devices.length) * 360 : 0}deg,
                      ${offlineColor} ${devices.length ? (onlineCount / devices.length) * 360 : 0}deg 360deg
                    )`,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: '16px',
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    px: 1,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {devices.length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>
                    {deviceLabel}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: onlineColor }} />
                  <Typography variant="body2">Na mreži ({onlineCount})</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: offlineColor }} />
                  <Typography variant="body2">Van mreže ({offlineCount})</Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Brzi pregled distribucije po statusu.
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, textAlign: 'center' }}>
            Zdravlje grupa po dostupnosti
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
            Pregled dostupnosti najvažnijih grupa.
          </Typography>
          {groupStatusSummary.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
              Nema podataka o grupama.
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                mt: 3,
                width: '100%',
              }}
            >
              <Box sx={{ width: 220, height: 220, mx: 'auto' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={220}
                    thickness={4}
                    sx={{
                      color: 'action.disabledBackground',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={firstGroupHealthPercent}
                    size={220}
                    thickness={4}
                    sx={{
                      color: firstGroupHealthColor,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {firstGroup ? `${Math.round(firstGroupHealthPercent)}%` : '0%'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gap: 1.5, width: '100%', maxWidth: 420, mx: 'auto' }}>
                {groupStatusSummary.slice(0, 4).map((group) => {
                  const healthPercent = group.deviceCount ? (group.onlineCount / group.deviceCount) * 100 : 0;
                  const color =
                    healthPercent > 75
                      ? 'success.main'
                      : healthPercent > 40
                      ? 'warning.main'
                      : 'error.main';
                  return (
                    <Box
                      key={group.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'light' ? theme.palette.grey[200] : 'action.hover',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: (theme) =>
                          theme.palette.mode === 'light' ? theme.palette.grey[500] : 'divider',
                        boxShadow: (theme) =>
                          theme.palette.mode === 'light'
                            ? '0 1px 4px rgba(0, 0, 0, 0.08)'
                            : 'none',
                        p: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {group.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {group.onlineCount}/{group.deviceCount}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color }}>
                        {Math.round(healthPercent)}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <Paper
          sx={{
            p: 3,
            height: '100%',
            bgcolor: (theme) =>
              theme.palette.mode === 'light' ? theme.palette.grey[100] : 'background.paper',
            border: (theme) =>
              theme.palette.mode === 'light' ? '1px solid' : '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'light' ? theme.palette.grey[500] : 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Grupe koje trebaju pažnju
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Prati udio offline uređaja u grupama i reagiraj gdje je najkritičnije.
          </Typography>
          {groupHealth.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
              Nema dovoljnih podataka za grupnu analizu.
            </Typography>
          ) : (
            <List disablePadding>
              {groupHealth.map((group) => (
                <ListItem key={group.id} disableGutters sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {group.name}
                      </Typography>
                      <Chip
                        label={`${group.offlineCount}/${group.deviceCount} offline`}
                        size="small"
                        color={group.offlineRatio > 0.5 ? 'error' : group.offlineRatio > 0.2 ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={group.deviceCount ? Math.round(group.offlineRatio * 100) : 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'action.disabledBackground',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: group.offlineRatio > 0.5 ? 'error.main' : group.offlineRatio > 0.2 ? 'warning.main' : 'success.main',
                        },
                      }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        <Paper
          sx={{
            p: 3,
            height: '100%',
            bgcolor: (theme) =>
              theme.palette.mode === 'light' ? theme.palette.grey[100] : 'background.paper',
            border: (theme) =>
              theme.palette.mode === 'light' ? '1px solid' : '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'light' ? theme.palette.grey[500] : 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Operativni uvidi
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Brze preporuke i sažetak ključnih promjena prilikom nadzora.
          </Typography>
          <List disablePadding>
            {dashboardInsights.map((insight, index) => (
              <ListItem key={index} disableGutters sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {insight}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

    </Container>
  );
}
