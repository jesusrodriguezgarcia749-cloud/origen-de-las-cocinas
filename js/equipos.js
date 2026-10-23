// equipos.js — «Formaciones de equipos»: cada vez que el docente arma equipos queda
// una formación (con sus códigos QR). Cada tarea en equipo usa una formación, así
// se pueden reutilizar los mismos equipos o formar nuevos solo para una tarea.
//   grupos/{g}.formaciones  = { [fid]: { nombre, creada (ms), abiertas } }
//   grupos/{g}.equiposTarea = { [tareaId]: fid }
//   grupos/{g}/equipos/{e}.formacion = fid   (sin el campo = 'actual', los equipos de antes)
// Módulo sin Firebase: solo funciones sobre los datos ya leídos.

export const BASE = 'actual';
export const TIPOS_EQUIPO = ['atlas', 'cuadro', 'influencias'];
export const enEquipo = a => !!a && TIPOS_EQUIPO.includes(a.tipo);
export const formacionDe = e => (e && e.formacion) || BASE;

// todas las formaciones del grupo; la «actual» siempre existe
export function formaciones(g) {
  g = g || {};
  const F = {};
  Object.entries(g.formaciones || {}).forEach(([k, f]) => { if (f) F[k] = { ...f }; });
  F[BASE] = { nombre: 'Equipos actuales', creada: 0, ...(F[BASE] || {}) };
  if (F[BASE].abiertas === undefined) F[BASE].abiertas = g.equiposAbiertos !== false;
  Object.values(F).forEach(f => { if (f.abiertas === undefined) f.abiertas = false; });
  return F;
}
export const ordenFormaciones = g => Object.entries(formaciones(g)).sort((a, b) => (a[1].creada || 0) - (b[1].creada || 0));
export function formacionDeTarea(g, tareaId) {
  const f = ((g && g.equiposTarea) || {})[tareaId];
  return f && formaciones(g)[f] ? f : BASE;
}
export const abiertas = (g, fid) => !!(formaciones(g)[fid] || {}).abiertas;
export const equiposDe = (equipos, fid) => (equipos || []).filter(e => formacionDe(e) === fid);
export const equipoDe = (equipos, fid, alumnoId) => equiposDe(equipos, fid).find(e => (e.integrantes || []).includes(alumnoId)) || null;
// tareas (de una lista {id: tarea}) que usan esa formación
export const tareasDeFormacion = (g, fid, TAREAS) => Object.values(TAREAS).filter(a => enEquipo(a) && formacionDeTarea(g, a.id) === fid);

// ---- QR: corrección de errores máxima (H, aguanta hasta ~30 % del código tapado o
// con reflejo) y dirección corta (unir.html#CODE) para que el código salga menos denso.
export const urlUnir = (cod, base) => new URL('unir.html#' + cod, base || location.href).href;
export function qrSvg(texto, { titulo = '' } = {}) {
  if (typeof qrcode !== 'function') return '<p class="empty-inline">QR no disponible</p>';
  const q = qrcode(0, 'H'); q.addData(texto); q.make();
  const n = q.getModuleCount(), m = 4, t = n + m * 2;   // 4 módulos de margen blanco (zona de silencio)
  let d = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!q.isDark(r, c)) { c++; continue; }
      let k = c; while (k < n && q.isDark(r, k)) k++;
      d += `M${c + m} ${r + m}h${k - c}v1h${c - k}z`; c = k;
    }
  }
  return `<svg class="qr-svg" viewBox="0 0 ${t} ${t}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="${titulo ? 'Código QR: ' + String(titulo).replace(/"/g, '') : 'Código QR'}"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
