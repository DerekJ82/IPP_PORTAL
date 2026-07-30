@echo off
REM 2027 IPP Portal Launcher
REM Update TRACKER_URL below after deploying the Apps Script web app.
REM Deploy: Apps Script editor → Deploy → New deployment → Web app

set TRACKER_URL=https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec

echo Opening 2027 IPP Portal...
start "" %TRACKER_URL%
