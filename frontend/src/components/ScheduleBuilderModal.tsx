import React, { useState, useEffect } from "react";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

interface ScheduleBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduleData) => Promise<void>;
  onCronChange: (cron: string) => void;
  currentCron: string;
  action: string;
  deviceName: string;
}

interface ScheduleData {
  hour: number;
  minute: number;
  days: number[];
  cron: string;
}

const ScheduleBuilderModal: React.FC<ScheduleBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  onCronChange,
  currentCron,
  action,
  deviceName,
}) => {
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Monday to Friday
  const [loading, setLoading] = useState(false);

  const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
  const dayLabelsShort = ["Ne", "Po", "Ut", "Sr", "Če", "Pe", "Su"];

  useEffect(() => {
    // Parse current cron to populate fields
    let parsedHour: number | null = null;
    let parsedMinute: number | null = null;
    let parsedDays: number[] | null = null;

    if (currentCron) {
      const parts = currentCron.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [min, hrs] = parts;
        // Simple parsing for HH:MM format
        if (!/\*/.test(hrs) && !/\*/.test(min)) {
          const h = parseInt(hrs, 10);
          const m = parseInt(min, 10);
          if (!isNaN(h) && !isNaN(m)) {
            parsedHour = h;
            parsedMinute = m;
          }
        }
        // Parse day of week (5th field)
        if (parts[4] && parts[4] !== "*") {
          const days = parts[4].split(",").map((d) => parseInt(d, 10));
          parsedDays = days.filter((d) => !isNaN(d));
        }
      }
    }

    const timer = window.setTimeout(() => {
      if (parsedHour !== null) {
        setHour(parsedHour);
      }
      if (parsedMinute !== null) {
        setMinute(parsedMinute);
      }
      if (parsedDays !== null) {
        setSelectedDays(parsedDays);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentCron]);

  const generateCron = (h: number, m: number, days: number[]): string => {
    if (days.length === 0) {
      return "0 0 * * *"; // Invalid, fallback
    }
    const dayString = days.sort((a, b) => a - b).join(",");
    return `${m} ${h} * * ${dayString}`;
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    onCronChange(generateCron(newHour, minute, selectedDays));
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    onCronChange(generateCron(hour, newMinute, selectedDays));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const cron = generateCron(hour, minute, selectedDays);
      await onSave({ hour, minute, days: selectedDays, cron });
      onClose();
    } catch (error) {
      console.error("Error saving schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const presetSchedules = [
    { label: "Ujutro (7:00)", hour: 7, minute: 0 },
    { label: "Popodne (14:00)", hour: 14, minute: 0 },
    { label: "Večer (21:00)", hour: 21, minute: 0 },
    { label: "Noć (23:00)", hour: 23, minute: 0 },
  ];

  const presetDays = [
    { label: "Samo radni dani (Po-Pe)", days: [1, 2, 3, 4, 5] },
    { label: "Svakodnevno", days: [0, 1, 2, 3, 4, 5, 6] },
    { label: "Samo vikend", days: [0, 6] },
    { label: "Samo ponedjeljak", days: [1] },
  ];

  if (!isOpen) return null;

  const handleDayGroupChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSelectedDays: number[],
  ) => {
    const days = Array.isArray(newSelectedDays) ? newSelectedDays : [];
    setSelectedDays(days);
    onCronChange(generateCron(hour, minute, days));
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="schedule-builder-dialog-title"
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle id="schedule-builder-dialog-title" sx={{ fontWeight: 600 }}>
        Postavi raspored
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {deviceName} — {action}
          </Typography>
        </Box>

        {/* Time Section */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            ⏰ Vrijeme
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Sat
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleHourChange((hour - 1 + 24) % 24)}
                sx={{ minWidth: 'auto' }}
              >
                ◀
              </Button>
              <Paper
                sx={{
                  width: 60,
                  textAlign: 'center',
                  py: 1,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {String(hour).padStart(2, "0")}
                </Typography>
              </Paper>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleHourChange((hour + 1) % 24)}
                sx={{ minWidth: 'auto' }}
              >
                ▶
              </Button>
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 700 }}>:</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Minuta
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleMinuteChange((minute - 5 + 60) % 60)}
                sx={{ minWidth: 'auto' }}
              >
                ◀
              </Button>
              <Paper
                sx={{
                  width: 60,
                  textAlign: 'center',
                  py: 1,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {String(minute).padStart(2, "0")}
                </Typography>
              </Paper>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleMinuteChange((minute + 5) % 60)}
                sx={{ minWidth: 'auto' }}
              >
                ▶
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {presetSchedules.map((preset) => (
              <Button
                key={preset.label}
                variant="outlined"
                size="small"
                onClick={() => {
                  handleHourChange(preset.hour);
                  handleMinuteChange(preset.minute);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Divider />

        {/* Days Section */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📅 Dani
          </Typography>
          
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={selectedDays}
              onChange={handleDayGroupChange}
              aria-label="Odaberi dane"
              size="small"
            >
              {dayLabelsShort.map((label, dayNum) => (
                <ToggleButton key={dayNum} value={dayNum} aria-label={dayNames[dayNum]}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {presetDays.map((preset) => (
              <Button
                key={preset.label}
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedDays(preset.days);
                  onCronChange(generateCron(hour, minute, preset.days));
                }}
              >
                {preset.label}
              </Button>
            ))}
          </Box>

          {selectedDays.length > 0 && (
            <Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                <Typography component="span" sx={{ fontWeight: 700 }}>
                  Odabrani dani:
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedDays.map((d) => (
                  <Chip key={d} label={dayNames[d]} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Summary Section */}
        <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            📋 Sažetak
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">Vrijeme:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">Dani:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedDays.length === 7
                  ? "Svakodnevno"
                  : selectedDays.length === 5 && selectedDays.join(",") === "1,2,3,4,5"
                  ? "Radni dani (Po-Pe)"
                  : `${selectedDays.length} dan(a)`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="textSecondary">Cron:</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {generateCron(hour, minute, selectedDays)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Otkaži
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || selectedDays.length === 0}
          variant="contained"
          color="primary"
        >
          {loading ? "Sprema..." : "Spremi raspored"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleBuilderModal;
