"""
Script de inicialización y carga de datos maestros (Seed Data) para GeoAlert-VRP.
Siembra las 13 Provincias de Cajamarca, quebradas emblemáticas, sensores IoT,
nodos de socorro, tramos viales y vehículos de la flota de emergencia.
"""

import sys
import os
import math
from datetime import datetime

# Asegurar path de importación
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal, init_db
from app.models import Provincia, Quebrada, SensorIoT, Nodo, TramoVial, Vehiculo
from app.config import PROVINCIAS_CAJAMARCA


def seed_database():
    print("[*] Inicializando esquema de base de datos en 3FN...")
    init_db()
    db = SessionLocal()

    try:
        # Verificar si ya existen datos
        if db.query(Provincia).count() > 0:
            print("[i] La base de datos ya contiene datos maestros. Limpiando para recarga limpia...")
            db.query(TramoVial).delete()
            db.query(SensorIoT).delete()
            db.query(Quebrada).delete()
            db.query(Vehiculo).delete()
            db.query(Nodo).delete()
            db.query(Provincia).delete()
            db.commit()

        print("[*] Sembrando 13 Provincias de la Región Cajamarca...")
        for ubigeo, info in PROVINCIAS_CAJAMARCA.items():
            prov = Provincia(
                codigo_provincia=ubigeo,
                nombre_provincia=info["nombre"],
                capital_provincial=info["capital"],
                latitud_capital=info["lat"],
                longitud_capital=info["lon"],
                altitud_msnm=info["altitud"],
                poblacion=info["poblacion"],
                indice_riesgo=info["riesgo"]
            )
            db.add(prov)
        db.commit()

        print("[*] Sembrando Quebradas y Sensores IoT multi-dinámica...")
        quebradas_data = [
            # Cajamarca (0601)
            {"id": "QBR-0601-01", "ubi": "0601", "nom": "Quebrada San Lucas", "tipo": "TORRENCIAL", "tc": 45, "crit": 45.0, "pob": 8500},
            {"id": "QBR-0601-02", "ubi": "0601", "nom": "Quebrada Calispuquio", "tipo": "DEBRIS_FLOW", "tc": 60, "crit": 50.0, "pob": 6200},
            # Contumazá (0605)
            {"id": "QBR-0605-01", "ubi": "0605", "nom": "Quebrada Cascas-Contumazá", "tipo": "DEBRIS_FLOW", "tc": 35, "crit": 40.0, "pob": 4300},
            # Jaén (0608)
            {"id": "QBR-0608-01", "ubi": "0608", "nom": "Quebrada Amojú - Jaén", "tipo": "TORRENCIAL", "tc": 30, "crit": 55.0, "pob": 19500},
            # Chota (0604)
            {"id": "QBR-0604-01", "ubi": "0604", "nom": "Quebrada Colpamayo - Chota", "tipo": "CRECIDA_LENTA", "tc": 120, "crit": 50.0, "pob": 11000},
            # San Ignacio (0609)
            {"id": "QBR-0609-01", "ubi": "0609", "nom": "Quebrada San Antonio - Chinchipe", "tipo": "TORRENCIAL", "tc": 50, "crit": 48.0, "pob": 5800},
            # Cutervo (0606)
            {"id": "QBR-0606-01", "ubi": "0606", "nom": "Quebrada Callayuc - Cutervo", "tipo": "DEBRIS_FLOW", "tc": 55, "crit": 46.0, "pob": 7400},
            # Hualgayoc (0607)
            {"id": "QBR-0607-01", "ubi": "0607", "nom": "Quebrada Llaucano - Bambamarca", "tipo": "TORRENCIAL", "tc": 40, "crit": 44.0, "pob": 8900},
            # Celendín (0603)
            {"id": "QBR-0603-01", "ubi": "0603", "nom": "Quebrada Sendamal - Celendín", "tipo": "CRECIDA_LENTA", "tc": 90, "crit": 52.0, "pob": 6100},
            # Santa Cruz (0613)
            {"id": "QBR-0613-01", "ubi": "0613", "nom": "Quebrada Chancay - Santa Cruz", "tipo": "TORRENCIAL", "tc": 35, "crit": 42.0, "pob": 5200}
        ]

        for q in quebradas_data:
            q_obj = Quebrada(
                id_quebrada=q["id"],
                codigo_provincia=q["ubi"],
                nombre_quebrada=q["nom"],
                tipo_quebrada=q["tipo"],
                tiempo_concentracion_min=q["tc"],
                umbral_precipitacion_critica=q["crit"],
                poblacion_afectada_est=q["pob"],
                estado_alerta="VERDE"
            )
            db.add(q_obj)

            # Agregar sensores IoT para cada quebrada
            s_pluv = SensorIoT(
                id_sensor=f"IOT-PLUV-{q['id'][4:]}",
                id_quebrada=q["id"],
                tipo_sensor="PLUVIOMETRO",
                precipitacion_actual_mmh=5.0,
                caudal_actual_m=0.4,
                vibracion_hz=2.0,
                estado_alerta="VERDE"
            )
            s_limn = SensorIoT(
                id_sensor=f"IOT-LIMN-{q['id'][4:]}",
                id_quebrada=q["id"],
                tipo_sensor="LIMNIMETRO",
                precipitacion_actual_mmh=5.0,
                caudal_actual_m=0.4,
                vibracion_hz=2.0,
                estado_alerta="VERDE"
            )
            db.add(s_pluv)
            db.add(s_limn)
        db.commit()

        print("[*] Sembrando Nodos de la Red Logística Provincial (Cajamarca 0601)...")
        # Nodos en la provincia piloto de Cajamarca (0601)
        base_lat, base_lon = -7.16378, -78.50027
        nodos_cajamarca = [
            {"id": 0, "nom": "COER Almacén Central Cajamarca (AAP)", "tipo": "DEPOT_CENTRAL", "dlat": 0.0, "dlon": 0.0, "kits": 0, "kg": 0.0, "vol": 0.0, "s": 0, "e": 0, "l": 720},
            {"id": 1, "nom": "Albergue La Florida (Qbr. San Lucas)", "tipo": "ALBERGUE", "dlat": 0.025, "dlon": -0.018, "kits": 120, "kg": 1800.0, "vol": 5.4, "s": 25, "e": 60, "l": 240},
            {"id": 2, "nom": "Caserío Huambocancha / Río Seco", "tipo": "ALBERGUE", "dlat": 0.045, "dlon": 0.012, "kits": 160, "kg": 2400.0, "vol": 7.2, "s": 30, "e": 90, "l": 300},
            {"id": 3, "nom": "Comunidad Otuzco / Desborde Lateral", "tipo": "ALBERGUE", "dlat": -0.028, "dlon": 0.035, "kits": 100, "kg": 1500.0, "vol": 4.5, "s": 20, "e": 120, "l": 360},
            {"id": 4, "nom": "Pariamarca / Qbr. Calispuquio", "tipo": "ALBERGUE", "dlat": -0.042, "dlon": -0.022, "kits": 140, "kg": 2100.0, "vol": 6.3, "s": 25, "e": 150, "l": 420},
            {"id": 5, "nom": "Chetilla / Tramo Alto Montañoso", "tipo": "ALBERGUE", "dlat": -0.015, "dlon": -0.055, "kits": 130, "kg": 1950.0, "vol": 5.8, "s": 30, "e": 180, "l": 480},
            {"id": 6, "nom": "La Encañada / Refugio Temporal", "tipo": "ALBERGUE", "dlat": 0.065, "dlon": 0.040, "kits": 110, "kg": 1650.0, "vol": 5.0, "s": 25, "e": 210, "l": 540}
        ]

        for n in nodos_cajamarca:
            nodo_obj = Nodo(
                id_nodo=n["id"],
                codigo_provincia="0601",
                nombre_nodo=n["nom"],
                tipo_nodo=n["tipo"],
                lat=base_lat + n["dlat"],
                lon=base_lon + n["dlon"],
                demanda_kits=n["kits"],
                demanda_peso_kg=n["kg"],
                demanda_volumen_m3=n["vol"],
                tiempo_servicio_min=n["s"],
                ventana_inicio=float(n["e"]),
                ventana_fin=float(n["l"])
            )
            db.add(nodo_obj)
        db.commit()

        print("[*] Sembrando Tramos Viales y vulnerabilidad hidrológica...")
        # Generar arcos bidireccionales con cálculo de distancia montañosa
        nodos_db = db.query(Nodo).filter(Nodo.codigo_provincia == "0601").all()
        n_count = len(nodos_db)

        # Mapeo de tramos a quebradas
        quebrada_tramo_map = {
            (0, 1): "QBR-0601-01", (1, 2): "QBR-0601-01",
            (4, 5): "QBR-0601-02", (0, 4): "QBR-0601-02"
        }

        for i in range(n_count):
            for j in range(n_count):
                if i != j:
                    n_orig = nodos_db[i]
                    n_dest = nodos_db[j]
                    dx = (n_orig.lon - n_dest.lon) * 111.0 * math.cos(math.radians(base_lat))
                    dy = (n_orig.lat - n_dest.lat) * 111.0
                    dist_eucl = math.sqrt(dx * dx + dy * dy)
                    dist_km = round(dist_eucl * 1.45 + 2.0, 2)
                    tiempo_min = round((dist_km / 35.0) * 60.0, 1)

                    q_asoc = quebrada_tramo_map.get((i, j), quebrada_tramo_map.get((j, i), None))
                    riesgo = 0.85 if q_asoc is not None else 0.15

                    tramo = TramoVial(
                        id_origen=n_orig.id_nodo,
                        id_destino=n_dest.id_nodo,
                        distancia_km=dist_km,
                        tiempo_minutos_base=tiempo_min,
                        esta_bloqueado=False,
                        riesgo_hidrologico=riesgo,
                        quebrada_causante_id=q_asoc
                    )
                    db.add(tramo)
        db.commit()

        print("[*] Sembrando Flota Vehicular Provincial...")
        vehiculos_data = [
            {"id": "CAM-PESADO-01", "tipo": "PESADO_TRONCAL", "cap_ton": 10.0, "cap_vol": 30.0, "esc": "TRONCAL", "fijo": 850.0, "km": 6.5},
            {"id": "CAM-PESADO-02", "tipo": "PESADO_TRONCAL", "cap_ton": 10.0, "cap_vol": 30.0, "esc": "TRONCAL", "fijo": 850.0, "km": 6.5},
            {"id": "4X4-LIGERO-01", "tipo": "LIGERO_4X4_REPARTO", "cap_ton": 3.0, "cap_vol": 9.0, "esc": "REPARTO", "fijo": 320.0, "km": 3.8},
            {"id": "4X4-LIGERO-02", "tipo": "LIGERO_4X4_REPARTO", "cap_ton": 3.0, "cap_vol": 9.0, "esc": "REPARTO", "fijo": 320.0, "km": 3.8},
            {"id": "4X4-LIGERO-03", "tipo": "LIGERO_4X4_REPARTO", "cap_ton": 3.0, "cap_vol": 9.0, "esc": "REPARTO", "fijo": 320.0, "km": 3.8},
            {"id": "4X4-LIGERO-04", "tipo": "LIGERO_4X4_REPARTO", "cap_ton": 3.0, "cap_vol": 9.0, "esc": "REPARTO", "fijo": 320.0, "km": 3.8},
            {"id": "4X4-LIGERO-05", "tipo": "LIGERO_4X4_REPARTO", "cap_ton": 3.0, "cap_vol": 9.0, "esc": "REPARTO", "fijo": 320.0, "km": 3.8}
        ]

        for v in vehiculos_data:
            veh_obj = Vehiculo(
                id_vehiculo=v["id"],
                codigo_provincia_base="0601",
                tipo_vehiculo=v["tipo"],
                capacidad_ton=v["cap_ton"],
                capacidad_vol_m3=v["cap_vol"],
                tipo_escalon=v["esc"],
                velocidad_promedio_kmh=40.0,
                costo_fijo=v["fijo"],
                costo_km=v["km"],
                disponible=True
            )
            db.add(veh_obj)
        db.commit()

        print("\n==================================================================")
        print("SEMILLADO DE BASE DE DATOS COMPLETADO CON ÉXITO:")
        print(f"  - Provincias sembradas: {db.query(Provincia).count()}")
        print(f"  - Quebradas registradas: {db.query(Quebrada).count()}")
        print(f"  - Sensores IoT en línea: {db.query(SensorIoT).count()}")
        print(f"  - Nodos de socorro / Depot: {db.query(Nodo).count()}")
        print(f"  - Tramos viales conectados: {db.query(TramoVial).count()}")
        print(f"  - Vehículos de flota: {db.query(Vehiculo).count()}")
        print("==================================================================")

    except Exception as e:
        db.rollback()
        print(f"[!] Error sembrando la base de datos: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
