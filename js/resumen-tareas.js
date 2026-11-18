// resumen-tareas.js — «📊 Resumen general» del panel docente (Historial).
// Junta, para el grupo activo, todas las tareas del catálogo (digitales y en papel) y las entregas
// del proyecto: quién entregó, quién no, qué ya calificaste y qué te falta calificar.
// Es el mismo archivo en Origen de las Cocinas y en Epistemología; cada panel le pasa sus datos:
//   ctx = { db, fs:{collection,getDocs}, grupo, clase, alumnos:[{id,nombre}], temas (TEMAS_TAREAS),
//           califica, catalogoId, entregasDig: async a => [{ alId, ent, emp, t }],
//           proyecto: async () => [{ id, nombre, filas:[{ alId, ent, emp, cal }] }],
//           irCalificar: a => void, escaparHTML }

const PARCIALES = { p1: 'Parcial 1', p2: 'Parcial 2', final: 'Final' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fechaCorta = f => { const d = f ? new Date(f + 'T12:00:00') : null; return d && !isNaN(d) ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''; };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const tieneCal = r => !!r && (r.exento || (r.calificacion !== undefined && r.calificacion !== null && r.calificacion !== ''));
const prom = xs => xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length * 10) / 10 : null;

let R = null; // último resumen armado (para el filtro, el Excel y el texto)

