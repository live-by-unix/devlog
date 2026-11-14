@echo off
REM Devlog — start in development mode (Windows)
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. & exit /b 1)
if not exist node_modules call npm install
if not exist .env copy .env.example .env
npm run build --workspace @devlog/shared
start "devlog-api" cmd /k "cd apps\server && npx tsx src\index.ts"
timeout /t 2 >nul
start "devlog-web" cmd /k "cd apps\web && npx vite --port 5173"
echo.
echo Devlog API:      http://localhost:3001
echo Devlog Frontend: http://localhost:5173
