@echo off
chcp 65001 >nul
title VENDORA - Starting...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-vendora.ps1"
if errorlevel 1 (
  echo.
  echo Failed to start VENDORA. Press any key to exit.
  pause >nul
)
