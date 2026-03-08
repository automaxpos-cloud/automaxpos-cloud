# AutoMax Cloud Backups + Daily Reports

This guide sets up:
- Nightly database backups (pg_dump)
- Daily summary report (JSON) without email

## 1) Nightly Backup (pg_dump)

Prereqs:
- pg_dump installed (PostgreSQL tools)
- DATABASE_URL set in your shell

Example (PowerShell):

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE"
.\scripts\backup-render-db.ps1 -OutDir ".\backups"
```

Optional: provide pg_dump path explicitly:

```powershell
.\scripts\backup-render-db.ps1 -OutDir ".\backups" -PgDumpPath "C:\path\to\pg_dump.exe"
```

Schedule in Windows Task Scheduler:
- Action: `powershell.exe`
- Arguments:
  `-ExecutionPolicy Bypass -File "C:\path\to\cloud_api\scripts\backup-render-db.ps1" -OutDir "C:\path\to\cloud_api\backups"`
- Trigger: Daily at 01:00

## 2) Daily Summary Report (No Email)

Generates a JSON report for a specific business (and optional branch).

Example:

```powershell
node .\scripts\daily-summary-report.js --business_id=YOUR_BUSINESS_UUID --date=2026-03-08 --out .\reports\daily_2026-03-08.json
```

Notes:
- `--date` defaults to today if not provided
- `--branch_id` is optional

Schedule with Task Scheduler (daily):
- Action: `node.exe`
- Arguments:
  `"C:\path\to\cloud_api\scripts\daily-summary-report.js" --business_id=YOUR_BUSINESS_UUID --out "C:\path\to\reports\daily.json"`

## 3) Report Fields

The JSON output includes:
- gross_sales
- returns_total
- net_sales
- transactions
- returns_count
- cashiers (summary)
- recent_sales (top 10)
- recent_returns (top 10)
