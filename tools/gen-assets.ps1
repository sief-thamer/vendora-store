#requires -version 5.1
# VENDORA - local SVG asset generator (ASCII-only script; reads Arabic labels from assets-data.json)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $PSScriptRoot 'assets-data.json'
$data = Get-Content -LiteralPath $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

$icons = @{
    electronics = '<rect x="-70" y="-130" width="140" height="260" rx="26" fill="none" stroke="__C__" stroke-width="14"/><line x1="-28" y1="-92" x2="28" y2="-92" stroke="__C__" stroke-width="12" stroke-linecap="round"/><circle cx="0" cy="98" r="13" fill="__C__"/>'
    fashion     = '<path d="M-92 -96 l64 -32 h56 l64 32 -30 56 -32 -16 v164 h-116 v-164 l-32 16 z" fill="none" stroke="__C__" stroke-width="14" stroke-linejoin="round"/>'
    perfume     = '<rect x="-58" y="-34" width="116" height="176" rx="24" fill="none" stroke="__C__" stroke-width="14"/><rect x="-22" y="-92" width="44" height="58" fill="none" stroke="__C__" stroke-width="12"/><rect x="-42" y="-128" width="84" height="40" rx="10" fill="__C__"/><line x1="-22" y1="30" x2="22" y2="30" stroke="__C__" stroke-width="10"/>'
    home        = '<path d="M-132 6 l132 -122 132 122" fill="none" stroke="__C__" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><rect x="-92" y="6" width="184" height="134" rx="14" fill="none" stroke="__C__" stroke-width="14"/><rect x="-24" y="70" width="48" height="70" rx="8" fill="__C__"/>'
    furniture   = '<path d="M-150 46 v-42 a30 30 0 0 1 30 -30 h240 a30 30 0 0 1 30 30 v42" fill="none" stroke="__C__" stroke-width="14"/><rect x="-170" y="46" width="340" height="112" rx="28" fill="none" stroke="__C__" stroke-width="14"/><rect x="-136" y="-6" width="272" height="56" rx="20" fill="__C__" opacity="0.45"/>'
    sports      = '<circle cx="0" cy="0" r="132" fill="none" stroke="__C__" stroke-width="14"/><path d="M0 -132 a132 132 0 0 1 0 264 a132 132 0 0 1 0 -264 M-132 0 h264" stroke="__C__" stroke-width="12" fill="none" opacity="0.9"/>'
    stationery  = '<path d="M-124 -96 h104 v196 h-104 z" fill="none" stroke="__C__" stroke-width="14"/><path d="M-20 -96 h104 v196 h-104 z" fill="none" stroke="__C__" stroke-width="14"/><line x1="-100" y1="-40" x2="-44" y2="-40" stroke="__C__" stroke-width="12" stroke-linecap="round"/><line x1="4" y1="-40" x2="60" y2="-40" stroke="__C__" stroke-width="12" stroke-linecap="round"/>'
    kids        = '<rect x="-124" y="-24" width="118" height="118" rx="18" fill="none" stroke="__C__" stroke-width="14"/><rect x="6" y="-24" width="118" height="118" rx="18" fill="none" stroke="__C__" stroke-width="14"/><rect x="-58" y="-164" width="118" height="118" rx="18" fill="none" stroke="__C__" stroke-width="14"/>'
}

