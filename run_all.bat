@echo off
echo ====================================================
echo Launching ReutersIR Studio (Full Stack System)
echo ====================================================

start "ReutersIR - FastAPI Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

start "ReutersIR - React Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are launching!
echo Backend:  http://127.0.0.1:8000  (Swagger Docs: http://127.0.0.1:8000/docs)
echo Frontend: http://localhost:5173
echo.
