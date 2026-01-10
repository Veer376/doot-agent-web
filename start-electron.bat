@echo off
set NODE_ENV=development
start /B npm run dev
timeout /t 10 /nobreak
npx electron .
