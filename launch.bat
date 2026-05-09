@echo off
setlocal

cd /d "%~dp0"

echo.
echo AgenticPrime launcher
echo ---------------------

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

set "PORT="
for /f %%P in ('powershell -NoProfile -Command "$ports=5173..5180; foreach ($p in $ports) { if (-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)) { $p; break } }"') do set "PORT=%%P"

if "%PORT%"=="" (
  echo No free port found between 5173 and 5180.
  pause
  exit /b 1
)

echo Opening http://127.0.0.1:%PORT%/
start "AgenticPrime Browser Delay" cmd /c "timeout /t 2 /nobreak >nul && start "" http://127.0.0.1:%PORT%/"

echo Starting dev server. Close this window to stop AgenticPrime.
call npm run dev -- --host 127.0.0.1 --port %PORT% --strictPort

pause
