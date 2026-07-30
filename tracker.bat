@echo off
REM 2027 IPP Portal Launcher
REM Update TRACKER_URL below after deploying the Apps Script web app.
REM Deploy: Apps Script editor → Deploy → New deployment → Web app

set TRACKER_URL=https://script.google.com/a/macros/telus.com/s/AKfycbzV-8KDsDwN1m9yzpcI350X-tP1z1ZfZRXrd2KKRw_Cr-nQadLJvo5d7IBNx51hRu5xJg/exec

echo Opening 2027 IPP Portal...
start "" %TRACKER_URL%
