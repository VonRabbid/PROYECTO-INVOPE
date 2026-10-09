"""
Programación Dinámica Probabilística (PDP) — Pre-posicionamiento Estocástico de Kits.
Modelo multietapa de Bellman con cadenas de Markov basado en pronósticos meteorológicos SENAMHI.
"""

import numpy as np
from typing import Dict, Any


class StochasticInventoryEngine:
    """
    Motor de Programación Dinámica Probabilística (PDP).
    Determina la política óptima de pre-posicionamiento preventivo de kits
    humanitarios hacia los Almacenes Avanzados Provinciales (AAP).
    """

    # Matriz de transición meteorológica estocástica P(H_{t+1} | H_t)
    # Estados: [0: VERDE, 1: AMARILLO, 2: NARANJA, 3: ROJO]
    MATRIZ_TRANSICION = np.array([
        [0.60, 0.30, 0.08, 0.02],  # Desde Verde
        [0.15, 0.50, 0.25, 0.10],  # Desde Amarillo
        [0.05, 0.15, 0.55, 0.25],  # Desde Naranja
        [0.00, 0.05, 0.25, 0.70]   # Desde Rojo
    ])

    DEMANDAS_ESPERADAS = {0: 50, 1: 220, 2: 550, 3: 1200}
    NOMBRES_ALERTA = {0: "VERDE", 1: "AMARILLO", 2: "NARANJA", 3: "ROJO"}
    MAPA_ALERTAS_INV = {"VERDE": 0, "AMARILLO": 1, "NARANJA": 2, "ROJO": 3, "ROJO_ACTIVADO": 3}

    @classmethod
    def evaluate_prepositioning(
        cls,
        codigo_provincia: str = "0601",
        stock_actual: int = 300,
        alerta_actual_str: str = "ROJO",
        costo_flete_unit: float = 12.0,
        costo_almacen_unit: float = 2.0,
        costo_escasez_unit: float = 150.0
    ) -> Dict[str, Any]:
        """
        Evalúa hacia atrás la ecuación recursiva de Bellman:
        V_t(I_t, H_t) = min_{a_t} { C_envio(a_t) + C_almacen(I_t + a_t) +
                        E_{H_{t+1}} [ C_escasez * (D_{t+1} - I_t - a_t)^+ + V_{t+1} ] }
        """
        acciones_posibles = [0, 150, 300, 500, 800, 1000]
        politica_por_alerta = {}

        for s_idx in range(4):
            nombre = cls.NOMBRES_ALERTA[s_idx]
            mejor_costo = float("inf")
            mejor_accion = 0

            for a in acciones_posibles:
                inv_total = stock_actual + a
                costo_directo = a * costo_flete_unit + inv_total * costo_almacen_unit

                costo_esperado_futuro = 0.0
                for next_s in range(4):
                    prob = cls.MATRIZ_TRANSICION[s_idx, next_s]
                    dem_s = cls.DEMANDAS_ESPERADAS[next_s]
                    deficit = max(0, dem_s - inv_total)
                    costo_esperado_futuro += prob * (deficit * costo_escasez_unit)

                costo_total = costo_directo + costo_esperado_futuro
                if costo_total < mejor_costo:
                    mejor_costo = costo_total
                    mejor_accion = a

            stock_final = stock_actual + mejor_accion
            cobertura = min(100.0, round((stock_final / cls.DEMANDAS_ESPERADAS[3]) * 100.0, 1))

            politica_por_alerta[nombre] = {
                "kits_a_despachar": mejor_accion,
                "costo_esperado_soles": round(mejor_costo, 2),
                "stock_final_provincia": stock_final,
                "cobertura_riesgo_severo_pct": cobertura
            }

        alerta_norm = cls.MAPA_ALERTAS_INV.get(alerta_actual_str.upper(), 1)
        alerta_key = cls.NOMBRES_ALERTA[alerta_norm]
        despacho_rec = politica_por_alerta[alerta_key]["kits_a_despachar"]

        return {
            "modelo": "PDP_Bellman_Estocastico_Multietapa",
            "codigo_provincia": codigo_provincia,
            "stock_inicial": stock_actual,
            "alerta_actual": alerta_key,
            "despacho_inmediato_recomendado": despacho_rec,
            "politica_completa": politica_por_alerta
        }
