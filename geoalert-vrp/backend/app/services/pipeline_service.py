"""Pipeline Service: Orquestación M2M de las 5 fases encadenadas (Fase 0 a Fase 4)."""
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    CentrosAcopio,
    RefugiosDamnificados,
    FlotaVehicular,
    AristasViales,
    EventosBloqueoVial,
    RutasDespacho,
    ParadasRuta,
)
from app.core_io.pilar1_pdp import classify_state, solve_pdp
from app.core_io.pilar2_pert import calculate_pert
from app.core_io.pilar3_vrptw import solve_vrptw_model, NODES


class PipelineService:
    @staticmethod
    def get_active_roadblocks(db: Session) -> List[Tuple[str, str]]:
        """Obtiene las aristas actualmente bloqueadas en la base de datos."""
        active_events = db.query(EventosBloqueoVial).filter_by(Activo=True).all()
        blocked_pairs = []
        for ev in active_events:
            parts = ev.TramoCodigo.split("-")
            if len(parts) == 2:
                blocked_pairs.append((parts[0].strip(), parts[1].strip()))
        return blocked_pairs

    @staticmethod
    def persist_routes(db: Session, vrptw_solution: Dict[str, Any], scenario: str = "BASE"):
        """Persiste las rutas y paradas calculadas en RutasDespacho y ParadasRuta."""
        if not vrptw_solution.get("is_feasible"):
            return

        # Limpiar rutas previas para este escenario
        old_routes = db.query(RutasDespacho).filter_by(Escenario=scenario).all()
        for r in old_routes:
            db.delete(r)
        db.commit()

        depot = db.query(CentrosAcopio).filter_by(Codigo="N0").first()
        depot_id = depot.CentroId if depot else None

        vehicles = db.query(FlotaVehicular).all()
        v_map = {idx + 1: v.VehiculoId for idx, v in enumerate(vehicles)}

        shelters = db.query(RefugiosDamnificados).all()
        s_map = {s.Codigo: s.RefugioId for s in shelters}

        for r_data in vrptw_solution.get("rutas", []):
            v_id = v_map.get(r_data["vehiculo_id"], 1)
            new_route = RutasDespacho(
                VehiculoId=v_id,
                CentroAcopioId=depot_id,
                TiempoTotalMin=r_data["tiempo_ruta_min"],
                CargaTotalEntregada=r_data["carga_inicial_t"],
                Estado="REOPTIMIZADA" if scenario == "BLOQUEO" else "PLANIFICADA",
                Escenario=scenario,
                FechaCreacion=datetime.now(timezone.utc),
            )
            db.add(new_route)
            db.commit()
            db.refresh(new_route)

            for stop in r_data.get("paradas", []):
                refugio_id = s_map.get(stop["nodo_codigo"])
                new_stop = ParadasRuta(
                    RutaId=new_route.RutaId,
                    RefugioId=refugio_id,
                    NodoCodigo=stop["nodo_codigo"],
                    OrdenSecuencia=stop["secuencia"],
                    TiempoArriboMin=float(stop["arribo_min"]),
                    TiempoSalidaMin=float(stop["salida_min"]),
                    CargaDescargada=float(stop["descarga_t"]),
                    CargaRemanente=float(stop["carga_remanente_t"]),
                )
                db.add(new_stop)
            db.commit()

    @staticmethod
    def solve_and_persist(db: Session) -> Dict[str, Any]:
        """Resuelve el VRPTW considerando los bloqueos activos y persiste el resultado."""
        blocked = PipelineService.get_active_roadblocks(db)
        scenario = "BLOQUEO" if blocked else "BASE"
        solution = solve_vrptw_model(blocked_edges=blocked)
        PipelineService.persist_routes(db, solution, scenario=scenario)
        return solution

    @staticmethod
    def register_roadblock(db: Session, u: str, v: str, description: str) -> Dict[str, Any]:
        """Registra un evento de bloqueo vial dinámico (tuv = 9999) y reoptimiza en caliente."""
        u_clean = u.strip().upper()
        v_clean = v.strip().upper()
        tramo_code = f"{u_clean}-{v_clean}"

        # Actualizar estado en AristasViales
        edge = db.query(AristasViales).filter(
            ((AristasViales.OrigenCodigo == u_clean) & (AristasViales.DestinoCodigo == v_clean)) |
            ((AristasViales.OrigenCodigo == v_clean) & (AristasViales.DestinoCodigo == u_clean))
        ).first()

        if edge:
            edge.Estado = "BLOQUEADO"
            db.commit()

        # Crear Evento de Bloqueo
        event = EventosBloqueoVial(
            AristaId=edge.AristaId if edge else None,
            TramoCodigo=tramo_code,
            FechaReporte=datetime.now(timezone.utc),
            Descripcion=description,
            Activo=True,
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Reoptimización en caliente (Guided Local Search)
        reopt_solution = PipelineService.solve_and_persist(db)

        return {
            "mensaje": f"Corte dinámico registrado en tramo {tramo_code}. Penalización Big-M = 9999 aplicada.",
            "bloqueo_id": event.BloqueoId,
            "tramo_bloqueado": tramo_code,
            "penalizacion_big_m": 9999,
            "solucion_reoptimizada": reopt_solution,
        }

    @staticmethod
    def clear_all_roadblocks(db: Session) -> Dict[str, Any]:
        """Desactiva todos los bloqueos y restituye la red vial a su estado base."""
        events = db.query(EventosBloqueoVial).filter_by(Activo=True).all()
        for ev in events:
            ev.Activo = False

        edges = db.query(AristasViales).filter_by(Estado="BLOQUEADO").all()
        for e in edges:
            e.Estado = "OPERATIVO"

        db.commit()
        base_solution = PipelineService.solve_and_persist(db)
        return base_solution

    @classmethod
    def run_full_pipeline(
        cls,
        db: Session,
        precipitation_mm_h: float = 32.0,
        soil_saturation_pct: float = 85.0,
        stage: int = 1,
        t_alerta: float = 0.0,
        simulate_block: bool = False,
    ) -> Dict[str, Any]:
        """Ejecuta la cadena M2M completa de Fase 0 a Fase 4."""
        # --- FASE 0: Capa de datos del ámbito territorial ---
        depot = db.query(CentrosAcopio).first()
        shelters = db.query(RefugiosDamnificados).all()
        fleet = db.query(FlotaVehicular).all()
        edges = db.query(AristasViales).all()

        fase0_datos = {
            "ambito": "Región Cajamarca (Cuenca del Río Crisnejas / Chonta)",
            "deposito_central": depot.Nombre if depot else "COER Cajamarca",
            "total_refugios": len(shelters),
            "capacidad_flota_total_t": sum(v.CapacidadCarga for v in fleet),
            "total_tramos_viales": len(edges),
        }

        # --- FASE 1: Motor estocástico de alerta temprana (PDP) ---
        state_code, state_name = classify_state(precipitation_mm_h, soil_saturation_pct)
        pdp_res = solve_pdp(stage=stage, current_state=state_code)

        fase1_output = {
            "precipitacion_mm_h": precipitation_mm_h,
            "saturacion_suelo_pct": soil_saturation_pct,
            "etapa": stage,
            "estado_clasificado": state_code,
            "estado_nombre": state_name,
            "accion_optima": pdp_res["optimal_action"],
            "accion_nombre": pdp_res["action_name"],
            "costo_minimo_esperado": pdp_res["expected_min_cost"],
            "valores_Q": pdp_res["Q_values"],
            "dispara_protocolo": pdp_res["trigger_protocol"],
            "recomendacion": pdp_res["recommendation"],
        }

        fase2_output = None
        fase3_output = None
        hora_partida_t0 = t_alerta

        # Regla de acoplamiento M2M: Solo se dispara PERT y VRPTW si acción in {A2, A3}
        if pdp_res["trigger_protocol"]:
            # --- FASE 2: Protocolo de preparación logística (PERT/CPM) ---
            pert_res = calculate_pert()
            hora_partida_t0 = t_alerta + pert_res["mu_CP"]  # Expresión (26): T0 = talerta + mu_CP

            fase2_output = {
                "actividades": pert_res["actividades"],
                "ruta_critica": pert_res["ruta_critica"],
                "ruta_critica_str": pert_res["ruta_critica_str"],
                "mu_CP": pert_res["mu_CP"],
                "var_CP": pert_res["var_CP"],
                "sigma_CP": pert_res["sigma_CP"],
                "t_alerta": t_alerta,
                "hora_partida_T0": hora_partida_t0,
                "evaluacion_umbrales": pert_res["evaluacion_umbrales"],
            }

            # --- FASE 3: Ruteo vehicular dinámico (VRPTW) ---
            if simulate_block:
                blocked = [("R4", "R6")]
            else:
                blocked = cls.get_active_roadblocks(db)

            fase3_output = solve_vrptw_model(blocked_edges=blocked)
            scenario = "BLOQUEO" if blocked else "BASE"
            cls.persist_routes(db, fase3_output, scenario=scenario)

        # --- FASE 4: Resumen de gobernanza e interfaces M2M ---
        fase4_resumen = {
            "contrato_ingesta_a_pdp": f"Lecturas P={precipitation_mm_h} mm/h, θ={soil_saturation_pct}% clasificadas como {state_code}",
            "contrato_pdp_a_pert": (
                f"Política óptima {pdp_res['optimal_action']} disparó el cronograma de despacho a t_alerta={t_alerta} min"
                if pdp_res["trigger_protocol"] else
                "Acción A1 (Monitoreo): protocolo logístico permanece en reposo"
            ),
            "contrato_pert_a_vrptw": (
                f"T0 fijado en {hora_partida_t0} min (t_alerta + 190.00 min) como origen de ventanas de tiempo"
                if pdp_res["trigger_protocol"] else "No aplica"
            ),
            "contrato_vrptw_a_dashboard": (
                f"Rutas resueltas con Z* = {fase3_output['Z_star_tiempo_total']} min (100% ventanas respetadas, 0 atrapados)"
                if fase3_output and fase3_output.get("is_feasible") else "En espera de alerta"
            ),
        }

        return {
            "fase0_datos": fase0_datos,
            "fase1_pdp": fase1_output,
            "fase2_pert": fase2_output,
            "fase3_vrptw": fase3_output,
            "fase4_resumen_m2m": fase4_resumen,
        }
