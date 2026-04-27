# Weekly Firebase Backup — Setup

These two files belong in the **`diary-backup-`** repository (private), not here.

## Files
- `.github/workflows/weekly-backup.yml` — GitHub Actions workflow (runs Sunday 03:00 UTC)
- `scripts/backup.mjs` — Node.js script that pulls Firebase data and writes a JSON snapshot

## Required secrets in `diary-backup-`
- `FIREBASE_SERVICE_ACCOUNT` — full JSON of a Firebase service account key with read access to the realtime database

## Output
Each run writes `backups/YYYY-MM-DD.json` and commits it via the built-in `GITHUB_TOKEN`.

## Manual run
Go to the repo's Actions tab → "Weekly Firebase Backup" → "Run workflow".
