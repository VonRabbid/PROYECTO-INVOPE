@echo off
TITLE GeoAlert-VRP Launcher
echo =========================================================================
echo      GeoAlert-VRP: Sistema de Alerta Temprana y Despliegue Logistico
echo                   COER Cajamarca - Activacion de Quebradas
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando entorno backend...
cd backend
start "GeoAlert-VRP Backend (FastAPI)" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Verificando entorno frontend...
cd ..\frontend
start "GeoAlert-VRP Frontend (Vite React)" cmd /k "npm.cmd run dev"

echo.
echo [3/3] Aplicacion iniciada exitosamente:
echo   - Backend API y Swagger UI: http://127.0.0.1:8000/docs
echo   - Frontend Sala de Control: http://localhost:5173
echo.
echo Presione cualquier tecla para cerrar esta ventana de lanzamiento...
pause > nul
