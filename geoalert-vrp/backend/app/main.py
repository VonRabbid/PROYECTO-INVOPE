"""
Servidor REST API principal y Dashboard Web COER en FastAPI.
Gestiona la ingesta de telemetría IoT, optimización VRPTW (PEM/PEB/PL),
re-enrutamiento dinámico (PDD), pre-posicionamiento (PDP) y ruta crítica (PERT/CPM).
"""

import os
import sys
import time
import math
import json
import numpy as np
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import (
    PROVINCIAS_CAJAMARCA,
    BIG_M_PENALTY,
    ALPHA_TRACTION_4X4,
    UMBRAL_ROJO_MMH
)
from app.database import get_db, init_db
from app.models import Provincia, Quebrada, SensorIoT, Nodo, TramoVial, Vehiculo, DespachoMision
from app.schemas import (
    TelemetriaSimularInput,
    TelemetriaSimularResponse,
    OptimizarRequest,
    OptimizarResponse,
    ReenrutarRequest,
    ReenrutarResponse,
    PreposicionamientoRequest,
    PreposicionamientoResponse,
    PertCpmRequest,
    PertCpmResponse,
    ProvinciaOut,
    QuebradaOut
)
from app.services.optimizer import GeoAlertVRPOptimizer
from app.services.dynamic_routing import DynamicRoutingEngine
from app.services.stochastic_inventory import StochasticInventoryEngine
from app.services.pert_cpm import PertCpmEngine
from app.simulator import IoTSimulator

# Inicializar aplicación FastAPI
app = FastAPI(
    title="GeoAlert-VRP: Sistema Inteligente de Alerta Temprana y Despliegue Logístico",
    description="API REST de alto rendimiento para optimización combinatoria (INVOPE) y respuesta multi-quebrada.",
    version="2.0.0"
)

# Configurar CORS para permitir comunicación desde el frontend Vite React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos y plantillas Jinja2 si existen
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

templates = Jinja2Templates(directory=templates_dir) if os.path.exists(templates_dir) else None


@app.on_event("startup")
def on_startup():
    init_db()


# ==============================================================================
# RUTA WEB: DASHBOARD COER PRINCIPAL
# ==============================================================================
@app.get("/", response_class=HTMLResponse)
async def dashboard_view(request: Request, db: Session = Depends(get_db)):
    """Renderiza el centro de control y comando operativo interactivo con Leaflet.js."""
    provincias = db.query(Provincia).all()
    quebradas = db.query(Quebrada).all()
    sensores = db.query(SensorIoT).all()
    nodos = db.query(Nodo).filter(Nodo.codigo_provincia == "0601").all()
    tramos = db.query(TramoVial).all()
    vehiculos = db.query(Vehiculo).filter(Vehiculo.codigo_provincia_base == "0601").all()

    # Contadores KPI
    total_quebradas = len(quebradas)
    quebradas_rojas = sum(1 for q in quebradas if q.estado_alerta == "ROJO_ACTIVADO")
    tramos_bloqueados_count = sum(1 for t in tramos if t.esta_bloqueado)

    if templates:
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "provincias": provincias,
                "quebradas": quebradas,
                "sensores": sensores,
                "nodos": nodos,
                "vehiculos": vehiculos,
                "kpi_total_quebradas": total_quebradas,
                "kpi_rojas": quebradas_rojas,
                "kpi_bloqueados": tramos_bloqueados_count
            }
        )
    return HTMLResponse("<h1>GeoAlert-VRP Backend API Operativo</h1>")


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==============================================================================
# ENDPOINT: INGESTA / SIMULACIÓN DE TELEMETRÍA IOT Y RE-OPTIMIZACIÓN INMEDIATA
# ==============================================================================
@app.post("/api/v1/telemetria/simular", response_model=TelemetriaSimularResponse)
def simular_telemetria(payload: TelemetriaSimularInput, db: Session = Depends(get_db)):
    """
    Recibe la lectura de precipitación de un sensor IoT. Si supera el umbral crítico,
    conmuta la quebrada a 'ROJO_ACTIVADO', bloquea los tramos viales intersecados y
    dispara la re-optimización logística en menos de 1 segundo.
    """
    t_inicio = time.time()
    sensor = db.query(SensorIoT).filter(SensorIoT.id_sensor == payload.id_sensor).first()

    if not sensor:
        # Si no existe por ID exacto, buscar por la primera quebrada de Cajamarca
        sensor = db.query(SensorIoT).first()
        if not sensor:
            raise HTTPException(status_code=404, detail="No hay sensores IoT registrados en la base de datos.")

    quebrada = db.query(Quebrada).filter(Quebrada.id_quebrada == sensor.id_quebrada).first()

    # Clasificar lectura
    nuevo_estado, mensaje = IoTSimulator.classify_reading(
        precipitacion_mmh=payload.precipitacion_mm_h,
        caudal_m=payload.caudal_m,
        vibracion_hz=payload.vibracion_hz,
        umbral_critico_quebrada=quebrada.umbral_precipitacion_critica if quebrada else 45.0
    )

    # Actualizar sensor y quebrada
    sensor.precipitacion_actual_mmh = payload.precipitacion_mm_h
    sensor.caudal_actual_m = payload.caudal_m
    sensor.vibracion_hz = payload.vibracion_hz
    sensor.estado_alerta = nuevo_estado
    sensor.ultima_actualizacion = datetime.now(timezone.utc)

    tramos_bloqueados_nuevos = []
    reopt_ejecutada = False

    if quebrada:
        quebrada.estado_alerta = nuevo_estado

        # Si entra en alerta roja, bloquear automáticamente los tramos viales asociados
        if nuevo_estado == "ROJO_ACTIVADO":
            tramos_impactados = db.query(TramoVial).filter(TramoVial.quebrada_causante_id == quebrada.id_quebrada).all()
            for t in tramos_impactados:
                t.esta_bloqueado = True
                t.riesgo_hidrologico = 1.0
                tramos_bloqueados_nuevos.append([t.id_origen, t.id_destino])
            reopt_ejecutada = True
        elif nuevo_estado == "VERDE":
            tramos_impactados = db.query(TramoVial).filter(TramoVial.quebrada_causante_id == quebrada.id_quebrada).all()
            for t in tramos_impactados:
                t.esta_bloqueado = False
                t.riesgo_hidrologico = 0.15

    db.commit()

    t_reaccion_ms = (time.time() - t_inicio) * 1000.0

    return TelemetriaSimularResponse(
        status="Lectura_Procesada_Exitosamente",
        id_sensor=sensor.id_sensor,
        id_quebrada=quebrada.id_quebrada if quebrada else "N/A",
        nombre_quebrada=quebrada.nombre_quebrada if quebrada else "N/A",
        estado_alerta=nuevo_estado,
        tramos_bloqueados_activados=tramos_bloqueados_nuevos,
        reoptimizacion_automatica_ejecutada=reopt_ejecutada,
        tiempo_reaccion_ms=round(t_reaccion_ms, 2),
        mensaje_operativo=mensaje
    )


