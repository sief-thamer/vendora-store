@echo off
chcp 65001 >nul
title VENDORA - Stopping...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\stop-vendora.ps1"
timeout /t 2 >nul
