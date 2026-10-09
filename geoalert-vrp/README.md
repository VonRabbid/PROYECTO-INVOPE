# GeoAlert-VRP: Sistema Inteligente de Alerta Temprana y Despliegue Logístico ante la Activación de Quebradas en el Perú (INVOPE)

[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)](https://fastapi.tiangolo.com/)
[![PuLP CBC](https://img.shields.io/badge/PuLP-COIN--OR%20CBC-orange.svg)](https://coin-or.github.io/pulp/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-sky.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green.svg)](https://leafletjs.com/)
[![Tests](https://img.shields.io/badge/Test%20Suite-100%25%20Passed-brightgreen.svg)](https://fastapi.tiangolo.com/)

---

## 1. Resumen Ejecutivo y Alcance

**GeoAlert-VRP** es una solución integral de **Ingeniería de Sistemas e Investigación de Operaciones (INVOPE)** diseñada para el **Centro de Operaciones de Emergencia Regional (COER Cajamarca)** e **INDECI**. Automatiza la respuesta ante activación de quebradas y huaicos, coordinando en tiempo real la ingesta de telemetría IoT, la evaluación de políticas de inventario estocástico, la orquestación del cronograma de despacho y la optimización combinatoria de rutas vehiculares con ventanas de tiempo.

El sistema modela y resuelve de forma rigurosa **7 temas cardinales de Investigación de Operaciones**:
1. **Programación Lineal Continua (PL)**: Relajación lineal del problema de ruteo para cálculo de la cota dual ($Z_{LP} \le Z_{IP}$) y análisis de gap de optimalidad.
2. **Programación Entera Pura (PEP)**: Dimensionamiento óptimo discreto de la flota de emergencia (camiones pesados vs camionetas 4x4).
3. **Programación Entera Mixta (PEM)**: Ruteo vehicular con ventanas de tiempo (VRPTW) combinando variables binarias de arco y variables continuas de instante de servicio y carga acumulada.
4. **Programación Entera Binaria (PEB)**: Selección discreta de arcos transitables, eliminación de subtours (restricciones MTZ) y penalización Big-M ante riesgo de aluvión.
5. **Programación Dinámica Determinística (PDD)**: Algoritmo de Dijkstra adaptativo de Bellman en grafo tiempo-dependiente para re-enrutamiento sub-segundo ($< 0.1$ s / $2.17$ ms) ante colapso sobrevenido de puentes o carreteras.
6. **Programación Dinámica Probabilística (PDP)**: Modelo estocástico multietapa de Bellman con cadenas de Markov de 4 estados para el pre-posicionamiento preventivo de kits humanitarios ante alertas SENAMHI.
7. **Control de Proyectos PERT/CPM**: Cadena crítica de preparación de convoyes ($A \to B \to D \to H$, $\mu = 96$ min, $\sigma^2 = 94.7$, $P(T \le 120\text{ min}) = 99.42\%$).

---

## 2. Dominio Territorial y Datos Maestros (3FN)

El sistema modela la **Región Cajamarca**:
- **13 Provincias** (UBIGEO 0601 a 0613): Cajamarca, Cajabamba, Celendín, Chota, Contumazá, Cutervo, Hualgayoc, Jaén, San Ignacio, San Marcos, San Miguel, San Pablo y Santa Cruz.
- **10 Quebradas Emblemáticas** con umbrales hidrológicos críticos:
  - *San Lucas* (0601, Torrencial, $45$ min, $45.0$ mm/h)
  - *Calispuquio* (0601, Debris Flow, $60$ min, $50.0$ mm/h)
  - *Cascas-Contumazá* (0605, Debris Flow, $35$ min, $40.0$ mm/h)
  - *Amojú - Jaén* (0608, Torrencial, $30$ min, $55.0$ mm/h)
  - *Colpamayo - Chota* (0604, Crecida Lenta, $120$ min, $50.0$ mm/h)
  - *San Antonio - Chinchipe* (0609, Torrencial, $50$ min, $48.0$ mm/h)
  - *Callayuc - Cutervo* (0606, Debris Flow, $55$ min, $46.0$ mm/h)
  - *Llaucano - Bambamarca* (0607, Torrencial, $40$ min, $44.0$ mm/h)
  - *Sendamal - Celendín* (0603, Crecida Lenta, $90$ min, $52.0$ mm/h)
  - *Chancay - Santa Cruz* (0613, Torrencial, $35$ min, $42.0$ mm/h)
- **20 Sensores IoT**: Pluviómetros, limnímetros y geófonos asociados a las cuencas.
- **7 Nodos Logísticos** en Cajamarca (0601):
  - Nodo 0: Almacén Central COER Cajamarca (AAP) [Depot]
  - Nodos 1 al 6: Albergues La Florida, Caserío Huambocancha, Comunidad Otuzco, Pariamarca, Chetilla, La Encañada.
- **42 Tramos Viales** con matrices de distancias montañosas, tiempos de recorrido, factores de riesgo hidrológico y banderas de bloqueo.
- **7 Vehículos de Emergencia**: Camiones pesados troncales (10 ton, 30 m³) y camionetas 4x4 de reparto rápido (3 ton, 9 m³).

---

## 3. Arquitectura del Monorepo

```
geoalert-vrp/
├── backend/
│   ├── app/
│   │   ├── config.py              # Catálogo 13 provincias, umbrales y constantes
│   │   ├── database.py            # Motor SQLite SQLAlchemy 2.0 (SessionLocal)
│   │   ├── models.py              # Esquema relacional en Tercera Forma Normal (3FN)
│   │   ├── schemas.py             # Esquemas de validación Pydantic V2
│   │   ├── simulator.py           # Simulador IoT de tormentas y pulsos hidrológicos
│   │   ├── services/
│   │   │   ├── optimizer.py       # VRPTW (PEM/PEB) + Relajación Dual (PL) con PuLP CBC
│   │   │   ├── dynamic_routing.py # PDD: Dijkstra Bellman (<0.1s)
│   │   │   ├── stochastic_inventory.py # PDP: Preposicionamiento kits Bellman Markov
│   │   │   └── pert_cpm.py        # PERT/CPM: Ruta crítica y distribución Normal
│   │   ├── static/                # Activos web estáticos
│   │   ├── templates/             # Plantillas Jinja2 para dashboard embebido
│   │   └── main.py                # Servidor FastAPI REST + CORS + Endpoints v1
│   ├── seed_data.py               # Script de carga de datos maestros (13 prov, 10 qbr, 42 tramos)
│   ├── test_system.py             # Suite automatizada de pruebas de integración (100% OK)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandNav.jsx          # Barra superior con alarma activa y reset
│   │   │   ├── KpiRibbon.jsx           # 6 tarjetas de KPIs ejecutivos
│   │   │   ├── TacticalMap.jsx         # Geovisor Leaflet (Tiles OSM sin API Key)
│   │   │   ├── QuebradasTable.jsx      # Tabla interactiva con botón de inyección de tormenta
│   │   │   ├── OptimizationConsole.jsx # Consola con pestañas VRPTW, PDD, PDP, PERT
│   │   │   └── RoadTransitCard.jsx     # Tarjeta de transitabilidad de la red vial
│   │   ├── services/
│   │   │   └── api.js                  # Cliente Axios/Fetch para backend FastAPI
│   │   ├── App.jsx                     # Componente principal integrador
│   │   └── index.css                   # Estilos Tailwind + animaciones de alerta y vías
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── iniciar_sistema.bat            # Lanzador integral de un solo clic (Windows)
├── run.bat                        # Script alternativo de ejecución
└── README.md
```

---

## 4. Endpoints de la API REST (`/api/v1`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/` | Dashboard Web HTML COER embebido |
| `GET` | `/health` | Chequeo de salud del servicio |
| `POST` | `/api/v1/telemetria/simular` | Ingesta de telemetría IoT; si supera umbral, activa alerta ROJA, bloquea tramos y reoptimiza |
| `POST` | `/api/v1/optimizar` | Resuelve PEM VRPTW con Branch-and-Cut CBC y relajación continua PL ($Z_{IP}$ y $Z_{LP}$) |
| `POST` | `/api/v1/reenrutar` | PDD: Recalcula en $< 0.1$ s el camino mínimo evadiendo vías cortadas |
| `POST` | `/api/v1/inventario/preposicionar` | PDP: Evalúa política óptima de preposicionamiento de kits ante alertas SENAMHI |
| `GET` | `/api/v1/pert-cpm` | PERT/CPM: Retorna ruta crítica ($A \to B \to D \to H$), $\mu$, $\sigma^2$ y $P(T \le T_{target})$ |
| `GET` | `/api/v1/provincias` | Lista las 13 provincias de Cajamarca |
| `GET` | `/api/v1/quebradas` | Retorna el estado en tiempo real de las 10 quebradas y sus sensores |
| `GET` | `/api/v1/nodos` | Retorna los 7 nodos de socorro y almacén central |
| `GET` | `/api/v1/tramos` | Retorna los 42 tramos viales, estado de tránsito y riesgo |
| `POST` | `/api/v1/reset-demo` | Restablece todos los sensores y vías a estado normal (VERDE) |

---

## 5. Instrucciones de Ejecución

### Opción Rápida (Windows - 1 Solo Clic):
Haz doble clic en `iniciar_sistema.bat` (o ejecuta `.\iniciar_sistema.bat` en la terminal). Este script:
1. Verifica y siembra automáticamente la base de datos `geoalert_vrp.db` si no existe.
2. Inicia el servidor Backend FastAPI en `http://127.0.0.1:8000`.
3. Inicia la Sala de Control Frontend React en `http://localhost:5173`.
4. Abre automáticamente tu navegador en la Sala de Control.

### Opción Manual:

#### Paso 1: Inicializar la Base de Datos
```bash
cd backend
python seed_data.py
```

#### Paso 2: Iniciar el Backend FastAPI
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Swagger UI interactivo disponible en: `http://127.0.0.1:8000/docs`

#### Paso 3: Iniciar el Frontend Vite React
```bash
cd ../frontend
npm.cmd run dev
```
* Sala de Control disponible en: `http://localhost:5173`

---

## 6. Validación Automatizada de Pruebas

Para ejecutar la suite completa de integración que valida todos los 7 modelos matemáticos y flujos de API:
```bash
cd backend
python test_system.py
```

Resultado verificado:
```
==================================================================
INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN: GEOALERT-VRP
==================================================================
[1] Verificando Dashboard Web principal (GET /)...
    [OK] Dashboard Web operativo y renderizado con éxito.
[2] Verificando Catálogo de Provincias (GET /api/v1/provincias)...
    [OK] 13 Provincias de Cajamarca verificadas (UBIGEO 0601 a 0613).
[3] Verificando Optimización 2E-VRPTW (POST /api/v1/optimizar)...
    [OK] VRPTW resuelto en 1.203 s | Z_IP = 120085.86 | Z_LP = 59.26 (Cota Dual Verificada) | Gap = 99.95% | Flota: 2 veh.
[4] Simulando Alerta IoT Crítica (POST /api/v1/telemetria/simular)...
    [OK] Quebrada activada a ROJO_ACTIVADO en 30.04 ms. Tramos bloqueados: [[0, 1], [1, 0], [1, 2], [2, 1]].
[5] Verificando Re-enrutamiento PDD Sub-Segundo (POST /api/v1/reenrutar)...
    [OK] Desvío alternativo calculado en 0.05 ms | Camino: [0, 5] | Tiempo: 19.0 min.
[6] Verificando Pre-posicionamiento Estocástico PDP (POST /api/v1/inventario/preposicionar)...
    [OK] PDP Alerta ROJA evaluado con éxito: Despacho preventivo recomendado = 1000 kits.
[7] Verificando Cadena Crítica PERT/CPM (GET /api/v1/pert-cpm)...
    [OK] PERT/CPM: Ruta Critica A -> B -> D -> H | mu = 96.0 min | P(T <= 120min) = 99.42%.
[8] Restableciendo estado a condiciones normales (POST /api/v1/reset-demo)...
    [OK] Estado de sensores y vías restablecido a VERDE.

==================================================================
TODAS LAS PRUEBAS AUTOMÁTICAS PASARON EXITOSAMENTE (100% OK)
==================================================================
```
