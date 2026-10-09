"""Test suite: Validación exacta contra los datos, tablas y fórmulas del informe.

Comprueba con rigurosidad:
1. Pilar 1 (PDP): valores f1(S1)=108.61, f1(S2)=196.52, f1(S3)=263.56 (Tablas 7 y 8).
2. Pilar 2 (PERT/CPM): mu_CP = 190.00 min, sigma_CP = 10.5145 min, ruta crítica y Normal CDF (Tablas 9, 10 y 11).
3. Pilar 3 (VRPTW): Z* = 357 min en escenario base y Z* = 366 min ante bloqueo R4 <-> R6 (Tablas 14, 15 y 16).
4. Integración FastAPI: endpoints REST y orquestación M2M.
"""
import pytest
import math
from fastapi.testclient import TestClient

from app.core_io.pilar1_pdp import solve_bellman_backward, solve_pdp, classify_state
from app.core_io.pilar2_pert import calculate_pert, calculate_target_probability
from app.core_io.pilar3_vrptw import solve_vrptw_model
from app.main import app
from app.database.seed_cajamarca import seed_database
from app.database.session import SessionLocal


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    seed_database()


# -------------------------------------------------------------
# 1. PRUEBAS PILAR 1: PROGRAMACIÓN DINÁMICA PROBABILÍSTICA (BELLMAN)
# -------------------------------------------------------------
def test_pdp_bellman_exact_values():
    """Valida los valores de Bellman etapa por etapa contra la Tabla 7 y 8 del informe."""
    sol = solve_bellman_backward()
    f = sol["f_values"]
    Q = sol["Q_values"]
    opt = sol["optimal_policy"]

    # Etapa 3
    assert f[3]["S1"] == pytest.approx(33.80, abs=0.01)
    assert f[3]["S2"] == pytest.approx(114.00, abs=0.01)
    assert f[3]["S3"] == pytest.approx(219.00, abs=0.01)
    assert opt[3]["S1"] == "A1"
    assert opt[3]["S2"] == "A2"
    assert opt[3]["S3"] == "A3"

    # Etapa 2
    assert f[2]["S1"] == pytest.approx(71.26, abs=0.01)
    assert f[2]["S2"] == pytest.approx(158.96, abs=0.01)
    assert f[2]["S3"] == pytest.approx(234.47, abs=0.01)
    assert opt[2]["S1"] == "A1"
    assert opt[2]["S2"] == "A2"
    assert opt[2]["S3"] == "A3"

    # Etapa 1 (Requerimiento explícito)
    assert f[1]["S1"] == pytest.approx(108.61, abs=0.01)
    assert f[1]["S2"] == pytest.approx(196.52, abs=0.01)
    assert f[1]["S3"] == pytest.approx(263.56, abs=0.01)
    assert opt[1]["S1"] == "A1"
    assert opt[1]["S2"] == "A2"
    assert opt[1]["S3"] == "A3"


def test_pdp_classification_and_coupling():
    """Valida la clasificación hidrometeorológica y la regla de acoplamiento."""
    # S1 (Normal / Verde)
    s1, _ = classify_state(precipitation_mm_h=5.0, soil_saturation_pct=40.0)
    assert s1 == "S1"
    res1 = solve_pdp(stage=1, current_state=s1)
    assert res1["optimal_action"] == "A1"
    assert res1["trigger_protocol"] is False  # A1 no dispara

    # S2 (Alerta amarilla)
    s2, _ = classify_state(precipitation_mm_h=18.0, soil_saturation_pct=65.0)
    assert s2 == "S2"
    res2 = solve_pdp(stage=1, current_state=s2)
    assert res2["optimal_action"] == "A2"
    assert res2["trigger_protocol"] is True  # A2 dispara protocolo

    # S3 (Alerta roja)
    s3, _ = classify_state(precipitation_mm_h=35.0, soil_saturation_pct=88.0)
    assert s3 == "S3"
    res3 = solve_pdp(stage=1, current_state=s3)
    assert res3["optimal_action"] == "A3"
    assert res3["trigger_protocol"] is True  # A3 dispara protocolo


# -------------------------------------------------------------
# 2. PRUEBAS PILAR 2: PROGRAMACIÓN PERT/CPM
# -------------------------------------------------------------
def test_pert_critical_path_and_duration():
    """Valida la red de 10 actividades, holguras, mu_CP y varianza contra Tablas 9 y 10."""
    pert = calculate_pert()

    # Ruta crítica exacta: A -> B -> C -> E -> H -> I -> J
    assert pert["ruta_critica"] == ["A", "B", "C", "E", "H", "I", "J"]
    assert pert["ruta_critica_str"] == "A -> B -> C -> E -> H -> I -> J"

    # Duración esperada mu_CP = 190.00 min
    assert pert["mu_CP"] == pytest.approx(190.00, abs=0.01)

    # Varianza var_CP = 110.56 min^2 y desviación estándar sigma_CP = 10.5145 min
    assert pert["var_CP"] == pytest.approx(110.56, abs=0.05)
    assert pert["sigma_CP"] == pytest.approx(10.5145, abs=0.01)

    # Holguras de actividades no críticas (Tabla 10)
    act_map = {a["codigo"]: a for a in pert["actividades"]}
    assert act_map["D"]["holgura"] == pytest.approx(41.00, abs=0.01)
    assert act_map["F"]["holgura"] == pytest.approx(72.00, abs=0.01)
    assert act_map["G"]["holgura"] == pytest.approx(66.00, abs=0.01)
    assert act_map["D"]["es_critica"] is False
    assert act_map["C"]["es_critica"] is True
    assert act_map["E"]["es_critica"] is True