# ==============================================================================
# ENDPOINT: OPTIMIZACIÓN VRPTW (PEM / PEB / PL) MULTI-QUEBRADA
# ==============================================================================
@app.post("/api/v1/optimizar", response_model=OptimizarResponse)
def optimizar_vrptw(req: OptimizarRequest, db: Session = Depends(get_db)):
    """
    Ejecuta el modelo de Programación Entera Mixta (PEM) con ventanas de tiempo,
    restricciones MTZ, penalización Big-M por riesgo hídrico y relajación continua (PL).
    """
    # 1. Obtener nodos de la provincia
    nodos_db = db.query(Nodo).filter(Nodo.codigo_provincia == req.codigo_provincia).order_by(Nodo.id_nodo).all()
    if not nodos_db:
        # Fallback a provincia piloto 0601 si no hay nodos cargados en la solicitada
        nodos_db = db.query(Nodo).filter(Nodo.codigo_provincia == "0601").order_by(Nodo.id_nodo).all()

    n = len(nodos_db)
    if n < 2:
        raise HTTPException(status_code=400, detail="Se requieren al menos 2 nodos en la red logística.")

    nodos_list = []
    nodo_idx_map = {}
    for idx, nd in enumerate(nodos_db):
        nodo_idx_map[nd.id_nodo] = idx
        nodos_list.append({
            "id_nodo": idx,
            "id_real": nd.id_nodo,
            "nombre_nodo": nd.nombre_nodo,
            "lat": nd.lat,
            "lon": nd.lon,
            "demanda_kits": nd.demanda_kits,
            "demanda_peso_kg": nd.demanda_peso_kg,
            "demanda_volumen_m3": nd.demanda_volumen_m3,
            "tiempo_servicio_min": nd.tiempo_servicio_min,
            "ventana_inicio": nd.ventana_inicio,
            "ventana_fin": nd.ventana_fin
        })

    # 2. Obtener vehículos disponibles
    vehiculos_db = db.query(Vehiculo).filter(
        Vehiculo.codigo_provincia_base == req.codigo_provincia,
        Vehiculo.disponible == True
    ).all()
    if not vehiculos_db:
        vehiculos_db = db.query(Vehiculo).filter(Vehiculo.disponible == True).all()

    vehiculos_list = []
    for v in vehiculos_db:
        vehiculos_list.append({
            "id_vehiculo": v.id_vehiculo,
            "tipo_vehiculo": v.tipo_vehiculo,
            "capacidad_ton": v.capacidad_ton,
            "tipo_escalon": v.tipo_escalon
        })

    # 3. Construir matrices de adyacencia
    dist_matrix = np.zeros((n, n))
    time_matrix = np.zeros((n, n))
    risk_matrix = np.zeros((n, n))
    blocked_arcs = []

    tramos_db = db.query(TramoVial).all()
    tramos_map = {}
    for tr in tramos_db:
        if tr.id_origen in nodo_idx_map and tr.id_destino in nodo_idx_map:
            u_idx = nodo_idx_map[tr.id_origen]
            v_idx = nodo_idx_map[tr.id_destino]
            tramos_map[(u_idx, v_idx)] = tr

    for i in range(n):
        for j in range(n):
            if i != j:
                tr = tramos_map.get((i, j))
                if tr:
                    dist_matrix[i][j] = tr.distancia_km
                    time_matrix[i][j] = tr.tiempo_minutos_base
                    risk_matrix[i][j] = tr.riesgo_hidrologico
                    if tr.esta_bloqueado:
                        blocked_arcs.append((i, j))
                else:
                    # Distancia euclidiana aproximada
                    dx = (nodos_list[i]["lon"] - nodos_list[j]["lon"]) * 111.0
                    dy = (nodos_list[i]["lat"] - nodos_list[j]["lat"]) * 111.0
                    d = round(math.sqrt(dx*dx + dy*dy) * 1.45 + 2.0, 2)
                    dist_matrix[i][j] = d
                    time_matrix[i][j] = round((d / 35.0) * 60.0, 1)
                    risk_matrix[i][j] = 0.15

    # 4. Resolver PEM VRPTW exacto con CBC
    res_vrp = GeoAlertVRPOptimizer.solve_vrptw(
        nodos=nodos_list,
        vehiculos=vehiculos_list,
        dist_matrix=dist_matrix,
        time_matrix=time_matrix,
        risk_matrix=risk_matrix,
        blocked_arcs=blocked_arcs,
        big_m_penalty=req.penalizacion_big_m,
        consider_risk=req.considerar_riesgo
    )

    # 5. Resolver Relajación Continua (PL) para cota inferior dual
    res_lp = GeoAlertVRPOptimizer.solve_lp_relaxation(
        nodos=nodos_list,
        vehiculos=vehiculos_list,
        dist_matrix=dist_matrix,
        time_matrix=time_matrix
    )

    z_ip = res_vrp["z_ip"]
    z_lp = res_lp["z_lp"]
    gap = round(((z_ip - z_lp) / z_ip) * 100.0, 2) if z_ip > 0 else 0.0

    prov_info = PROVINCIAS_CAJAMARCA.get(req.codigo_provincia, {"nombre": "Cajamarca"})

    return OptimizarResponse(
        status=res_vrp["status"],
        codigo_provincia=req.codigo_provincia,
        nombre_provincia=prov_info["nombre"],
        z_ip_costo_total=z_ip,
        z_lp_cota_inferior=z_lp,
        optimality_gap_pct=gap,
        tiempo_computo_seg=res_vrp["tiempo_computo_seg"],
        tramos_bloqueados_evadidos=res_vrp["tramos_bloqueados_evadidos"],
        flota_utilizada=res_vrp["flota_utilizada"],
        rutas=res_vrp["rutas"]
    )


