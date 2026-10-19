// curso.js — "Hoy en el curso" (portada), Calendario, Proyecto y Rúbricas.
// Todo sale de data/curso.json, que a su vez se genera desde la planeación
// curricular: si cambia la planeación, se regenera ese archivo y estas
// páginas se actualizan solas.

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const esc = (s) => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };
const md = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');

// Fechas como "AAAA-MM-DD" en hora local (sin desfases por zona horaria).
const aFecha = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const hoyISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; };
const diasEntre = (desde, hasta) => Math.round((aFecha(hasta) - aFecha(desde)) / 86400000);
const fechaLarga = (iso) => { const f = aFecha(iso); return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`; };
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function cargarCurso() {
  const r = await fetch('data/curso.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo cargar el calendario del curso.');
  return r.json();
}

function linksSubtemas(ids) {
  if (!ids || !ids.length) return '';
  return `<div class="chips">${ids.map(id => `<a class="chip-link" href="tema.html?id=${encodeURIComponent(id)}">${esc(id === '1.0' ? 'Introducción' : id)}</a>`).join('')}</div>`;
}

function textoCuenta(dias) {
  if (dias === 0) return ['Hoy', ''];
  if (dias === 1) return ['1', 'día'];
  return [String(dias), 'días'];
}

// ---------------------------------------------------------------- PORTADA
async function renderHoy() {
  const cont = document.getElementById('hoy-en-el-curso');
  if (!cont) return;
  let curso;
  try { curso = await cargarCurso(); } catch { cont.hidden = true; return; }

  const hoy = hoyISO();
  const sesion = curso.sesiones.find(s => s.fecha >= hoy);
  const evento = curso.eventos.find(e => e.fecha >= hoy && ['entrega', 'examen', 'practica'].includes(e.tipo));
  const siguientes = [...curso.sesiones.map(s => ({ fecha: s.fecha, txt: `Sesión ${s.n} · ${s.titulo}` })),
    ...curso.eventos.filter(e => e.tipo !== 'aviso').map(e => ({ fecha: e.fecha, txt: e.titulo }))]
    .filter(x => x.fecha > (sesion ? sesion.fecha : hoy)).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3);

  let principal;
  if (!sesion) {
    principal = `<div class="hoy-card"><p class="hoy-kicker">Curso concluido</p><h2>¡Gracias por este cuatrimestre!</h2><p>Puedes seguir consultando el compendio, la biblioteca y tus calificaciones.</p></div>`;
  } else {
    const esHoy = sesion.fecha === hoy;
    principal = `
      <article class="hoy-card">
        <p class="hoy-kicker">${esHoy ? 'Hoy en clase' : 'Próxima clase'} · Sesión ${sesion.n} de ${curso.sesiones.length}</p>
        <p class="hoy-fecha">${capital(fechaLarga(sesion.fecha))} · ${sesion.horas || 2} ${(sesion.horas || 2) === 1 ? 'hora' : 'horas'}</p>
        <h2>${esc(sesion.titulo)}</h2>
        ${sesion.subtemas.length ? `<p class="hoy-sub">${esHoy ? 'Repasa en el compendio' : 'Lee antes de clase'}</p>${linksSubtemas(sesion.subtemas)}` : ''}
        <p class="hoy-sub">Lo que haremos</p>
        <ul>${sesion.docente.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${sesion.proyecto.length ? `<p class="hoy-sub">Proyecto · ${esc(curso.proyecto.nombre)}</p><ul>${sesion.proyecto.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <div class="hoy-acciones">
          <a class="btn btn-primary btn-sm" href="calendario.html">Ver todo el calendario</a>
          <a class="btn btn-line btn-sm" href="proyecto.html">Ir al proyecto</a>
        </div>
      </article>`;
  }

  let lateral = '';
  if (evento) {
    const [num, unidad] = textoCuenta(diasEntre(hoy, evento.fecha));
    lateral = `
      <aside class="hoy-side">
        <p class="hoy-kicker">${{ examen: 'Próximo examen', practica: 'Próxima práctica de cocina' }[evento.tipo] || 'Próxima entrega'}</p>
        <div class="cuenta"><span class="cuenta-num">${num}</span><span class="cuenta-txt">${unidad ? `${unidad} para` : ''}</span></div>
        <h3>${esc(evento.titulo)}</h3>
        <p>${esc(evento.fechaTexto || capital(fechaLarga(evento.fecha)))}</p>
        ${siguientes.length ? `<ul class="hoy-siguientes">${siguientes.map(s => { const f = aFecha(s.fecha); return `<li><b>${DIAS_CORTOS[f.getDay()]} ${f.getDate()}/${f.getMonth() + 1}</b><span>${esc(s.txt)}</span></li>`; }).join('')}</ul>` : ''}
      </aside>`;
  }
  cont.innerHTML = `<div class="wrap"><div class="hoy-grid">${principal}${lateral}</div></div>`;
}

// ------------------------------------------------------------- CALENDARIO
async function renderCalendario() {
  const cont = document.getElementById('calendario-root');
  if (!cont) return;
  let curso;
  try { curso = await cargarCurso(); } catch (e) { cont.innerHTML = `<p>${esc(e.message)}</p>`; return; }
  const hoy = hoyISO();

  const items = [
    ...curso.sesiones.map(s => ({ ...s, tipo: 'sesion' })),
    ...curso.eventos,
  ].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.tipo === 'sesion' ? -1 : 1));
  const siguiente = items.find(i => i.fecha >= hoy);

  const etiqueta = { sesion: 'Clase', examen: 'Examen', entrega: 'Entrega', practica: 'Práctica', descanso: 'Sin clase', aviso: 'Aviso' };
  let html = '', mesActual = -1;
  items.forEach(it => {
    const f = aFecha(it.fecha);
    if (f.getMonth() !== mesActual) {
      if (mesActual !== -1) html += '</ol>';
      mesActual = f.getMonth();
      html += `<h2 class="cal-mes">${capital(MESES[mesActual])}</h2><ol class="cal-lista">`;
    }
    const clases = ['cal-item', `t-${it.tipo}`];
    if (it.fecha < hoy) clases.push('pasado');
    if (it === siguiente) clases.push('siguiente');
    const titulo = it.tipo === 'sesion' ? `Sesión ${it.n} · ${it.titulo}` : it.titulo;
    let detalle = '';
    if (it.tipo === 'sesion') {
      detalle = `
        ${it.subtemas.length ? linksSubtemas(it.subtemas) : ''}
        <details><summary>Ver el plan de la sesión</summary>
          <h4>En clase</h4><ul>${it.docente.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <h4>Trabajo independiente</h4><ul>${it.independiente.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          ${it.proyecto.length ? `<h4>Proyecto · ${esc(curso.proyecto.nombre)}</h4><ul>${it.proyecto.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <h4>Se evalúa</h4><ul>${it.evaluacion.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        </details>`;
    } else if (it.detalle) {
      detalle = `<p>${esc(it.detalle)}</p>`;
    }
    html += `
      <li class="${clases.join(' ')}" id="${it.tipo === 'sesion' ? `sesion-${it.n}` : `${it.tipo}-${it.fecha}`}">
        <div class="cal-dia"><span class="dsem">${DIAS_CORTOS[f.getDay()]}</span><span class="dnum">${f.getDate()}</span><span class="dmes">${MESES[f.getMonth()].slice(0, 3)}</span></div>
        <div>
          <span class="cal-tipo">${etiqueta[it.tipo] || ''}</span>${it.fecha === hoy ? '<span class="badge-hoy">HOY</span>' : (it === siguiente ? '<span class="badge-hoy">SIGUE</span>' : '')}
          <h3>${esc(titulo)}</h3>
          ${(it.tipo === 'examen' || it.tipo === 'practica') && it.fechaTexto ? `<p><strong>${esc(it.fechaTexto)}</strong></p>` : ''}
          ${detalle}
        </div>
      </li>`;
  });
  html += '</ol>';
  cont.innerHTML = html;
  const marcado = cont.querySelector('.siguiente');
  if (marcado && !location.hash) setTimeout(() => marcado.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
}

// --------------------------------------------------------------- PROYECTO
async function renderProyecto() {
  const cont = document.getElementById('proyecto-root');
  if (!cont) return;
  let curso;
  try { curso = await cargarCurso(); } catch (e) { cont.innerHTML = `<p>${esc(e.message)}</p>`; return; }
  const p = curso.proyecto, hoy = hoyISO();
  const proxima = p.entregas.find(e => e.fecha >= hoy);
  const colores = p.colores || ['#4E7D6A', '#2E5E8C', '#C9A04A'];
  let num = 1;

  cont.innerHTML = `
    <div class="proy-intro">
      <div class="proy-box"><p class="hoy-kicker">De qué se trata</p><p>${esc(p.descripcion)}</p><p><em>${esc(p.lema)}</em></p></div>
      <div class="proy-box proy-peso"><p class="hoy-kicker">Cuánto vale</p><p>${esc(p.peso)}</p>
        <div class="barra-puntos">${p.entregas.map((e, i) => `<span style="flex:${e.puntos};background:${colores[i]}" title="${esc(e.nombre)}"></span>`).join('')}</div>
        <p style="font-size:.85rem">${p.entregas.map((e, i) => `<span style="color:${colores[i]};font-weight:700">■</span> ${esc(e.nombre.split(' · ')[0])}: ${e.puntos} pts`).join(' &nbsp; ')}</p>
      </div>
    </div>
    <div class="entregas">
      ${p.entregas.map((e, i) => {
        const dias = diasEntre(hoy, e.fecha);
        const estado = dias < 0 ? 'Entregada' : (dias === 0 ? '¡Es hoy!' : `Faltan ${dias} día${dias === 1 ? '' : 's'}`);
        return `
        <article class="entrega${e === proxima ? ' proxima' : ''}" style="border-top-color:${colores[i]}">
          <div><span class="pts" style="background:${colores[i]}">${e.puntos} pts</span> <span class="cal-tipo">${estado}</span></div>
          <h3>${esc(e.nombre)}</h3>
          <p class="meta">${esc(e.fechaTexto)}${e.temas ? ` · ${esc(e.temas)}` : ''}</p>
          <p class="req">${esc(e.requisito)}</p>
          <ol start="${num}">${e.preguntas.map(q => { num++; return `<li>${esc(q)}</li>`; }).join('')}</ol>
        </article>`;
      }).join('')}
    </div>
    ${p.ejemplo ? `<section class="ejemplo">
      <h2 style="font-size:1.3rem;margin:0 0 6px">${esc(p.ejemplo.titulo)}</h2>
      <p class="aviso">${esc(p.ejemplo.nota)}</p>
      ${p.ejemplo.respuestas.map(r => `<p class="resp"><b class="n">${r.n}</b>${md(r.texto)}</p>`).join('')}
    </section>` : ''}
    <div class="enlaces-utiles">
      ${(p.enlaces || []).map((l, k) => `<a class="btn ${k === 0 ? 'btn-primary' : 'btn-line'} btn-sm" href="${esc(l.href)}"${l.descarga ? ' download' : ''}>${esc(l.texto)}</a>`).join('\n      ')}
    </div>`;
}

// ---------------------------------------------------------------- RÚBRICAS
async function renderRubricas() {
  const cont = document.getElementById('rubricas-root');
  if (!cont) return;
  let curso;
  try { curso = await cargarCurso(); } catch (e) { cont.innerHTML = `<p>${esc(e.message)}</p>`; return; }
  cont.innerHTML = curso.rubricas.map(r => `
    <section class="rubrica" id="${esc(r.id)}">
      <h2>${esc(r.nombre)}</h2>
      <div class="tabla-wrap"><table class="tabla-rubrica">
        <thead><tr><th>Criterio</th><th class="n3">Excelente (10)</th><th class="n2">Suficiente (7–8)</th><th class="n1">Insuficiente (5 o menos)</th></tr></thead>
        <tbody>${r.criterios.map(c => `<tr>${c.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
    </section>`).join('') +
    `<p class="rubrica-nota">Cada criterio se califica en la escala de su columna y la calificación del producto es el promedio de los criterios. Las rúbricas son públicas para que sepas, antes de entregar, exactamente qué se espera de ti.</p>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderHoy(); renderCalendario(); renderProyecto(); renderRubricas();
});
