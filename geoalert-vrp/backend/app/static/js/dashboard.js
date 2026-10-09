/**
 * Lógica del Geovisor Táctico Leaflet.js y control interactivo de GeoAlert-VRP.
 */

let map;
let nodeMarkers = {};
let roadLines = [];
let routeLayers = [];
let rerouteLayer = null;

const CAJAMARCA_COORDS = [-7.16378, -78.50027];

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadNetworkData();
});

/**
 * Inicializa el mapa Leaflet con CartoDB Positron / OpenStreetMap
 */
function initMap() {
    map = L.map("map", {
        center: CAJAMARCA_COORDS,
        zoom: 12,
        zoomControl: true
    });

    // Capa base de OpenStreetMap libre de API Key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

/**
 * Carga nodos y tramos viales desde la API REST
 */
async function loadNetworkData() {
    try {
        const [resNodos, resTramos] = await Promise.all([
            fetch("/api/v1/nodos"),
            fetch("/api/v1/tramos")
        ]);

        const nodos = await resNodos.json();
        const tramos = await resTramos.json();

        // 1. Dibujar nodos
        nodos.forEach(n => {
            const isDepot = (n.id_nodo === 0);
            const markerColor = isDepot ? "#0d6efd" : "#198754";

            const marker = L.circleMarker([n.lat, n.lon], {
                radius: isDepot ? 10 : 7,
                fillColor: markerColor,
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(map);

            marker.bindPopup(`
                <div class="p-1">
                    <h6 class="fw-bold mb-1">${n.nombre_nodo}</h6>
                    <span class="badge ${isDepot ? 'bg-primary' : 'bg-success'} mb-1">${n.tipo_nodo}</span>
                    <div><strong>Demanda:</strong> ${n.demanda_kits} kits (${n.demanda_peso_kg} kg)</div>
                    <div><strong>Ventana:</strong> [${n.ventana_inicio}, ${n.ventana_fin}] min</div>
                </div>
            `);

            nodeMarkers[n.id_nodo] = { marker, data: n };
        });

        // 2. Dibujar tramos viales
        renderRoadSegments(tramos);

    } catch (err) {
        console.error("Error cargando la red logística:", err);
    }
}

/**
 * Dibuja los tramos viales en el mapa
 */
function renderRoadSegments(tramos) {
    // Limpiar tramos previos
    roadLines.forEach(l => map.removeLayer(l));
    roadLines = [];

    const containerVias = document.getElementById("contenedor-estado-vias");
    let htmlVias = "";
    let hayBloqueos = false;

    tramos.forEach(t => {
        const orig = nodeMarkers[t.id_origen];
        const dest = nodeMarkers[t.id_destino];

        if (orig && dest && t.id_origen < t.id_destino) {
            const latlngs = [
                [orig.data.lat, orig.data.lon],
                [dest.data.lat, dest.data.lon]
            ];

            let color = "#28a745";
            let dashArray = null;
            let weight = 3;

            if (t.esta_bloqueado) {
                color = "#dc3545";
                dashArray = "8, 8";
                weight = 5;
                hayBloqueos = true;
                htmlVias += `
                    <div class="p-1 mb-1 rounded bg-danger bg-opacity-10 border border-danger text-danger">
                        <i class="bi bi-exclamation-triangle-fill"></i> <strong>Tramo ${t.id_origen} ↔ ${t.id_destino}:</strong> Bloqueado por huaico.
                    </div>
                `;
            } else if (t.riesgo_hidrologico > 0.5) {
                color = "#fd7e14";
                weight = 3.5;
            }

            const polyline = L.polyline(latlngs, {
                color: color,
                weight: weight,
                opacity: 0.75,
                dashArray: dashArray,
                className: t.esta_bloqueado ? "blocked-road-animated" : ""
            }).addTo(map);

            polyline.bindPopup(`
                <strong>Tramo ${orig.data.nombre_nodo} ↔ ${dest.data.nombre_nodo}</strong><br>
                Distancia: ${t.distancia_km} km | Tiempo: ${t.tiempo_minutos_base} min<br>
                Estado: <span class="badge ${t.esta_bloqueado ? 'bg-danger' : 'bg-success'}">${t.esta_bloqueado ? 'BLOQUEADO' : 'TRANSITABLE'}</span>
            `);

            roadLines.push(polyline);
        }
    });

    if (!hayBloqueos) {
        htmlVias = '<div class="text-muted"><i class="bi bi-check-circle-fill text-success"></i> Todos los tramos viales principales operativos.</div>';
        document.getElementById("badge-transitabilidad").className = "badge bg-success";
        document.getElementById("badge-transitabilidad").innerText = "Red Transitable";
    } else {
        document.getElementById("badge-transitabilidad").className = "badge bg-danger";
        document.getElementById("badge-transitabilidad").innerText = "Vías Interrumpidas";
    }

    containerVias.innerHTML = htmlVias;
}

/**
 * 1. Optimizar VRPTW mediante PEM/PEB con solver Branch-and-Cut CBC
 */
async function ejecutarOptimizacionVRPTW() {
    try {
        const btn = event?.target;
        if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Optimizando...';

        const res = await fetch("/api/v1/optimizar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codigo_provincia: "0601", considerar_riesgo: true })
        });
        const data = await res.json();

        // Actualizar métricas INVOPE
        document.getElementById("lbl-zip").innerText = data.z_ip_costo_total.toFixed(2);
        document.getElementById("lbl-zlp").innerText = data.z_lp_cota_inferior.toFixed(2);
        document.getElementById("lbl-gap").innerText = `${data.optimality_gap_pct}%`;
        document.getElementById("lbl-tcomputo").innerText = `${data.tiempo_computo_seg} s`;
        document.getElementById("badge-solver-status").innerText = data.status;

        // Limpiar rutas previas
        routeLayers.forEach(l => map.removeLayer(l));
        routeLayers = [];

        // Dibujar nuevas rutas por vehículo
        const coloresRutas = ["#0d6efd", "#fd7e14", "#6f42c1", "#20c997"];
        let htmlRutas = "";

        data.rutas.forEach((r, idx) => {
            const color = coloresRutas[idx % coloresRutas.length];
            const latlngs = r.paradas.map(p => [p.lat, p.lon]);

            // Agregar retorno al depot
            if (latlngs.length > 0) {
                latlngs.push(latlngs[0]);
            }

            const polyline = L.polyline(latlngs, {
                color: color,
                weight: 5,
                opacity: 0.9,
                lineJoin: "round"
            }).addTo(map);

            polyline.bindPopup(`
                <strong>${r.id_vehiculo} (${r.tipo_vehiculo})</strong><br>
                Carga: ${r.carga_total_kg} kg | Distancia: ${r.distancia_km} km | Tiempo: ${r.tiempo_ruta_min} min
            `);
            routeLayers.push(polyline);

            htmlRutas += `
                <div class="p-2 mb-2 bg-white rounded border border-start border-4" style="border-left-color: ${color} !important;">
                    <div class="fw-bold d-flex justify-content-between">
                        <span>${r.id_vehiculo}</span>
                        <span class="badge bg-light text-dark">${r.distancia_km} km</span>
                    </div>
                    <small class="text-muted d-block mb-1">Carga: ${r.carga_total_kg} kg | ${r.tiempo_ruta_min} min</small>
                    <div style="font-size:0.75rem;">Secuencia: ${r.paradas.map(p => p.id_nodo).join(" → ")} → 0</div>
                </div>
            `;
        });

        document.getElementById("rutas-lista-container").innerHTML = htmlRutas;

        if (btn) btn.innerHTML = '<i class="bi bi-play-circle-fill"></i> 1. Optimizar VRPTW';

    } catch (err) {
        console.error("Error optimizando VRPTW:", err);
    }
}

/**
 * 2. Simular evento de lluvia crítica y activación de huaico
 */
async function simularActivacionQuebrada() {
    try {
        const payload = {
            id_sensor: "IOT-PLUV-0601-01",
            precipitacion_mm_h: 62.5,
            caudal_m: 3.4,
            vibracion_hz: 75.0
        };

        const res = await fetch("/api/v1/telemetria/simular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        // Actualizar UI
        document.getElementById("badge-sistema").className = "badge bg-danger px-3 py-2 fs-6";
        document.getElementById("badge-sistema").innerText = "ALERTA ROJA ACTIVADA";
        document.getElementById("kpi-rojas").innerText = "1 / 10";
        document.getElementById("kpi-rojas-desc").innerText = `${data.nombre_quebrada} (ROJO)`;
        document.getElementById("kpi-bloqueados").innerText = "2";

        // Actualizar tabla de quebradas
        const badgeQ = document.getElementById("badge-qbr-QBR-0601-01");
        if (badgeQ) {
            badgeQ.className = "badge bg-danger badge-alerta";
            badgeQ.innerText = "ROJO_ACTIVADO";
        }
        const pluvVal = document.getElementById("pluv-QBR-0601-01");
        if (pluvVal) pluvVal.innerText = "62.5";

        // Recargar tramos en mapa para reflejar bloqueo rojo parpadeante
        const resTramos = await fetch("/api/v1/tramos");
        const tramos = await resTramos.json();
        renderRoadSegments(tramos);

        // Disparar re-optimización automática para evadir tramos caídos
        await ejecutarOptimizacionVRPTW();

    } catch (err) {
        console.error("Error simulando activación de quebrada:", err);
    }
}

/**
 * 3. Ejecutar re-enrutamiento PDD adaptativo en sub-segundos
 */
async function ejecutarReenrutamientoPDD() {
    try {
        const res = await fetch("/api/v1/reenrutar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_origen: 0,
                id_destino: 5,
                tramos_bloqueados: [[0, 1], [1, 2]]
            })
        });
        const data = await res.json();

        document.getElementById("lbl-pdd-ms").innerText = `${data.tiempo_computo_ms} ms`;
        document.getElementById("lbl-pdd-camino").innerText = data.camino_nodos.join(" → ");
        document.getElementById("lbl-pdd-tiempo").innerText = `${data.tiempo_total_min} min`;
        document.getElementById("kpi-pdd").innerText = `${data.tiempo_computo_ms} ms`;

        // Dibujar línea de desvío dinámico en mapa (morado punteado)
        if (rerouteLayer) map.removeLayer(rerouteLayer);
        if (data.ruta_coordenadas.length > 0) {
            rerouteLayer = L.polyline(data.ruta_coordenadas, {
                color: "#6f42c1",
                weight: 6,
                dashArray: "10, 10",
                opacity: 0.95
            }).addTo(map);

            rerouteLayer.bindPopup(`<strong>Desvío Dinámico PDD</strong><br>Tiempo: ${data.tiempo_total_min} min | Latencia: ${data.tiempo_computo_ms} ms`).openPopup();
        }

        // Cambiar a la pestaña PDD
        const tabTrigger = new bootstrap.Tab(document.getElementById("tab-pdd-btn"));
        tabTrigger.show();

    } catch (err) {
        console.error("Error en re-enrutamiento PDD:", err);
    }
}

