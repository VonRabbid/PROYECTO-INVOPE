import React, { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, TrendingUp, Calendar, ArrowRight, ShieldAlert } from 'lucide-react';

export default function PertGantt({ pertData, tAlerta = 0 }) {
  const [customTarget, setCustomTarget] = useState(190);

  if (!pertData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        Cargando modelo PERT/CPM...
      </div>
    );
  }

  const muCp = pertData.mu_CP || 190.0;
  const sigmaCp = pertData.sigma_CP || 10.5145;
  const varCp = pertData.var_CP || 110.56;
  const t0 = (tAlerta + muCp).toFixed(1);

  // Dynamic calculation for custom threshold
  const calcProb = (t) => {
    const z = (t - muCp) / sigmaCp;
    // erf approximation
    const tVal = 1.0 / (1.0 + 0.5 * Math.abs(z / Math.sqrt(2.0)));
    const ans = 1 - tVal * Math.exp(-0.5 * z * z - 1.26551223 + tVal * (1.00002368 + tVal * (0.37409196 + tVal * (0.09678418 + tVal * (-0.18628806 + tVal * (0.27886807 + tVal * (-1.13520398 + tVal * (1.48851587 + tVal * (-0.82215223 + tVal * 0.17087277)))))))));
    const p = z >= 0 ? 0.5 + 0.5 * ans : 0.5 - 0.5 * ans;
    return { z: z.toFixed(4), pct: (p * 100).toFixed(2) };
  };

  const dynamicProb = calcProb(customTarget);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              Pilar 2: Protocolo de Preparación Logística en COE (PERT/CPM)
            </h3>
            <p className="text-xs text-slate-400">
              Ruta crítica de 10 actividades, holguras y probabilidad normal de partida oportuna
            </p>
          </div>
        </div>

        {/* Departure Time Metric */}
        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Hora de Partida T₀</div>
            <div className="text-xs text-slate-300">
              talerta ({tAlerta}m) + μCP ({muCp}m)
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-800">
            T₀ = {t0} min
          </div>
        </div>
      </div>

      {/* Critical Path Banner */}
      <div className="bg-slate-950 p-3.5 rounded-lg border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Ruta Crítica Determinada (Holgura Hi = 0)
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
            {pertData.ruta_critica?.map((act, idx) => (
              <React.Fragment key={act}>
                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                  {act}
                </span>
                {idx < pertData.ruta_critica.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400">μ_CP: </span>
            <span className="font-bold text-amber-400">{muCp} min</span> (3h 10m)
          </div>
          <div className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400">σ_CP²: </span>
            <span className="font-bold text-slate-200">{varCp} min²</span>
          </div>
          <div className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400">σ_CP: </span>
            <span className="font-bold text-slate-200">{sigmaCp} min</span>
          </div>
        </div>
      </div>

      {/* Probability Calculator (Table 11 + Slider) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table 11 Standard Values */}
        <div className="lg:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 border-b border-slate-800/80 pb-2">
            <span>Tabla 11: Probabilidad frente a umbrales de colapso de vías</span>
            <span className="text-[10px] text-slate-400 font-mono">Z = (Ttarget - μCP) / σCP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {pertData.evaluacion_umbrales?.map((row) => (
              <div
                key={row.T_target}
                onClick={() => setCustomTarget(row.T_target)}
                className={`p-2.5 rounded-lg border cursor-pointer transition ${
                  customTarget === row.T_target
                    ? 'bg-amber-500/10 border-amber-500/60 text-slate-100 shadow'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold font-mono text-slate-200">
                    T = {row.T_target} min
                  </span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    row.probabilidad_pct > 80
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : row.probabilidad_pct > 30
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {row.probabilidad_pct}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                  <span>{row.interpretacion}</span>
                  <span className="font-mono text-slate-500">Z = {row.Z_score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Custom Threshold Calculator */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Calculadora Continua P(T ≤ Ttarget)
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Umbral Ttarget:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 text-xs">
                  {customTarget} minutos
                </span>
              </div>
              <input
                type="range"
                min="150"
                max="230"
                step="1"
                value={customTarget}
                onChange={(e) => setCustomTarget(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>150m</span>
                <span>190m (Media)</span>
                <span>230m</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Probabilidad de Despacho Oportuno
            </div>
            <div className="text-2xl font-black font-mono text-teal-400">
              {dynamicProb.pct}%
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Z-score = {dynamicProb.z}
            </div>
          </div>
        </div>
      </div>

      {/* 10 Activities Table (Table 9 & 10) */}
      <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
        <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 text-xs font-semibold text-slate-300">
          Tabla 9 y 10: Parámetros Estadísticos, Pasadas y Holguras del Protocolo COE (10 Actividades)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Cód</th>
                <th className="py-2 px-3">Actividad</th>
                <th className="py-2 px-2 text-center">Pred.</th>
                <th className="py-2 px-2 text-center">a</th>
                <th className="py-2 px-2 text-center">m</th>
                <th className="py-2 px-2 text-center">b</th>
                <th className="py-2 px-2 text-center font-mono">μi (min)</th>
                <th className="py-2 px-2 text-center font-mono">ES</th>
                <th className="py-2 px-2 text-center font-mono">EF</th>
                <th className="py-2 px-2 text-center font-mono">LS</th>
                <th className="py-2 px-2 text-center font-mono">LF</th>
                <th className="py-2 px-2 text-center font-mono">Holgura Hi</th>
                <th className="py-2 px-3 text-center">Condición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {pertData.actividades?.map((act) => (
                <tr
                  key={act.codigo}
                  className={`hover:bg-slate-900/40 transition ${
                    act.es_critica ? 'bg-amber-500/5 font-medium' : ''
                  }`}
                >
                  <td className="py-2 px-3 font-bold font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${
                      act.es_critica
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {act.codigo}
                    </span>
                  </td>
                  <td className="py-2 px-3 max-w-xs truncate text-slate-200" title={act.nombre}>
                    {act.nombre}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">
                    {act.predecesores?.length > 0 ? act.predecesores.join(',') : '—'}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">{act.a}</td>
                  <td className="py-2 px-2 text-center font-mono">{act.m}</td>
                  <td className="py-2 px-2 text-center font-mono">{act.b}</td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-amber-300">
                    {act.mu.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">{act.ES.toFixed(1)}</td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">{act.EF.toFixed(1)}</td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">{act.LS.toFixed(1)}</td>
                  <td className="py-2 px-2 text-center font-mono text-slate-400">{act.LF.toFixed(1)}</td>
                  <td className={`py-2 px-2 text-center font-mono font-bold ${
                    act.es_critica ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {act.holgura.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      act.es_critica
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {act.condicion}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