export async function resumenGeneral(cont, ctx) {
  if (!ctx.grupo) { cont.innerHTML = '<p class="empty-inline">Elige un grupo primero.</p>'; return; }
  if (!ctx.alumnos.length) { cont.innerHTML = '<p class="empty-inline">Este grupo aún no tiene alumnos.</p>'; return; }
  const est = t => { cont.innerHTML = `<p class="empty-inline">${esc(t)}</p>`; };
  const { collection, getDocs } = ctx.fs, db = ctx.db, g = ctx.grupo;
  est('Leyendo el catálogo de tareas…');
  let catalogo = [];
  try { const sn = await getDocs(collection(db, 'grupos', g, 'tareas_catalogo')); catalogo = sn.docs.map(d => ({ id: d.id, ...d.data() })); } catch { /* */ }
  const digPorId = {}; ctx.temas.forEach(t => t.acts.filter(ctx.califica).forEach(a => { digPorId[ctx.catalogoId(a.id)] = { a, tema: t }; }));

  // Calificaciones: una lectura por alumno trae todas sus tareas.
  est('Leyendo las calificaciones de cada alumno…');
  const cals = {};
  await Promise.all(ctx.alumnos.map(async al => {
    cals[al.id] = {};
    try { const sn = await getDocs(collection(db, 'grupos', g, 'alumnos', al.id, 'tareas')); sn.forEach(d => { cals[al.id][d.id] = d.data(); }); } catch { /* */ }
  }));

  // Entregas de las tareas digitales: las del catálogo y las de clases que ya pasaron aunque no estén en él.
  const hoy = hoyISO();
  const digitales = Object.entries(digPorId).filter(([cid, x]) => catalogo.some(c => c.id === cid) || (x.tema.fecha && x.tema.fecha <= hoy));
  const entregas = {}; let hechas = 0;
  const cola = [...digitales];
  await Promise.all([0, 1, 2, 3].map(async () => {
    while (cola.length) {
      const [cid, { a }] = cola.shift();
      try { entregas[cid] = await ctx.entregasDig(a); } catch { entregas[cid] = null; }
      est(`Revisando entregas… ${++hechas} de ${digitales.length}`);
    }
  }));
  let proyecto = [];
  try { est('Revisando el proyecto…'); proyecto = await ctx.proyecto(); } catch { /* */ }

  // Renglones: uno por trabajo.
  const items = [];
  catalogo.forEach(c => {
    const dg = digPorId[c.id], E = entregas[c.id];
    items.push({ id: c.id, nombre: c.nombre || (dg && dg.a.nombre) || c.id, fecha: c.fecha || (dg && dg.tema.fecha) || '', parcial: c.parcial || '', clase: dg ? 'dig' : 'papel', a: dg && dg.a, enCat: true,
      por: Object.fromEntries(ctx.alumnos.map(al => {
        const cr = cals[al.id][c.id], e = E ? E.find(x => x.alId === al.id) : null;
        const cal = cr && !cr.exento && cr.calificacion !== undefined && cr.calificacion !== null && cr.calificacion !== '' ? Number(cr.calificacion) : null;
        let s;
        if (cr && cr.exento) s = 'exento';
        else if (cal !== null) s = 'cal';
        else if (!dg) s = 'papel';
        else if (e && e.ent) s = 'porcal';
        else if (e && e.emp) s = 'emp';
        else s = 'no';
        return [al.id, { s, cal, ent: !!(e && e.ent) }];
      })) });
  });
  digitales.filter(([cid]) => !catalogo.some(c => c.id === cid)).forEach(([cid, { a, tema }]) => {
    const E = entregas[cid] || [];
    const n = E.filter(x => x.ent || x.emp).length;
    items.push({ id: cid, nombre: a.nombre, fecha: tema.fecha || '', parcial: '', clase: 'dig', a, enCat: false, conTrabajo: n,
      por: Object.fromEntries(ctx.alumnos.map(al => { const e = E.find(x => x.alId === al.id), cr = cals[al.id][cid]; const cal = tieneCal(cr) && !cr.exento ? Number(cr.calificacion) : null; return [al.id, { s: cr && cr.exento ? 'exento' : cal !== null ? 'cal' : e && e.ent ? 'porcal' : e && e.emp ? 'emp' : 'no', cal, ent: !!(e && e.ent) }]; })) });
  });
  proyecto.forEach(p => {
    const algo = p.filas.some(f => f.ent || f.cal !== null);
    if (!algo) return; // entrega que todavía no empieza
    items.push({ id: p.id, nombre: p.nombre, fecha: p.fecha || '', parcial: '', clase: 'proy', enCat: true,
      por: Object.fromEntries(ctx.alumnos.map(al => { const f = p.filas.find(x => x.alId === al.id) || {}; return [al.id, { s: f.cal !== null && f.cal !== undefined ? 'cal' : f.ent ? 'porcal' : f.emp ? 'emp' : 'no', cal: f.cal ?? null, ent: !!f.ent }]; })) });
  });
  items.sort((x, y) => String(x.fecha).localeCompare(String(y.fecha)));

  const parciales = [...new Set(items.map(i => i.parcial).filter(Boolean))];
  const masReciente = [...items].reverse().find(i => i.parcial);
  R = { ctx, items, parciales, filtro: masReciente ? masReciente.parcial : 'todos', generado: new Date() };
  pintar(cont);
}

// ---------- cálculo ----------
function visibles() {
  const f = R.filtro;
  // El proyecto y las digitales fuera del catálogo se ven siempre (no tienen parcial).
  return R.items.filter(i => f === 'todos' || !i.parcial || i.parcial === f);
}
function porTarea(i) {
  const v = Object.values(i.por), c = k => v.filter(x => x.s === k).length;
  const cuenta = { cal: c('cal'), exento: c('exento'), porcal: c('porcal'), emp: c('emp'), no: c('no'), papel: c('papel') };
  cuenta.entregaron = i.clase === 'papel' ? cuenta.cal : v.filter(x => x.ent || x.s === 'cal').length;
  cuenta.prom = prom(v.filter(x => x.cal !== null).map(x => x.cal));
  return cuenta;
}
function porAlumno(al) {
  const its = visibles().filter(i => i.enCat);
  const r = { al, total: its.length, cal: [], porcal: [], falta: [], emp: [], papel: [], exento: 0, notas: [] };
  its.forEach(i => {
    const x = i.por[al.id]; if (!x) return;
    if (x.s === 'cal') { r.cal.push(i); r.notas.push(x.cal); }
    else if (x.s === 'exento') r.exento++;
    else if (x.s === 'porcal') r.porcal.push(i);
    else if (x.s === 'emp') { r.emp.push(i); r.falta.push(i); }
    else if (x.s === 'no') r.falta.push(i);
    else if (x.s === 'papel') r.papel.push(i);
  });
  r.prom = prom(r.notas);
  r.entrego = r.total - r.falta.length - r.papel.length - r.exento;
  return r;
}

