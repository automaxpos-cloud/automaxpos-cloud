param(
  [string]$OutDir = ".\\backups",
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$PgDumpPath = ""
)

if (-not $DatabaseUrl) {
  Write-Host "DATABASE_URL not set. Use -DatabaseUrl or set `$env:DATABASE_URL." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outfile = Join-Path $OutDir ("automaxpos_backup_" + $timestamp + ".dump")

if (-not $PgDumpPath) {
  $PgDumpPath = "pg_dump"
}

Write-Host "Starting backup..."
Write-Host "Output: $outfile"

& $PgDumpPath "$DatabaseUrl" --format=custom --no-owner --no-acl --file "$outfile"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Backup failed. Ensure pg_dump is installed and on PATH (or use -PgDumpPath)." -ForegroundColor Red
  exit 1
}

Write-Host "Backup complete." -ForegroundColor Green
