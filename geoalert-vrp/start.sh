#!/usr/bin/env bash
# Script de inicio para entornos Unix/Linux/macOS/WSL
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "========================================================================="
echo "     GeoAlert-VRP: Sistema de Alerta Temprana y Despliegue Logístico"
echo "                  COER Cajamarca - Activación de Quebradas"
echo "========================================================================="

echo "[1/2] Iniciando Backend FastAPI en segundo plano..."
cd "$DIR/backend"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "[2/2] Iniciando Frontend React en segundo plano..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Sistema en ejecucion:"
echo "  - Backend Docs: http://127.0.0.1:8000/docs"
echo "  - Frontend UI:   http://localhost:5173"
echo ""
echo "Presione Ctrl+C para detener ambos servicios."

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
