"""
Simulador de eventos hidrometeorológicos y telemetría IoT en cabeceras de cuenca.
Genera lecturas sintéticas y procesa pulsos de precipitación crítica para GeoAlert-VRP.
"""

import random
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from app.config import UMBRAL_AMARILLO_MMH, UMBRAL_NARANJA_MMH, UMBRAL_ROJO_MMH


class IoTSimulator:
    """
    Simulador asíncrono de sensores IoT (pluviómetros, limnímetros y geófonos).
    """

    @staticmethod
    def classify_reading(
        precipitacion_mmh: float,
        caudal_m: float = 0.0,
        vibracion_hz: float = 0.0,
        umbral_critico_quebrada: float = 45.0
    ) -> Tuple[str, str]:
        """
        Clasifica el estado de alerta hidrológica según umbrales de lluvia y caudal.
        Retorna (nivel_alerta, descripcion_operativa).
        """
        if precipitacion_mmh >= umbral_critico_quebrada or caudal_m >= 2.5 or vibracion_hz >= 50.0:
            return "ROJO_ACTIVADO", "Activación inminente de quebrada / Huaico en curso. Bloqueo vial preventivo inmediato."
        elif precipitacion_mmh >= UMBRAL_NARANJA_MMH or caudal_m >= 1.8 or vibracion_hz >= 25.0:
            return "NARANJA", "Caudal crítico en ascenso. Pre-posicionar kits de ayuda humanitaria en AAP."
        elif precipitacion_mmh >= UMBRAL_AMARILLO_MMH or caudal_m >= 1.0:
            return "AMARILLO", "Precipitación moderada sobre la cuenca. Alerta preventiva para brigadas."
        else:
            return "VERDE", "Condiciones hidrológicas estables. Tránsito normal."

    @classmethod
    def generate_random_telemetry(cls, id_sensor: str, id_quebrada: str, modo: str = "NORMAL") -> Dict[str, Any]:
        """
        Genera una lectura simulada. Si modo == 'TORMENTA', genera lluvia torrencial extrema.
        """
        if modo == "TORMENTA":
            lluvia = round(random.uniform(52.0, 78.0), 2)
            caudal = round(random.uniform(2.6, 4.2), 2)
            vibracion = round(random.uniform(55.0, 95.0), 1)
        elif modo == "CRECIDA":
            lluvia = round(random.uniform(32.0, 48.0), 2)
            caudal = round(random.uniform(1.7, 2.4), 2)
            vibracion = round(random.uniform(18.0, 40.0), 1)
        else:
            lluvia = round(random.uniform(2.0, 14.0), 2)
            caudal = round(random.uniform(0.3, 0.9), 2)
            vibracion = round(random.uniform(2.0, 10.0), 1)

        alerta, desc = cls.classify_reading(lluvia, caudal, vibracion)

        return {
            "id_sensor": id_sensor,
            "id_quebrada": id_quebrada,
            "precipitacion_mm_h": lluvia,
            "caudal_m": caudal,
            "vibracion_hz": vibracion,
            "estado_alerta": alerta,
            "mensaje": desc,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
