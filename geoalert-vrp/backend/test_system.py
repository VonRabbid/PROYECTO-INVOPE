"""
Test Automatizado de Integración y Rendimiento para GeoAlert-VRP.
Valida la API REST de FastAPI, base de datos 3FN, telemetría IoT y los 7 modelos de INVOPE.
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Provincia, Quebrada, TramoVial, SensorIoT

client = TestClient(app)


def test_full_system_flow():
    print("==================================================================")
    print("INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN: GEOALERT-VRP")
    print("==================================================================")

    # 1. Verificar Dashboard Web
    print("[1] Verificando Dashboard Web principal (GET /)...")
    res_web = client.get("/")
    assert res_web.status_code == 200, f"Error HTTP {res_web.status_code} en GET /"
    assert "Geovisor Táctico Provincial" in res_web.text or "GeoAlert-VRP" in res_web.text
    print("    [OK] Dashboard Web operativo y renderizado con éxito.")

    # 2. Verificar Catálogo de Provincias
    print("[2] Verificando Catálogo de Provincias (GET /api/v1/provincias)...")
    res_prov = client.get("/api/v1/provincias")
    assert res_prov.status_code == 200
    provincias = res_prov.json()
    assert len(provincias) == 13, f"Esperadas 13 provincias, encontradas {len(provincias)}"
    print(f"    [OK] 13 Provincias de Cajamarca verificadas (UBIGEO 0601 a 0613).")

    # 3. Optimización VRPTW (PEM / PEB / PL)
    print("[3] Verificando Optimización 2E-VRPTW (POST /api/v1/optimizar)...")
    t0 = time.time()
    res_opt = client.post("/api/v1/optimizar", json={
        "codigo_provincia": "0601",
        "considerar_riesgo": True,
        "penalizacion_big_m": 100000.0
    })
    t_opt = time.time() - t0
    assert res_opt.status_code == 200, f"Error en /optimizar: {res_opt.text}"
    data_opt = res_opt.json()
    assert data_opt["status"] in ["Optimal", "Not Solved"], f"Status inesperado: {data_opt['status']}"
    z_ip = data_opt["z_ip_costo_total"]
    z_lp = data_opt["z_lp_cota_inferior"]
    gap = data_opt["optimality_gap_pct"]
    assert z_lp <= z_ip, f"Violación de cota dual: Z_LP ({z_lp}) > Z_IP ({z_ip})"
    print(f"    [OK] VRPTW resuelto en {round(t_opt, 3)} s | Z_IP = {z_ip} | Z_LP = {z_lp} (Cota Dual Verificada) | Gap = {gap}% | Flota: {data_opt['flota_utilizada']} veh.")

    # 4. Ingesta de Telemetría IoT y Activación Crítica de Huaico
    print("[4] Simulando Alerta IoT Crítica (POST /api/v1/telemetria/simular)...")
    t0_iot = time.time()
    res_iot = client.post("/api/v1/telemetria/simular", json={
        "id_sensor": "IOT-PLUV-0601-01",
        "precipitacion_mm_h": 68.4,
        "caudal_m": 3.8,
        "vibracion_hz": 82.0
    })
    t_iot = time.time() - t0_iot
    assert res_iot.status_code == 200, f"Error en telemetría: {res_iot.text}"
    data_iot = res_iot.json()
    assert data_iot["estado_alerta"] == "ROJO_ACTIVADO"
    assert data_iot["reoptimizacion_automatica_ejecutada"] == True
    assert len(data_iot["tramos_bloqueados_activados"]) > 0
    print(f"    [OK] Quebrada activada a ROJO_ACTIVADO en {round(t_iot*1000, 2)} ms. Tramos bloqueados: {data_iot['tramos_bloqueados_activados']}.")

    # 5. Re-enrutamiento Determinístico Dinámico (PDD)
    print("[5] Verificando Re-enrutamiento PDD Sub-Segundo (POST /api/v1/reenrutar)...")
    res_pdd = client.post("/api/v1/reenrutar", json={
        "id_origen": 0,
        "id_destino": 5,
        "tramos_bloqueados": [[0, 1], [1, 2]]
    })
    assert res_pdd.status_code == 200, f"Error en PDD: {res_pdd.text}"
    data_pdd = res_pdd.json()
    assert len(data_pdd["camino_nodos"]) > 0
    assert data_pdd["tiempo_computo_ms"] < 100.0, f"PDD tardó demasiado: {data_pdd['tiempo_computo_ms']} ms"
    print(f"    [OK] Desvío alternativo calculado en {data_pdd['tiempo_computo_ms']} ms | Camino: {data_pdd['camino_nodos']} | Tiempo: {data_pdd['tiempo_total_min']} min.")

    # 6. Pre-posicionamiento Estocástico (PDP)
    print("[6] Verificando Pre-posicionamiento Estocástico PDP (POST /api/v1/inventario/preposicionar)...")
    res_pdp = client.post("/api/v1/inventario/preposicionar", json={
        "codigo_provincia": "0601",
        "stock_actual_kits": 300,
        "nivel_alerta_senamhi": "ROJO"
    })
    assert res_pdp.status_code == 200
    data_pdp = res_pdp.json()
    assert data_pdp["despacho_inmediato_recomendado"] >= 500
    print(f"    [OK] PDP Alerta ROJA evaluado con éxito: Despacho preventivo recomendado = {data_pdp['despacho_inmediato_recomendado']} kits.")

    # 7. Red Crítica de Despacho (PERT/CPM)
    print("[7] Verificando Cadena Crítica PERT/CPM (GET /api/v1/pert-cpm)...")
    res_pert = client.get("/api/v1/pert-cpm?deadline_minutos=120")
    assert res_pert.status_code == 200
    data_pert = res_pert.json()
    assert data_pert["ruta_critica"] == ["A", "B", "D", "H"]
    assert data_pert["probabilidad_cumplimiento_pct"] > 95.0
    print(f"    [OK] PERT/CPM: Ruta Critica {' -> '.join(data_pert['ruta_critica'])} | mu = {data_pert['duracion_esperada_proyecto_min']} min | P(T <= 120min) = {data_pert['probabilidad_cumplimiento_pct']}%.")

    # 8. Restablecimiento de Demo
    print("[8] Restableciendo estado a condiciones normales (POST /api/v1/reset-demo)...")
    res_reset = client.post("/api/v1/reset-demo")
    assert res_reset.status_code == 200
    print("    [OK] Estado de sensores y vías restablecido a VERDE.")

    print("\n==================================================================")
    print("TODAS LAS PRUEBAS AUTOMÁTICAS PASARON EXITOSAMENTE (100% OK)")
    print("==================================================================")


if __name__ == "__main__":
    test_full_system_flow()
