// React import not required directly in TSX with new JSX runtime
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Chip from '@mui/material/Chip';
import type { Group } from '../types/app';

type GroupStatusSummary = Group & {
  onlineCount: number;
  offlineCount: number;
};

interface Props {
  groupStatusSummary: GroupStatusSummary[];
  groupName: string;
  setGroupName: (v: string) => void;
  handleCreateGroup: () => void;
  handleRestartGroup: (id: number) => void;
  handlePowerOnGroup: (id: number) => void;
  handlePowerOffGroup: (id: number) => void;
  handleOpenAuditForGroup: (id: number) => void;
}

export default function Groups({ groupStatusSummary, groupName, setGroupName, handleCreateGroup, handleRestartGroup, handlePowerOnGroup, handlePowerOffGroup, handleOpenAuditForGroup }: Props) {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Grupe uređaja
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Grupe služe za organizaciju TV uređaja u logične cjeline.
        Dodaj uređaje u grupu kako bi mogao upravljati cijelom grupom odjednom,
        primjerice restartati sve uređaje u toj grupi.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        <TextField
          placeholder="Naziv nove grupe"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          size="small"
          variant="outlined"
          sx={{ minWidth: 280 }}
        />
        <Button variant="contained" onClick={handleCreateGroup}>
          Kreiraj grupu
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        {groupStatusSummary.map((group) => {
          const offlineRatio = group.deviceCount ? group.offlineCount / group.deviceCount : 0;
          return (
          <Card key={group.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {group.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {group.deviceCount} uređaja
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" color="success" variant="outlined" label={`Online: ${group.onlineCount}`} />
                <Chip
                  size="small"
                  color={offlineRatio > 0.5 ? 'error' : offlineRatio > 0.2 ? 'warning' : 'default'}
                  variant="outlined"
                  label={`Offline: ${group.offlineCount}`}
                />
              </Box>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleRestartGroup(group.id)}
              >
                Restart grupe
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handlePowerOnGroup(group.id)}
              >
                Upali grupu
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => handlePowerOffGroup(group.id)}
              >
                Isključi grupu
              </Button>
              <Button
                variant="text"
                onClick={() => handleOpenAuditForGroup(group.id)}
              >
                Audit log
              </Button>
            </CardActions>
          </Card>
        )})}
      </Box>
    </Container>
  );
}
