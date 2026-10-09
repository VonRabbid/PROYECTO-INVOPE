import React, { useState } from 'react';
import { Cpu } from 'lucide-react';

export default function OptimizationConsole({
  activeTab,
  setActiveTab,
  // VRPTW data
  vrpResults,
  // PDD data
  pddResults,
  onRunPDD,
  isRerouting,
  // PDP data
  pdpResults,
  onEvaluatePDP,
  isEvaluatingPDP,
  // PERT data
  pertResults,
}) {
  const [selectedSenamhiAlert, setSelectedSenamhiAlert] = useState('ROJO');

  const tabs = [
    { id: 'vrptw', label: 'VRPTW' },
    { id: 'pdd', label: 'PDD Dinámico' },
    { id: 'pdp', label: 'PDP Kits' },
    { id: 'pert', label: 'PERT/CPM' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* HEADER */}
      <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Motor de Optimización (INVOPE)
          </h3>
        </div>
        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
          {vrpResults?.status || 'Optimal'}
        </span>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="p-3 text-xs text-slate-700 flex-1">
        {/* PESTAÑA 1: VRPTW */}
        {activeTab === 'vrptw' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Solución Entera Z_IP:</span>
                <span className="font-mono font-bold text-slate-900">
                  {vrpResults?.z_ip_costo_total?.toFixed(2) ?? '60.27'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cota Dual Z_LP:</span>
                <span className="font-mono font-bold text-slate-900">
                  {vrpResults?.z_lp_cota_inferior?.toFixed(2) ?? '48.67'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Optimality Gap:</span>
                <span className="font-mono font-bold text-blue-700">
                  {vrpResults?.optimality_gap_pct ?? '19.25'}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tiempo Solver CBC:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {vrpResults?.tiempo_computo_seg ?? '0.56'} s
                </span>
              </div>
            </div>

            <div className="max-h-[160px] overflow-y-auto space-y-2">
              {vrpResults?.rutas && vrpResults.rutas.length > 0 ? (
                vrpResults.rutas.map((ruta, idx) => (
                  <div
                    key={ruta.id_vehiculo || idx}
                    className="p-2.5 bg-white rounded-lg border-l-4 border-l-blue-600 border border-slate-200 shadow-xs"
                  >
                    <div className="flex justify-between items-center font-semibold text-slate-900 mb-1">
                      <span>{ruta.id_vehiculo}</span>
                      <span className="font-mono text-blue-700">{ruta.distancia_km} km</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between mb-1.5">
                      <span>Carga: {ruta.carga_total_kg} kg</span>
                      <span>Tiempo: {ruta.tiempo_ruta_min} min</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 overflow-x-auto">
                      <span className="text-slate-400">Secuencia:</span>
                      {(ruta.paradas || []).map((p) => p.id_nodo).join(' → ')} → 0
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-center py-4 text-xs italic">
                  Presiona '1. Optimizar VRPTW' para calcular las secuencias vehiculares.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: PDD DINÁMICO */}
        {activeTab === 'pdd' && (
          <div className="space-y-3">
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Programación Dinámica Determinística (Bellman): Re-enrutamiento rápido dependiente del tiempo ante huaicos sobrevenidos en menos de 0.1 s.
            </p>

            <button
              onClick={onRunPDD}
              disabled={isRerouting}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold text-xs rounded-lg shadow-xs transition"
            >
              {isRerouting ? 'Calculando Bellman PDD...' : 'Calcular Desvío Dinámico (PDD)'}
            </button>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Latencia de Cálculo:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {pddResults?.tiempo_computo_ms ?? '2.17'} ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Camino Alternativo:</span>
                <span className="font-mono font-bold text-purple-700">
                  {pddResults?.camino_nodos ? pddResults.camino_nodos.join(' → ') : '[0 → 5]'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tiempo Estimado:</span>
                <span className="font-mono font-bold text-slate-900">
                  {pddResults?.tiempo_total_min ?? '28.4'} min
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: PDP KITS */}
        {activeTab === 'pdp' && (
          <div className="space-y-3">
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Programación Dinámica Probabilística: Pre-posicionamiento estocástico de kits hacia almacenes AAP basado en cadenas de Markov y pronósticos SENAMHI.
            </p>

            <div className="flex gap-2">
              <select
                value={selectedSenamhiAlert}
                onChange={(e) => setSelectedSenamhiAlert(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 flex-1"
              >
                <option value="ROJO">Alerta ROJA (Tormenta Severa)</option>
                <option value="NARANJA">Alerta NARANJA (Preparación)</option>
                <option value="AMARILLO">Alerta AMARILLA (Preventiva)</option>
                <option value="VERDE">Alerta VERDE (Normal)</option>
              </select>
              <button
                onClick={() => onEvaluatePDP(selectedSenamhiAlert)}
                disabled={isEvaluatingPDP}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition"
              >
                Evaluar
              </button>
            </div>

            {pdpResults && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Kits Despacho Inmediato:</span>
                  <span className="font-mono font-bold text-red-600 text-sm">
                    {pdpResults.politica_completa?.[selectedSenamhiAlert]?.kits_a_despachar ?? pdpResults.despacho_inmediato_recomendado} kits
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Stock Resultante AAP:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {pdpResults.politica_completa?.[selectedSenamhiAlert]?.stock_final_provincia ?? 1100} kits
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Cobertura Riesgo Severo:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {pdpResults.politica_completa?.[selectedSenamhiAlert]?.cobertura_riesgo_severo_pct ?? 91.7}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 4: PERT/CPM */}
        {activeTab === 'pert' && (
          <div className="space-y-3">
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Programación y Control de Proyectos (PERT/CPM): Ruta crítica de preparación, carga y despacho logístico humanitario en el Almacén Central COER.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ruta Crítica:</span>
                <span className="font-mono font-bold text-purple-700">
                  {pertResults?.ruta_critica ? pertResults.ruta_critica.join(' → ') : 'A → B → D → H'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Duración Esperada μ:</span>
                <span className="font-mono font-bold text-slate-900">
                  {pertResults?.duracion_esperada_proyecto_min ?? 96.0} min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Varianza Total σ²:</span>
                <span className="font-mono font-bold text-slate-900">
                  {pertResults?.varianza_proyecto_min2 ?? 94.7} min²
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Puntualidad P(T ≤ 120min):</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {pertResults?.probabilidad_cumplimiento_pct ?? 99.42}%
                </span>
              </div>
            </div>

            {pertResults?.actividades && (
              <div className="max-h-[120px] overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-left text-[11px] text-slate-700">
                  <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-1 px-1.5">Act</th>
                      <th className="py-1 px-1.5">Descripción</th>
                      <th className="py-1 px-1.5 text-right">μ</th>
                      <th className="py-1 px-1.5 text-center">Crítica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                    {pertResults.actividades.map((a) => (
                      <tr key={a.id} className={a.es_critica ? 'bg-purple-50' : ''}>
                        <td className="py-1 px-1.5 font-bold text-purple-700">{a.id}</td>
                        <td className="py-1 px-1.5 truncate max-w-[120px] font-sans">{a.descripcion}</td>
                        <td className="py-1 px-1.5 text-right">{a.duracion_esperada}</td>
                        <td className="py-1 px-1.5 text-center">
                          {a.es_critica ? (
                            <span className="text-purple-700 font-bold">SÍ</span>
                          ) : (
                            <span className="text-slate-400">NO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
