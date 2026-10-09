import React, { useState } from 'react';
import { CloudRain, Droplets, Activity, Zap, ShieldCheck, AlertTriangle, AlertOctagon, ArrowRight, Gauge } from 'lucide-react';

export default function TelemetryPanel({
  telemetry,
  pdpResult,
  onUpdateTelemetry,
  isLoading,
}) {
  const [precipitation, setPrecipitation] = useState(telemetry?.precipitacion_mm_h || 32.0);
  const [soilSaturation, setSoilSaturation] = useState(telemetry?.saturacion_suelo_pct || 85.0);
  const [stage, setStage] = useState(telemetry?.etapa || 1);

  const handleApply = (p, s, st) => {
    setPrecipitation(p);
    setSoilSaturation(s);
    setStage(st);
    onUpdateTelemetry(p, s, st);
  };

  const applyPreset = (type) => {
    if (type === 'normal') {
      handleApply(4.0, 35.0, 1);
    } else if (type === 'alerta') {
      handleApply(18.0, 68.0, 1);
    } else if (type === 'critico') {
      handleApply(32.0, 85.0, 1);
    }
  };

  const currentState = pdpResult?.estado_clasificado || 'S3';
  const currentAction = pdpResult?.accion_optima || 'A3';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-500/10 rounded-lg border border-teal-500/20 text-teal-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              Pilar 1: Ingesta SENAMHI y Programación Dinámica Probabilística
            </h3>
            <p className="text-xs text-slate-400">
              Clasificación estocástica en 3 etapas de Bellman (0-6h, 6-12h, 12-18h)
            </p>
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => applyPreset('normal')}
            className="px-2.5 py-1 rounded hover:bg-emerald-950 hover:text-emerald-400 text-slate-400 transition font-medium"
          >
            S₁ Normal
          </button>
          <button
            onClick={() => applyPreset('alerta')}
            className="px-2.5 py-1 rounded hover:bg-amber-950 hover:text-amber-400 text-slate-400 transition font-medium"
          >
            S₂ Alerta
          </button>
          <button
            onClick={() => applyPreset('critico')}
            className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800 transition font-medium"
          >
            S₃ Huaico Crítico
          </button>
        </div>
      </div>

      {/* Sliders & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
        {/* Lluvia P */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              Intensidad de Lluvia P
            </span>
            <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              {precipitation} mm/h
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={precipitation}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setPrecipitation(val);
              onUpdateTelemetry(val, soilSaturation, stage);
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 mm/h</span>
            <span>10 (Alerta)</span>
            <span>25 (Crítico)</span>
            <span>50 mm/h</span>
          </div>
        </div>

        {/* Humedad Suelo θ */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Droplets className="w-4 h-4 text-teal-400" />
              Saturación del Suelo θ
            </span>
            <span className="font-mono text-teal-400 font-bold bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
              {soilSaturation}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={soilSaturation}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSoilSaturation(val);
              onUpdateTelemetry(precipitation, val, stage);
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0%</span>
            <span>60% (Inestable)</span>
            <span>80% (Colapso)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Etapa de Bellman */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Gauge className="w-4 h-4 text-amber-400" />
              Etapa Temporal (t)
            </span>
            <span className="font-mono text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
              Etapa {stage} ({stage === 1 ? '0-6h' : stage === 2 ? '6-12h' : '12-18h'})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStage(s);
                  onUpdateTelemetry(precipitation, soilSaturation, s);
                }}
                className={`py-1.5 text-xs font-semibold rounded border transition ${
                  stage === s
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                t = {s}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 text-center">
            {stage === 1 ? 'Detección temprana' : stage === 2 ? 'Infiltración activa' : 'Fase previa a detonación'}
          </div>
        </div>
      </div>

      {/* Decision Output & Semáforo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Estado Clasificado */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          currentState === 'S3'
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
            : currentState === 'S2'
            ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
        }`}>
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Estado Hidrometeorológico Clasificado
            </div>
            <div className="text-xl font-bold flex items-center gap-2">
              {currentState === 'S3' && <AlertOctagon className="w-5 h-5 text-rose-400 animate-pulse" />}
              {currentState === 'S2' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {currentState === 'S1' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              <span>{pdpResult?.estado_nombre || 'S3: Alerta roja (Detonación inminente)'}</span>
            </div>
            <div className="text-xs text-slate-300">
              {currentState === 'S3'
                ? 'Condición severa: Lluvia > 25 mm/h o Humedad > 80%'
                : currentState === 'S2'
                ? 'Condición moderada: 10-25 mm/h o Humedad 60-80%'
                : 'Condición normal: Escorrentía regular'}
            </div>
          </div>
          <div className={`text-2xl font-black font-mono px-3 py-1.5 rounded-lg border ${
            currentState === 'S3'
              ? 'bg-rose-900/60 text-rose-300 border-rose-700'
              : currentState === 'S2'
              ? 'bg-amber-900/60 text-amber-300 border-amber-700'
              : 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
          }`}>
            {currentState}
          </div>
        </div>

        {/* Acción Óptima de Bellman */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Prescripción Óptima de Bellman xₜ*(sₜ)
            </span>
            <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
              f_{stage}({currentState}) = {pdpResult?.costo_minimo_esperado || 263.56} k PEN
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60">
            <div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{pdpResult?.accion_nombre || 'A3: Despliegue logístico y evacuación total'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {pdpResult?.dispara_protocolo
                  ? '⚡ Regla de Acoplamiento activa: Dispara Pilar 2 (PERT/CPM)'
                  : 'Monitoreo pasivo: Convoy logístico en espera'}
              </div>
            </div>
            <div className="text-base font-black font-mono bg-teal-500/20 text-teal-300 px-3 py-1 rounded border border-teal-500/40">
              {currentAction}
            </div>
          </div>

          {/* Breakdown de valores Q */}
          {pdpResult?.valores_Q && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className={`p-1.5 rounded text-center border text-[11px] ${
                currentAction === 'A1'
                  ? 'bg-teal-950 text-teal-300 border-teal-700 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <div>Q(A₁ Monitoreo)</div>
                <div className="font-mono font-semibold">{pdpResult.valores_Q.A1} k</div>
              </div>
              <div className={`p-1.5 rounded text-center border text-[11px] ${
                currentAction === 'A2'
                  ? 'bg-teal-950 text-teal-300 border-teal-700 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <div>Q(A₂ Pre-pos.)</div>
                <div className="font-mono font-semibold">{pdpResult.valores_Q.A2} k</div>
              </div>
              <div className={`p-1.5 rounded text-center border text-[11px] ${
                currentAction === 'A3'
                  ? 'bg-teal-950 text-teal-300 border-teal-700 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <div>Q(A₃ Despliegue)</div>
                <div className="font-mono font-semibold">{pdpResult.valores_Q.A3} k</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
