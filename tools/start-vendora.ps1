# ============================================================
#  VENDORA - Start script
#  Picks a free port (8000-8999), starts the static server,
#  waits until it responds, then opens the default browser.
# ============================================================
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$StateDir = Join-Path $env:TEMP "VENDORA"
if (-not (Test-Path -LiteralPath $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }
$StateFile = Join-Path $StateDir "state.json"

function Test-PortFree([int]$port) {
  try {
    $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
    $l.Start()
    $l.Stop()
    return $true
  } catch { return $false }
}

function Test-ServerReady([int]$port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect("127.0.0.1", $port)
    $c.Close()
    return $true
  } catch { return $false }
}

# Stop a previously running instance if any
if (Test-Path -LiteralPath $StateFile) {
  try {
    $prev = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    if ($prev.pid) { Stop-Process -Id $prev.pid -Force -ErrorAction SilentlyContinue }
  } catch { }
  Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
}

# Find a free port
$port = 0
foreach ($p in 8000..8999) {
  if (Test-PortFree $p) { $port = $p; break }
}
if ($port -eq 0) {
  Write-Host "No free port found in range 8000-8999." -ForegroundColor Red
  exit 1
}

$serverScript = Join-Path $ProjectRoot "tools\server\server.ps1"
$args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$serverScript`"", "-Port", "$port", "-Root", "`"$ProjectRoot`"")

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $args -WindowStyle Hidden -PassThru

# Wait for readiness
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 250
  if (Test-ServerReady $port) { $ready = $true; break }
  if ($proc.HasExited) { break }
}

if (-not $ready) {
  Write-Host "Server failed to start. Check $StateDir\server.log" -ForegroundColor Red
  try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch { }
  exit 1
}

$state = [pscustomobject]@{ pid = $proc.Id; port = $port; url = "http://127.0.0.1:$port/"; startedAt = (Get-Date).ToString("o") }
$state | ConvertTo-Json | Set-Content -LiteralPath $StateFile -Encoding UTF8

$url = "http://127.0.0.1:$port/"
Write-Host ""
Write-Host "  VENDORA is running" -ForegroundColor Green
Write-Host "  URL : $url" -ForegroundColor Cyan
Write-Host "  PID : $($proc.Id)  (port $port)"
Write-Host ""
Write-Host "  Opening your browser..."
Start-Sleep -Milliseconds 400
Start-Process $url | Out-Null
