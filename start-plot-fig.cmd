@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title Plot Fig - Development Server

set "CHECK_ONLY="
set "OPEN_BROWSER=--open"
if /i "%~1"=="--check" set "CHECK_ONLY=1"
if /i "%~1"=="--no-open" set "OPEN_BROWSER="

echo [1/3] Checking Node.js and pnpm...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Node.js was not found. Install Node.js 24.13.0 or newer.
  goto :failed
)

for /f "delims=" %%V in ('node --version') do set "NODE_VERSION=%%V"
node -e "const [a,b,c]=process.versions.node.split('.').map(Number); process.exit(a>24 || (a===24 && (b>13 || (b===13 && c>=0))) ? 0 : 1)"
if errorlevel 1 (
  echo.
  echo ERROR: Found Node.js %NODE_VERSION%, but this project requires 24.13.0 or newer.
  goto :failed
)

where pnpm >nul 2>nul
if not errorlevel 1 (
  set "PNPM_COMMAND=pnpm"
) else (
  where corepack >nul 2>nul
  if errorlevel 1 (
    echo.
    echo ERROR: pnpm and Corepack were not found.
    echo Install pnpm 11.19.0, then run this file again.
    goto :failed
  )
  set "PNPM_COMMAND=corepack pnpm"
)

for /f "delims=" %%V in ('%PNPM_COMMAND% --version') do set "PNPM_VERSION=%%V"
echo       Node.js %NODE_VERSION%, pnpm %PNPM_VERSION%

echo [2/3] Restoring dependencies from pnpm-lock.yaml...
call %PNPM_COMMAND% install --frozen-lockfile --prefer-offline
if errorlevel 1 (
  echo.
  echo ERROR: Dependency installation failed. Review the message above.
  goto :failed
)

if defined CHECK_ONLY (
  echo [3/3] Environment check passed. The project is ready to run.
  exit /b 0
)

echo [3/3] Starting Plot Fig...
echo       Vite will print the actual local address below.
echo       Press Ctrl+C to stop the server.
echo.
call %PNPM_COMMAND% --filter @plot-fig/web-editor dev --host 127.0.0.1 --port 5173 %OPEN_BROWSER%
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo ERROR: Plot Fig stopped with exit code %EXIT_CODE%.
  goto :failed_with_code
)
exit /b 0

:failed
set "EXIT_CODE=1"

:failed_with_code
echo.
pause
exit /b %EXIT_CODE%
