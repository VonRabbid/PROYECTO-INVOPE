import React, { useState, useEffect } from 'react';
import CommandNav from './components/CommandNav';
import KpiRibbon from './components/KpiRibbon';
import TacticalMap from './components/TacticalMap';
import QuebradasTable from './components/QuebradasTable';
import OptimizationConsole from './components/OptimizationConsole';
import RoadTransitCard from './components/RoadTransitCard';

import {
  fetchProvincias,
  fetchQuebradas,
  fetchNodos,
  fetchTramos,
  optimizarVRPTW,
  simularTelemetria,
  reenrutarPDD,
  preposicionarPDP,
  fetchPertCpm,
  resetDemo,
} from './services/api';

export default function App() {
  // Datos del backend
  const [provincias, setProvincias] = useState([]);
  const [quebradas, setQuebradas] = useState([]);
  const [nodos, setNodos] = useState([]);
  const [tramos, setTramos] = useState([]);

  // Resultados de modelos INVOPE
  const [vrpResults, setVrpResults] = useState(null);
  const [pddResults, setPddResults] = useState({
    tiempo_computo_ms: 2.17,
    camino_nodos: [0, 5],
    tiempo_total_min: 28.4,
    ruta_coordenadas: [],
  });
  const [pdpResults, setPdpResults] = useState(null);
  const [pertResults, setPertResults] = useState(null);

  // Estados de control UI
  const [isRedAlert, setIsRedAlert] = useState(false);
  const [activeQuebradaName, setActiveQuebradaName] = useState('');
  const [activeTab, setActiveTab] = useState('vrptw');

  // Estados de carga
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [isEvaluatingPDP, setIsEvaluatingPDP] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [injectingSensorId, setInjectingSensorId] = useState(null);

  // Carga inicial
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [provs, qbrs, nds, trms, pert, pdp] = await Promise.all([
        fetchProvincias().catch(() => []),
        fetchQuebradas().catch(() => []),
        fetchNodos().catch(() => []),
        fetchTramos().catch(() => []),
        fetchPertCpm(120.0).catch(() => null),
        preposicionarPDP({ codigo_provincia: '0601', stock_actual_kits: 300, nivel_alerta_senamhi: 'ROJO' }).catch(() => null),
      ]);

      setProvincias(provs);
      setQuebradas(qbrs);
      setNodos(nds);
      setTramos(trms);
      setPertResults(pert);
      setPdpResults(pdp);

      // Verificar si hay alguna quebrada roja en la carga inicial
      const roja = qbrs.find((q) => q.estado_alerta === 'ROJO_ACTIVADO');
      if (roja) {
        setIsRedAlert(true);
        setActiveQuebradaName(roja.nombre_quebrada);
      }
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    }
  }

  // 1. Optimizar VRPTW
  async function handleOptimizeVRPTW() {
    setIsOptimizing(true);
    try {
      const res = await optimizarVRPTW({ codigo_provincia: '0601', considerar_riesgo: true });
      setVrpResults(res);
      setActiveTab('vrptw');
    } catch (err) {
      console.error('Error al optimizar VRPTW:', err);
    } finally {
      setIsOptimizing(false);
    }
  }

  // 2. Simular Activación de Quebrada / Huaico
  async function handleSimulateStorm(sensorId = 'IOT-PLUV-0601-01') {
    setIsSimulating(true);
    setInjectingSensorId(sensorId);
    try {
      const payload = {
        id_sensor: sensorId,
        precipitacion_mm_h: 62.5,
        caudal_m: 3.4,
        vibracion_hz: 75.0,
      };

      const res = await simularTelemetria(payload);
      setIsRedAlert(true);
      setActiveQuebradaName(res.nombre_quebrada || 'Quebrada San Lucas');

      // Recargar quebradas y tramos actualizados
      const [qbrs, trms] = await Promise.all([fetchQuebradas(), fetchTramos()]);
      setQuebradas(qbrs);
      setTramos(trms);

      // Disparar re-optimización automática en caliente para esquivar las vías caídas
      await handleOptimizeVRPTW();
    } catch (err) {
      console.error('Error simulando activación de huaico:', err);
    } finally {
      setIsSimulating(false);
      setInjectingSensorId(null);
    }
  }

  // 3. Re-enrutar PDD adaptativo en sub-segundos
  async function handleReroutePDD() {
    setIsRerouting(true);
    try {
      const res = await reenrutarPDD({
        id_origen: 0,
        id_destino: 5,
        tramos_bloqueados: [
          [0, 1],
          [1, 2],
        ],
      });
      setPddResults(res);
      setActiveTab('pdd');
    } catch (err) {
      console.error('Error en re-enrutamiento PDD:', err);
    } finally {
      setIsRerouting(false);
    }
  }

  // Evaluar PDP
  async function handleEvaluatePDP(alerta = 'ROJO') {
    setIsEvaluatingPDP(true);
    try {
      const res = await preposicionarPDP({
        codigo_provincia: '0601',
        stock_actual_kits: 300,
        nivel_alerta_senamhi: alerta,
      });
      setPdpResults(res);
    } catch (err) {
      console.error('Error evaluando PDP:', err);
    } finally {
      setIsEvaluatingPDP(false);
    }
  }

  // Reiniciar Demo
  async function handleResetDemo() {
    setIsResetting(true);
    try {
      await resetDemo();
      setIsRedAlert(false);
      setActiveQuebradaName('');
      setPddResults(null);
      await loadInitialData();
      await handleOptimizeVRPTW();
    } catch (err) {
      console.error('Error al reiniciar demo:', err);
    } finally {
      setIsResetting(false);
    }
  }

  // Contadores para KPIs
  const rojasCount = quebradas.filter((q) => q.estado_alerta === 'ROJO_ACTIVADO').length;
  const blockedCount = tramos.filter((t) => t.esta_bloqueado && t.id_origen < t.id_destino).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* 1. BARRA SUPERIOR DE COMANDO COER */}
      <CommandNav
        isRedAlert={isRedAlert}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-4 flex flex-col gap-3">
        {/* 2. RIBBON DE KPIS EJECUTIVOS */}
        <KpiRibbon
          provinciasCount={provincias.length || 13}
          quebradasRojas={rojasCount}
          totalQuebradas={quebradas.length || 10}
          tramosBloqueados={blockedCount}
          pddTimeMs={pddResults?.tiempo_computo_ms ?? 2.17}
          gapDualPct={vrpResults?.optimality_gap_pct ?? 19.25}
          pertReliabilityPct={pertResults?.probabilidad_cumplimiento_pct ?? 99.42}
          activeQuebradaName={activeQuebradaName}
        />

        {/* 3. LAYOUT CENTRAL: MAPA SIG (COL IZQ) + CONSOLA OPERATIVA (COL DER) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1">
          {/* COLUMNA IZQUIERDA: MAPA TÁCTICO VECTORIAL (8 COLS) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-[580px]">
            <TacticalMap
              nodos={nodos}
              tramos={tramos}
              rutas={vrpResults?.rutas || []}
              pddRuta={pddResults}
              isOptimizing={isOptimizing}
              isSimulating={isSimulating}
              isRerouting={isRerouting}
              onOptimize={handleOptimizeVRPTW}
              onSimulateStorm={() => handleSimulateStorm('IOT-PLUV-0601-01')}
              onReroutePDD={handleReroutePDD}
            />
          </div>

          {/* COLUMNA DERECHA: CONSOLA DE OPERACIONES E INVOPE (4 COLS) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3">
            {/* TARJETA 1: TELEMETRÍA IOT MULTI-QUEBRADA */}
            <QuebradasTable
              quebradas={quebradas}
              onInjectStorm={handleSimulateStorm}
              injectingQuebradaId={injectingSensorId}
            />

            {/* TARJETA 2: MOTOR DE OPTIMIZACIÓN INVOPE (VRPTW, PDD, PDP, PERT) */}
            <OptimizationConsole
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              vrpResults={vrpResults}
              pddResults={pddResults}
              onRunPDD={handleReroutePDD}
              isRerouting={isRerouting}
              pdpResults={pdpResults}
              onEvaluatePDP={handleEvaluatePDP}
              isEvaluatingPDP={isEvaluatingPDP}
              pertResults={pertResults}
            />

            {/* TARJETA 3: ESTADO VIAL PROVINCIAL */}
            <RoadTransitCard tramos={tramos} nodos={nodos} />
          </div>
        </div>
      </main>
    </div>
  );
}