// ---------- pintar ----------
function pintar(cont) {
  const { ctx } = R, e = esc;
  const its = visibles(), cat = its.filter(i => i.enCat), fuera = its.filter(i => !i.enCat && i.conTrabajo);
  const T = cat.map(i => ({ i, c: porTarea(i) }));
  const A = ctx.alumnos.map(porAlumno);
  const totPorcal = T.reduce((s, x) => s + x.c.porcal, 0), totNo = T.reduce((s, x) => s + x.c.no + x.c.emp, 0);
  const totCal = T.reduce((s, x) => s + x.c.cal, 0), papelSin = T.filter(x => x.i.clase === 'papel' && x.c.cal === 0);
  const riesgo = A.filter(a => a.falta.length >= 3).sort((x, y) => y.falta.length - x.falta.length);
  const nombreTipo = { dig: '💻 Digital', papel: '📄 En papel', proy: '📘 Proyecto' };
  const etiqueta = R.filtro === 'todos' ? 'todos los parciales' : PARCIALES[R.filtro] || R.filtro;

  cont.innerHTML = `
  <div class="rs-cab">
    <label>Parcial <select id="rs-parcial"><option value="todos">Todos</option>${R.parciales.map(p => `<option value="${p}" ${p === R.filtro ? 'selected' : ''}>${e(PARCIALES[p] || p)}</option>`).join('')}</select></label>
    <button type="button" class="btn btn-small btn-ghost-dark" id="rs-csv">⬇ Excel (CSV)</button>
    <button type="button" class="btn btn-small btn-ghost-dark" id="rs-txt">📋 Copiar resumen en texto</button>
    <button type="button" class="btn btn-small btn-ghost-dark" id="rs-otra">↻ Actualizar</button>
    <span class="field-hint" id="rs-msg"></span>
  </div>
  <div class="rs-kpis">
    <div class="rs-kpi rs-k-cal"><b>${totCal}</b><span>trabajos calificados</span></div>
    <div class="rs-kpi rs-k-por"><b>${totPorcal}</b><span>entregados por calificar</span></div>
    <div class="rs-kpi rs-k-no"><b>${totNo}</b><span>sin entregar</span></div>
    <div class="rs-kpi rs-k-al"><b>${riesgo.length}</b><span>alumnos deben 3 o más</span></div>
  </div>
  <p class="field-hint">${e(ctx.clase)} · ${e(etiqueta)} · ${cat.length} trabajos en el catálogo · ${ctx.alumnos.length} alumnos · al ${R.generado.toLocaleString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
  ${fuera.length ? `<div class="rs-alerta">⚠️ <b>Con trabajo pero fuera del catálogo</b> (no cuentan en el promedio hasta que las agregues en Tareas → Tareas digitales): ${fuera.map(i => `${e(i.nombre)} (${i.conTrabajo} alumno${i.conTrabajo === 1 ? '' : 's'})`).join(' · ')}</div>` : ''}
  ${papelSin.length ? `<div class="rs-alerta rs-suave">📄 <b>Tareas en papel sin ninguna calificación capturada:</b> ${papelSin.map(x => e(x.i.nombre)).join(' · ')}. Aquí no puedo saber quién la entregó; captura las calificaciones en la pestaña Tareas.</div>` : ''}

  <h4 class="rs-h">Lo que te falta calificar</h4>
  ${T.filter(x => x.c.porcal).length ? `<ul class="rs-pend">${T.filter(x => x.c.porcal).sort((a, b) => b.c.porcal - a.c.porcal).map(x => `<li><b>${x.c.porcal}</b> · ${e(x.i.nombre)} <small>${e(fechaCorta(x.i.fecha))}</small>${x.i.a ? ` <button type="button" class="btn btn-small" data-ircal="${e(x.i.id)}">Calificar</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty-inline">✓ Nada pendiente: todo lo entregado ya tiene calificación.</p>'}

  <h4 class="rs-h">Por tarea</h4>
  <div class="taller-tabla-wrap"><table class="taller-tabla rs-tabla"><thead><tr><th>Trabajo</th><th>Fecha</th><th>Tipo</th><th title="Entregaron o ya tienen calificación">Entregaron</th><th>Calificadas</th><th>Por calificar</th><th title="La empezaron pero no la entregaron">Empezada</th><th>Sin entregar</th><th>Promedio</th></tr></thead><tbody>
  ${T.map(({ i, c }) => `<tr><td><b>${e(i.nombre)}</b></td><td>${e(fechaCorta(i.fecha))}</td><td><small>${nombreTipo[i.clase]}</small></td>
    <td>${c.entregaron} / ${ctx.alumnos.length - c.exento}</td><td>${c.cal}${c.exento ? ` <small>(+${c.exento} exento${c.exento === 1 ? '' : 's'})</small>` : ''}</td>
    <td class="${c.porcal ? 'rs-rojo' : ''}">${i.clase === 'papel' ? '—' : c.porcal}</td><td>${i.clase === 'papel' ? '—' : c.emp}</td><td>${i.clase === 'papel' ? `<small>${c.papel} sin calif.</small>` : c.no}</td><td>${c.prom ?? '—'}</td></tr>`).join('')}
  </tbody></table></div>

  <h4 class="rs-h">Por alumno</h4>
  <p class="field-hint">Ordenados de quien debe más a quien debe menos. Toca un nombre para ver qué le falta.</p>
  <div class="taller-tabla-wrap"><table class="taller-tabla rs-tabla"><thead><tr><th>Alumno</th><th>Entregó</th><th>Le falta</th><th>Por calificar</th><th>Promedio de lo calificado</th></tr></thead><tbody>
  ${[...A].sort((x, y) => y.falta.length - x.falta.length || x.al.nombre.localeCompare(y.al.nombre)).map(a => `<tr class="${a.falta.length >= 3 ? 'rs-riesgo' : ''}"><td><details><summary><b>${e(a.al.nombre)}</b>${a.falta.length >= 3 ? ' ⚠️' : ''}</summary>
      ${a.falta.length ? `<p><b>Le falta:</b> ${a.falta.map(i => e(i.nombre) + (a.emp.includes(i) ? ' <small>(la empezó)</small>' : '')).join(' · ')}</p>` : '<p>✓ No debe nada.</p>'}
      ${a.porcal.length ? `<p><b>Entregó y falta calificar:</b> ${a.porcal.map(i => e(i.nombre)).join(' · ')}</p>` : ''}
      ${a.papel.length ? `<p><b>En papel sin calificación:</b> ${a.papel.map(i => e(i.nombre)).join(' · ')}</p>` : ''}</details></td>
    <td>${a.entrego} / ${a.total - a.exento - a.papel.length}</td><td class="${a.falta.length ? 'rs-rojo' : ''}">${a.falta.length}</td><td>${a.porcal.length}</td><td>${a.prom ?? '—'}</td></tr>`).join('')}
  </tbody></table></div>`;

  cont.querySelector('#rs-parcial').value = R.filtro;
  cont.querySelector('#rs-parcial').addEventListener('change', ev => { R.filtro = ev.target.value; pintar(cont); });
  cont.querySelector('#rs-otra').addEventListener('click', () => resumenGeneral(cont, ctx));
  cont.querySelector('#rs-csv').addEventListener('click', () => bajarCSV(T, A));
  cont.querySelector('#rs-txt').addEventListener('click', async () => {
    const msg = cont.querySelector('#rs-msg'), txt = texto(T, A, totCal, totPorcal, totNo, fuera, papelSin);
    try { await navigator.clipboard.writeText(txt); msg.textContent = '✓ Copiado. Pégalo donde quieras.'; }
    catch { const ta = document.createElement('textarea'); ta.value = txt; ta.className = 'rs-copia'; cont.querySelector('.rs-cab').after(ta); ta.select(); msg.textContent = 'Selecciona y copia el texto de abajo.'; }
  });
  cont.querySelectorAll('[data-ircal]').forEach(b => b.addEventListener('click', () => { const i = R.items.find(x => x.id === b.dataset.ircal); if (i && i.a) ctx.irCalificar(i.a); }));
}

// ---------- salidas ----------
function bajarCSV(T, A) {
  const { ctx } = R, q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const its = T.map(x => x.i);
  const corto = { cal: '', exento: 'Exento', porcal: 'Por calificar', emp: 'Empezada', no: 'Sin entregar', papel: 'Sin calificación' };
  const filas = [
    ['Alumno', ...its.map(i => i.nombre), 'Le falta', 'Por calificar', 'Promedio'],
    ...[...A].sort((x, y) => x.al.nombre.localeCompare(y.al.nombre)).map(a => [a.al.nombre, ...its.map(i => { const x = i.por[a.al.id]; return x.s === 'cal' ? x.cal : corto[x.s]; }), a.falta.length, a.porcal.length, a.prom ?? '']),
    [],
    ['Trabajo', 'Fecha', 'Entregaron', 'Calificadas', 'Por calificar', 'Empezada', 'Sin entregar', 'Promedio'],
    ...T.map(({ i, c }) => [i.nombre, i.fecha, c.entregaron, c.cal, i.clase === 'papel' ? '' : c.porcal, i.clase === 'papel' ? '' : c.emp, i.clase === 'papel' ? '' : c.no, c.prom ?? ''])
  ];
  const blob = new Blob(['﻿' + filas.map(f => f.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `Resumen_${ctx.clase.replace(/\s+/g, '_')}_${ctx.grupo}_${hoyISO()}.csv`.normalize('NFD').replace(/[̀-ͯ]/g, '');
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function texto(T, A, totCal, totPorcal, totNo, fuera, papelSin) {
  const { ctx } = R, L = [];
  L.push(`RESUMEN DE TAREAS · ${ctx.clase} · grupo ${ctx.grupo}`);
  L.push(`${R.filtro === 'todos' ? 'Todos los parciales' : PARCIALES[R.filtro] || R.filtro} · ${R.generado.toLocaleString('es-MX')}`);
  L.push(`${ctx.alumnos.length} alumnos · ${T.length} trabajos en el catálogo`);
  L.push(`Calificados: ${totCal} · Entregados por calificar: ${totPorcal} · Sin entregar: ${totNo}`);
  if (fuera.length) L.push(`Con trabajo pero fuera del catálogo: ${fuera.map(i => `${i.nombre} (${i.conTrabajo})`).join('; ')}`);
  if (papelSin.length) L.push(`En papel sin calificaciones capturadas: ${papelSin.map(x => x.i.nombre).join('; ')}`);
  L.push('', 'POR TAREA (entregaron / calificadas / por calificar / sin entregar / promedio)');
  T.forEach(({ i, c }) => L.push(`- ${i.nombre} (${fechaCorta(i.fecha)}): ${c.entregaron}/${ctx.alumnos.length - c.exento} · ${c.cal} · ${i.clase === 'papel' ? '—' : c.porcal} · ${i.clase === 'papel' ? '—' : c.no + c.emp} · ${c.prom ?? '—'}`));
  L.push('', 'POR ALUMNO (le falta / por calificar / promedio)');
  [...A].sort((x, y) => y.falta.length - x.falta.length || x.al.nombre.localeCompare(y.al.nombre)).forEach(a => L.push(`- ${a.al.nombre}: ${a.falta.length} · ${a.porcal.length} · ${a.prom ?? '—'}${a.falta.length ? ` · Le falta: ${a.falta.map(i => i.nombre).join(', ')}` : ''}`));
  return L.join('\n');
}
