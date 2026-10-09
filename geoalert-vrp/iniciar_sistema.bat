@echo off
chcp 65001 >nul
title GeoAlert-VRP: Centro de Operaciones de Emergencia (COER)
color 0B

echo ==============================================================================
echo       GEOALERT-VRP: SISTEMA INTELIGENTE DE DESPLIEGUE LOGÍSTICO (INVOPE)
echo       Centro de Operaciones de Emergencia Regional (COER Cajamarca)
echo       Tecnologías: FastAPI + SQLite 3FN + PuLP CBC + React + Vite + Leaflet
echo ==============================================================================
echo.

cd /d "%~dp0"

:: 1. Verificar y sembrar base de datos si no existe
if not exist "backend\geoalert_vrp.db" (
    echo [*] Primera ejecución detectada: Sembrando base de datos relacional 3FN...
    cd backend
    python seed_data.py
    cd ..
    echo.
)

:: 2. Iniciar backend FastAPI
echo [*] Iniciando servidor Backend FastAPI en http://127.0.0.1:8000 ...
cd backend
start "GeoAlert-VRP Backend (FastAPI)" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
cd ..

:: 3. Iniciar frontend Vite React
echo [*] Iniciando Sala de Control Frontend React (Vite) en http://localhost:5173 ...
cd frontend
start "GeoAlert-VRP Frontend (React + Vite)" cmd /k "npm.cmd run dev"
cd ..

:: 4. Abrir navegador en frontend y backend
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173"

echo.
echo ==============================================================================
echo [OK] Sistema iniciado exitosamente:
echo      - Frontend React (Sala de Control): http://localhost:5173
echo      - Backend REST API (FastAPI):       http://127.0.0.1:8000
echo      - Documentación Swagger Interactiva: http://127.0.0.1:8000/docs
echo ==============================================================================
echo Presione cualquier tecla para cerrar esta ventana lanzadora...
pause > nul
