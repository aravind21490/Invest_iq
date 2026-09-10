# start.ps1 - Quick launcher for PowerShell
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Invest IQ Simulator & Opening Browser..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot

# Configure UTF-8 encoding for Python console
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

& "$PSScriptRoot\venv\Scripts\Activate.ps1"
python app.py
