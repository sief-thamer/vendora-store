# ============================================================
#  VENDORA - Stop script
#  Stops the running static server using the saved state file.
# ============================================================
$StateDir = Join-Path $env:TEMP "VENDORA"
$StateFile = Join-Path $StateDir "state.json"

if (-not (Test-Path -LiteralPath $StateFile)) {
  Write-Host "VENDORA is not running (no state file)." -ForegroundColor Yellow
  exit 0
}

try {
  $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
  if ($state.pid) {
    $p = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
    if ($p) {
      Stop-Process -Id $state.pid -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped VENDORA server (PID $($state.pid))." -ForegroundColor Green
    } else {
      Write-Host "Server process not found (already stopped)." -ForegroundColor Yellow
    }
  }
} catch {
  Write-Host "Could not read state file: $_" -ForegroundColor Red
}

Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
