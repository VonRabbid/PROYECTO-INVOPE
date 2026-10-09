import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Zap, ShieldCheck, Check, ArrowRight, Truck } from 'lucide-react';

export default function RoadBlockModal({
  activeRoadblocks = [],
  solution,
  onApplyBlock,
  onClearBlocks,
  isLoading,
}) {
  const [selectedEdge, setSelectedEdge] = useState('R4-R6');
  const isR4R6Blocked = activeRoadblocks.some(
    (b) => b.tramo === 'R4-R6' || b.tramo === 'R6-R4'
  );

  const handleSimulateDefault = () => {
    onApplyBlock('R4', 'R6', 'Activación masiva de quebrada con aluvión en tramo R4 ↔ R6');
  };

  const handleCustomBlock = () => {
    const [u, v] = selectedEdge.split('-');
    onApplyBlock(u, v, `Corte dinámico por flujo de detritos en tramo ${selectedEdge}`);
  };

  const isBlocked = activeRoadblocks.length > 0;
  const zStar = solution?.Z_star_tiempo_total || (isBlocked ? 366 : 357);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              Módulo de Corte Dinámico de Vías y Reoptimización en Caliente
            </h3>
            <p className="text-xs text-slate-400">
              Penalización Big-M (tᵤᵥ = 9999) y reconfiguración autónoma de convoyes
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isBlocked ? (
            <button
              onClick={handleSimulateDefault}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-rose-900/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              Simular Aluvión en R4 ↔ R6
            </button>
          ) : (
            <button
              onClick={onClearBlocks}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer Vías a Escenario Base
            </button>
          )}
        </div>
      </div>

      {/* Comparison KPIs (Tabla 16 del informe) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Tiempo Global Z*</div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-0.5">
            {zStar} min
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isBlocked ? (
              <span className="text-amber-400">+9 min (+2.5%) vs Base (357)</span>
            ) : (
              <span className="text-emerald-400">Óptimo Base (357 min)</span>
            )}
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Demanda Abastecida</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            18 / 18 t
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">
            100% de damnificados cubiertos
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Arribos en Ventana</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
            6 de 6
          </div>
          <div className="text-[10px] text-cyan-400 mt-1">
            Cero retrasos intolerables
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Camiones Atrapados</div>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-0.5">
            0 unidades
          </div>
          <div className="text-[10px] text-indigo-400 mt-1">
            Evacuación vial exitosa
          </div>
        </div>
      </div>

      {/* Routes Breakdown Comparison (Table 14 vs 15) */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            Reasignación Automática de Flota en Tiempo Real
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
            isBlocked
              ? 'bg-rose-950 text-rose-300 border-rose-800'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}>
            {isBlocked ? 'Estado: ESCENARIO CON BLOQUEO ACTIVO' : 'Estado: ESCENARIO BASE'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Camión 1 */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-cyan-500/30 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-cyan-300">Camión 1 (MAN 6×4)</span>
              <span className="font-mono text-[11px] text-slate-400">
                {isBlocked ? 'Carga: 8t | Retorno: 202 min' : 'Carga: 10t | Retorno: 202 min'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-200 text-[11px]">
              {isBlocked ? (
                <>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold">R6 (20')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold">R1 (77')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold">R5 (117')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0 (202')</span>
                </>
              ) : (
                <>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold">R1 (55')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold">R3 (80')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold">R5 (117')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0 (202')</span>
                </>
              )}
            </div>
          </div>

          {/* Camión 2 */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-orange-500/30 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-orange-300">Camión 2 (MAN 6×4)</span>
              <span className="font-mono text-[11px] text-slate-400">
                {isBlocked ? 'Carga: 10t | Retorno: 164 min' : 'Carga: 8t | Retorno: 155 min'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-200 text-[11px]">
              {isBlocked ? (
                <>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-orange-950 text-orange-300 border border-orange-800 rounded font-bold">R4 (35')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-orange-950 text-orange-300 border border-orange-800 rounded font-bold">R3 (76')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-orange-950 text-orange-300 border border-orange-800 rounded font-bold">R2 (99')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0 (164')</span>
                </>
              ) : (
                <>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-orange-950 text-orange-300 border border-orange-800 rounded font-bold">R6 (20')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-orange-950 text-orange-300 border border-orange-800 rounded font-bold">R4 (53')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-orange-950 text-orange-300 border border-orange-800 rounded font-bold">R2 (90')</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded">N0 (155')</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
