# ============================================================
#  VENDORA - Minimal static file server (TcpListener based)
#  No admin rights required, no external dependencies.
#  Usage: powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1 -Port 8123
# ============================================================
param(
  [int]$Port = 8123,
  [string]$Root = ""
)

$ErrorActionPreference = "Stop"

if (-not $Root -or $Root -eq "") {
  $Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
  $Root = (Resolve-Path $Root).Path
}

$script:LogDir = Join-Path $env:TEMP "VENDORA"
if (-not (Test-Path -LiteralPath $script:LogDir)) { New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null }
$script:LogFile = Join-Path $script:LogDir "server.log"

function Write-Log([string]$msg) {
  $line = ("[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $msg)
  try { Add-Content -LiteralPath $script:LogFile -Value $line -Encoding UTF8 } catch { }
}

$MimeMap = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".mjs"  = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".ico"  = "image/x-icon"
  ".woff" = "font/woff"
  ".woff2"= "font/woff2"
  ".ttf"  = "font/ttf"
  ".txt"  = "text/plain; charset=utf-8"
  ".xml"  = "application/xml; charset=utf-8"
  ".pdf"  = "application/pdf"
  ".map"  = "application/json; charset=utf-8"
}

function Get-Mime([string]$path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($MimeMap.ContainsKey($ext)) { return $MimeMap[$ext] }
  return "application/octet-stream"
}

function Send-Response($stream, [int]$status, [string]$statusText, [string]$contentType, [byte[]]$body, [bool]$headOnly) {
  $header = "HTTP/1.1 $status $statusText`r`n"
  $header += "Content-Type: $contentType`r`n"
  $len = 0
  if ($body -ne $null) { $len = $body.Length }
  $header += "Content-Length: $len`r`n"
  $header += "Cache-Control: no-cache`r`n"
  $header += "Connection: close`r`n"
  $header += "`r`n"
  $headBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if (-not $headOnly -and $body -ne $null -and $body.Length -gt 0) {
    $stream.Write($body, 0, $body.Length)
  }
  $stream.Flush()
}

function Read-RequestLine($stream) {
  $buffer = New-Object System.Collections.Generic.List[byte]
  $one = New-Object byte[] 1
  $max = 16384
  while ($buffer.Count -lt $max) {
    $read = 0
    try { $read = $stream.Read($one, 0, 1) } catch { break }
    if ($read -eq 0) { break }
    $buffer.Add($one[0])
    $n = $buffer.Count
    if ($n -ge 4 -and $buffer[$n-4] -eq 13 -and $buffer[$n-3] -eq 10 -and $buffer[$n-2] -eq 13 -and $buffer[$n-1] -eq 10) { break }
  }
  if ($buffer.Count -eq 0) { return $null }
  return [System.Text.Encoding]::ASCII.GetString($buffer.ToArray())
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Log "FAILED to bind port $Port : $_"
  Write-Error "Could not bind port $Port"
  exit 1
}

Write-Log "Server started on http://127.0.0.1:$Port/  root=$Root"
Write-Host "VENDORA server listening on http://127.0.0.1:$Port/  (root: $Root)"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $client.SendTimeout = 15000
      $stream = $client.GetStream()
      $raw = Read-RequestLine $stream
      if ($null -eq $raw) { $client.Close(); continue }

      $firstLine = ($raw -split "`r`n")[0]
      $parts = $firstLine -split " "
      if ($parts.Count -lt 2) { $client.Close(); continue }
      $method = $parts[0].ToUpperInvariant()
      $target = $parts[1]
      $headOnly = ($method -eq "HEAD")

      # strip query string
      $qIndex = $target.IndexOf("?")
      if ($qIndex -ge 0) { $target = $target.Substring(0, $qIndex) }
      $target = [System.Uri]::UnescapeDataString($target)
      if ($target -eq "/" -or $target -eq "") { $target = "/index.html" }

      # prevent path traversal
      $clean = $target.Replace("\", "/").TrimStart("/")
      if ($clean.Contains("..")) {
        Send-Response $stream 403 "Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")) $headOnly
        $client.Close(); continue
      }

      $full = Join-Path $Root $clean
      if ((Test-Path -LiteralPath $full) -and (Get-Item -LiteralPath $full).PSIsContainer) {
        $full = Join-Path $full "index.html"
      }

      if (-not (Test-Path -LiteralPath $full)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $target")
        Send-Response $stream 404 "Not Found" "text/plain; charset=utf-8" $body $headOnly
        Write-Log "404 $target"
        $client.Close(); continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($full)
      $mime = Get-Mime $full
      Send-Response $stream 200 "OK" $mime $bytes $headOnly
      Write-Log "200 $target ($($bytes.Length) bytes)"
    } catch {
      Write-Log "ERR $_"
    } finally {
      try { $client.Close() } catch { }
    }
  }
} finally {
  try { $listener.Stop() } catch { }
  Write-Log "Server stopped (port $Port)"
}
