import React from 'react';
import { Waves, Zap } from 'lucide-react';

export default function QuebradasTable({
  quebradas = [],
  onInjectStorm,
  injectingQuebradaId,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
      <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Telemetría IoT Multi-Quebrada
          </h3>
        </div>
        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
          En tiempo real
        </span>
      </div>

      <div className="max-h-[220px] overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 px-3">Quebrada</th>
              <th className="py-2 px-2">Dinámica</th>
              <th className="py-2 px-2 text-right">Lluvia</th>
              <th className="py-2 px-2 text-center">Alerta</th>
              <th className="py-2 px-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quebradas.map((q) => {
              const sensor = q.sensores?.[0];
              const lluvia = sensor ? sensor.precipitacion_actual_mmh : 5.0;
              const isRojo = q.estado_alerta === 'ROJO_ACTIVADO';
              const isAmarillo = q.estado_alerta === 'AMARILLO';
              const isNaranja = q.estado_alerta === 'NARANJA';

              let alertBadgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium';
              if (isRojo) {
                alertBadgeClass = 'bg-red-100 text-red-700 border border-red-300 badge-alerta-rojo font-bold';
              } else if (isNaranja) {
                alertBadgeClass = 'bg-orange-100 text-orange-800 border border-orange-300 font-semibold';
              } else if (isAmarillo) {
                alertBadgeClass = 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold';
              }

              return (
                <tr
                  key={q.id_quebrada}
                  className={`hover:bg-slate-50 transition ${isRojo ? 'bg-red-50/60' : ''}`}
                >
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    <div className="truncate max-w-[120px]" title={q.nombre_quebrada}>
                      {q.nombre_quebrada}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                      {q.tipo_quebrada}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-900 font-medium">
                    {lluvia.toFixed(1)} <span className="text-[10px] text-slate-400">mm/h</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${alertBadgeClass}`}>
                      {q.estado_alerta}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => onInjectStorm(sensor?.id_sensor || `IOT-PLUV-${q.id_quebrada.slice(4)}`)}
                      disabled={injectingQuebradaId === q.id_quebrada}
                      title="Inyectar tormenta crítica"
                      className="p-1 rounded text-red-600 hover:text-white hover:bg-red-600 border border-red-200 bg-red-50 transition disabled:opacity-50"
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
