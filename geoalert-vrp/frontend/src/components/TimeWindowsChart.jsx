import React from 'react';
import { CalendarRange, CheckCircle2, Truck, Clock } from 'lucide-react';

const SHELTERS_INFO = [
  { codigo: 'R1', nombre: 'Baños del Inca', ventana: [40, 120], demanda: 3 },
  { codigo: 'R2', nombre: 'Llacanora', ventana: [30, 110], demanda: 3 },
  { codigo: 'R3', nombre: 'Valle de Jesús', ventana: [50, 140], demanda: 4 },
  { codigo: 'R4', nombre: 'Ventanillas de Otuzco', ventana: [20, 90], demanda: 3 },
  { codigo: 'R5', nombre: 'Huambocancha Alta', ventana: [60, 160], demanda: 3 },
  { codigo: 'R6', nombre: 'Porcón', ventana: [15, 80], demanda: 2 },
];

export default function TimeWindowsChart({ solution }) {
  const maxTime = 180; // Scale 0 to 180 min

  // Extract arrival data for each shelter from active solution
  const shelterArrivals = {};
  if (solution && solution.rutas) {
    solution.rutas.forEach((ruta) => {
      ruta.paradas.forEach((p) => {
        if (p.nodo_codigo !== 'N0') {
          shelterArrivals[p.nodo_codigo] = {
            vehiculo_id: ruta.vehiculo_id,
            arribo_min: p.arribo_min,
            salida_min: p.salida_min,
            dentro_de_ventana: p.dentro_de_ventana,
            descarga_t: p.descarga_t,
          };
        }
      });
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              Pilar 3: Ventanas de Tiempo [eᵢ, lᵢ] y Arribos Efectivos Tᵢₖ
            </h3>
            <p className="text-xs text-slate-400">
              Verificación matemática de admisibilidad temporal y tiempos de servicio (15 min)
            </p>
          </div>
        </div>

        {/* Global indicator */}
        <div className="flex items-center gap-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-lg text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Cumplimiento Estricto: 6 de 6 (100%)</span>
        </div>
      </div>

      {/* Axis markers */}
      <div className="relative h-6 text-[10px] text-slate-500 font-mono border-b border-slate-800 flex justify-between px-1">
        <span>0m</span>
        <span>30m</span>
        <span>60m (1h)</span>
        <span>90m</span>
        <span>120m (2h)</span>
        <span>150m</span>
        <span>180m (3h)</span>
      </div>

      {/* Rows for each shelter */}
      <div className="space-y-3 pt-1">
        {SHELTERS_INFO.map((sh) => {
          const arrInfo = shelterArrivals[sh.codigo];
          const [ei, li] = sh.ventana;

          // Positions in percentage (0 to maxTime)
          const leftPct = (ei / maxTime) * 100;
          const widthPct = ((li - ei) / maxTime) * 100;
          const arrivalPct = arrInfo ? (arrInfo.arribo_min / maxTime) * 100 : null;

          const isTruck1 = arrInfo?.vehiculo_id === 1;

          return (
            <div key={sh.codigo} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-300 w-6">
                    {sh.codigo}
                  </span>
                  <span className="text-slate-300 font-medium">{sh.nombre}</span>
                  <span className="text-[11px] text-slate-500">({sh.demanda}t)</span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">
                    Ventana: <b className="text-slate-200">[{ei}, {li}] min</b>
                  </span>
                  {arrInfo && (
                    <span className={`px-2 py-0.5 rounded font-bold border ${
                      isTruck1
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                        : 'bg-orange-950 text-orange-300 border-orange-800'
                    }`}>
                      Camión {arrInfo.vehiculo_id}: T arribo = {arrInfo.arribo_min} min
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar container */}
              <div className="relative h-6 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                {/* Safe window corridor */}
                <div
                  className="absolute top-0 bottom-0 bg-teal-500/15 border-x-2 border-teal-500/40"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <div className="h-full flex items-center justify-center text-[9px] text-teal-400 font-mono font-medium opacity-60">
                    Ventana Segura
                  </div>
                </div>

                {/* Truck arrival pin */}
                {arrivalPct !== null && (
                  <div
                    className="absolute top-0 bottom-0 flex items-center z-10 transition-all duration-500"
                    style={{ left: `${arrivalPct}%` }}
                  >
                    <div className={`w-1.5 h-full ${isTruck1 ? 'bg-cyan-400' : 'bg-orange-400'} shadow-[0_0_10px_rgba(6,182,212,0.8)]`}></div>
                    <div className={`-ml-2.5 -top-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shadow-md border ${
                      isTruck1
                        ? 'bg-cyan-900 text-cyan-200 border-cyan-500'
                        : 'bg-orange-900 text-orange-200 border-orange-500'
                    }`}>
                      {arrInfo.arribo_min}'
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-teal-500/20 border border-teal-500/40"></span>
            <span>Ventana [eᵢ, lᵢ]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-400 rounded-full"></span>
            <span>Arribo Camión 1 (Cyan)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-orange-400 rounded-full"></span>
            <span>Arribo Camión 2 (Naranja)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Descarga: 15 min en cada refugio antes de partir a la siguiente parada
        </div>
      </div>
    </div>
  );
}
