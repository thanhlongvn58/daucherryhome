@echo off
chcp 65001 >nul
title So Tai Chinh Nha Minh - dang chay (dong cua so nay se tat ung dung)
netstat -ano | findstr /R /C:"0\.0\.0\.0:80 .*LISTENING" >nul
if not errorlevel 1 (
  echo So Tai Chinh dang chay san. Mo http://taichinh.local tren dien thoai.
  timeout /t 5 >nul
  exit /b
)
cd /d "%~dp0web"
node --disable-warning=ExperimentalWarning --env-file-if-exists=.env server.js
echo.
echo May chu da dung. Nhan phim bat ky de dong.
pause >nul
