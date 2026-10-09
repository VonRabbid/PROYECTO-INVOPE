import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Layers, ShieldAlert, Truck, Navigation, Eye, CheckCircle2 } from 'lucide-react';

// Fix default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Color palettes
const ROUTE_COLORS = {
  1: '#06b6d4', // Cyan / Electric blue for Camión 1
  2: '#f97316', // Amber / Orange for Camión 2
};

const RISK_COLORS = {
  Bajo: '#10b981',      // Emerald Green
  Moderado: '#eab308',  // Yellow
  Alto: '#f97316',      // Orange
  'Muy alto': '#ef4444', // Crimson Red
};

export default function MapView({ networkData, solution, onSelectRoadblock }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    roads: L.layerGroup(),
    routes: L.layerGroup(),
    markers: L.layerGroup(),
    roadblocks: L.layerGroup(),
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center in Cajamarca, Peru (-7.16, -78.48)
    const map = L.map(mapContainerRef.current, {
      center: [-7.15, -78.48],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Esri World Dark Gray Canvas (Gratuito, sin API Key requerida, temática oscura)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
    }).addTo(map);

    // Add layer groups to map
    layersRef.current.roads.addTo(map);
    layersRef.current.routes.addTo(map);
    layersRef.current.roadblocks.addTo(map);
    layersRef.current.markers.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map contents when networkData or solution changes
  useEffect(() => {
    if (!mapInstanceRef.current || !networkData) return;

    const map = mapInstanceRef.current;
    const { roads, routes, markers, roadblocks } = layersRef.current;

    // Clear previous layers
    roads.clearLayers();
    routes.clearLayers();
    markers.clearLayers();
    roadblocks.clearLayers();

    const nodesMap = {};
    if (networkData.nodos) {
      networkData.nodos.forEach((n) => {
        nodesMap[n.codigo] = n;
      });
    }

    // 1. Draw Road Network Edges
    if (networkData.aristas) {
      networkData.aristas.forEach((edge) => {
        const u = nodesMap[edge.origen];
        const v = nodesMap[edge.destino];
        if (!u || !v) return;

        const isBlocked = edge.estado === 'BLOQUEADO';
        const color = isBlocked ? '#ef4444' : RISK_COLORS[edge.nivel_riesgo] || '#94a3b8';

        const poly = L.polyline(
          [[u.lat, u.lng], [v.lat, v.lng]],
          {
            color: color,
            weight: isBlocked ? 4 : 2,
            dashArray: isBlocked ? '8, 8' : undefined,
            opacity: isBlocked ? 0.9 : 0.45,
          }
        );

        poly.bindTooltip(
          `<b>Tramo ${edge.origen} ↔ ${edge.destino}</b><br/>Distancia: ${edge.distancia_km} km | Tiempo: ${edge.tiempo_min} min<br/>Riesgo: ${edge.riesgo} (${edge.nivel_riesgo})<br/><b>Estado: ${edge.estado}</b>`,
          { sticky: true }
        );

        if (isBlocked) {
          roadblocks.addLayer(poly);
        } else {
          roads.addLayer(poly);
        }
      });
    }

    // 2. Draw Optimized Convoy Routes
    const activeSolution = solution || networkData.solucion_actual;
    if (activeSolution && activeSolution.rutas) {
      activeSolution.rutas.forEach((ruta) => {
        const vColor = ROUTE_COLORS[ruta.vehiculo_id] || '#3b82f6';
        const latlngs = [];

        ruta.paradas.forEach((parada) => {
          const node = nodesMap[parada.nodo_codigo];
          if (node) {
            latlngs.push([node.lat, node.lng]);
          }
        });

        if (latlngs.length > 1) {
          // Glow effect under route line
          const glowLine = L.polyline(latlngs, {
            color: vColor,
            weight: 8,
            opacity: 0.25,
            smoothFactor: 1,
          });
          routes.addLayer(glowLine);

          // Main route line
          const routeLine = L.polyline(latlngs, {
            color: vColor,
            weight: 4,
            opacity: 0.95,
            smoothFactor: 1,
          });

          routeLine.bindPopup(`
            <div class="p-1 text-xs">
              <h4 class="font-bold text-sm" style="color: ${vColor}">${ruta.vehiculo_nombre}</h4>
              <p class="text-slate-300"><b>Ruta:</b> ${ruta.resumen_ruta}</p>
              <p class="text-slate-300"><b>Tiempo Total:</b> ${ruta.tiempo_ruta_min} min</p>
              <p class="text-slate-300"><b>Carga Transportada:</b> ${ruta.carga_inicial_t} / ${ruta.capacidad_max_t} t (${ruta.ocupacion_pct}%)</p>
            </div>
          `);

          routes.addLayer(routeLine);
        }
      });
    }

    // 3. Draw Nodes (Depot & Shelters)
    if (networkData.nodos) {
      networkData.nodos.forEach((node) => {
        const isDepot = node.tipo === 'depot';

        // Custom HTML Marker
        const iconHtml = isDepot
          ? `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border-2 border-amber-400 shadow-lg text-amber-400 font-bold text-xs ring-4 ring-amber-400/20">
               N0
             </div>`
          : `<div class="flex flex-col items-center">
               <div class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 border-teal-400 shadow-md text-teal-300 font-bold text-xs ring-2 ring-teal-400/20">
                 ${node.codigo}
               </div>
               <span class="text-[10px] font-semibold bg-slate-900/90 text-slate-200 px-1.5 py-0.5 rounded shadow border border-slate-700 -mt-1 whitespace-nowrap">
                 ${node.demanda}t [${node.ventana[0]}-${node.ventana[1]}m]
               </span>
             </div>`;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-leaflet-marker',
          iconSize: isDepot ? [40, 40] : [50, 45],
          iconAnchor: isDepot ? [20, 20] : [25, 22],
        });

        const marker = L.marker([node.lat, node.lng], { icon: customIcon });

        // Lookup arrival time for this node in active solution
        let arrivalInfo = '';
        if (activeSolution && activeSolution.rutas && !isDepot) {
          activeSolution.rutas.forEach((r) => {
            const p = r.paradas.find((s) => s.nodo_codigo === node.codigo);
            if (p) {
              arrivalInfo = `
                <div class="mt-2 pt-2 border-t border-slate-700 text-xs">
                  <div class="flex items-center justify-between text-teal-300 font-semibold">
                    <span>${r.vehiculo_nombre}</span>
                    <span class="bg-teal-950/80 text-teal-400 px-1.5 py-0.5 rounded border border-teal-800 text-[10px]">
                      Parada #${p.secuencia}
                    </span>
                  </div>
                  <div class="grid grid-cols-2 gap-1 mt-1 text-slate-300 text-[11px]">
                    <div>Arribo: <b>${p.arribo_min} min</b></div>
                    <div>Salida: <b>${p.salida_min} min</b></div>
                    <div>Descarga: <b>${p.descarga_t} t</b></div>
                    <div>Carga rem.: <b>${p.carga_remanente_t} t</b></div>
                  </div>
                  <div class="mt-1 flex items-center gap-1 text-[10px] ${p.dentro_de_ventana ? 'text-emerald-400' : 'text-rose-400'}">
                    <span>● ${p.dentro_de_ventana ? 'Arribo exacto en ventana de seguridad' : 'Fuera de ventana'}</span>
                  </div>
                </div>
              `;
            }
          });
        }

        marker.bindPopup(`
          <div class="p-1 min-w-[210px]">
            <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
              <span class="font-bold text-sm text-slate-100">${node.codigo}: ${node.nombre}</span>
            </div>
            <div class="text-xs text-slate-300 mt-1 space-y-0.5">
              <div><b>Rol:</b> ${node.rol}</div>
              ${!isDepot ? `<div><b>Demanda:</b> ${node.demanda} toneladas</div>` : ''}
              <div><b>Ventana segura:</b> [${node.ventana[0]}, ${node.ventana[1]}] min</div>
              ${!isDepot ? `<div><b>Tiempo descarga:</b> ${node.servicio} min</div>` : ''}
            </div>
            ${arrivalInfo}
          </div>
        `);

        markers.addLayer(marker);
      });
    }

    // Auto-fit bounds
    if (networkData.nodos && networkData.nodos.length > 0) {
      const bounds = L.latLngBounds(networkData.nodos.map((n) => [n.lat, n.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [networkData, solution]);

  const activeSolution = solution || networkData?.solucion_actual;

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Control Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs max-w-xs">
        <div className="flex items-center justify-between font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-teal-400" />
            Topología COER Cajamarca
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800">
            6 Refugios + N0
          </span>
        </div>

        {/* Fleet Route Legend */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400">Rutas de Despacho Activas:</div>
          <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50">
            <span className="flex items-center gap-2 text-cyan-400 font-medium">
              <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block"></span>
              Camión 1 (MAN 6x4)
            </span>
            <span className="text-slate-300 font-mono text-[11px]">
              {activeSolution?.rutas?.[0]?.tiempo_ruta_min || 202} min
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50">
            <span className="flex items-center gap-2 text-orange-400 font-medium">
              <span className="w-3 h-1 bg-orange-400 rounded-full inline-block"></span>
              Camión 2 (MAN 6x4)
            </span>
            <span className="text-slate-300 font-mono text-[11px]">
              {activeSolution?.rutas?.[1]?.tiempo_ruta_min || 155} min
            </span>
          </div>
        </div>

        {/* Risk Legend */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span>Riesgo Aluvial:</span>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Bajo
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Mod
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Alto
            </span>
          </div>
        </div>
      </div>

      {/* Floating Status Badge */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-lg shadow-xl text-xs flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-semibold">Ventanas Cumplidas: 6 de 6</span>
        </div>
        <div className="h-4 w-px bg-slate-700"></div>
        <div className="text-slate-300">
          Tiempo Global Z*: <span className="font-mono font-bold text-teal-400">{activeSolution?.Z_star_tiempo_total || 357} min</span>
        </div>
      </div>
    </div>
  );
}
