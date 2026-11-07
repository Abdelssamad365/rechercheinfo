@echo off
echo ====================================================
echo Starting FastAPI Backend Server on http://127.0.0.1:8000
echo API Docs available at: http://127.0.0.1:8000/docs
echo ====================================================
cd /d "%~dp0..\backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause

