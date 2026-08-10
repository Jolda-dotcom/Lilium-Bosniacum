# Maintenance Checklist

## Weekly (10-20 min)
- Test one full cycle on a real device: power on, power off, restart.
- Open audit log and confirm there are no repeated failed restart actions.
- Verify backend is running on expected host/port.

## Monthly
- Create a manual backup from Settings -> Backup/Restore.
- Verify the latest backup exists in backend/backups.
- Review dependency updates (backend + frontend) and run smoke test.
- Check that MAC addresses are valid (no 00:00:00:00:00:00 placeholders).

## Before Deploying Changes
- Run backend syntax check: `node --check backend/server.js`.
- Run frontend build: `cd frontend && npm run build`.
- Verify dashboard, devices page, audit log, and settings page all load.

## Security Basics
- Keep backend on local network or behind VPN.
- Do not expose backend publicly without auth + HTTPS reverse proxy.
- Keep `ALLOWED_ORIGINS` restricted to trusted frontend hosts.
- Keep `ENABLE_DEBUG_ROUTES` disabled in production.

## Backup/Restore Ops
- To create backup: Settings -> "Napravi backup" or `POST /system/backups`.
- To restore backup: Settings -> "Restore odabranog backupa" or `POST /system/backups/restore`.
- Restore overwrites current DB state. Always create fresh backup before restore.

## Auto-Maintenance In Backend
- Startup backup runs automatically.
- Periodic backup runs every `AUTO_BACKUP_INTERVAL_MS` (default 24h).
- Invalid MAC watchdog runs every `MAC_SELF_HEAL_INTERVAL_MS` (default 15 min).
- Weekly maintenance runs by cron `WEEKLY_MAINTENANCE_CRON` (default `0 4 * * 0`).

## Quick Error Recovery Runbook
1. Open Settings and click `Osvježi diagnostics`.
2. Check `last maintenance`, `runtime issue zapisa`, and `recent failed audit` counts.
3. Click `Pokreni maintenance sada` to run self-heal + backup + DB optimize in one step.
4. If problem persists, open `Prikaži diagnostics snapshot` and inspect latest errors.
5. Click `Preuzmi diagnostics JSON` and keep the file for troubleshooting history.
5. Run one live restart test from UI and confirm new audit entry status.

## Runtime Alert Threshold
- Backend exposes `runtimeIssueAlertThreshold` in diagnostics config.
- UI shows warning panel and toast when runtime issue count is above threshold.
- Configure via `RUNTIME_ISSUE_ALERT_THRESHOLD` environment variable.
