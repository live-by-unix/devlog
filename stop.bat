@echo off
REM Devlog — stop dev processes (best-effort on Windows)
taskkill /FI "WINDOWTITLE eq devlog-api*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq devlog-web*" /F >nul 2>nul
echo Stopped Devlog dev windows.
