// resumen-semana.js — «📈 Resumen de la semana» del panel docente (Historial).
// Para el grupo activo, en una sola pantalla: quién va en riesgo en el parcial que corre, quién no entregó
// las tareas de los últimos siete días, quién lleva días sin entregar nada, faltas de la semana y qué temas
// de repaso faltan por terminar. Lee lo mismo que ya usa el Historial (datosDeAlumno) y no escribe nada.
// Es el mismo archivo en Origen de las Cocinas y en Epistemología; cada panel le pasa:
//   ctx = { clase, grupo, alumnos:[{id,nombre}], parcial ('p1'|'p2'|'final'), nombresParcial,
//           datosDeAlumno: async id => datos, calcularParcial, temasRepaso: [n…] }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fCorta = f => { const d = f ? new Date(f + 'T12:00:00') : null; return d && !isNaN(d) ? d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; };
const ms = v => { if (!v) return 0; if (typeof v.toMillis === 'function') return v.toMillis(); if (typeof v.seconds === 'number') return v.seconds * 1000; const t = Date.parse(v); return isNaN(t) ? 0 : t; };
const uno = n => Math.round(n * 10) / 10;

let TXT = '';

export async function resumenSemana(cont, ctx) {
  if (!ctx.grupo) { cont.innerHTML = '<p class="empty-inline">Elige un grupo primero.</p>'; return; }
  if (!ctx.alumnos.length) { cont.innerHTML = '<p class="empty-inline">Este grupo aún no tiene alumnos.</p>'; return; }
  const hoyD = new Date(), hoy = iso(hoyD), desdeD = new Date(hoyD); desdeD.setDate(desdeD.getDate() - 6); const desde = iso(desdeD);
  const P = ctx.parcial, nomP = ctx.nombresParcial[P] || P, temas = ctx.temasRepaso || [];
  const filas = [];
  let i = 0;
  for (const al of ctx.alumnos) {
    cont.innerHTML = `<p class="empty-inline">Revisando a ${esc(al.nombre)} (${++i} de ${ctx.alumnos.length})…</p>`;
    let d; try { d = await ctx.datosDeAlumno(al.id); } catch { continue; }
    const ex = new Set((d.tareas || []).filter(t => t && t.exento).map(t => t.id));
    const porId = new Map((d.tareas || []).map(t => [t.id, t]));
    const r = ctx.calcularParcial(P, d);
    const tar = P === 'final' ? (r.tareasParticipacion && r.tareasParticipacion.tareas) : r.tareas;
    const semana = (d.catalogoTareas || []).filter(t => t.fecha && t.fecha >= desde && t.fecha < hoy && !ex.has(t.id));
    const sinEntregar = semana.filter(t => { const e = porId.get(t.id); return !e || e.calificacion === undefined || e.calificacion === null || e.calificacion === ''; });
    const ultimo = Math.max(0, ...(d.tareas || []).map(t => ms(t.actualizado)), ...(d.actividades || []).map(a => ms(a.fecha)));
    const dias = ultimo ? Math.floor((Date.now() - ultimo) / 864e5) : null;
    const faltas = (d.asistencias || []).filter(a => a.fecha >= desde && a.fecha <= hoy && a.estado === 'falta').length;
    const hechos = new Set((d.actividades || []).filter(a => a.completado).map(a => Number(a.tema)));
    filas.push({ al, prom: tar && tar.esperadas ? uno(tar.promedio) : null, ent: tar ? tar.entregadas : 0, esp: tar ? tar.esperadas : 0,
      sinEntregar, dias, faltas, repaso: temas.filter(t => hechos.has(t)) });
  }
  // Clasificación
  const riesgo = filas.filter(f => f.prom !== null && (f.prom < 6 || (f.esp && f.ent / f.esp < 0.6))).sort((a, b) => a.prom - b.prom);
  const atencion = filas.filter(f => !riesgo.includes(f) && f.prom !== null && f.prom < 7.5).sort((a, b) => a.prom - b.prom);
  const debenSemana = filas.filter(f => f.sinEntregar.length).sort((a, b) => b.sinEntregar.length - a.sinEntregar.length);
  const inactivos = filas.filter(f => f.dias === null || f.dias >= 7).sort((a, b) => (b.dias ?? 999) - (a.dias ?? 999));
  const conFaltas = filas.filter(f => f.faltas).sort((a, b) => b.faltas - a.faltas);
  const porTema = temas.map(t => ({ t, n: filas.filter(f => f.repaso.includes(t)).length })).sort((a, b) => a.n - b.n);
  const proms = filas.filter(f => f.prom !== null).map(f => f.prom);
  const promGrupo = proms.length ? uno(proms.reduce((s, x) => s + x, 0) / proms.length) : null;
  const tareasSemana = [...new Map(filas.flatMap(f => f.sinEntregar).map(t => [t.id, t])).values()];

  const diasTxt = f => f.dias === null ? 'sin entregas registradas' : `${f.dias} días sin entregar nada`;
  const caja = (titulo, ayuda, cuerpo, tono = '') => `<div class="rs-caja${tono}" style="border:1px solid var(--line,#ddd);border-radius:12px;padding:12px 14px;margin:10px 0"><h4 style="margin:0 0 4px">${titulo}</h4><p class="field-hint" style="margin:0 0 8px">${ayuda}</p>${cuerpo}</div>`;
  const lista = (L, fn) => L.length ? `<ul style="margin:0;padding-left:20px;line-height:1.55">${L.map(f => `<li>${fn(f)}</li>`).join('')}</ul>` : '<p class="empty-inline" style="margin:0">✓ Nadie.</p>';

  cont.innerHTML = `
    <p style="margin:0 0 6px"><b>${esc(ctx.clase)}</b> · semana del ${fCorta(desde)} al ${fCorta(hoy)} · ${nomP} · ${filas.length} alumnos${promGrupo !== null ? ` · promedio de tareas del grupo: <b>${promGrupo}</b>` : ''}</p>
    <div class="rs-cab"><button type="button" class="btn btn-small btn-ghost-dark" id="rsem-copiar">Copiar como texto</button><button type="button" class="btn btn-small btn-ghost-dark" id="rsem-imp">Imprimir (carta)</button></div>
    <div id="rsem-hoja">
    ${caja('🚨 En riesgo de reprobar', `Promedio de tareas del ${nomP} menor a 6, o entregó menos de seis de cada diez. Llámalos esta semana.`,
      lista(riesgo, f => `<b>${esc(f.al.nombre)}</b> · tareas ${f.prom} · entregó ${f.ent} de ${f.esp}${f.sinEntregar.length ? ` · debe ${f.sinEntregar.length} de esta semana` : ''}`))}
    ${caja('⚠️ Requieren atención', 'Promedio de tareas entre 6 y 7.5: todavía a tiempo de subir.',
      lista(atencion, f => `<b>${esc(f.al.nombre)}</b> · tareas ${f.prom} · entregó ${f.ent} de ${f.esp}`))}
    ${caja('📭 No entregaron lo de esta semana', tareasSemana.length ? `Tareas del catálogo de estos días (las de hoy siguen abiertas y no cuentan): ${tareasSemana.map(t => esc(t.nombre || t.id)).join(' · ')}.` : 'No hubo tareas en el catálogo con fecha en estos siete días.',
      lista(debenSemana, f => `<b>${esc(f.al.nombre)}</b> · ${f.sinEntregar.map(t => esc(t.nombre || t.id)).join(', ')}`))}
    ${caja('💤 Una semana o más sin entregar nada', 'Ni tareas ni temas de repaso en la plataforma. Puede que no estén entrando.',
      lista(inactivos, f => `<b>${esc(f.al.nombre)}</b> · ${diasTxt(f)}`))}
    ${caja('🗓️ Faltas de esta semana', 'Según el pase de lista del panel.', lista(conFaltas, f => `<b>${esc(f.al.nombre)}</b> · ${f.faltas} falta${f.faltas === 1 ? '' : 's'}`))}
    ${temas.length ? caja('📚 Temas de repaso del parcial', `Cuántos alumnos ya terminaron cada tema (de ${filas.length}). Los de arriba son los que conviene repasar en clase.`,
      `<ul style="margin:0;padding-left:20px;line-height:1.55">${porTema.map(x => `<li>Tema ${x.t}: <b>${x.n}</b> de ${filas.length}</li>`).join('')}</ul>`) : ''}
    </div>`;

  TXT = `RESUMEN DE LA SEMANA · ${ctx.clase}\nDel ${fCorta(desde)} al ${fCorta(hoy)} · ${nomP} · ${filas.length} alumnos${promGrupo !== null ? ` · promedio de tareas: ${promGrupo}` : ''}\n\n` +
    `EN RIESGO (${riesgo.length})\n${riesgo.map(f => `- ${f.al.nombre}: tareas ${f.prom}, entregó ${f.ent} de ${f.esp}`).join('\n') || '- Nadie'}\n\n` +
    `REQUIEREN ATENCIÓN (${atencion.length})\n${atencion.map(f => `- ${f.al.nombre}: tareas ${f.prom}`).join('\n') || '- Nadie'}\n\n` +
    `NO ENTREGARON LO DE ESTA SEMANA (${debenSemana.length})\n${debenSemana.map(f => `- ${f.al.nombre}: ${f.sinEntregar.map(t => t.nombre || t.id).join(', ')}`).join('\n') || '- Nadie'}\n\n` +
    `UNA SEMANA O MÁS SIN ENTREGAR NADA (${inactivos.length})\n${inactivos.map(f => `- ${f.al.nombre}: ${diasTxt(f)}`).join('\n') || '- Nadie'}\n\n` +
    `FALTAS DE LA SEMANA\n${conFaltas.map(f => `- ${f.al.nombre}: ${f.faltas}`).join('\n') || '- Nadie'}` +
    (temas.length ? `\n\nTEMAS DE REPASO TERMINADOS\n${porTema.map(x => `- Tema ${x.t}: ${x.n} de ${filas.length}`).join('\n')}` : '');

  cont.querySelector('#rsem-copiar').addEventListener('click', async e => { try { await navigator.clipboard.writeText(TXT); e.target.textContent = '✓ Copiado'; } catch { prompt('Copia el resumen:', TXT); } });
  cont.querySelector('#rsem-imp').addEventListener('click', () => {
    const w = open('', '_blank'); if (!w) return;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resumen de la semana · ${esc(ctx.clase)}</title><style>@page{size:letter;margin:1.6cm}body{font:11pt/1.4 Georgia,serif;color:#111}h4{margin:0 0 3px;font-size:12pt}.field-hint{color:#555;font-size:9.5pt}.rs-caja{break-inside:avoid}button{display:none}</style></head><body><h2 style="margin:0 0 4px">Resumen de la semana</h2>${cont.innerHTML}<script>setTimeout(()=>print(),300)<\/script></body></html>`);
    w.document.close();
  });
}
