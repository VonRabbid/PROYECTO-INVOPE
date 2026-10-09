/**
 * Servicio cliente API para comunicarse con el backend FastAPI de GeoAlert-VRP (INVOPE).
 */
const API_BASE = '/api/v1';

export async function fetchProvincias() {
  const res = await fetch(`${API_BASE}/provincias`);
  if (!res.ok) throw new Error('Error al obtener catálogo de provincias');
  return res.json();
}

export async function fetchQuebradas() {
  const res = await fetch(`${API_BASE}/quebradas`);
  if (!res.ok) throw new Error('Error al obtener telemetría de quebradas');
  return res.json();
}

export async function fetchNodos() {
  const res = await fetch(`${API_BASE}/nodos`);
  if (!res.ok) throw new Error('Error al obtener nodos logísticos');
  return res.json();
}

export async function fetchTramos() {
  const res = await fetch(`${API_BASE}/tramos`);
  if (!res.ok) throw new Error('Error al obtener tramos viales');
  return res.json();
}

export async function optimizarVRPTW(params = {}) {
  const res = await fetch(`${API_BASE}/optimizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigo_provincia: params.codigo_provincia || '0601',
      considerar_riesgo: params.considerar_riesgo ?? true,
      penalizacion_big_m: params.penalizacion_big_m ?? 100000.0,
    }),
  });
  if (!res.ok) throw new Error('Error al optimizar VRPTW');
  return res.json();
}

export async function simularTelemetria(payload) {
  const res = await fetch(`${API_BASE}/telemetria/simular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al simular telemetría IoT');
  return res.json();
}

export async function reenrutarPDD(payload = {}) {
  const res = await fetch(`${API_BASE}/reenrutar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_origen: payload.id_origen ?? 0,
      id_destino: payload.id_destino ?? 5,
      tramos_bloqueados: payload.tramos_bloqueados || [[0, 1], [1, 2]],
    }),
  });
  if (!res.ok) throw new Error('Error en re-enrutamiento dinámico PDD');
  return res.json();
}

export async function preposicionarPDP(payload = {}) {
  const res = await fetch(`${API_BASE}/inventario/preposicionar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigo_provincia: payload.codigo_provincia || '0601',
      stock_actual_kits: payload.stock_actual_kits ?? 300,
      nivel_alerta_senamhi: payload.nivel_alerta_senamhi || 'ROJO',
    }),
  });
  if (!res.ok) throw new Error('Error en evaluación estocástica PDP');
  return res.json();
}

export async function fetchPertCpm(deadlineMinutos = 120.0) {
  const res = await fetch(`${API_BASE}/pert-cpm?deadline_minutos=${deadlineMinutos}`);
  if (!res.ok) throw new Error('Error al calcular ruta crítica PERT/CPM');
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${API_BASE}/reset-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Error al reiniciar demo');
  return res.json();
}
