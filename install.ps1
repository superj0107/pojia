# pojia 全局安装脚本（Windows，双击 bat 调用）
# 用法：powershell -ExecutionPolicy Bypass -File .\install.ps1 [-Uninstall]
[CmdletBinding()]
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
function OK($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function WARN($m) { Write-Host "[!] $m" -ForegroundColor Yellow }
function ERR($m) { Write-Host "[X] $m" -ForegroundColor Red }

# 找 node（PATH 或 DSH 自带运行时）
$node = (Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $node) {
  Get-ChildItem "$env:USERPROFILE\.dsh\dsh-runtimes\*\dependencies\node\bin\node.exe" -ErrorAction SilentlyContinue | ForEach-Object { if (-not $node) { $node = $_.FullName } }
}
if (-not $node) { ERR "没找到 Node.js 18+，请先安装：https://nodejs.org"; exit 2 }
$npmDir = Split-Path (Split-Path $node -Parent) -Parent
$npmCmd = Join-Path $npmDir 'npm.cmd'
if (-not (Test-Path $npmCmd)) { $npmCmd = 'npm' }

if ($Uninstall) {
  Write-Host "Uninstalling pojia CLI..." -ForegroundColor Cyan
  & $npmCmd uninstall -g pojia 2>&1 | Out-String | Write-Host
  OK "pojia CLI 已卸载（人设与注入文件保留在 ~/.pojia）"
  exit 0
}

Write-Host "Installing pojia CLI from $repo" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $repo 'package.json'))) { ERR "当前目录不是 pojia 源码包（缺 package.json）"; exit 2 }
Push-Location $repo
try {
  # 源码安装用 npm link（无需发布到 npm）；若已发布也可改成 npm i -g pojia
  & $npmCmd link 2>&1 | Out-String | Write-Host
  if ($LASTEXITCODE -ne 0) { WARN "npm link 失败，尝试 npm install -g ."; & $npmCmd install -g . 2>&1 | Out-String | Write-Host }
} finally { Pop-Location }

# npm link 后当前进程 PATH 可能还是旧的；刷新一次再判断。
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$pojia = Get-Command pojia -ErrorAction SilentlyContinue
$pojiaPath = if ($pojia) { $pojia.Source } else { $null }
if (-not $pojiaPath) {
  $npmGlobal = (& $npmCmd root -g 2>$null).Trim()
  $cand = Join-Path (Split-Path $npmGlobal -Parent) 'pojia.ps1'
  if (Test-Path $cand) { $pojiaPath = $cand }
}
if ($pojiaPath) {
  OK "pojia 可用：$pojiaPath"
  & $pojiaPath doctor 2>&1 | Select-Object -First 12 | Out-String | Write-Host
} else {
  WARN "pojia 不在 PATH。把 npm 全局 bin 目录加入 PATH 后重开终端，再双击「点我检查是否生效.bat」。"
}
OK "完成。下一步双击「点我一键注入.bat」投放到 codex/claude（或先 doctor 看通道）。"