function New-ProductSvg([string]$c1, [string]$c2, [string]$iconKey, [string]$iconColor, [int]$variant) {
    $angle = @(0, 1, 0, 1, 0, 1)[$variant % 6]
    $x1 = '0'; $y1 = '0'; $x2 = '1'; $y2 = '1'
    if ($angle -eq 1) { $x1 = '1'; $y1 = '0'; $x2 = '0'; $y2 = '1' }
    $scale = @(1.30, 1.30, 1.15, 1.15, 1.45, 1.45)[$variant % 6]
    $circle = ''
    switch ($variant % 6) {
        0 { $circle = '<circle cx="650" cy="150" r="230" fill="#FFFFFF" opacity="0.06"/><circle cx="150" cy="680" r="190" fill="#000000" opacity="0.06"/>' }
        1 { $circle = '<circle cx="140" cy="150" r="200" fill="#FFFFFF" opacity="0.07"/><circle cx="660" cy="650" r="240" fill="#000000" opacity="0.05"/>' }
        2 { $circle = '<path d="M0 520 Q200 430 400 520 T800 520 L800 800 L0 800 Z" fill="#FFFFFF" opacity="0.06"/>' }
        3 { $circle = '<path d="M0 300 Q210 200 420 300 T840 300 L840 0 L0 0 Z" fill="#000000" opacity="0.05"/>' }
        4 { $circle = '<circle cx="400" cy="400" r="260" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.12"/>' }
        5 { $circle = '<circle cx="400" cy="400" r="300" fill="none" stroke="#D4AF37" stroke-width="3" opacity="0.18"/><circle cx="400" cy="400" r="200" fill="none" stroke="#D4AF37" stroke-width="2" opacity="0.10"/>' }
    }
    $icon = $icons[$iconKey].Replace('__C__', $iconColor)
    @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img">
<defs><linearGradient id="bg" x1="$x1" y1="$y1" x2="$x2" y2="$y2"><stop offset="0" stop-color="$c1"/><stop offset="1" stop-color="$c2"/></linearGradient></defs>
<rect width="800" height="800" fill="url(#bg)"/>
$circle
<g transform="translate(400 400) scale($scale)">$icon</g>
</svg>
"@
}

function New-CategorySvg([string]$c1, [string]$c2, [string]$iconKey, [string]$labelAr) {
    $icon = $icons[$iconKey].Replace('__C__', '#F5F0E8')
    @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="$c1"/><stop offset="1" stop-color="$c2"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#bg)"/>
<circle cx="490" cy="110" r="170" fill="#FFFFFF" opacity="0.06"/>
<circle cx="110" cy="500" r="150" fill="#000000" opacity="0.06"/>
<g transform="translate(300 260) scale(0.95)">$icon</g>
<text x="300" y="530" text-anchor="middle" font-family="Cairo, Segoe UI, Tahoma, sans-serif" font-size="46" font-weight="700" fill="#F5F0E8">$labelAr</text>
</svg>
"@
}

function New-BannerSvg($b) {
    @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 600" width="1600" height="600" role="img">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="$($b.c1)"/><stop offset="1" stop-color="$($b.c2)"/></linearGradient></defs>
<rect width="1600" height="600" fill="url(#bg)"/>
<circle cx="1380" cy="120" r="260" fill="#FFFFFF" opacity="0.06"/>
<circle cx="180" cy="520" r="220" fill="#D4AF37" opacity="0.10"/>
<circle cx="1280" cy="470" r="150" fill="none" stroke="#D4AF37" stroke-width="3" opacity="0.25"/>
<text x="800" y="250" text-anchor="middle" font-family="Cairo, Segoe UI, Tahoma, sans-serif" font-size="86" font-weight="700" fill="#F5F0E8">$($b.ar)</text>
<text x="800" y="340" text-anchor="middle" font-family="Cairo, Segoe UI, Tahoma, sans-serif" font-size="40" fill="#D8C3A5">$($b.subAr)</text>
<text x="800" y="430" text-anchor="middle" font-family="Montserrat, Segoe UI, sans-serif" font-size="30" letter-spacing="3" fill="#D4AF37">$($b.en.ToUpper())</text>
</svg>
"@
}

$imgRoot = Join-Path $root 'assets\images'
$logoRoot = Join-Path $root 'assets\logos'
$iconRoot = Join-Path $root 'assets\icons'
$phRoot = Join-Path $root 'assets\placeholders'

