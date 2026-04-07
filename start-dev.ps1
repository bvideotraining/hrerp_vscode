# HR ERP - Start Development Servers
# Starts backend (port 3003) and frontend (port 3000) in separate windows

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HR ERP - Starting Development Servers " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Kill any stale processes on ports 3003 and 3000 ──────────────────────────
foreach ($port in @(3003, 3000, 3001)) {
    $procs = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess
    foreach ($proc in $procs) {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# ── Build backend ─────────────────────────────────────────────────────────────
Write-Host "Building backend..." -ForegroundColor Yellow
Push-Location $backend
$buildResult = npm run build 2>&1
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build FAILED. Check errors above." -ForegroundColor Red
    Write-Host $buildResult
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Backend build OK" -ForegroundColor Green

# ── Start backend in a new window ─────────────────────────────────────────────
Write-Host "Starting backend on http://localhost:3003 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$backend'; `$env:PORT=3003; npm run start:prod" `
    -WindowStyle Normal

Start-Sleep -Seconds 2

# ── Clear Next.js cache to prevent ChunkLoadError ─────────────────────────────
Write-Host "Clearing Next.js build cache..." -ForegroundColor Yellow
$nextCacheDir = Join-Path $frontend ".next"
if (Test-Path $nextCacheDir) {
    Remove-Item -Recurse -Force $nextCacheDir
    Write-Host "Next.js cache cleared." -ForegroundColor Green
}

# ── Start frontend in a new window ────────────────────────────────────────────
Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$frontend'; npx next dev" `
    -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Both servers are starting up!"          -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://localhost:3000"       -ForegroundColor White
Write-Host "  Backend  : http://localhost:3003"       -ForegroundColor White
Write-Host "  API Docs : http://localhost:3003/api/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Two new terminal windows have opened." -ForegroundColor Gray
Write-Host "Wait ~10 seconds then open your browser." -ForegroundColor Gray
Write-Host ""
