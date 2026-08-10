# Release Checklist (v1.0)

## 1) Backend Runtime
- [ ] Backend starts without errors (`npm run start` in backend).
- [ ] Endpoint `GET /health/summary` returns valid JSON.
- [ ] Endpoint `GET /system/diagnostics` returns valid JSON.
- [ ] Endpoint `GET /system/backups` lists backups.

## 2) Core Device Actions
- [ ] Single device power on works.
- [ ] Single device power off works.
- [ ] Single device restart works (LG/webOS path verified).
- [ ] Group restart path works.

## 3) Resilience Features
- [ ] Manual maintenance run (`POST /system/maintenance/run`) succeeds.
- [ ] Startup backup appears in `backend/backups`.
- [ ] Weekly maintenance cron is configured (`WEEKLY_MAINTENANCE_CRON`).
- [ ] MAC self-heal works for invalid MAC entries.

## 4) Frontend Quality
- [ ] Frontend build passes (`npm run build` in frontend).
- [ ] Settings page shows health section.
- [ ] Settings page can create backup.
- [ ] Settings page can restore selected backup.
- [ ] Settings page can open diagnostics snapshot.
- [ ] Settings page can download diagnostics JSON.

## 5) Diagnostics + Alerts
- [ ] Runtime issue threshold warning is visible when threshold is exceeded.
- [ ] Diagnostics counts update after refresh.
- [ ] Audit log shows maintenance and backup operations.

## 6) Security Baseline
- [ ] CORS allowlist is set (`ALLOWED_ORIGINS`).
- [ ] Debug routes disabled in production (`ENABLE_DEBUG_ROUTES != true`).
- [ ] Backend is not publicly exposed without auth + TLS reverse proxy.

## 7) Final Sign-off
- [ ] `MAINTENANCE.md` reviewed.
- [ ] `SCOPE_LOCK_V1.md` accepted.
- [ ] Tag release as `v1.0` (optional git tag).
