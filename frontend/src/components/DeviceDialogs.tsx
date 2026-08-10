import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { Group, MessageModalState } from '../types/app';

export type DeviceDialogsProps = {
  dialogsProps: {
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: (value: boolean) => void;
    cancelDelete: () => void;
    confirmDelete: () => void;
    showAssignGroupModal: boolean;
    setShowAssignGroupModal: (value: boolean) => void;
    selectedAssignGroupId: number | null;
    groups: Group[];
    setSelectedAssignGroupId: (value: number | null) => void;
    assignGroupToSelected: () => void;
    messageModal: MessageModalState | null;
    setMessageModal: (value: MessageModalState | null) => void;
    closeMessageModal: () => void;
    handleMessageConfirm: () => void;
  };
};

export const DeviceDialogs: FC<DeviceDialogsProps> = ({
  dialogsProps: {
    showDeleteConfirm,
    setShowDeleteConfirm,
    cancelDelete,
    confirmDelete,
    showAssignGroupModal,
    setShowAssignGroupModal,
    selectedAssignGroupId,
    groups,
    setSelectedAssignGroupId,
    assignGroupToSelected,
    messageModal,
    setMessageModal,
    closeMessageModal,
    handleMessageConfirm,
  },
}) => (
  <>
    <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
      <DialogTitle>Potvrda brisanja</DialogTitle>
      <DialogContent>
        <Typography variant="body2">Da li želiš obrisati odabrani uređaj?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancelDelete}>Ne, poništi</Button>
        <Button onClick={confirmDelete} variant="contained" color="error">Da, obriši</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={showAssignGroupModal} onClose={() => setShowAssignGroupModal(false)}>
      <DialogTitle>Dodaj u grupu</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>Izaberi grupu za označene uređaje:</Typography>
        <FormControl size="small" sx={{ minWidth: 260, mt: 1 }}>
          <Select
            value={selectedAssignGroupId ?? ''}
            onChange={(e) => setSelectedAssignGroupId(e.target.value ? Number(e.target.value) : null)}
            displayEmpty
          >
            <MenuItem value="">Odaberi grupu</MenuItem>
            {groups?.map((group) => (
              <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowAssignGroupModal(false)}>Otkaži</Button>
        <Button onClick={assignGroupToSelected} variant="contained">Dodaj u grupu</Button>
      </DialogActions>
    </Dialog>

    {messageModal && (
      <Dialog open={!!messageModal} onClose={() => setMessageModal(null)} maxWidth="md" fullWidth>
        <DialogTitle>{messageModal.title}</DialogTitle>
        <DialogContent>
          {messageModal.title?.toLowerCase().includes('log') ? (
            <Typography
              component="pre"
              variant="body2"
              sx={{ whiteSpace: 'pre-wrap', m: 0, fontFamily: 'inherit' }}
            >
              {messageModal.message}
            </Typography>
          ) : (
            <Typography variant="body2">{messageModal.message}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {messageModal.onConfirm ? (
            <>
              <Button onClick={closeMessageModal}>{messageModal.cancelText || 'Odustani'}</Button>
              <Button onClick={handleMessageConfirm} variant="contained">{messageModal.confirmText || 'Potvrdi'}</Button>
            </>
          ) : (
            <Button onClick={closeMessageModal} variant="contained">U redu</Button>
          )}
        </DialogActions>
      </Dialog>
    )}
  </>
);
