import React from 'react';
import { Cone, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RoadTransitCard({ tramos = [], nodos = [] }) {
  const nodeMap = {};
  nodos.forEach((n) => {
    nodeMap[n.id_nodo] = n;
  });

  const blockedTramos = tramos.filter((t) => t.esta_bloqueado && t.id_origen < t.id_destino);
  const hasBlocks = blockedTramos.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
      <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Cone className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Transitabilidad de la Red Vial
          </h3>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
            hasBlocks
              ? 'bg-red-100 text-red-800 border-red-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}
        >
          {hasBlocks ? 'Vías Interrumpidas' : 'Red Transitable'}
        </span>
      </div>

      <div className="p-3 text-xs text-slate-700 max-h-[140px] overflow-y-auto space-y-1.5">
        {!hasBlocks ? (
          <div className="flex items-center gap-2 text-emerald-700 py-1 font-medium">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Todos los tramos viales principales operativos.</span>
          </div>
        ) : (
          blockedTramos.map((t, idx) => {
            const orig = nodeMap[t.id_origen];
            const dest = nodeMap[t.id_destino];
            const origName = orig ? orig.nombre_nodo : `Nodo ${t.id_origen}`;
            const destName = dest ? dest.nombre_nodo : `Nodo ${t.id_destino}`;

            return (
              <div
                key={idx}
                className="p-2 rounded bg-red-50 border border-red-200 text-red-800 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold">
                    Tramo {t.id_origen} ↔ {t.id_destino} ({origName} ↔ {destName}):
                  </span>{' '}
                  Bloqueado por activación de quebrada / huaico.
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
