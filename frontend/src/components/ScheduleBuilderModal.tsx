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
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { buildCronExpression, formatClock } from '../utils/schedule';

interface ScheduleBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduleData) => Promise<void>;
  onCronChange: (cron: string) => void;
  currentCron: string;
  action: string;
  deviceName: string;
  selectedAction: string;
  onActionChange: (value: string) => void;
  actionTarget: string;
  onActionTargetChange: (value: string) => void;
  availableActions: Array<{ value: string; label: string; requiresParameter?: boolean; parameterLabel?: string }>;
}

interface ScheduleData {
  hour: number;
  minute: number;
  days: number[];
  cron: string;
  turnOffEnabled: boolean;
  turnOffHour?: number;
  turnOffMinute?: number;
  turnOffCron?: string;
  afterPowerOnAction?: string;
  afterPowerOnTarget?: string;
}

interface TimeInputEditorProps {
  value: number;
  max: number;
  onChange: (nextValue: number) => void;
}

const TimeInputEditor: React.FC<TimeInputEditorProps> = ({ value, max, onChange }) => {
  const [draft, setDraft] = useState<string>(String(value).padStart(2, '0'));

  useEffect(() => {
    setDraft(String(value).padStart(2, '0'));
  }, [value]);

  const commitDraft = (nextDraft: string) => {
    const digits = nextDraft.replace(/\D/g, '').slice(0, 2);
    if (!digits) {
      setDraft('00');
      return;
    }

    const parsed = Number.parseInt(digits, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value).padStart(2, '0'));
      return;
    }

    const clamped = Math.min(Math.max(parsed, 0), max);
    setDraft(String(clamped).padStart(2, '0'));
    onChange(clamped);
  };

  return (
    <TextField
      value={draft}
      onFocus={(event) => {
        const input = event.target as HTMLInputElement | null;
        input?.select();
      }}
      onClick={(event) => {
        const input = event.currentTarget.querySelector('input');
        if (input) {
          input.select();
        }
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 2);
        setDraft(digits);

        if (digits.length === 2) {
          const parsed = Number.parseInt(digits, 10);
          if (!Number.isNaN(parsed)) {
            const clamped = Math.min(Math.max(parsed, 0), max);
            setDraft(String(clamped).padStart(2, '0'));
            onChange(clamped);
          }
        }
      }}
      onBlur={() => {
        const digits = draft.replace(/\D/g, '').slice(0, 2);
        if (!digits) {
          setDraft(String(value).padStart(2, '0'));
          return;
        }

        const parsed = Number.parseInt(digits, 10);
        if (Number.isNaN(parsed)) {
          setDraft(String(value).padStart(2, '0'));
          return;
        }

        const clamped = Math.min(Math.max(parsed, 0), max);
        setDraft(String(clamped).padStart(2, '0'));
        onChange(clamped);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const digits = draft.replace(/\D/g, '').slice(0, 2);
          commitDraft(digits);
          event.currentTarget.blur();
        }
      }}
      variant="outlined"
      size="small"
      slotProps={{
        htmlInput: {
          inputMode: 'numeric',
          pattern: '[0-9]*',
          maxLength: 2,
          style: {
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '1.6rem',
            padding: '8px 0',
            width: '2ch',
          },
        },
      }}
      sx={{
        width: 72,
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'primary.main',
        },
        '& .MuiInputBase-input': {
          color: 'primary.contrastText',
        },
      }}
    />
  );
};

