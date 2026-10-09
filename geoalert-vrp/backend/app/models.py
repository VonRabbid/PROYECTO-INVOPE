"""Modelos relacionales en Tercera Forma Normal (3FN) con SQLAlchemy 2.0.
Entidades: Provincias, Quebradas, SensoresIoT, NodosRed, TramosViales, Vehiculos, DespachoMision.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Provincia(Base):
    __tablename__ = "provincias"

    codigo_provincia = Column(String(4), primary_key=True, index=True)  # UBIGEO: ej. '0601'
    nombre_provincia = Column(String(100), nullable=False)
    capital_provincial = Column(String(100), nullable=False)
    latitud_capital = Column(Float, nullable=False)
    longitud_capital = Column(Float, nullable=False)
    altitud_msnm = Column(Integer, default=2500)
    poblacion = Column(Integer, default=50000)
    indice_riesgo = Column(Float, default=7.0)

    # Relaciones
    quebradas = relationship("Quebrada", back_populates="provincia", cascade="all, delete-orphan")
    nodos = relationship("Nodo", back_populates="provincia", cascade="all, delete-orphan")
    vehiculos = relationship("Vehiculo", back_populates="provincia", cascade="all, delete-orphan")


class Quebrada(Base):
    __tablename__ = "quebradas"

    id_quebrada = Column(String(30), primary_key=True, index=True)
    codigo_provincia = Column(String(4), ForeignKey("provincias.codigo_provincia"), nullable=False)
    nombre_quebrada = Column(String(150), nullable=False)
    tipo_quebrada = Column(String(30), nullable=False)  # 'TORRENCIAL', 'DEBRIS_FLOW', 'CRECIDA_LENTA'
    umbral_precipitacion_critica = Column(Float, default=45.0)  # mm/h
    tiempo_concentracion_min = Column(Integer, default=45)     # tc en minutos
    estado_alerta = Column(String(20), default="VERDE")        # 'VERDE', 'AMARILLO', 'NARANJA', 'ROJO_ACTIVADO'
    poblacion_afectada_est = Column(Integer, default=5000)

    # Relaciones
    provincia = relationship("Provincia", back_populates="quebradas")
    sensores = relationship("SensorIoT", back_populates="quebrada", cascade="all, delete-orphan")
    tramos_impactados = relationship("TramoVial", back_populates="quebrada_causante")


class SensorIoT(Base):
    __tablename__ = "sensores_iot"

    id_sensor = Column(String(30), primary_key=True, index=True)
    id_quebrada = Column(String(30), ForeignKey("quebradas.id_quebrada"), nullable=False)
    tipo_sensor = Column(String(30), default="PLUVIOMETRO")    # 'PLUVIOMETRO', 'LIMNIMETRO', 'GEOFONO'
    precipitacion_actual_mmh = Column(Float, default=0.0)
    caudal_actual_m = Column(Float, default=0.0)
    vibracion_hz = Column(Float, default=0.0)
    estado_alerta = Column(String(20), default="VERDE")        # 'VERDE', 'AMARILLO', 'NARANJA', 'ROJO_ACTIVADO'
    bateria_porcentaje = Column(Float, default=100.0)
    ultima_actualizacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relaciones
    quebrada = relationship("Quebrada", back_populates="sensores")


class Nodo(Base):
    __tablename__ = "nodos_red"

    id_nodo = Column(Integer, primary_key=True, index=True)
    codigo_provincia = Column(String(4), ForeignKey("provincias.codigo_provincia"), nullable=False)
    nombre_nodo = Column(String(150), nullable=False)
    tipo_nodo = Column(String(30), nullable=False)  # 'DEPOT_CENTRAL', 'ALMACEN_PROVINCIAL', 'ALBERGUE'
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    demanda_kits = Column(Integer, default=0)
    demanda_peso_kg = Column(Float, default=0.0)
    demanda_volumen_m3 = Column(Float, default=0.0)
    tiempo_servicio_min = Column(Integer, default=15)
    ventana_inicio = Column(Float, default=0.0)    # e_i en minutos
    ventana_fin = Column(Float, default=720.0)     # l_i en minutos

    # Relaciones
    provincia = relationship("Provincia", back_populates="nodos")
    tramos_salida = relationship("TramoVial", foreign_keys="[TramoVial.id_origen]", back_populates="nodo_origen")
    tramos_entrada = relationship("TramoVial", foreign_keys="[TramoVial.id_destino]", back_populates="nodo_destino")


class TramoVial(Base):
    __tablename__ = "tramos_viales"

    id_tramo = Column(Integer, primary_key=True, autoincrement=True)
    id_origen = Column(Integer, ForeignKey("nodos_red.id_nodo"), nullable=False)
    id_destino = Column(Integer, ForeignKey("nodos_red.id_nodo"), nullable=False)
    distancia_km = Column(Float, nullable=False)
    tiempo_minutos_base = Column(Float, nullable=False)
    esta_bloqueado = Column(Boolean, default=False)
    riesgo_hidrologico = Column(Float, default=0.0)  # Factor de riesgo (0.0 a 1.0)
    quebrada_causante_id = Column(String(30), ForeignKey("quebradas.id_quebrada"), nullable=True)

    # Relaciones
    nodo_origen = relationship("Nodo", foreign_keys=[id_origen], back_populates="tramos_salida")
    nodo_destino = relationship("Nodo", foreign_keys=[id_destino], back_populates="tramos_entrada")
    quebrada_causante = relationship("Quebrada", back_populates="tramos_impactados")


class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id_vehiculo = Column(String(30), primary_key=True, index=True)
    codigo_provincia_base = Column(String(4), ForeignKey("provincias.codigo_provincia"), nullable=False)
    tipo_vehiculo = Column(String(30), nullable=False)  # 'PESADO_TRONCAL', 'LIGERO_4X4_REPARTO'
    capacidad_ton = Column(Float, default=10.0)
    capacidad_vol_m3 = Column(Float, default=30.0)
    tipo_escalon = Column(String(20), default="REPARTO") # 'TRONCAL', 'REPARTO'
    velocidad_promedio_kmh = Column(Float, default=40.0)
    costo_fijo = Column(Float, default=500.0)
    costo_km = Column(Float, default=4.5)
    disponible = Column(Boolean, default=True)

    # Relaciones
    provincia = relationship("Provincia", back_populates="vehiculos")


class DespachoMision(Base):
    __tablename__ = "despachos_misiones"

    id_despacho = Column(String(36), primary_key=True, index=True)
    codigo_provincia = Column(String(4), ForeignKey("provincias.codigo_provincia"), nullable=False)
    fecha_hora = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    costo_total = Column(Float, default=0.0)
    distancia_total_km = Column(Float, default=0.0)
    tiempo_total_min = Column(Float, default=0.0)
    estado = Column(String(30), default="PLANIFICADO")  # 'PLANIFICADO', 'EN_EJECUCION', 'RE_ENRUTADO', 'COMPLETADO'
    rutas_json = Column(Text, default="{}")
