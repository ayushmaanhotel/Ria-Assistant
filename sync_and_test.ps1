$ErrorActionPreference = "Stop"

Stop-Process -Name "MYRAA" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "myraa-agent" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$src = "C:\Users\ayush\MYRAA_Release\win-arm64-unpacked"
$dst = Join-Path $env:LOCALAPPDATA "Programs\MYRAA"

if (Test-Path $dst) {
    Remove-Item -Recurse -Force $dst -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $dst -Force | Out-Null
Copy-Item -Recurse -Force "$src\*" $dst

$desk = Join-Path ([Environment]::GetFolderPath('Desktop')) "MYRAA.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sh = $wsh.CreateShortcut($desk)
$sh.TargetPath = Join-Path $dst "MYRAA.exe"
$sh.WorkingDirectory = $dst
$sh.Description = "MYRAA AI Assistant"
$sh.Save()

Write-Host "SYNC_SUCCESS"