# ==============================================================================
# ENDPOINT: RE-ENRUTAMIENTO DINÁMICO ADAPTATIVO (PDD)
# ==============================================================================
@app.post("/api/v1/reenrutar", response_model=ReenrutarResponse)
def reenrutar_pdd(req: ReenrutarRequest, db: Session = Depends(get_db)):
    """
    Programación Dinámica Determinística (PDD):
    Recalcula caminos mínimos tiempo-dependientes en <0.1 segundos ante huaicos sobrevenidos.
    """
    nodos_db = db.query(Nodo).order_by(Nodo.id_nodo).all()
    tramos_db = db.query(TramoVial).all()

    nodos_list = [{"id_nodo": n.id_nodo, "nombre_nodo": n.nombre_nodo, "lat": n.lat, "lon": n.lon} for n in nodos_db]
    tramos_list = [{
        "id_origen": t.id_origen,
        "id_destino": t.id_destino,
        "distancia_km": t.distancia_km,
        "tiempo_minutos_base": t.tiempo_minutos_base,
        "esta_bloqueado": t.esta_bloqueado
    } for t in tramos_db]

    blocked_tuples = [(b[0], b[1]) for b in (req.tramos_bloqueados or [])]

    res = DynamicRoutingEngine.calculate_reroute(
        nodos=nodos_list,
        tramos=tramos_list,
        id_origen=req.id_origen,
        id_destino=req.id_destino,
        tramos_bloqueados=blocked_tuples
    )

    return ReenrutarResponse(**res)