def test_pert_target_probabilities():
    """Valida los Z-scores y probabilidades Normales acumuladas contra Tabla 11."""
    pert = calculate_pert()
    eval_map = {row["T_target"]: row for row in pert["evaluacion_umbrales"]}

    # T = 170 min
    assert eval_map[170.0]["Z_score"] == pytest.approx(-1.9021, abs=0.005)
    assert eval_map[170.0]["probabilidad_pct"] == pytest.approx(2.86, abs=0.1)

    # T = 180 min
    assert eval_map[180.0]["Z_score"] == pytest.approx(-0.9511, abs=0.005)
    assert eval_map[180.0]["probabilidad_pct"] == pytest.approx(17.08, abs=0.1)

    # T = 190 min
    assert eval_map[190.0]["Z_score"] == pytest.approx(0.0000, abs=0.001)
    assert eval_map[190.0]["probabilidad_pct"] == pytest.approx(50.00, abs=0.1)

    # T = 210 min
    assert eval_map[210.0]["Z_score"] == pytest.approx(1.9021, abs=0.005)
    assert eval_map[210.0]["probabilidad_pct"] == pytest.approx(97.14, abs=0.1)


# -------------------------------------------------------------
# 3. PRUEBAS PILAR 3: DVRPTW CON GOOGLE OR-TOOLS
# -------------------------------------------------------------
def test_vrptw_base_scenario():
    """Valida el escenario base contra Tablas 14 y 16: Z* = 357 min, 2 camiones, 18 t abastecidas."""
    res = solve_vrptw_model(blocked_edges=None)
    assert res["status"] == "OPTIMAL"
    assert res["is_feasible"] is True
    assert res["Z_star_tiempo_total"] == 357
    assert res["demanda_abastecida_t"] == 18
    assert res["cobertura_demanda_pct"] == 100.0
    assert len(res["rutas"]) == 2

    # Camión 1: N0 -> R1 -> R3 -> R5 -> N0 (202 min, 10 t)
    c1 = res["rutas"][0]
    assert c1["carga_inicial_t"] == 10
    assert c1["tiempo_ruta_min"] == 202
    assert [s["nodo_codigo"] for s in c1["paradas"]] == ["N0", "R1", "R3", "R5", "N0"]

    # Camión 2: N0 -> R6 -> R4 -> R2 -> N0 (155 min, 8 t)
    c2 = res["rutas"][1]
    assert c2["carga_inicial_t"] == 8
    assert c2["tiempo_ruta_min"] == 155
    assert [s["nodo_codigo"] for s in c2["paradas"]] == ["N0", "R6", "R4", "R2", "N0"]


def test_vrptw_roadblock_scenario_r4_r6():
    """Valida el escenario dinámico con corte R4 <-> R6 contra Tablas 15 y 16: Z* = 366 min (+9 min)."""
    res = solve_vrptw_model(blocked_edges=[("R4", "R6")])
    assert res["status"] == "OPTIMAL"
    assert res["is_feasible"] is True
    assert res["Z_star_tiempo_total"] == 366
    assert res["demanda_abastecida_t"] == 18
    assert res["vehiculos_atrapados"] == 0

    # Camión 1: N0 -> R6 -> R1 -> R5 -> N0 (202 min, 8 t)
    c1 = res["rutas"][0]
    assert c1["carga_inicial_t"] == 8
    assert c1["tiempo_ruta_min"] == 202
    assert [s["nodo_codigo"] for s in c1["paradas"]] == ["N0", "R6", "R1", "R5", "N0"]

    # Camión 2: N0 -> R4 -> R3 -> R2 -> N0 (164 min, 10 t)
    c2 = res["rutas"][1]
    assert c2["carga_inicial_t"] == 10
    assert c2["tiempo_ruta_min"] == 164
    assert [s["nodo_codigo"] for s in c2["paradas"]] == ["N0", "R4", "R3", "R2", "N0"]


# -------------------------------------------------------------
# 4. PRUEBAS DE INTEGRACIÓN FASTAPI Y PIPELINE COMPLETO
# -------------------------------------------------------------
def test_api_telemetry_and_pipeline():
    """Valida la API REST de telemetría y orquestación M2M de 5 fases."""
    client = TestClient(app)

    # Ingesta
    resp_ingest = client.post("/api/telemetry/ingest", json={
        "precipitacion_mm_h": 32.0,
        "saturacion_suelo_pct": 85.0,
        "etapa": 1
    })
    assert resp_ingest.status_code == 200
    data_ingest = resp_ingest.json()
    assert data_ingest["estado_clasificado"] == "S3"
    assert data_ingest["accion_optima"] == "A3"
    assert data_ingest["dispara_protocolo"] is True

    # PERT
    resp_pert = client.post("/api/pert/calculate", json={"t_alerta": 10.0})
    assert resp_pert.status_code == 200
    data_pert = resp_pert.json()
    assert data_pert["mu_CP"] == 190.00
    assert data_pert["hora_partida_T0"] == 200.00

    # Pipeline Full
    resp_pipe = client.get("/api/pipeline/run-full?precipitacion_mm_h=30&saturacion_suelo_pct=85&etapa=1")
    assert resp_pipe.status_code == 200
    data_pipe = resp_pipe.json()
    assert data_pipe["fase1_pdp"]["accion_optima"] == "A3"
    assert data_pipe["fase2_pert"]["mu_CP"] == 190.00
    assert data_pipe["fase3_vrptw"]["Z_star_tiempo_total"] in [357, 366]
