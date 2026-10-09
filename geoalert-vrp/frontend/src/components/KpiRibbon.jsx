import React from 'react';
import { MapPin, AlertTriangle, AlertOctagon, Zap, TrendingDown, CheckCircle2 } from 'lucide-react';

export default function KpiRibbon({
  provinciasCount = 13,
  quebradasRojas = 0,
  totalQuebradas = 10,
  tramosBloqueados = 0,
  pddTimeMs = 2.17,
  gapDualPct = 19.25,
  pertReliabilityPct = 99.42,
  activeQuebradaName = '',
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
      {/* 1. Provincias */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-lg p-3 shadow-xs hover:shadow-md hover:translate-y-[-2px] transition duration-200">
        <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
          <span>Provincias</span>
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="text-2xl font-bold text-slate-900 my-0.5">{provinciasCount}</div>
        <div className="text-[11px] text-slate-500 truncate">Cajamarca (Piloto) & Perú</div>
      </div>

      {/* 2. Quebradas Rojas */}
      <div className={`bg-white border border-slate-200 border-l-4 border-l-red-600 rounded-lg p-3 shadow-xs hover:shadow-md hover:translate-y-[-2px] transition duration-200 ${quebradasRojas > 0 ? 'bg-red-50/50' : ''}`}>
        <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
          <span>Alerta Roja</span>
          <AlertTriangle className={`w-3.5 h-3.5 ${quebradasRojas > 0 ? 'text-red-600 animate-bounce' : 'text-slate-400'}`} />
        </div>
        <div className="text-2xl font-bold text-red-600 my-0.5">
          {quebradasRojas} / {totalQuebradas}
        </div>
        <div className="text-[11px] text-red-600 font-medium truncate">
          {quebradasRojas > 0 ? `${activeQuebradaName || 'Quebrada'} (ROJO)` : '0 activadas actualmente'}
        </div>
      </div>

      {/* 3. Tramos Bloqueados */}
      <div className={`bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-lg p-3 shadow-xs hover:shadow-md hover:translate-y-[-2px] transition duration-200 ${tramosBloqueados > 0 ? 'bg-amber-50/50' : ''}`}>
        <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
          <span>Vías Bloqueadas</span>
          <AlertOctagon className={`w-3.5 h-3.5 ${tramosBloqueados > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
        </div>
        <div className="text-2xl font-bold text-amber-600 my-0.5">{tramosBloqueados}</div>
        <div className="text-[11px] text-slate-500 truncate">Huaico / Pérdida conectividad</div>
      </div>

      {/* 4. PDD Dinámico */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 rounded-lg p-3 shadow-xs hover:shadow-md hover:translate-y-[-2px] transition duration-200">
        <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
          <span>Re-enrutamiento PDD</span>
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="text-2xl font-bold text-emerald-600 my-0.5">{pddTimeMs} ms</div>
        <div className="text-[11px] text-slate-500 truncate">Tiempo de cálculo Bellman</div>
      </div>

      {/* 5. Gap Dual */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-cyan-600 rounded-lg p-3 shadow-xs hover:shadow-md hover:translate-y-[-2px] transition duration-200">
        <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
          <span>Gap Dual Z_LP / Z_IP</span>
          <TrendingDown className="w-3.5 h-3.5 text-cyan-600" />
        </div>
        <div className="text-2xl font-bold text-cyan-700 my-0.5">{gapDualPct}%</div>
        <div className="text-[11px] text-slate-500 truncate">Z_LP ≤ Z_IP Demostrado</div>
      </div>

      {/* 6. PERT/CPM */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-purple-600 rounded-lg p-3 shadow-xs hover:shadow-md hover:translate-y-[-2px] transition duration-200">
        <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
          <span>PERT/CPM P(T≤120)</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
        </div>
        <div className="text-2xl font-bold text-purple-700 my-0.5">{pertReliabilityPct}%</div>
        <div className="text-[11px] text-slate-500 truncate">Ventana límite &lt; 120 min</div>
      </div>
    </div>
  );
}
