# GeoAlert-VRP: Sistema Inteligente de Alerta Temprana y Despliegue Logístico Automatizado ante la Activación de Quebradas en el Perú

[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)](https://fastapi.tiangolo.com/)
[![Google OR-Tools](https://img.shields.io/badge/Google%20OR--Tools-9.9+-orange.svg)](https://developers.google.com/optimization)
[![React](https://img.shields.io/badge/React-18%2F19-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-sky.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green.svg)](https://leafletjs.com/)
[![Tests](https://img.shields.io/badge/pytest-7%20passed-brightgreen.svg)](https://docs.pytest.org/)

---

## 1. Resumen Ejecutivo y Alcance del Proyecto

**GeoAlert-VRP** es una solución de ingeniería de sistemas e investigación de operaciones diseñada para superar la desarticulación operativa que históricamente ha provocado que la ayuda humanitaria llegue tarde o que los convoyes queden varados ante aluviones y huaicos en el Perú.

El sistema fusiona tres modelos matemáticos avanzados de **Investigación de Operaciones II** en una cadena autónoma máquina a máquina (M2M):
1. **Pilar 1: Programación Dinámica Probabilística (PDP - Bellman MDP)** para la alerta temprana estocástica.
2. **Pilar 2: Programación y Control de Proyectos (PERT/CPM)** para la orquestación probabilística de la preparación del convoy en el almacén regional.
3. **Pilar 3: Ruteo Vehicular Dinámico con Ventanas de Tiempo y Capacidad (DVRPTW con Google OR-Tools)** con corte dinámico de vías (penalización Big-M) y reoptimización en caliente.

El caso de estudio y validación cuantitativa corresponde a la **Región Cajamarca**, integrando el Centro de Operaciones de Emergencia Regional (**COER**) y seis refugios de damnificados ubicados a lo largo de las quebradas de la cuenca del Río Chonta / Crisnejas (Baños del Inca, Llacanora, Jesús, Otuzco, Huambocancha y Porcón).

---

## 2. Arquitectura de Cuatro Capas y Flujo Secuencial M2M

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA 4: DASHBOARD WEB INTERACTIVO                    │
│   (React 18/19 + Tailwind CSS + MapView Leaflet + Semáforo + Gantt)    │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ Contrato: Rutas, arribos Tik, alertas
┌───────────────────────────────────┴────────────────────────────────────┐
│              CAPA 3: MOTOR ANALÍTICO DE OPTIMIZACIÓN (IO II)           │
│                                                                        │
│   [Fase 1: PDP Bellman] ──(xt* in {A2,A3})──► [Fase 2: PERT/CPM]      │
│   Precipitación P y θ                         Cronograma COE           │
│   Decisión óptima                             Ruta crítica 190 min     │
│                                                        │               │
│                                               T0 = talerta + 190 min   │
│                                                        ▼               │
│   [Fase 4: Despacho M2M] ◄───(Hojas de ruta)── [Fase 3: DVRPTW]        │
│   Persistencia relacional                     Google OR-Tools (GLS)   │
│   en RutasDespacho y Paradas                  Z* = 357m / 366m        │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│               CAPA 2: BASE DE DATOS RELACIONAL (7 TABLAS)              │
│       CentrosAcopio, Refugios, Flota, AristasViales, Bloqueos,         │
│                 RutasDespacho, ParadasRuta (SQLAlchemy)                │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                     CAPA 1: INGESTA TELEMÉTRICA                        │
│          Lecturas horarias de lluvia P (mm/h) y humedad θ (%)          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación Matemática de los Tres Pilares

### Pilar 1: Programación Dinámica Probabilística (pilar1_pdp.py)
- **Horizonte temporal**: 3 etapas $t \in \{1, 2, 3\}$ de 6 horas cada una (0-6h detección, 6-12h infiltración, 12-18h detonación) y etapa terminal $t=4$.
- **Estados hidrometeorológicos**:
  - $S_1$ (Normal / Verde): $P < 10\text{ mm/h}$ y $\theta < 60\%$.
  - $S_2$ (Alerta amarilla): $10 \le P \le 25\text{ mm/h}$ o $60 \le \theta \le 80\%$.
  - $S_3$ (Alerta roja): $P > 25\text{ mm/h}$ o $\theta > 80\%$.
- **Decisiones operativas**:
  - $A_1$: Monitoreo pasivo ($C_{op} = 5.0$ k PEN).
  - $A_2$: Pre-posicionamiento preventivo ($C_{op} = 25.0$ k PEN).
  - $A_3$: Despliegue logístico total ($C_{op} = 60.0$ k PEN).
- **Costos terminales residuales**: $D_{term}(S_1) = 0.0$, $D_{term}(S_2) = 40.0$, $D_{term}(S_3) = 250.0$ miles de PEN.
- **Ecuación recursiva hacia atrás de Bellman**:
  $$Q_t(s_t, x_t) = C(s_t, x_t) + \sum_{j \in \{S_1, S_2, S_3\}} P(j \mid s_t, x_t) \cdot f_{t+1}(j)$$
  $$f_t(s_t) = \min_{x_t} Q_t(s_t, x_t), \quad x_t^*(s_t) = \arg\min_{x_t} Q_t(s_t, x_t)$$
- **Resultados exactos validados**:
  - Etapa 1: $f_1(S_1) = 108.61$ k PEN ($A_1$), $f_1(S_2) = 196.52$ k PEN ($A_2$), $f_1(S_3) = 263.56$ k PEN ($A_3$).
  - Etapa 2: $f_2(S_1) = 71.26$, $f_2(S_2) = 158.96$, $f_2(S_3) = 234.47$.
  - Etapa 3: $f_3(S_1) = 33.80$, $f_3(S_2) = 114.00$, $f_3(S_3) = 219.00$.

### Pilar 2: Programación y Control de Proyectos PERT/CPM (pilar2_pert.py)
- **10 actividades del protocolo COE/INDECI** (A a la J):
  - Convocatoria (A), EDAN (B), Cubicaje (C), Mecánica (D), Estiba (E), Tripulación (F), Salvoconductos (G), Briefing (H), Precintado (I), Partida (J).
- **Parámetros estadísticos**:
  $$\mu_i = \frac{a_i + 4m_i + b_i}{6}, \quad \sigma_i^2 = \left(\frac{b_i - a_i}{6}\right)^2$$
- **Ruta crítica identificada**:
  $$\text{Camino Crítico} = A \to B \to C \to E \to H \to I \to J$$
- **Parámetros globales**:
  $$\mu_{CP} = 190.00\text{ min (3h 10m)}, \quad \sigma_{CP}^2 = 110.56\text{ min}^2, \quad \sigma_{CP} = 10.5145\text{ min}$$
- **Holguras no críticas**: $D = 41.00\text{ min}$, $F = 72.00\text{ min}$, $G = 66.00\text{ min}$.
- **Probabilidad de partida oportuna $P(T \le T_{target})$**:
  $$Z = \frac{T_{target} - \mu_{CP}}{\sigma_{CP}}, \quad P(T \le T_{target}) = \Phi(Z)$$
  - $T = 170\text{ min} \implies Z = -1.9021, P = 2.86\%$
  - $T = 180\text{ min} \implies Z = -0.9511, P = 17.08\%$
  - $T = 190\text{ min} \implies Z = 0.0000, P = 50.00\%$
  - $T = 210\text{ min} \implies Z = +1.9021, P = 97.14\%$
- **Regla de acoplamiento**: $T_0 = t_{alerta} + 190.00\text{ min}$ fija el origen de las ventanas de tiempo del VRPTW.

### Pilar 3: DVRPTW Dinámico con Google OR-Tools (pilar3_vrptw.py)
- **Instancia Región Cajamarca**:
  - $N_0$ (Almacén COER): $[0, 300]\text{ min}$, demanda $0\text{ t}$.
  - $R_1$ (Baños del Inca): $[40, 120]\text{ min}$, demanda $3\text{ t}$, servicio $15\text{ min}$.
  - $R_2$ (Llacanora): $[30, 110]\text{ min}$, demanda $3\text{ t}$, servicio $15\text{ min}$.
  - $R_3$ (Valle de Jesús): $[50, 140]\text{ min}$, demanda $4\text{ t}$, servicio $15\text{ min}$.
  - $R_4$ (Ventanillas de Otuzco): $[20, 90]\text{ min}$, demanda $3\text{ t}$, servicio $15\text{ min}$.
  - $R_5$ (Huambocancha Alta): $[60, 160]\text{ min}$, demanda $3\text{ t}$, servicio $15\text{ min}$.
  - $R_6$ (Porcón): $[15, 80]\text{ min}$, demanda $2\text{ t}$, servicio $15\text{ min}$.
- **Flota**: 2 camiones pesados MAN 6×4 de $10\text{ t}$ de capacidad. Demanda total: $18\text{ t}$.
- **Metaheurística**: Guided Local Search (GLS).
- **Corte dinámico de aristas**:
  $$t_{uv} = M = 9999\text{ min}$$
- **Resultados cuantitativos validados**:
  | Indicador | Escenario Base | Escenario con Bloqueo R4 ↔ R6 |
  |---|:---:|:---:|
  | **Tiempo global $Z^*$** | **357 min** | **366 min (+9 min, +2.5%)** |
  | **Ruta Camión 1** | $N_0 \to R_1 \to R_3 \to R_5 \to N_0$ (202 min, 10t) | $N_0 \to R_6 \to R_1 \to R_5 \to N_0$ (202 min, 8t) |
  | **Ruta Camión 2** | $N_0 \to R_6 \to R_4 \to R_2 \to N_0$ (155 min, 8t) | $N_0 \to R_4 \to R_3 \to R_2 \to N_0$ (164 min, 10t) |
  | **Arribos en ventana** | **6 de 6 (100%)** | **6 de 6 (100%)** |
  | **Vehículos atrapados** | 0 | 0 |

---

## 4. Estructura del Monorepo

```
geoalert-vrp/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── entities.py           # 7 tablas del esquema relacional
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── io_schemas.py         # Validación Pydantic
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py            # Motor SQLite / SQL Server
│   │   │   └── seed_cajamarca.py     # Nodos, aristas y flota de Cajamarca
│   │   ├── core_io/
│   │   │   ├── __init__.py
│   │   │   ├── pilar1_pdp.py         # MDP Bellman hacia atrás
│   │   │   ├── pilar2_pert.py        # PERT/CPM y Gauss Error CDF
│   │   │   └── pilar3_vrptw.py       # DVRPTW con Google OR-Tools
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── pipeline_service.py   # Orquestación de Fases 0 a 4
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── telemetry.py          # /api/telemetry/*
│   │       ├── optimization.py       # /api/pert/* y /api/pipeline/*
│   │       └── routes.py             # /api/routing/*
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_models_validation.py # Pruebas pytest automatizadas
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx           # Mapa Leaflet interactivo con rutas
│   │   │   ├── TelemetryPanel.jsx    # Simulador SENAMHI y Bellman
│   │   │   ├── PertGantt.jsx         # Ruta crítica y calculadora Z-score
│   │   │   ├── TimeWindowsChart.jsx  # Corredores de tiempo y pines Tik
│   │   │   └── RoadBlockModal.jsx    # Disparador dinámico R4-R6 tuv = 9999
│   │   ├── services/
│   │   │   └── api.js                # Cliente REST
│   │   ├── App.jsx                   # Centro de control COER
│   │   ├── index.css                 # Directivas Tailwind y estilos Leaflet
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── run.bat                           # Lanzador rápido Windows
├── start.sh                          # Lanzador rápido Linux/macOS
└── README.md
```

---

## 5. Instrucciones de Instalación y Ejecución

### Prerrequisitos
- **Python**: 3.10 o superior (validado en Python 3.14).
- **Node.js**: v18 o superior (validado en Node.js v24).

### Arranque Rápido con un Solo Clic
En Windows, simplemente ejecuta el archivo `run.bat` ubicado en la raíz del proyecto.
En Linux / macOS / WSL, ejecuta:
```bash
chmod +x start.sh
./start.sh
```

---

### Arranque Manual Paso a Paso

#### 1. Backend (FastAPI + OR-Tools)
```powershell
cd geoalert-vrp/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API REST interactiva (Swagger UI): **http://127.0.0.1:8000/docs**
- Healthcheck: **http://127.0.0.1:8000/health**

#### 2. Frontend (React 18 + Vite + Leaflet)
En otra terminal:
```powershell
cd geoalert-vrp/frontend
npm.cmd install
npm.cmd run dev
```
- Sala de Control COER: **http://localhost:5173**

---

## 6. Ejecución de la Suite de Pruebas Automatizadas

Para validar que las fórmulas y cálculos coinciden exactamente con los del documento de investigación:

```powershell
cd geoalert-vrp/backend
python -m pytest tests/test_models_validation.py -v
```

**Resultado esperado**:
```
tests/test_models_validation.py::test_pdp_bellman_exact_values PASSED    [ 14%]
tests/test_models_validation.py::test_pdp_classification_and_coupling PASSED [ 28%]
tests/test_models_validation.py::test_pert_critical_path_and_duration PASSED [ 42%]
tests/test_models_validation.py::test_pert_target_probabilities PASSED   [ 57%]
tests/test_models_validation.py::test_vrptw_base_scenario PASSED         [ 71%]
tests/test_models_validation.py::test_vrptw_roadblock_scenario_r4_r6 PASSED [ 85%]
tests/test_models_validation.py::test_api_telemetry_and_pipeline PASSED  [100%]
======================= 7 passed in 10.99s ========================
```

---

## 7. Catálogo de Endpoints de la API REST

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/telemetry/ingest` | Ingiere $P$ (mm/h) y $\theta$ (%), clasifica estado y resuelve Bellman |
| `GET` | `/api/telemetry/pdp/status` | Obtiene la matriz completa de Bellman para etapas 1, 2 y 3 |
| `POST` | `/api/pert/calculate` | Resuelve red PERT/CPM, ruta crítica ($\mu_{CP}=190\text{m}$) y CDF Normal |
| `POST` | `/api/routing/solve` | Resuelve VRPTW con Google OR-Tools y persiste rutas |
| `POST` | `/api/routing/block-edge` | Registra corte vial dinámico ($t_{uv}=9999$) y reoptimiza en caliente |
| `POST` | `/api/routing/unblock-all` | Restablece la red vial al escenario base ($Z^*=357\text{ min}$) |
| `GET` | `/api/routing/network-graph` | Retorna nodos, coordenadas, ventanas, aristas y rutas para Leaflet |
| `GET/POST`| `/api/pipeline/run-full` | Ejecuta la orquestación M2M de 5 fases encadenadas de principio a fin |