const ScheduleBuilderModal: React.FC<ScheduleBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  onCronChange,
  currentCron,
  action,
  deviceName,
  selectedAction,
  onActionChange,
  actionTarget,
  onActionTargetChange,
  availableActions,
}) => {
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [turnOffEnabled, setTurnOffEnabled] = useState(true);
  const [turnOffHour, setTurnOffHour] = useState(9);
  const [turnOffMinute, setTurnOffMinute] = useState(0);
  const [loading, setLoading] = useState(false);

  const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
  const dayLabelsShort = ["Ne", "Po", "Ut", "Sr", "Če", "Pe", "Su"];

  useEffect(() => {
    let parsedHour: number | null = null;
    let parsedMinute: number | null = null;
    let parsedDays: number[] | null = null;

    if (currentCron) {
      const parts = currentCron.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [min, hrs] = parts;
        if (!/\*/.test(hrs) && !/\*/.test(min)) {
          const h = parseInt(hrs, 10);
          const m = parseInt(min, 10);
          if (!Number.isNaN(h) && !Number.isNaN(m)) {
            parsedHour = h;
            parsedMinute = m;
          }
        }

        if (parts[4] && parts[4] !== "*") {
          const days = parts[4].split(",").map((d) => parseInt(d, 10));
          parsedDays = days.filter((d) => !Number.isNaN(d));
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

  const handleHourChange = (newHour: number) => {
    const nextHour = ((newHour % 24) + 24) % 24;
    setHour(nextHour);
    onCronChange(buildCronExpression(nextHour, minute, selectedDays));
  };

  const handleMinuteChange = (newMinute: number) => {
    const nextMinute = ((newMinute % 60) + 60) % 60;
    setMinute(nextMinute);
    onCronChange(buildCronExpression(hour, nextMinute, selectedDays));
  };

  const handlePresetTime = (newHour: number, newMinute: number) => {
    setHour(newHour);
    setMinute(newMinute);
    onCronChange(buildCronExpression(newHour, newMinute, selectedDays));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const cron = buildCronExpression(hour, minute, selectedDays);
      await onSave({
        hour,
        minute,
        days: selectedDays,
        cron,
        turnOffEnabled,
        turnOffHour: turnOffEnabled ? turnOffHour : undefined,
        turnOffMinute: turnOffEnabled ? turnOffMinute : undefined,
        turnOffCron: turnOffEnabled ? buildCronExpression(turnOffHour, turnOffMinute, selectedDays) : undefined,
        afterPowerOnAction: selectedAction,
        afterPowerOnTarget: actionTarget,
      });
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
    onCronChange(buildCronExpression(hour, minute, days));
  };

  const selectedActionMeta = availableActions.find((item) => item.value === selectedAction) || availableActions[0];
  const requiresActionTarget = Boolean(selectedActionMeta?.requiresParameter);

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

        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            ⏰ Vrijeme uključivanja
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Sat
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleHourChange(hour - 1)}
                sx={{ minWidth: 'auto' }}
              >
                ◀
              </Button>
              <TimeInputEditor value={hour} max={23} onChange={(nextValue) => handleHourChange(nextValue)} />
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleHourChange(hour + 1)}
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
                onClick={() => handleMinuteChange(minute - 5)}
                sx={{ minWidth: 'auto' }}
              >
                ◀
              </Button>
              <TimeInputEditor value={minute} max={59} onChange={(nextValue) => handleMinuteChange(nextValue)} />
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleMinuteChange(minute + 5)}
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
                onClick={() => handlePresetTime(preset.hour, preset.minute)}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            ⚡ Akcija nakon uključivanja
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {availableActions.map((item) => (
              <Button
                key={item.value}
                variant={selectedAction === item.value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => onActionChange(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {requiresActionTarget && (
            <TextField
              fullWidth
              size="small"
              label={selectedActionMeta?.parameterLabel || 'App ID ili URL'}
              value={actionTarget}
              onChange={(event) => onActionTargetChange(event.target.value)}
              placeholder={selectedActionMeta?.parameterLabel || 'App ID ili URL'}
            />
          )}
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={turnOffEnabled}
                onChange={(event) => setTurnOffEnabled(event.target.checked)}
              />
            }
            label="Dodaj isključivanje TV-a"
          />

          {turnOffEnabled && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="textSecondary">Sat</Typography>
                <Button variant="outlined" size="small" onClick={() => setTurnOffHour((turnOffHour - 1 + 24) % 24)} sx={{ minWidth: 'auto' }}>
                  ◀
                </Button>
                <TimeInputEditor value={turnOffHour} max={23} onChange={(nextValue) => setTurnOffHour(nextValue)} />
                <Button variant="outlined" size="small" onClick={() => setTurnOffHour((turnOffHour + 1) % 24)} sx={{ minWidth: 'auto' }}>
                  ▶
                </Button>
              </Box>

              <Typography variant="h4" sx={{ fontWeight: 700 }}>:</Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="textSecondary">Minuta</Typography>
                <Button variant="outlined" size="small" onClick={() => setTurnOffMinute((turnOffMinute - 5 + 60) % 60)} sx={{ minWidth: 'auto' }}>
                  ◀
                </Button>
                <TimeInputEditor value={turnOffMinute} max={59} onChange={(nextValue) => setTurnOffMinute(nextValue)} />
                <Button variant="outlined" size="small" onClick={() => setTurnOffMinute((turnOffMinute + 5) % 60)} sx={{ minWidth: 'auto' }}>
                  ▶
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        <Divider />

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
                  onCronChange(buildCronExpression(hour, minute, preset.days));
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

        <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            📋 Sažetak
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">Uključi:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatClock(hour)}:{formatClock(minute)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">Akcija:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedActionMeta?.label || action}
              </Typography>
            </Box>
            {turnOffEnabled && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Isključi:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatClock(turnOffHour)}:{formatClock(turnOffMinute)}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="textSecondary">Cron:</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {buildCronExpression(hour, minute, selectedDays)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Otkaži</Button>
        <Button
          onClick={handleSave}
          disabled={loading || selectedDays.length === 0 || (requiresActionTarget && !actionTarget.trim())}
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
