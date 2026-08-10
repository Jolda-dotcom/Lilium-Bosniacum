# Scope Lock (v1.0)

## Status
Aplikacija je zaključana kao "v1.0 stable" za trenutni scope.

## Zaključane funkcionalnosti
- Device management (add/edit/delete/list).
- Power controls (on/off/restart) za pojedinačne uređaje i grupe.
- Audit log pregled i filtriranje.
- Health summary endpoint + prikaz u Settings.
- Backup/restore baze (API + UI).
- Diagnostics endpoint + UI snapshot + JSON download.
- Runtime issue alert threshold u UI.
- Auto-maintenance:
  - startup maintenance,
  - periodični backup,
  - sedmični maintenance cron,
  - MAC self-heal watchdog.

## Change Control Pravilo
Nakon ovog dokumenta, sve nove izmjene ulaze samo kao:
1. Bug fix (bez širenja scope-a), ili
2. Security fix, ili
3. Explicitno odobren feature request.

## Šta se NE radi bez novog zahtjeva
- Novi veliki moduli.
- Redizajn UI strukture.
- Promjena API ugovora bez potrebe.
- Mijenjanje postojećih workflow-a koji su već stabilni.

## Definicija "Done" za v1.0
- Release checklist iz `RELEASE_CHECKLIST_V1.md` je prolazan.
- Nema blokirajućih runtime grešaka.
- Ključne akcije (power on/off/restart + maintenance + backup/restore) rade.

## Operativna referenca
- Održavanje i runbook: `MAINTENANCE.md`.
