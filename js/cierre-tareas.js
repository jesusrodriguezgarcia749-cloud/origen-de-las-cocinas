// cierre-tareas.js — Reglas de apertura de las tareas digitales que se califican.
// · Desde el 19 de noviembre de 2026, cada tarea cierra sola a las 23:59 del día de su clase,
//   salvo que el docente ponga otra fecha (o la deje vacía) en el panel: grupos/{g}.tareasDig.{id}.cierre.
// · El docente puede reabrirle una tarea a un alumno (falta justificada): grupos/{g}.tareasDig.{id}.extra.{alumnoId} = fecha límite.
// · Las tareas de esas clases entran solas al catálogo (las agrega el panel docente al abrirse);
//   si el docente quita una del catálogo, queda marcada con noCat y ya no se vuelve a agregar.
export const AUTO_DESDE = '2026-11-19';
export const FIN_P2 = '2026-11-27';             // clases hasta esta fecha cuentan para el Parcial 2; después, para el Final
export const parcialDe = fecha => (fecha && fecha > FIN_P2 ? 'final' : 'p2');
export const esAuto = a => !!(a && a.fecha && a.fecha >= AUTO_DESDE);
// Reapertura general para todo el grupo, puesta desde el repositorio (no hace falta tocar el panel):
// mientras esté vigente, todas las tareas de clases ya dadas quedan abiertas hasta «hasta», aunque el
// docente las haya cerrado o ya hubiera pasado su fecha límite.
export const REAPERTURA = { desde: '2026-11-27T10:00:00-06:00', hasta: '2026-11-27T12:45:00-06:00' };
export function reaperturaDe(a, ahora = Date.now()) {
  if (!REAPERTURA || !a || !a.fecha) return '';
  const d = Date.parse(REAPERTURA.desde), h = Date.parse(REAPERTURA.hasta);
  return ahora >= d && ahora < h && a.fecha <= REAPERTURA.desde.slice(0, 10) ? REAPERTURA.hasta : '';
}
const tiene = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
// Fecha límite general de la tarea ('' = sin fecha límite).
export function cierreDe(est, a) {
  if (tiene(est, 'cierre')) return est.cierre || '';
  return esAuto(a) ? a.fecha + 'T23:59' : '';
}
// Prórroga de un alumno (si sigue vigente).
export function prorrogaDe(est, alumnoId, ahora = Date.now()) {
  const x = est && est.extra && alumnoId ? est.extra[alumnoId] : '';
  return x && ahora < Date.parse(x) ? x : '';
}
export function estaAbierta(est, a, alumnoId, ahora = Date.now()) {
  if (prorrogaDe(est, alumnoId, ahora) || reaperturaDe(a, ahora)) return true;
  if (est && est.abierta === false) return false;
  const c = cierreDe(est, a);
  return !(c && ahora > Date.parse(c));
}
