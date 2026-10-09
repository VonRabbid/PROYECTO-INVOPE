"""Configuración global, constantes operativas y catálogo nacional UBIGEO.
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'geoalert_vrp.db')}")

# Constantes de Optimización e Investigación de Operaciones (INVOPE)
BIG_M_PENALTY = 100000.0          # Penalización severa para arcos en riesgo aluviónico
ALPHA_TRACTION_4X4 = 0.40        # Cuota mínima de demanda reservada a camionetas 4x4 todoterreno
HORIZONTE_MAXIMO_MIN = 1440.0     # M_time para linealización Miller-Tucker-Zemlin (24 horas)

# Umbrales Hidrológicos de Alerta Pluviométrica (SENAMHI / CENEPRED)
UMBRAL_AMARILLO_MMH = 20.0       # Alerta preventiva (incremento de escorrentía)
UMBRAL_NARANJA_MMH = 35.0        # Alerta de preparación y pre-posicionamiento
UMBRAL_ROJO_MMH = 50.0           # Activación inminente / desborde / huaico

# Catálogo Maestro: 13 Provincias de la Región Cajamarca (Región Piloto)
# Extensible a las 196 provincias del Perú mediante código UBIGEO estándar
PROVINCIAS_CAJAMARCA = {
    "0601": {
        "nombre": "Cajamarca", "capital": "Cajamarca", "altitud": 2750,
        "lat": -7.16378, "lon": -78.50027, "riesgo": 7.8, "poblacion": 245000,
        "cuenca_principal": "Río Cajamarquino / Crisnejas"
    },
    "0602": {
        "nombre": "Cajabamba", "capital": "Cajabamba", "altitud": 2654,
        "lat": -7.62472, "lon": -78.04611, "riesgo": 6.5, "poblacion": 80000,
        "cuenca_principal": "Río Condebamba"
    },
    "0603": {
        "nombre": "Celendín", "capital": "Celendín", "altitud": 2625,
        "lat": -6.87028, "lon": -78.14417, "riesgo": 7.2, "poblacion": 95000,
        "cuenca_principal": "Río Sendamal / Marañón"
    },
    "0604": {
        "nombre": "Chota", "capital": "Chota", "altitud": 2388,
        "lat": -6.55611, "lon": -78.64917, "riesgo": 8.4, "poblacion": 165000,
        "cuenca_principal": "Río Chotano"
    },
    "0605": {
        "nombre": "Contumazá", "capital": "Contumazá", "altitud": 2674,
        "lat": -7.36667, "lon": -78.80000, "riesgo": 9.1, "poblacion": 32000,
        "cuenca_principal": "Río Jequetepeque"
    },
    "0606": {
        "nombre": "Cutervo", "capital": "Cutervo", "altitud": 2637,
        "lat": -6.37778, "lon": -78.82194, "riesgo": 8.1, "poblacion": 140000,
        "cuenca_principal": "Río Callayuc / Chamaya"
    },
    "0607": {
        "nombre": "Hualgayoc", "capital": "Bambamarca", "altitud": 2526,
        "lat": -6.68000, "lon": -78.52000, "riesgo": 7.9, "poblacion": 102000,
        "cuenca_principal": "Río Llaucano"
    },
    "0608": {
        "nombre": "Jaén", "capital": "Jaén", "altitud": 729,
        "lat": -5.70833, "lon": -78.80778, "riesgo": 9.4, "poblacion": 198000,
        "cuenca_principal": "Río Amojú / Marañón"
    },
    "0609": {
        "nombre": "San Ignacio", "capital": "San Ignacio", "altitud": 1324,
        "lat": -5.14583, "lon": -79.00694, "riesgo": 8.9, "poblacion": 148000,
        "cuenca_principal": "Río Chinchipe"
    },
    "0610": {
        "nombre": "San Marcos", "capital": "San Marcos", "altitud": 2251,
        "lat": -7.33333, "lon": -78.16667, "riesgo": 6.7, "poblacion": 54000,
        "cuenca_principal": "Río Crisnejas"
    },
    "0611": {
        "nombre": "San Miguel", "capital": "San Miguel de Pallaques", "altitud": 2665,
        "lat": -7.00000, "lon": -78.85000, "riesgo": 7.5, "poblacion": 60000,
        "cuenca_principal": "Río San Miguel"
    },
    "0612": {
        "nombre": "San Pablo", "capital": "San Pablo", "altitud": 2365,
        "lat": -7.11667, "lon": -78.81667, "riesgo": 7.1, "poblacion": 28000,
        "cuenca_principal": "Río San Pablo"
    },
    "0613": {
        "nombre": "Santa Cruz", "capital": "Santa Cruz de Succhabamba", "altitud": 2035,
        "lat": -6.62694, "lon": -78.94694, "riesgo": 8.6, "poblacion": 45000,
        "cuenca_principal": "Río Chancay-Lambayeque"
    }
}
