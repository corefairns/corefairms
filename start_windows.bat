@echo off
setlocal
cd /d "%~dp0"
echo.
echo  CoreFair Full Marketplace - Windows
echo  ===================================
echo.
echo Opening CoreFair in your default browser...
start "" "%~dp0index.html"
echo.
echo Tip: For development, open this folder in VS Code and use Live Server.
echo Setup guide: README.md
echo.
pause
