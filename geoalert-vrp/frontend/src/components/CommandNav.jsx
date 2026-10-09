import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

export default function CommandNav({ isRedAlert, onResetDemo, isResetting }) {
  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              GeoAlert-VRP <span className="text-slate-500 text-xs md:text-sm font-normal">| Centro de Mando Logístico y Alerta Temprana</span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              COER Cajamarca & INDECI — Sistema de Optimización Combinatoria Multi-Quebrada (INVOPE)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              isRedAlert
                ? 'bg-red-100 border border-red-300 text-red-700 badge-alerta-rojo'
                : 'bg-emerald-100 border border-emerald-300 text-emerald-800'
            }`}
          >
            {isRedAlert ? 'ALERTA ROJA ACTIVADA' : 'SISTEMA ACTIVO'}
          </span>

          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 rounded-md border border-slate-300 shadow-xs transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reiniciar Demo</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
