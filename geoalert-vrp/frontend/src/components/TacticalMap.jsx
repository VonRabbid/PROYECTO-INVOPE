import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, CloudLightning, GitFork, Loader2 } from 'lucide-react';

const CAJAMARCA_COORDS = [-7.16378, -78.50027];
const ROUTE_COLORS = ['#2563eb', '#ea580c', '#9333ea', '#0d9488'];

export default function TacticalMap({
  nodos = [],
  tramos = [],
  rutas = [],
  pddRuta = null,
  isOptimizing = false,
  isSimulating = false,
  isRerouting = false,
  onOptimize,
  onSimulateStorm,
  onReroutePDD,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(L.layerGroup());
  const roadsLayerRef = useRef(L.layerGroup());
  const routesLayerRef = useRef(L.layerGroup());
  const pddLayerRef = useRef(L.layerGroup());

  // Inicializar mapa Leaflet una sola vez
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CAJAMARCA_COORDS,
      zoom: 12,
      zoomControl: true,
    });

    // Tiles libres de OpenStreetMap sin API Key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markersLayerRef.current.addTo(map);
    roadsLayerRef.current.addTo(map);
    routesLayerRef.current.addTo(map);
    pddLayerRef.current.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Actualizar nodos en el mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    nodos.forEach((n) => {
      const isDepot = n.id_nodo === 0;
      const markerColor = isDepot ? '#2563eb' : '#059669';

      const circle = L.circleMarker([n.lat, n.lon], {
        radius: isDepot ? 10 : 7,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95,
      });

      circle.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #1e293b;">
          <strong style="color: #0f172a; font-size: 14px;">${n.nombre_nodo}</strong><br>
          <span style="display:inline-block; margin: 4px 0; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background-color: ${isDepot ? '#1d4ed8' : '#047857'}; color: white;">
            ${n.tipo_nodo || (isDepot ? 'DEPOT_CENTRAL' : 'ALBERGUE')}
          </span><br>
          <strong>Demanda:</strong> ${n.demanda_kits} kits (${n.demanda_peso_kg} kg)<br>
          <strong>Ventana:</strong> [${n.ventana_inicio}, ${n.ventana_fin}] min
        </div>
      `);

      circle.addTo(layer);
    });
  }, [nodos]);

  // Actualizar tramos viales (normales y bloqueados)
  useEffect(() => {
    if (!mapInstanceRef.current || nodos.length === 0) return;
    const layer = roadsLayerRef.current;
    layer.clearLayers();

    const nodeMap = {};
    nodos.forEach((n) => {
      nodeMap[n.id_nodo] = n;
    });

    tramos.forEach((t) => {
      const orig = nodeMap[t.id_origen];
      const dest = nodeMap[t.id_destino];

      // Dibujar cada arco una sola vez
      if (orig && dest && t.id_origen < t.id_destino) {
        const latlngs = [
          [orig.lat, orig.lon],
          [dest.lat, dest.lon],
        ];

        let color = '#16a34a';
        let dashArray = null;
        let weight = 3;
        let className = '';

        if (t.esta_bloqueado) {
          color = '#dc2626';
          dashArray = '8, 8';
          weight = 5;
          className = 'blocked-road-animated';
        } else if (t.riesgo_hidrologico > 0.5) {
          color = '#ea580c';
          weight = 3.5;
        }

        const polyline = L.polyline(latlngs, {
          color,
          weight,
          opacity: 0.8,
          dashArray,
          className,
        });

        polyline.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #1e293b;">
            <strong style="color: #0f172a;">Tramo ${orig.nombre_nodo} ↔ ${dest.nombre_nodo}</strong><br>
            <strong>Distancia:</strong> ${t.distancia_km} km | <strong>Tiempo:</strong> ${t.tiempo_minutos_base} min<br>
            <strong>Riesgo:</strong> ${(t.riesgo_hidrologico * 100).toFixed(0)}%<br>
            <strong>Estado:</strong> <span style="font-weight: 700; color: ${t.esta_bloqueado ? '#dc2626' : '#16a34a'};">
              ${t.esta_bloqueado ? 'BLOQUEADO POR HUAICO' : 'TRANSITABLE'}
            </span>
          </div>
        `);

        polyline.addTo(layer);
      }
    });
  }, [tramos, nodos]);

  // Actualizar rutas de despacho optimizadas
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const layer = routesLayerRef.current;
    layer.clearLayers();

    rutas.forEach((r, idx) => {
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const latlngs = (r.paradas || []).map((p) => [p.lat, p.lon]);

      // Retorno al depósito para cerrar ciclo
      if (latlngs.length > 0) {
        latlngs.push(latlngs[0]);
      }

      const polyline = L.polyline(latlngs, {
        color,
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
      });

      polyline.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #1e293b;">
          <strong style="color: #0f172a; font-size: 13px;">${r.id_vehiculo}</strong> (${r.tipo_vehiculo})<br>
          <strong>Carga Asignada:</strong> ${r.carga_total_kg} kg<br>
          <strong>Distancia Total:</strong> ${r.distancia_km} km<br>
          <strong>Tiempo Ruta:</strong> ${r.tiempo_ruta_min} min<br>
          <strong>Secuencia:</strong> ${(r.paradas || []).map((p) => p.id_nodo).join(' → ')} → 0
        </div>
      `);

      polyline.addTo(layer);
    });
  }, [rutas]);

  // Actualizar desvío dinámico PDD
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const layer = pddLayerRef.current;
    layer.clearLayers();

    if (pddRuta && pddRuta.ruta_coordenadas && pddRuta.ruta_coordenadas.length > 0) {
      const polyline = L.polyline(pddRuta.ruta_coordenadas, {
        color: '#9333ea',
        weight: 6,
        dashArray: '10, 10',
        opacity: 0.95,
      });

      polyline.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #1e293b;">
          <strong style="color: #9333ea; font-size: 13px;">Desvío Dinámico PDD (Bellman)</strong><br>
          <strong>Camino:</strong> ${pddRuta.camino_nodos?.join(' → ')}<br>
          <strong>Tiempo Estimado:</strong> ${pddRuta.tiempo_total_min} min<br>
          <strong>Latencia de Reacción:</strong> ${pddRuta.tiempo_computo_ms} ms
        </div>
      `).openPopup();

      polyline.addTo(layer);
    }
  }, [pddRuta]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-full">
      {/* HEADER CON BOTONES OPERATIVOS */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
          <h2 className="text-sm md:text-base font-semibold text-slate-900">
            Geovisor Táctico Provincial — Región Cajamarca (UBIGEO 0601)
          </h2>
        </div>

        {/* BOTONERA ACCIÓN RÁPIDA */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOptimize}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-md shadow-xs transition"
          >
            {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>1. Optimizar VRPTW</span>
          </button>

          <button
            onClick={onSimulateStorm}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-semibold rounded-md shadow-xs transition"
          >
            {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudLightning className="w-3.5 h-3.5" />}
            <span>2. Disparar Huaico IoT</span>
          </button>

          <button
            onClick={onReroutePDD}
            disabled={isRerouting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-semibold rounded-md shadow-xs transition"
          >
            {isRerouting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitFork className="w-3.5 h-3.5" />}
            <span>3. Re-enrutar PDD</span>
          </button>
        </div>
      </div>

      {/* CONTENEDOR DEL MAPA */}
      <div className="relative flex-1 min-h-[580px] w-full">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* LEYENDA CARTOGRÁFICA FLOTANTE (ESTILO BLANCO/LIGERO) */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-slate-300 rounded-lg p-3 text-xs text-slate-700 shadow-md z-[1000] pointer-events-auto">
          <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between gap-4">
            <span>Leyenda Cartográfica</span>
            <span className="text-[10px] text-slate-400 font-mono">SIG 2.0</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
              <span>Almacén Central COER / AAP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              <span>Albergue Damnificados</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-1 bg-green-600 rounded inline-block"></span>
              <span>Tramo Vial Transitable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-1 bg-orange-500 rounded inline-block"></span>
              <span>Riesgo Hidrológico Alto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-1.5 bg-red-600 rounded inline-block border border-red-300"></span>
              <span className="text-red-700 font-semibold">Bloqueado por Huaico</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-1.5 bg-blue-600 rounded inline-block"></span>
              <span>Ruta Vehículo 1 (Pesado)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-1.5 bg-orange-600 rounded inline-block"></span>
              <span>Ruta Vehículo 2 (Pesado)</span>
            </div>
            {pddRuta && (
              <div className="flex items-center gap-2">
                <span className="w-5 h-1.5 bg-purple-600 rounded inline-block border-b-2 border-dashed border-purple-800"></span>
                <span className="text-purple-700 font-semibold">Desvío Dinámico PDD</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
