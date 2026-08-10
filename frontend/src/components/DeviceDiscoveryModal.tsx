import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import type { DiscoveredDevice } from "../types/app";

interface DeviceDiscoveryModalProps {
  isOpen: boolean;
  discoveryLoading: boolean;
  discoveredDevices: DiscoveredDevice[];
  selectedDiscoveredDevices: Set<string>;
  onClose: () => void;
  onRetryDiscovery: () => void;
  onAddSelected: () => void;
  onSelectionChange: (nextSelection: Set<string>) => void;
}

export default function DeviceDiscoveryModal({
  isOpen,
  discoveryLoading,
  discoveredDevices,
  selectedDiscoveredDevices,
  onClose,
  onRetryDiscovery,
  onAddSelected,
  onSelectionChange,
}: DeviceDiscoveryModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="discovery-dialog-title"
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="discovery-dialog-title">🔍 Skeniraj mrežu za TV uređaje</DialogTitle>
      <DialogContent dividers>
        {discoveryLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Skeniram mrežu... Molim čekaj (~5 sekundi)...</Typography>
          </Box>
        ) : discoveredDevices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nisu pronađeni TV uređaji. Klikni "Skeniraj" da pokušaš ponovo.
          </Typography>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Pronađeno {discoveredDevices.length} uređaja. Odaberi koje želiš dodati:
            </Typography>
            <List dense>
              {discoveredDevices.map((device) => (
                <ListItem key={device.ip} disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography component="span" sx={{ fontWeight: 600 }}>
                          {device.name}
                        </Typography>
                        {device.already_added && <Chip size="small" label="Već dodan" color="success" variant="outlined" />}
                      </Box>
                    }
                    secondary={device.ip}
                  />
                  <ListItemSecondaryAction>
                    <Checkbox
                      size="small"
                      edge="end"
                      checked={selectedDiscoveredDevices.has(device.ip)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedDiscoveredDevices);
                        if (e.target.checked) {
                          newSelected.add(device.ip);
                        } else {
                          newSelected.delete(device.ip);
                        }
                        onSelectionChange(newSelected);
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose}>Otkaži</Button>
        <Button onClick={onRetryDiscovery} disabled={discoveryLoading} variant="outlined">
          {discoveryLoading ? "Skeniram..." : "🔄 Skeniraj ponovo"}
        </Button>
        <Button
          onClick={onAddSelected}
          disabled={selectedDiscoveredDevices.size === 0 || discoveryLoading}
          variant="contained"
          color="primary"
        >
          ✅ Dodaj ({selectedDiscoveredDevices.size})
        </Button>
      </DialogActions>
    </Dialog>
  );
}
