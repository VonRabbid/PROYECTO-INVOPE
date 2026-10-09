"""Esquemas Pydantic para validación y serialización de la API REST de GeoAlert-VRP.
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


# --- Telemetría IoT ---
class TelemetriaSimularInput(BaseModel):
    id_sensor: str = Field(..., json_schema_extra={"example": "IOT-0601-01"})
    precipitacion_mm_h: float = Field(..., ge=0.0, json_schema_extra={"example": 58.5})
    caudal_m: Optional[float] = Field(default=2.8, ge=0.0, json_schema_extra={"example": 2.8})
    vibracion_hz: Optional[float] = Field(default=65.0, ge=0.0, json_schema_extra={"example": 65.0})


class TelemetriaSimularResponse(BaseModel):
    status: str
    id_sensor: str
    id_quebrada: str
    nombre_quebrada: str
    estado_alerta: str
    tramos_bloqueados_activados: List[List[int]]
    reoptimizacion_automatica_ejecutada: bool
    tiempo_reaccion_ms: float
    mensaje_operativo: str


# --- Optimización VRPTW (PEM / PEB / PL) ---
class OptimizarRequest(BaseModel):
    codigo_provincia: str = Field(default="0601", json_schema_extra={"example": "0601"})
    escalon: str = Field(default="REPARTO", json_schema_extra={"example": "REPARTO"})
    considerar_riesgo: bool = Field(default=True)
    penalizacion_big_m: float = Field(default=100000.0)


class ParadaRuta(BaseModel):
    orden: int
    id_nodo: int
    nombre_nodo: str
    lat: float
    lon: float
    demanda_kits: int
    demanda_kg: float
    llegada_min: float
    salida_min: float
    ventana_tiempo: str


class RutaVehiculo(BaseModel):
    id_vehiculo: str
    tipo_vehiculo: str
    capacidad_ton: float
    carga_total_kg: float
    distancia_km: float
    tiempo_ruta_min: float
    paradas: List[ParadaRuta]


class OptimizarResponse(BaseModel):
    status: str
    codigo_provincia: str
    nombre_provincia: str
    z_ip_costo_total: float
    z_lp_cota_inferior: float
    optimality_gap_pct: float
    tiempo_computo_seg: float
    tramos_bloqueados_evadidos: List[List[int]]
    flota_utilizada: int
    rutas: List[RutaVehiculo]


# --- Re-enrutamiento Dinámico Determinístico (PDD) ---
class ReenrutarRequest(BaseModel):
    id_origen: int = Field(default=0, json_schema_extra={"example": 0})
    id_destino: int = Field(default=5, json_schema_extra={"example": 5})
    tramos_bloqueados: Optional[List[List[int]]] = Field(default=[[0, 1]])


class ReenrutarResponse(BaseModel):
    status: str
    id_origen: int
    id_destino: int
    nombre_destino: str
    camino_nodos: List[int]
    ruta_coordenadas: List[List[float]]
    tiempo_total_min: float
    distancia_total_km: float
    tiempo_computo_ms: float
    bloqueos_evadidos: List[List[int]]


# --- Pre-posicionamiento Estocástico (PDP) ---
class PreposicionamientoRequest(BaseModel):
    codigo_provincia: str = Field(default="0601")
    stock_actual_kits: int = Field(default=300, ge=0)
    nivel_alerta_senamhi: str = Field(default="ROJO", json_schema_extra={"example": "ROJO"})


class PoliticaAlerta(BaseModel):
    kits_a_despachar: int
    costo_esperado_soles: float
    stock_final_provincia: int
    cobertura_riesgo_severo_pct: float


class PreposicionamientoResponse(BaseModel):
    modelo: str
    codigo_provincia: str
    stock_inicial: int
    alerta_actual: str
    despacho_inmediato_recomendado: int
    politica_completa: Dict[str, PoliticaAlerta]


# --- PERT / CPM ---
class PertCpmRequest(BaseModel):
    deadline_minutos: float = Field(default=120.0, ge=30.0)


class ActividadPert(BaseModel):
    id: str
    descripcion: str
    predecesores: str
    a: float
    m: float
    b: float
    duracion_esperada_min: float
    varianza: float
    ES: float
    EF: float
    LS: float
    LF: float
    holgura_total: float
    es_critica: bool


class PertCpmResponse(BaseModel):
    duracion_esperada_proyecto_min: float
    varianza_ruta_critica: float
    desviacion_estandar_min: float
    ruta_critica: List[str]
    cadena_critica_str: str
    deadline_evaluado_min: float
    z_score: float
    probabilidad_cumplimiento_pct: float
    actividades: List[ActividadPert]


# --- Esquemas de Catálogo ---
class ProvinciaOut(BaseModel):
    codigo_provincia: str
    nombre_provincia: str
    capital_provincial: str
    latitud_capital: float
    longitud_capital: float
    altitud_msnm: int
    poblacion: int
    indice_riesgo: float

    class Config:
        from_attributes = True


class QuebradaOut(BaseModel):
    id_quebrada: str
    codigo_provincia: str
    nombre_quebrada: str
    tipo_quebrada: str
    umbral_precipitacion_critica: float
    tiempo_concentracion_min: int
    estado_alerta: str
    poblacion_afectada_est: int

    class Config:
        from_attributes = True
