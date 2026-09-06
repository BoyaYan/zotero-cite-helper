# publish.ps1 - One-click publish to VS Code Marketplace
# Usage:
#   .\publish.ps1              # minor version bump (0.0.1 -> 0.0.2)
#   .\publish.ps1 -Patch       # patch bump (0.0.1 -> 0.0.2)
#   .\publish.ps1 -Minor       # minor bump (0.0.1 -> 0.1.0)
#   .\publish.ps1 -Major       # major bump (0.0.1 -> 1.0.0)
#   .\publish.ps1 -Version 1.2.3  # specific version

param(
    [switch]$Patch,
    [switch]$Minor,
    [switch]$Major,
    [string]$Version
)

$ErrorActionPreference = "Stop"
$pkg = Get-Content "package.json" | ConvertFrom-Json
$oldVersion = $pkg.version

# Determine new version
if ($Version) {
    $newVersion = $Version
} elseif ($Major) {
    $parts = $oldVersion.Split('.')
    $newVersion = "$([int]$parts[0] + 1).0.0"
} elseif ($Minor) {
    $parts = $oldVersion.Split('.')
    $newVersion = "$($parts[0]).$([int]$parts[1] + 1).0"
} else {
    # Default: patch bump
    $parts = $oldVersion.Split('.')
    $newVersion = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)"
}

Write-Host "=== Zotero Cite Helper - Publish ===" -ForegroundColor Cyan
Write-Host "Version: $oldVersion -> $newVersion" -ForegroundColor Yellow

# Check VSCE_PAT
if (-not $env:VSCE_PAT) {
    Write-Host ""
    Write-Host "ERROR: VSCE_PAT environment variable not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To set up:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://dev.azure.com/_usersSettings/tokens" -ForegroundColor White
    Write-Host "  2. Create PAT with Marketplace > Manage scope" -ForegroundColor White
    Write-Host "  3. Run: `$env:VSCE_PAT=`"your-token`"" -ForegroundColor White
    Write-Host "  4. Then run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Tip: Add to your PowerShell profile for persistence:" -ForegroundColor Gray
    Write-Host '  [Environment]::SetEnvironmentVariable("VSCE_PAT", "your-token", "User")' -ForegroundColor Gray
    exit 1
}

# Update version in package.json
$pkg.version = $newVersion
$pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8
Write-Host "[OK] package.json updated to $newVersion" -ForegroundColor Green

# Compile
Write-Host "[..] Compiling..." -ForegroundColor Gray
npm run compile 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Compile error!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Compiled" -ForegroundColor Green

# Package
Write-Host "[..] Packaging..." -ForegroundColor Gray
vsce package --no-dependencies 2>&1 | Out-Null
$vsixFile = "zotero-cite-helper-$newVersion.vsix"
if (-not (Test-Path $vsixFile)) {
    # vsce may name it differently
    $vsixFile = Get-ChildItem "zotero-cite-helper-*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
Write-Host "[OK] Packaged: $vsixFile" -ForegroundColor Green

# Publish
Write-Host "[..] Publishing to VS Code Marketplace..." -ForegroundColor Gray
vsce publish --no-dependencies 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Publish error!" -ForegroundColor Red
    exit 1
}

# Git tag
Write-Host "[..] Creating git tag v$newVersion..." -ForegroundColor Gray
git add package.json 2>&1 | Out-Null
git commit -m "v$newVersion" 2>&1 | Out-Null
git tag "v$newVersion" 2>&1 | Out-Null
git push origin "v$newVersion" 2>&1 | Out-Null
Write-Host "[OK] Tagged and pushed v$newVersion" -ForegroundColor Green

Write-Host ""
Write-Host "=== DONE! Published v$newVersion ===" -ForegroundColor Green
Write-Host "Marketplace: https://marketplace.visualstudio.com/items?itemName=boyayan.zotero-cite-helper" -ForegroundColor Cyan
