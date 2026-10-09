"""Programación y Control de Proyectos (PERT/CPM) — Cadena Crítica de Despacho COER/COEN.
Calcula duraciones esperadas Beta, varianza del proyecto, ruta crítica y probabilidad de cumplimiento.
"""
import math
from typing import Dict, Any, List


class PertCpmEngine:
    """Motor analítico PERT/CPM para la preparación y despacho de misiones humanitarias.
    """

    ACTIVIDADES_BASE = {
        "A": {"desc": "Detección y validación IoT telemetría pluviométrica", "a": 10.0, "m": 15.0, "b": 26.0, "pred": []},
        "B": {"desc": "Declaratoria COE y activación comité de crisis", "a": 15.0, "m": 20.0, "b": 35.0, "pred": ["A"]},
        "C": {"desc": "Inspección mecánica y alistamiento de flota 4x4", "a": 20.0, "m": 30.0, "b": 50.0, "pred": ["B"]},
        "D": {"desc": "Picking y estiba de kits en Almacén Avanzado", "a": 30.0, "m": 45.0, "b": 80.0, "pred": ["B"]},
        "E": {"desc": "Coordinación escolta militar CIRD / Policía", "a": 20.0, "m": 25.0, "b": 45.0, "pred": ["B"]},
        "F": {"desc": "Optimización algorítmica GeoAlert-VRP y waypoints", "a": 5.0,  "m": 10.0, "b": 18.0, "pred": ["A"]},
        "G": {"desc": "Briefing tripulaciones y sincronización GPS", "a": 10.0, "m": 15.0, "b": 25.0, "pred": ["C", "F"]},
        "H": {"desc": "Despacho efectivo y salida del convoy", "a": 5.0,  "m": 10.0, "b": 15.0, "pred": ["D", "E", "G"]}
    }

    @classmethod
    def calculate_critical_path(cls, deadline_minutos: float = 120.0) -> Dict[str, Any]:
        actividades = {k: dict(v) for k, v in cls.ACTIVIDADES_BASE.items()}

        # 1. Esperanzas y Varianzas Beta
        for k, v in actividades.items():
            v["mu"] = round((v["a"] + 4.0 * v["m"] + v["b"]) / 6.0, 2)
            v["var"] = round(((v["b"] - v["a"]) / 6.0) ** 2, 2)

        # 2. Pase hacia adelante (Forward Pass)
        ES, EF = {}, {}
        for k, v in actividades.items():
            if not v["pred"]:
                ES[k] = 0.0
            else:
                ES[k] = max(EF[p] for p in v["pred"])
            EF[k] = round(ES[k] + v["mu"], 2)

        duracion_proyecto_mu = max(EF.values())

        # 3. Pase hacia atrás (Backward Pass)
        sucesores = {k: [] for k in actividades}
        for k, v in actividades.items():
            for p in v["pred"]:
                sucesores[p].append(k)

        LF, LS = {}, {}
        for k in reversed(list(actividades.keys())):
            if not sucesores[k]:
                LF[k] = duracion_proyecto_mu
            else:
                LF[k] = min(LS[s] for s in sucesores[k])
            LS[k] = round(LF[k] - actividades[k]["mu"], 2)

        # 4. Holgura Total y Ruta Crítica
        ruta_critica = []
        var_cp = 0.0
        lista_resultado = []

        for k in actividades:
            tf = round(LS[k] - ES[k], 2)
            es_crit = (abs(tf) < 0.05)
            if es_crit:
                ruta_critica.append(k)
                var_cp += actividades[k]["var"]

            lista_resultado.append({
                "id": k,
                "descripcion": actividades[k]["desc"],
                "predecesores": ",".join(actividades[k]["pred"]) if actividades[k]["pred"] else "-",
                "a": actividades[k]["a"],
                "m": actividades[k]["m"],
                "b": actividades[k]["b"],
                "duracion_esperada_min": actividades[k]["mu"],
                "varianza": actividades[k]["var"],
                "ES": ES[k],
                "EF": EF[k],
                "LS": LS[k],
                "LF": LF[k],
                "holgura_total": tf,
                "es_critica": es_crit
            })

        desv_std_cp = math.sqrt(var_cp)
        z_score = (deadline_minutos - duracion_proyecto_mu) / desv_std_cp
        # Distribución normal acumulada estándar Phi(Z)
        prob_cumplimiento = 0.5 * (1.0 + math.erf(z_score / math.sqrt(2.0)))

        return {
            "duracion_esperada_proyecto_min": round(duracion_proyecto_mu, 2),
            "varianza_ruta_critica": round(var_cp, 2),
            "desviacion_estandar_min": round(desv_std_cp, 2),
            "ruta_critica": ruta_critica,
            "cadena_critica_str": " → ".join(ruta_critica),
            "deadline_evaluado_min": deadline_minutos,
            "z_score": round(z_score, 4),
            "probabilidad_cumplimiento_pct": round(prob_cumplimiento * 100.0, 2),
            "actividades": lista_resultado
        }