$palette = @('#F5F0E8', '#D4AF37', '#D8C3A5', '#F5F0E8', '#D4AF37', '#F5F0E8')
foreach ($c in $data.categories) {
    Write-Utf8NoBom (Join-Path $imgRoot ("categories\$($c.slug).svg")) (New-CategorySvg $c.c1 $c.c2 $c.icon $c.ar)
    for ($i = 0; $i -lt 6; $i++) {
        $ic = $palette[$i % 6]
        Write-Utf8NoBom (Join-Path $imgRoot ("products\$($c.slug)-$($i + 1).svg")) (New-ProductSvg $c.c1 $c.c2 $c.icon $ic $i)
    }
}
foreach ($b in $data.banners) {
    Write-Utf8NoBom (Join-Path $imgRoot ("banners\banner-$($b.n).svg")) (New-BannerSvg $b)
}

# generic placeholder
Write-Utf8NoBom (Join-Path $imgRoot 'ui\placeholder.svg') @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img">
<rect width="800" height="800" fill="#F5F0E8"/>
<rect x="40" y="40" width="720" height="720" rx="24" fill="none" stroke="#D8C3A5" stroke-width="6" stroke-dasharray="18 14"/>
<g transform="translate(400 370) scale(1.1)"><rect x="-120" y="-90" width="240" height="180" rx="20" fill="none" stroke="#D8C3A5" stroke-width="14"/><circle cx="-44" cy="-24" r="26" fill="#D8C3A5"/><path d="M-100 70 l70 -70 50 50 60 -60 40 40" fill="none" stroke="#D8C3A5" stroke-width="14" stroke-linejoin="round"/></g>
<text x="400" y="600" text-anchor="middle" font-family="Cairo, Segoe UI, sans-serif" font-size="34" fill="#D8C3A5">لا توجد صورة</text>
</svg>
"@

# logo mark + wordmark
Write-Utf8NoBom (Join-Path $logoRoot 'logo.svg') @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 140" width="560" height="140" role="img">
<rect x="6" y="6" width="128" height="128" rx="30" fill="#0B192C"/>
<path d="M38 44 L70 96 L102 44" fill="none" stroke="#D4AF37" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
<text x="168" y="92" font-family="Montserrat, Segoe UI, sans-serif" font-size="58" font-weight="700" letter-spacing="4" fill="#0B192C">VENDORA</text>
</svg>
'@
Write-Utf8NoBom (Join-Path $logoRoot 'logo-light.svg') @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 140" width="560" height="140" role="img">
<rect x="6" y="6" width="128" height="128" rx="30" fill="#D4AF37"/>
<path d="M38 44 L70 96 L102 44" fill="none" stroke="#0B192C" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
<text x="168" y="92" font-family="Montserrat, Segoe UI, sans-serif" font-size="58" font-weight="700" letter-spacing="4" fill="#F5F0E8">VENDORA</text>
</svg>
'@
Write-Utf8NoBom (Join-Path $logoRoot 'logo-mark.svg') @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140" role="img">
<rect x="4" y="4" width="132" height="132" rx="32" fill="#0B192C"/>
<path d="M36 42 L70 100 L104 42" fill="none" stroke="#D4AF37" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'@
Write-Utf8NoBom (Join-Path $iconRoot 'favicon.svg') @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<rect width="64" height="64" rx="14" fill="#0B192C"/>
<path d="M17 20 L32 46 L47 20" fill="none" stroke="#D4AF37" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'@

# ui illustration for empty states
Write-Utf8NoBom (Join-Path $imgRoot 'ui\empty-cart.svg') @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img">
<circle cx="200" cy="150" r="120" fill="#F5F0E8"/>
<path d="M120 110 h30 l24 90 h96 l22 -66 h-124" fill="none" stroke="#0B192C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="176" cy="222" r="12" fill="#D4AF37"/><circle cx="248" cy="222" r="12" fill="#D4AF37"/>
</svg>
'@

Write-Host "Assets generated under $imgRoot, $logoRoot, $iconRoot"
