@echo off
title Invest IQ — Virtual Market Simulator
echo ========================================================
echo   Starting Invest IQ Simulator & Opening Browser...
echo ========================================================
cd /d "%~dp0"

REM Ensure UTF-8 console output for Indian Rupee symbol
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
chcp 65001 >nul 2>&1

REM Activate Python Virtual Environment
call .\venv\Scripts\activate.bat

REM Run Flask App (which will auto-launch your browser to http://localhost:3000)
python app.py

pause
