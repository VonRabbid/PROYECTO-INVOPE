"""Motor de Optimización Matemática VRPTW Multi-Quebrada (PEM / PEB / PL / PEP).
Implementa la formulación exacta con eliminación de sub-tours MTZ, sincronización
de ventanas de tiempo, penalizaciones Big-M y relajación continua en el nodo raíz.
"""
import time
import math
import numpy as np
import pulp
from typing import List, Dict, Any, Tuple, Optional


class GeoAlertVRPOptimizer:
    """Motor matemático de Investigación de Operaciones (INVOPE) para GeoAlert-VRP.
    Resuelve el problema de ruteo vehicular con ventanas de tiempo en dos escalones (2E-VRPTW).
    """

    @staticmethod
    def solve_vrptw(
        nodos: List[Dict[str, Any]],
        vehiculos: List[Dict[str, Any]],
        dist_matrix: np.ndarray,
        time_matrix: np.ndarray,
        risk_matrix: np.ndarray,
        blocked_arcs: Optional[List[Tuple[int, int]]] = None,
        big_m_penalty: float = 100000.0,
        consider_risk: bool = True,
        time_limit_sec: int = 15
    ) -> Dict[str, Any]:
        """Formulación de Programación Entera Mixta (PEM) / Entera Binaria (PEB).
        
        Variables:
          X[i, j, k] in {0, 1} : Arco (i, j) recorrido por vehículo k.
          S[i, k] >= 0         : Instante de llegada y atención continua al nodo i.
        
        Función Objetivo:
          Min Sum_k Sum_ij ( c_ij + M * R_ij ) * X_ijk
        
        Restricciones:
          - Visita única a cada nodo damnificado.
          - Conservación de flujo en cada nodo.
          - Capacidad de carga por vehículo.
          - Ventanas de tiempo y eliminación de subrutas (Miller-Tucker-Zemlin Big-M).
          - Exclusión estricta de tramos bloqueados por huaico (X_ijk = 0).
        """
        t0 = time.time()
        n = len(nodos)
        K = list(range(len(vehiculos)))
        blocked_set = set(blocked_arcs or [])

        prob = pulp.LpProblem("GeoAlert_PEM_VRPTW", pulp.LpMinimize)

        # 1. Variables de decisión binarias de flujo (PEB)
        X = {}
        for k in K:
            for i in range(n):
                for j in range(n):
                    if i != j:
                        X[i, j, k] = pulp.LpVariable(f"X_{i}_{j}_{k}", cat=pulp.LpBinary)

        # 2. Variables continuas de tiempo de servicio (PEM)
        S = {}
        for k in K:
            for i in range(n):
                e_i = nodos[i].get("ventana_inicio", 0.0)
                l_i = nodos[i].get("ventana_fin", 720.0)
                S[i, k] = pulp.LpVariable(f"S_{i}_{k}", lowBound=e_i, upBound=l_i, cat=pulp.LpContinuous)

        # 3. Función Objetivo
        cost_terms = []
        for k in K:
            for i in range(n):
                for j in range(n):
                    if i != j:
                        base_cost = dist_matrix[i][j]
                        risk_penalty = (big_m_penalty * risk_matrix[i][j]) if consider_risk else 0.0
                        cost_terms.append((base_cost + risk_penalty) * X[i, j, k])
        prob += pulp.lpSum(cost_terms), "Costo_Total_Ponderado_Riesgo"

        # 4. Restricción: Cada nodo de socorro (1 a n-1) es visitado exactamente una vez
        for j in range(1, n):
            prob += pulp.lpSum([X[i, j, k] for k in K for i in range(n) if i != j]) == 1, f"Visita_Unica_{j}"

        # 5. Restricción: Salida y retorno al Almacén/Depot (nodo 0)
        for k in K:
            prob += pulp.lpSum([X[0, j, k] for j in range(1, n)]) <= 1, f"Salida_Depot_Veh_{k}"
            prob += pulp.lpSum([X[i, 0, k] for i in range(1, n)]) <= 1, f"Retorno_Depot_Veh_{k}"

        # 6. Restricción: Conservación de flujo en nodos intermedios
        for k in K:
            for h in range(1, n):
                incoming = pulp.lpSum([X[i, h, k] for i in range(n) if i != h])
                outgoing = pulp.lpSum([X[h, j, k] for j in range(n) if j != h])
                prob += incoming == outgoing, f"Conservacion_Flujo_{h}_{k}"

        # 7. Restricción: Capacidad de peso por vehículo
        for k in K:
            cap_kg = vehiculos[k].get("capacidad_ton", 5.0) * 1000.0
            prob += pulp.lpSum([nodos[j].get("demanda_peso_kg", 0.0) * X[i, j, k]
                                for i in range(n) for j in range(1, n) if i != j]) <= cap_kg, f"Capacidad_Peso_{k}"

        # 8. Restricción: Ventanas de tiempo y Sub-tour elimination MTZ (Miller-Tucker-Zemlin)
        M_time = 1440.0  # Horizonte temporal (24 horas)
        for k in K:
            for i in range(n):
                for j in range(1, n):
                    if i != j:
                        t_ij = time_matrix[i][j]
                        s_i = nodos[i].get("tiempo_servicio_min", 15)
                        prob += S[i, k] + s_i + t_ij - M_time * (1 - X[i, j, k]) <= S[j, k], f"MTZ_Tiempo_{i}_{j}_{k}"

        # 9. Restricción: Exclusión estricta de tramos bloqueados por huaicos activos
        arcs_to_block = set()
        for (u, v) in blocked_set:
            arcs_to_block.add((u, v))
            arcs_to_block.add((v, u))

        for (u, v) in arcs_to_block:
            for k in K:
                if (u, v, k) in X:
                    prob += X[u, v, k] == 0, f"Bloqueo_Huaico_{u}_{v}_{k}"

        # Resolver con CBC
        solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=time_limit_sec)
        status_code = prob.solve(solver)
        status_str = pulp.LpStatus[status_code]
        t_exec = time.time() - t0

        z_ip = float(pulp.value(prob.objective)) if pulp.value(prob.objective) is not None else 0.0

        # Reconstruir rutas detalladas
        rutas_construidas = []
        for k in K:
            v_info = vehiculos[k]
            paradas = []
            curr = 0
            visited = [0]
            dist_acum = 0.0
            carga_acum = 0.0

            # Parada inicial en Depot
            paradas.append({
                "orden": 0,
                "id_nodo": 0,
                "nombre_nodo": nodos[0]["nombre_nodo"],
                "lat": nodos[0]["lat"],
                "lon": nodos[0]["lon"],
                "demanda_kits": 0,
                "demanda_kg": 0.0,
                "llegada_min": 0.0,
                "salida_min": 0.0,
                "ventana_tiempo": f"[{nodos[0].get('ventana_inicio', 0)}, {nodos[0].get('ventana_fin', 720)}] min"
            })

            while True:
                next_node = None
                for j in range(n):
                    if curr != j and (curr, j, k) in X:
                        val = pulp.value(X[curr, j, k])
                        if val is not None and val > 0.5:
                            next_node = j
                            break

                if next_node is not None and next_node not in visited:
                    visited.append(next_node)
                    dist_acum += dist_matrix[curr][next_node]
                    dem_kg = nodos[next_node].get("demanda_peso_kg", 0.0)
                    dem_kits = nodos[next_node].get("demanda_kits", 0)
                    carga_acum += dem_kg
                    t_arr = float(pulp.value(S[next_node, k])) if pulp.value(S[next_node, k]) is not None else 0.0
                    t_sal = t_arr + nodos[next_node].get("tiempo_servicio_min", 15)

                    paradas.append({
                        "orden": len(paradas),
                        "id_nodo": next_node,
                        "nombre_nodo": nodos[next_node]["nombre_nodo"],
                        "lat": nodos[next_node]["lat"],
                        "lon": nodos[next_node]["lon"],
                        "demanda_kits": dem_kits,
                        "demanda_kg": dem_kg,
                        "llegada_min": round(t_arr, 1),
                        "salida_min": round(t_sal, 1),
                        "ventana_tiempo": f"[{nodos[next_node].get('ventana_inicio', 0)}, {nodos[next_node].get('ventana_fin', 720)}] min"
                    })
                    curr = next_node
                else:
                    break

            if len(paradas) > 1:
                # Retorno al depot
                dist_acum += dist_matrix[curr][0]
                tiempo_total_est = paradas[-1]["salida_min"] + time_matrix[curr][0]
                rutas_construidas.append({
                    "id_vehiculo": v_info.get("id_vehiculo", f"VEH-{k+1}"),
                    "tipo_vehiculo": v_info.get("tipo_vehiculo", "LIGERO_4X4_REPARTO"),
                    "capacidad_ton": v_info.get("capacidad_ton", 5.0),
                    "carga_total_kg": round(carga_acum, 1),
                    "distancia_km": round(dist_acum, 2),
                    "tiempo_ruta_min": round(tiempo_total_est, 1),
                    "paradas": paradas
                })

        return {
            "status": status_str,
            "z_ip": round(z_ip, 2),
            "tiempo_computo_seg": round(t_exec, 4),
            "rutas": rutas_construidas,
            "flota_utilizada": len(rutas_construidas),
            "tramos_bloqueados_evadidos": list(blocked_set)
        }

    @staticmethod
    def solve_lp_relaxation(
        nodos: List[Dict[str, Any]],
        vehiculos: List[Dict[str, Any]],
        dist_matrix: np.ndarray,
        time_matrix: np.ndarray
    ) -> Dict[str, Any]:
        """Programación Lineal Continua (PL):
        Resuelve la relajación continua en el nodo raíz reemplazando X_ijk in {0,1} por 0 <= X_ijk <= 1.
        Calcula formalmente la cota inferior dual Z_LP* <= Z_IP*.
        """
        n = len(nodos)
        K = list(range(len(vehiculos)))
        prob_lp = pulp.LpProblem("GeoAlert_PL_Relajacion", pulp.LpMinimize)

        X_lp = {}
        for k in K:
            for i in range(n):
                for j in range(n):
                    if i != j:
                        X_lp[i, j, k] = pulp.LpVariable(f"X_cont_{i}_{j}_{k}", lowBound=0.0, upBound=1.0, cat=pulp.LpContinuous)

        S_lp = {}
        for k in K:
            for i in range(n):
                e_i = nodos[i].get("ventana_inicio", 0.0)
                l_i = nodos[i].get("ventana_fin", 720.0)
                S_lp[i, k] = pulp.LpVariable(f"S_cont_{i}_{k}", lowBound=e_i, upBound=l_i, cat=pulp.LpContinuous)

        prob_lp += pulp.lpSum([dist_matrix[i][j] * X_lp[i, j, k] for k in K for i in range(n) for j in range(n) if i != j])

        for j in range(1, n):
            prob_lp += pulp.lpSum([X_lp[i, j, k] for k in K for i in range(n) if i != j]) == 1

        for k in K:
            prob_lp += pulp.lpSum([X_lp[0, j, k] for j in range(1, n)]) <= 1
            prob_lp += pulp.lpSum([X_lp[i, 0, k] for i in range(1, n)]) <= 1

        for k in K:
            for h in range(1, n):
                inc = pulp.lpSum([X_lp[i, h, k] for i in range(n) if i != h])
                outg = pulp.lpSum([X_lp[h, j, k] for j in range(n) if j != h])
                prob_lp += inc == outg

        solver = pulp.PULP_CBC_CMD(msg=False)
        prob_lp.solve(solver)
        z_lp = float(pulp.value(prob_lp.objective)) if pulp.value(prob_lp.objective) is not None else 0.0

        return {
            "status": pulp.LpStatus[prob_lp.status],
            "z_lp": round(z_lp, 2)
        }

    @staticmethod
    def solve_fleet_dimensioning(
        demanda_total_kg: float,
        demanda_vol_m3: float,
        factor_agreste: float = 0.40
    ) -> Dict[str, Any]:
        """Programación Entera Pura (PEP):
        Min Z = c_pesado * N_pesado + c_ligero * N_ligero
        s.a.
          Capacidad de peso y volumen >= requerida
          Cuota ligera 4x4 en fango >= factor_agreste * demanda_total
          N_pesado, N_ligero in Z_+
        """
        prob = pulp.LpProblem("PEP_Dimensionamiento_Flota", pulp.LpMinimize)
        Np = pulp.LpVariable("N_pesado", lowBound=0, cat=pulp.LpInteger)
        Nl = pulp.LpVariable("N_ligero_4x4", lowBound=0, cat=pulp.LpInteger)

        cap_p_kg, cap_p_vol, costo_p = 10000.0, 30.0, 850.0
        cap_l_kg, cap_l_vol, costo_l = 2500.0, 8.0, 320.0

        prob += costo_p * Np + costo_l * Nl
        prob += cap_p_kg * Np + cap_l_kg * Nl >= demanda_total_kg
        prob += cap_p_vol * Np + cap_l_vol * Nl >= demanda_vol_m3
        prob += cap_l_kg * Nl >= factor_agreste * demanda_total_kg

        solver = pulp.PULP_CBC_CMD(msg=False)
        prob.solve(solver)

        return {
            "n_pesados": int(pulp.value(Np)),
            "n_ligeros_4x4": int(pulp.value(Nl)),
            "costo_total_soles": float(pulp.value(prob.objective)),
            "capacidad_peso_kg": int(pulp.value(Np) * cap_p_kg + pulp.value(Nl) * cap_l_kg),
            "capacidad_vol_m3": float(pulp.value(Np) * cap_p_vol + pulp.value(Nl) * cap_l_vol)
        }