/**
 * Inyecta una lectura manual a un sensor
 */
async function pulsarSensor(sensorId, valor) {
    try {
        await fetch("/api/v1/telemetria/simular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_sensor: sensorId,
                precipitacion_mm_h: valor,
                caudal_m: valor > 40 ? 3.0 : 0.6,
                vibracion_hz: valor > 40 ? 60.0 : 5.0
            })
        });
        simularActivacionQuebrada();
    } catch (err) {
        console.error("Error pulsando sensor:", err);
    }
}

/**
 * Consulta la política estocástica PDP
 */
async function consultarPDP() {
    try {
        const alerta = document.getElementById("sel-alerta-senamhi").value;
        const res = await fetch("/api/v1/inventario/preposicionar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                codigo_provincia: "0601",
                stock_actual_kits: 300,
                nivel_alerta_senamhi: alerta
            })
        });
        const data = await res.json();
        const p = data.politica_completa[alerta];

        document.getElementById("lbl-pdp-kits").innerText = `${p.kits_a_despachar} kits`;
        document.getElementById("lbl-pdp-stock").innerText = `${p.stock_final_provincia} kits`;
        document.getElementById("lbl-pdp-cobertura").innerText = `${p.cobertura_riesgo_severo_pct}%`;
    } catch (err) {
        console.error("Error en PDP:", err);
    }
}

/**
 * Restablece la demo a condiciones normales
 */
async function resetearDemo() {
    try {
        await fetch("/api/v1/reset-demo", { method: "POST" });
        if (rerouteLayer) map.removeLayer(rerouteLayer);
        location.reload();
    } catch (err) {
        console.error("Error reseteando demo:", err);
    }
}