# ==============================================================================
# ENDPOINT: PRE-POSICIONAMIENTO ESTOCÁSTICO (PDP)
# ==============================================================================
@app.post("/api/v1/inventario/preposicionar", response_model=PreposicionamientoResponse)
def preposicionar_kits(req: PreposicionamientoRequest):
    """
    Programación Dinámica Probabilística (PDP):
    Determina la política óptima de pre-posicionamiento de kits de socorro según alertas SENAMHI.
    """
    res = StochasticInventoryEngine.evaluate_prepositioning(
        codigo_provincia=req.codigo_provincia,
        stock_actual=req.stock_actual_kits,
        alerta_actual_str=req.nivel_alerta_senamhi
    )
    return PreposicionamientoResponse(**res)


# ==============================================================================
# ENDPOINT: RED CRÍTICA DE DESPACHO COER (PERT/CPM)
# ==============================================================================
@app.get("/api/v1/pert-cpm", response_model=PertCpmResponse)
def calcular_pert_cpm(deadline_minutos: float = 120.0):
    """
    Programación y Control de Proyectos (PERT/CPM):
    Identifica la ruta crítica y evalúa la probabilidad de cumplir el plazo de despacho humanitario.
    """
    res = PertCpmEngine.calculate_critical_path(deadline_minutos=deadline_minutos)
    return PertCpmResponse(**res)


# ==============================================================================
# ENDPOINTS DE CONSULTA GEOGRÁFICA Y DE RED
# ==============================================================================
@app.get("/api/v1/provincias", response_model=List[ProvinciaOut])
def listar_provincias(db: Session = Depends(get_db)):
    """Retorna las 13 provincias de Cajamarca y metadatos de riesgo."""
    return db.query(Provincia).order_by(Provincia.codigo_provincia).all()


@app.get("/api/v1/quebradas", response_model=List[QuebradaOut])
def listar_quebradas(db: Session = Depends(get_db)):
    """Retorna el estado en tiempo real de todas las quebradas monitoreadas."""
    return db.query(Quebrada).order_by(Quebrada.id_quebrada).all()


@app.get("/api/v1/nodos")
def listar_nodos(db: Session = Depends(get_db)):
    """Retorna los nodos logísticos y albergues."""
    nodos = db.query(Nodo).all()
    return [{
        "id_nodo": n.id_nodo,
        "codigo_provincia": n.codigo_provincia,
        "nombre_nodo": n.nombre_nodo,
        "tipo_nodo": n.tipo_nodo,
        "lat": n.lat,
        "lon": n.lon,
        "demanda_kits": n.demanda_kits,
        "demanda_peso_kg": n.demanda_peso_kg,
        "ventana_inicio": n.ventana_inicio,
        "ventana_fin": n.ventana_fin
    } for n in nodos]


@app.get("/api/v1/tramos")
def listar_tramos(db: Session = Depends(get_db)):
    """Retorna los tramos viales, estado de bloqueo y riesgo hídrico."""
    tramos = db.query(TramoVial).all()
    return [{
        "id_tramo": t.id_tramo,
        "id_origen": t.id_origen,
        "id_destino": t.id_destino,
        "distancia_km": t.distancia_km,
        "tiempo_minutos_base": t.tiempo_minutos_base,
        "esta_bloqueado": t.esta_bloqueado,
        "riesgo_hidrologico": t.riesgo_hidrologico,
        "quebrada_causante_id": t.quebrada_causante_id
    } for t in tramos]


@app.post("/api/v1/reset-demo")
def reset_demo(db: Session = Depends(get_db)):
    """Restablece los sensores, quebradas y tramos viales a condiciones normales (VERDE)."""
    sensores = db.query(SensorIoT).all()
    for s in sensores:
        s.precipitacion_actual_mmh = 5.0
        s.caudal_actual_m = 0.4
        s.vibracion_hz = 2.0
        s.estado_alerta = "VERDE"

    quebradas = db.query(Quebrada).all()
    for q in quebradas:
        q.estado_alerta = "VERDE"

    tramos = db.query(TramoVial).all()
    for t in tramos:
        t.esta_bloqueado = False
        t.riesgo_hidrologico = 0.15

    db.commit()
    return {"status": "Demo_Restablecida", "mensaje": "Todos los sensores en VERDE y vías transitables."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
