import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { Device } from '../types/app';
import { DevicesToolbar } from './DevicesToolbar';

type DeviceSummaryCardsProps = {
  devices: Device[];
};

export const DeviceSummaryCards: FC<DeviceSummaryCardsProps> = ({ devices }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">Ukupno uređaja</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{devices?.length ?? 0}</Typography>
        <Typography variant="caption" color="text.secondary">Sve jedinice</Typography>
      </CardContent>
    </Card>
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">Na mreži</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
          {devices?.filter((d) => d.status === 'Online').length ?? 0}
        </Typography>
        <Typography variant="caption" color="text.secondary">Aktivni uređaji</Typography>
      </CardContent>
    </Card>
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">Van mreže</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
          {devices?.filter((d) => d.status === 'Offline').length ?? 0}
        </Typography>
        <Typography variant="caption" color="text.secondary">Nedostupni uređaji</Typography>
      </CardContent>
    </Card>
  </Box>
);
