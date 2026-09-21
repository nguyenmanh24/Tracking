@echo off
title Construction Payment Tracker Pro - Quan Ly Thanh Toan & Nghiem Thu Cong Trinh
echo =========================================================================
echo       DANG KHOI CHAY CONSTRUCTION PAYMENT TRACKER PRO (APP MODE)
echo =========================================================================
echo.

set "INDEX_PATH=%~dp0index.html"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%INDEX_PATH%" --window-size=1440,920
    exit /b 0
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%INDEX_PATH%" --window-size=1440,920
    exit /b 0
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%INDEX_PATH%" --window-size=1440,920
    exit /b 0
)

start "" "%INDEX_PATH%"
exit /b 0
