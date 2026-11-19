// curso-apa.js — Curso de APA 7 del Aula Virtual (el mismo archivo en Epistemología y en Origen de las Cocinas).
// La página dice qué materia es con data-* en <main id="apa">: data-sesion (clave de la sesión del alumno) y data-materia.
// El avance se guarda en grupos/{g}/alumnos/{a}/atlas/tarea-curso-apa:
//   { lecciones: { l1: { mejor, intentos, aprobada, t } … }, reto: { mejor, intentos, ultimo, t, historial: [...] } }
// El docente lo ve en Panel → Historial → «Curso de APA» y desde ahí puede pasar el Reto final al catálogo.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { LECCIONES, APA_APROBAR, APA_RETO, TIPOS_REF, CAMPOS_REF } from "./curso-apa-datos.js?v=2026111901";

const db = getFirestore(initializeApp(firebaseConfig));
const RAIZ = document.getElementById('apa');
const SESSION_KEY = RAIZ.dataset.sesion, MATERIA = RAIZ.dataset.materia || '';
const DOC_ID = 'tarea-curso-apa';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => esc(s).replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
const slug = n => n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
const barajar = a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };

let sesion = null; try { sesion = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { sesion = null; }
// Vista del docente: curso-apa.html?docente — recorre todo el curso; el avance se guarda solo en este navegador.
const DOCENTE = new URLSearchParams(location.search).has('docente');
if (DOCENTE) sesion = { grupoId: '_docente', alumnoId: 'docente', nombre: 'Docente (vista previa)', pin: '', docente: true };
let P = { lecciones: {}, reto: {} };      // avance del alumno
let relojReto = null;

// ======================================================= acceso
async function cargarGrupos(sel) {
  try { const sn = await getDocs(query(collection(db, 'grupos'), orderBy('nombre'))); sel.innerHTML = '<option value="">— Elige tu grupo —</option>' + sn.docs.map(d => `<option value="${d.id}">${esc(d.data().nombre)}</option>`).join(''); }
  catch { sel.innerHTML = '<option value="">No se pudieron cargar los grupos</option>'; }
}
function pintarAcceso() {
  RAIZ.innerHTML = `<section class="apa-portada">
      <p class="apa-lead">Aprende a citar y a hacer tus referencias como se pide en la universidad: siete lecciones cortas con ejemplos y ejercicios que se califican solos, un generador de referencias y un reto final con constancia.</p>
    </section>
    <div class="ma-login cl-login apa-login"><h3>Entra con tu nombre y PIN</h3>
      <form id="apa-form"><label for="apa-grupo">Tu grupo</label><select id="apa-grupo"><option value="">Cargando grupos…</option></select>
      <label for="apa-nombre">Tu nombre completo</label><input id="apa-nombre" type="text" autocomplete="name" placeholder="Como te registró tu docente">
      <label for="apa-pin">PIN</label><input id="apa-pin" type="text" inputmode="numeric" placeholder="4 dígitos">
      <button type="submit" class="btn-at">Entrar</button><p class="ma-error" id="apa-error" hidden></p></form>
      <p class="apa-nota">¿Solo quieres hacer una referencia? <button type="button" class="apa-link" id="apa-gen-libre">Abre el generador sin entrar</button>.</p></div>`;
  cargarGrupos($('#apa-grupo'));
  $('#apa-gen-libre').addEventListener('click', () => pintarGenerador(true));
  $('#apa-form').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#apa-error'); err.hidden = true;
    const g = $('#apa-grupo').value, n = $('#apa-nombre').value.trim(), pin = $('#apa-pin').value.trim();
    if (!g || !n || !pin) { err.textContent = 'Completa grupo, nombre y PIN.'; err.hidden = false; return; }
    try {
      const id = slug(n), s = await getDoc(doc(db, 'grupos', g, 'alumnos', id));
      if (!s.exists() || String(s.data().pin) !== pin) { err.textContent = 'No encontramos ese nombre y PIN en el grupo elegido. Verifica con tu docente.'; err.hidden = false; return; }
      sesion = { grupoId: g, alumnoId: id, nombre: s.data().nombre, pin };
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion)); } catch { /* */ }
      await arrancar();
    } catch (e2) { err.textContent = 'No se pudo entrar: ' + (e2.message || e2); err.hidden = false; }
  });
}
const refAvance = () => doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', DOC_ID);
async function cargarAvance() {
  if (sesion.docente) P = {};
  else { try { const s = await getDoc(refAvance()); P = s.exists() ? s.data() : {}; } catch { P = {}; } }
  P.lecciones = P.lecciones || {}; P.reto = P.reto || {};
  // Respaldo local por si se cayó el internet al guardar.
  try { const loc = JSON.parse(localStorage.getItem(`apa_${sesion.grupoId}_${sesion.alumnoId}`) || 'null'); if (loc) fusionar(loc); } catch { /* */ }
}
function fusionar(loc) {
  Object.entries(loc.lecciones || {}).forEach(([k, v]) => { const a = P.lecciones[k]; if (!a || (v.mejor || 0) > (a.mejor || 0) || (v.intentos || 0) > (a.intentos || 0)) P.lecciones[k] = { ...a, ...v, mejor: Math.max(v.mejor || 0, (a && a.mejor) || 0), aprobada: !!(v.aprobada || (a && a.aprobada)) }; });
  if (loc.reto && (loc.reto.intentos || 0) > (P.reto.intentos || 0)) P.reto = { ...P.reto, ...loc.reto, mejor: Math.max(loc.reto.mejor || 0, P.reto.mejor || 0) };
}
async function guardar(cambios) {
  if (cambios.lecciones) Object.assign(P.lecciones, cambios.lecciones);
  if (cambios.reto) P.reto = cambios.reto;
  try { localStorage.setItem(`apa_${sesion.grupoId}_${sesion.alumnoId}`, JSON.stringify({ lecciones: P.lecciones, reto: P.reto })); } catch { /* */ }
  if (sesion.docente) return true;
  try {
    await setDoc(refAvance(), { ...cambios, nombre: sesion.nombre, pinVerificado: sesion.pin, aprobadas: LECCIONES.filter(l => (P.lecciones[l.id] || {}).aprobada).length, actualizado: serverTimestamp() }, { merge: true });
    return true;
  } catch { return false; }
}

// ======================================================= menú
const aprobadas = () => LECCIONES.filter(l => (P.lecciones[l.id] || {}).aprobada).length;
const retoAbierto = () => aprobadas() === LECCIONES.length;
function pintarMenu() {
  pararReto();
  const n = aprobadas(), R = P.reto || {};
  RAIZ.innerHTML = `<section class="apa-portada apa-portada-chica">
      <p class="apa-hola">Hola, <b>${esc(sesion.nombre)}</b>. <button type="button" class="apa-link" id="apa-salir">${sesion.docente ? 'Salir de la vista previa' : 'No soy yo'}</button></p>
      <div class="apa-barra" role="progressbar" aria-valuemin="0" aria-valuemax="${LECCIONES.length}" aria-valuenow="${n}"><span style="width:${Math.round(100 * n / LECCIONES.length)}%"></span></div>
      <p class="apa-barra-txt">${n} de ${LECCIONES.length} lecciones aprobadas${n === LECCIONES.length ? ' · ¡ya puedes hacer el Reto final!' : ` · Aprueba cada una con ${Math.round(APA_APROBAR * 100)} % de aciertos.`}</p>
    </section>
    <div class="apa-lecciones">${LECCIONES.map((l, i) => { const e = P.lecciones[l.id] || {}; return `<button type="button" class="apa-lec${e.aprobada ? ' ok' : e.intentos ? ' curso' : ''}" data-lec="${l.id}">
        <span class="apa-lec-num">${e.aprobada ? '✓' : i + 1}</span><span class="apa-lec-ico">${l.ico}</span>
        <span class="apa-lec-txt"><b>${esc(l.titulo)}</b><small>${esc(l.sub)}</small><small class="apa-lec-est">${e.aprobada ? `Aprobada · mejor: ${e.mejor} %` : e.intentos ? `Mejor: ${e.mejor} % · vuelve a intentarlo` : `Unos ${l.min} minutos`}</small></span></button>`; }).join('')}</div>
    <div class="apa-extras">
      <button type="button" class="apa-extra" id="apa-gen"><span>🛠️</span><b>Generador de referencias</b><small>Llena los datos y obtén la referencia y la cita en APA 7, lista para copiar.</small></button>
      <button type="button" class="apa-extra${retoAbierto() ? '' : ' cerrado'}" id="apa-reto"><span>🏆</span><b>Reto final</b><small>${retoAbierto() ? `${APA_RETO.preguntas} preguntas de todo el curso en ${APA_RETO.minutos} minutos.${R.intentos ? ` Tu mejor: ${R.mejor} de 10.` : ''}` : `Se abre al aprobar las ${LECCIONES.length} lecciones.`}</small></button>
      ${(R.mejor || 0) >= APA_RETO.aprobar ? `<button type="button" class="apa-extra" id="apa-const"><span>📜</span><b>Tu constancia</b><small>Descárgala o imprímela en tamaño carta.</small></button>` : ''}
    </div>`;
  $('#apa-salir').addEventListener('click', () => { if (sesion.docente) { location.href = location.pathname; return; } try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ } location.reload(); });
  $$('[data-lec]').forEach(b => b.addEventListener('click', () => pintarLeccion(b.dataset.lec)));
  $('#apa-gen').addEventListener('click', () => pintarGenerador(false));
  $('#apa-reto').addEventListener('click', () => { if (retoAbierto()) pintarReto(); else alert(`El Reto final se abre cuando apruebes las ${LECCIONES.length} lecciones.`); });
  const c = $('#apa-const'); if (c) c.addEventListener('click', pintarConstancia);
  window.scrollTo({ top: 0 });
}

// ======================================================= lección
function seccionHTML(s) {
  if (s.t === 'texto') return `<section class="apa-sec"><h3>${md(s.h)}</h3>${s.p.map(p => `<p>${md(p)}</p>`).join('')}</section>`;
  if (s.t === 'regla' || s.t === 'check') return `<section class="apa-sec${s.t === 'check' ? ' apa-check' : ''}"><h3>${md(s.h)}</h3><ul>${s.items.map(x => `<li>${md(x)}</li>`).join('')}</ul></section>`;
  if (s.t === 'bienmal') return `<section class="apa-sec"><h3>${md(s.h)}</h3><div class="apa-bm"><div class="apa-mal"><h4>✗ Así no</h4><ul>${s.mal.map(x => `<li>${md(x)}</li>`).join('')}</ul></div><div class="apa-bien"><h4>✓ Así sí</h4><ul>${s.bien.map(x => `<li>${md(x)}</li>`).join('')}</ul></div></div></section>`;
  if (s.t === 'tabla') return `<section class="apa-sec"><h3>${md(s.h)}</h3><div class="apa-tabla-wrap"><table class="apa-tabla"><thead><tr>${s.cols.map(c => `<th>${md(c)}</th>`).join('')}</tr></thead><tbody>${s.filas.map(f => `<tr>${f.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  if (s.t === 'formatos') return `<section class="apa-sec"><h3>${md(s.h)}</h3>${s.items.map(([n, f, e]) => `<details class="apa-fmt"><summary>${esc(n)}</summary><p class="apa-fmt-l">Formato</p><p class="apa-ref">${md(f)}</p><p class="apa-fmt-l">Ejemplo</p><p class="apa-ref">${md(e)}</p></details>`).join('')}</section>`;
  if (s.t === 'ejemplo') return `<section class="apa-sec"><h3>${md(s.h)}</h3><div class="apa-lista-ej"><p class="apa-lista-tit">Referencias</p>${s.lineas.map(x => `<p class="apa-ref">${md(x)}</p>`).join('')}</div></section>`;
  return '';
}
function pintarLeccion(id) {
  const L = LECCIONES.find(x => x.id === id), i = LECCIONES.indexOf(L), e = P.lecciones[id] || {};
  RAIZ.innerHTML = `<nav class="apa-nav"><button type="button" class="apa-link" id="apa-volver">← Todas las lecciones</button></nav>
    <header class="apa-lec-cab"><p class="apa-kicker">Lección ${i + 1} de ${LECCIONES.length}</p><h2>${L.ico} ${esc(L.titulo)}</h2><p>${esc(L.sub)}</p></header>
    ${L.secciones.map(seccionHTML).join('')}
    <section class="apa-practica" id="apa-practica"><h3>✏️ Practica</h3><p>${L.ejercicios.length} ejercicios. Aprueba con ${Math.round(APA_APROBAR * 100)} % de aciertos.${e.intentos ? ` Tu mejor resultado: <b>${e.mejor} %</b>.` : ''}</p><button type="button" class="btn-at" id="apa-empezar">${e.intentos ? 'Practicar otra vez' : 'Empezar los ejercicios'}</button></section>`;
  $('#apa-volver').addEventListener('click', pintarMenu);
  $('#apa-empezar').addEventListener('click', () => practicar(L));
  window.scrollTo({ top: 0 });
}

// Un ejercicio en un contenedor; llama a listo(acierto) cuando el alumno responde.
function ejercicio(cont, E, listo) {
  let resuelto = false;
  const fin = ok => {
    if (resuelto) return; resuelto = true;
    cont.insertAdjacentHTML('beforeend', `<div class="apa-fb ${ok ? 'ok' : 'no'}"><b>${ok ? '✓ ¡Bien!' : '✗ No exactamente.'}</b> ${md(E.x || '')}</div>`);
    listo(ok);
  };
  if (E.tipo === 'opcion' || E.tipo === 'vf') {
    const ops = E.tipo === 'vf' ? [['Verdadero', E.v === true], ['Falso', E.v === false]] : barajar(E.o.map((t, k) => [t, k === E.c]));
    cont.innerHTML = `<p class="apa-q">${md(E.q)}</p><div class="apa-ops${E.tipo === 'vf' ? ' vf' : ''}">${ops.map(([t, ok], k) => `<button type="button" class="apa-op" data-k="${k}">${md(t)}</button>`).join('')}</div>`;
    $$('.apa-op', cont).forEach(b => b.addEventListener('click', () => {
      if (resuelto) return; const ok = ops[+b.dataset.k][1];
      b.classList.add(ok ? 'bien' : 'mal'); if (!ok) $$('.apa-op', cont).forEach(x => { if (ops[+x.dataset.k][1]) x.classList.add('bien'); });
      $$('.apa-op', cont).forEach(x => { x.disabled = true; }); fin(ok);
    }));
  } else if (E.tipo === 'error') {
    cont.innerHTML = `<p class="apa-q">${md(E.q)}</p><div class="apa-partes">${E.partes.map((t, k) => `<button type="button" class="apa-parte" data-k="${k}">${md(t)}</button>`).join(' ')}</div>`;
    $$('.apa-parte', cont).forEach(b => b.addEventListener('click', () => {
      if (resuelto) return; const ok = +b.dataset.k === E.mal;
      b.classList.add(ok ? 'bien' : 'mal'); if (!ok) $$('.apa-parte', cont)[E.mal].classList.add('bien');
      $$('.apa-parte', cont).forEach(x => { x.disabled = true; }); fin(ok);
    }));
  } else if (E.tipo === 'ordenar') {
    const orden = barajar(E.partes.map((t, k) => k)); let elegidas = [];
    const pintar = () => {
      cont.innerHTML = `<p class="apa-q">${md(E.q)}</p><p class="apa-ayuda-ord">Toca las partes en el orden correcto.</p>
        <div class="apa-armado">${elegidas.length ? elegidas.map(k => `<span class="apa-pieza">${md(E.partes[k])}</span>`).join(' ') : '<span class="apa-vacio">Aquí se va armando…</span>'}</div>
        <div class="apa-partes">${orden.filter(k => !elegidas.includes(k)).map(k => `<button type="button" class="apa-parte" data-k="${k}">${md(E.partes[k])}</button>`).join(' ')}</div>
        ${elegidas.length ? '<button type="button" class="apa-link" id="apa-reini">↺ Empezar de nuevo</button>' : ''}`;
      $$('.apa-parte', cont).forEach(b => b.addEventListener('click', () => { elegidas.push(+b.dataset.k); if (elegidas.length === E.partes.length) revisar(); else pintar(); }));
      const r = $('#apa-reini', cont); if (r) r.addEventListener('click', () => { elegidas = []; pintar(); });
    };
    const revisar = () => {
      const ok = elegidas.every((k, i) => k === i);
      cont.innerHTML = `<p class="apa-q">${md(E.q)}</p><div class="apa-armado ${ok ? 'bien' : 'mal'}">${elegidas.map(k => `<span class="apa-pieza">${md(E.partes[k])}</span>`).join(' ')}</div>
        ${ok ? '' : `<p class="apa-fmt-l">Así va:</p><div class="apa-armado bien">${E.partes.map(t => `<span class="apa-pieza">${md(t)}</span>`).join(' ')}</div>`}`;
      fin(ok);
    };
    pintar();
  }
}

function practicar(L) {
  const lista = barajar(L.ejercicios); let i = 0, bien = 0;
  const caja = $('#apa-practica');
  const paso = () => {
    caja.innerHTML = `<h3>✏️ Practica · ${i + 1} de ${lista.length}</h3><div class="apa-ej" id="apa-ej"></div><div class="apa-sig-wrap"><button type="button" class="btn-at" id="apa-sig" hidden>${i < lista.length - 1 ? 'Siguiente →' : 'Ver mi resultado'}</button></div>`;
    ejercicio($('#apa-ej'), lista[i], ok => { if (ok) bien++; $('#apa-sig').hidden = false; $('#apa-sig').focus(); });
    $('#apa-sig').addEventListener('click', () => { i++; if (i < lista.length) paso(); else terminar(); });
    caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const terminar = async () => {
    const pct = Math.round(100 * bien / lista.length), ap = pct >= APA_APROBAR * 100, e = P.lecciones[L.id] || {};
    const nuevo = { mejor: Math.max(pct, e.mejor || 0), intentos: (e.intentos || 0) + 1, aprobada: !!(e.aprobada || ap), ultimo: pct, t: Date.now() };
    P.lecciones[L.id] = nuevo;
    const okNube = await guardar({ lecciones: { [L.id]: nuevo } });
    const sig = LECCIONES[LECCIONES.indexOf(L) + 1];
    caja.innerHTML = `<div class="apa-resultado ${ap ? 'ok' : 'no'}"><p class="apa-res-num">${bien} de ${lista.length}</p><p class="apa-res-pct">${pct} %</p>
      <p>${ap ? '¡Lección aprobada! 🎉' : `Te faltó poco: necesitas ${Math.round(APA_APROBAR * 100)} %. Repasa la lección y vuelve a intentarlo.`}</p>
      ${okNube ? '' : '<p class="apa-nota">⚠️ No se pudo guardar en línea; quedó guardado en este celular. Vuelve a entrar cuando tengas internet.</p>'}
      <div class="apa-res-bot">${ap && sig ? `<button type="button" class="btn-at" id="apa-sigl">Siguiente lección: ${esc(sig.titulo)} →</button>` : ''}<button type="button" class="btn-at btn-sec" id="apa-otra">Practicar otra vez</button><button type="button" class="apa-link" id="apa-menu">Volver al curso</button></div></div>`;
    const s = $('#apa-sigl'); if (s) s.addEventListener('click', () => pintarLeccion(sig.id));
    $('#apa-otra').addEventListener('click', () => practicar(L));
    $('#apa-menu').addEventListener('click', pintarMenu);
  };
  paso();
}

// ======================================================= reto final
function pararReto() { if (relojReto) { clearInterval(relojReto); relojReto = null; } }
function pintarReto() {
  const todos = LECCIONES.flatMap(l => l.ejercicios.map(e => ({ ...e, lec: l.id })));
  // Reparto parejo: primero uno de cada lección, luego al azar.
  const porLec = LECCIONES.map(l => barajar(todos.filter(e => e.lec === l.id)));
  let lista = []; for (let r = 0; lista.length < APA_RETO.preguntas && r < 20; r++) porLec.forEach(g => { if (g[r] && lista.length < APA_RETO.preguntas) lista.push(g[r]); });
  lista = barajar(lista);
  let i = 0, bien = 0; const fin = Date.now() + APA_RETO.minutos * 60000;
  RAIZ.innerHTML = `<nav class="apa-nav"><button type="button" class="apa-link" id="apa-abandonar">← Salir del reto</button><span class="apa-reloj" id="apa-reloj"></span></nav>
    <header class="apa-lec-cab"><p class="apa-kicker">Reto final</p><h2>🏆 ${APA_RETO.preguntas} preguntas de todo el curso</h2><p>Necesitas ${APA_RETO.aprobar} de 10 para obtener tu constancia. Puedes intentarlo las veces que quieras: cuenta tu mejor resultado.</p></header>
    <section class="apa-practica" id="apa-practica"></section>`;
  $('#apa-abandonar').addEventListener('click', () => { if (confirm('¿Salir del reto? Este intento no contará.')) pintarMenu(); });
  const reloj = () => { const s = Math.max(0, Math.round((fin - Date.now()) / 1000)); $('#apa-reloj').textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s <= 0) terminar(true); };
  relojReto = setInterval(reloj, 1000); reloj();
  const caja = $('#apa-practica');
  const paso = () => {
    caja.innerHTML = `<h3>Pregunta ${i + 1} de ${lista.length}</h3><div class="apa-ej" id="apa-ej"></div><div class="apa-sig-wrap"><button type="button" class="btn-at" id="apa-sig" hidden>${i < lista.length - 1 ? 'Siguiente →' : 'Terminar'}</button></div>`;
    ejercicio($('#apa-ej'), lista[i], ok => { if (ok) bien++; $('#apa-sig').hidden = false; });
    $('#apa-sig').addEventListener('click', () => { i++; if (i < lista.length) paso(); else terminar(false); });
  };
  let terminado = false;
  const terminar = async porTiempo => {
    if (terminado) return; terminado = true; pararReto();
    const cal = Math.round(100 * bien / lista.length) / 10, R = P.reto || {};
    const nuevo = { mejor: Math.max(cal, R.mejor || 0), intentos: (R.intentos || 0) + 1, ultimo: cal, t: Date.now(), historial: [...(R.historial || []), { cal, t: Date.now() }].slice(-20) };
    P.reto = nuevo;
    const okNube = await guardar({ reto: nuevo });
    caja.innerHTML = `<div class="apa-resultado ${cal >= APA_RETO.aprobar ? 'ok' : 'no'}">${porTiempo ? '<p>⏱ Se acabó el tiempo.</p>' : ''}<p class="apa-res-num">${bien} de ${lista.length}</p><p class="apa-res-pct">${cal} de 10</p>
      <p>${cal >= APA_RETO.aprobar ? '¡Aprobaste el Curso de APA! 🎓' : `Necesitas ${APA_RETO.aprobar} de 10. Repasa las lecciones donde fallaste y vuelve a intentarlo.`}</p>
      ${okNube ? '' : '<p class="apa-nota">⚠️ No se pudo guardar en línea; quedó guardado en este celular.</p>'}
      <div class="apa-res-bot">${cal >= APA_RETO.aprobar || (nuevo.mejor >= APA_RETO.aprobar) ? '<button type="button" class="btn-at" id="apa-c2">📜 Ver mi constancia</button>' : ''}<button type="button" class="btn-at btn-sec" id="apa-r2">Intentar otra vez</button><button type="button" class="apa-link" id="apa-menu">Volver al curso</button></div></div>`;
    const c = $('#apa-c2'); if (c) c.addEventListener('click', pintarConstancia);
    $('#apa-r2').addEventListener('click', pintarReto);
    $('#apa-menu').addEventListener('click', pintarMenu);
  };
  paso();
}

// ======================================================= constancia
function pintarConstancia() {
  const R = P.reto || {}, f = new Date(R.t || Date.now()).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  RAIZ.innerHTML = `<nav class="apa-nav no-imprimir"><button type="button" class="apa-link" id="apa-volver">← Volver al curso</button><button type="button" class="btn-at" id="apa-imp">🖨️ Imprimir o guardar en PDF</button></nav>
    <article class="apa-constancia">
      <img src="assets/escudo.png" alt="" class="apa-c-escudo" onerror="this.remove()">
      <p class="apa-c-inst">ITES René Descartes</p>
      <p class="apa-c-materia">${esc(MATERIA)} · Aula Virtual</p>
      <h1>Constancia</h1>
      <p>Se hace constar que</p>
      <p class="apa-c-nombre">${esc(sesion.nombre)}</p>
      <p>aprobó el <b>Curso de APA 7</b>: citas en el texto, cita textual y paráfrasis, referencias, lista de referencias, formato del trabajo y verificación de fuentes, con una calificación de <b>${R.mejor} de 10</b> en el Reto final.</p>
      <p class="apa-c-fecha">${esc(f)}</p>
      <div class="apa-c-firma"><span></span><p>Mtro. Jesús Rodríguez García<br>Docente</p></div>
    </article>`;
  $('#apa-volver').addEventListener('click', pintarMenu);
  $('#apa-imp').addEventListener('click', () => window.print());
  window.scrollTo({ top: 0 });
}

// ======================================================= generador de referencias
const ini = nombres => String(nombres || '').trim().split(/\s+/).filter(Boolean).map(w => w.split('-').map(p => p[0] ? p[0].toUpperCase() + '.' : '').join('-')).join(' ');
function autorAPA(linea) {           // «Kuhn, Thomas S.» → «Kuhn, T. S.»; sin coma se deja igual (institución)
  const [ap, no] = String(linea).split(',').map(x => x.trim());
  return no ? `${ap}, ${ini(no)}` : ap;
}
function autoresAPA(texto) {
  const L = String(texto || '').split('\n').map(x => x.trim()).filter(Boolean).map(autorAPA);
  if (!L.length) return '';
  if (L.length === 1) return L[0];
  if (L.length <= 20) return L.slice(0, -1).join(', ') + ', y ' + L[L.length - 1];
  return L.slice(0, 19).join(', ') + ', … ' + L[L.length - 1];
}
const apellidos = texto => String(texto || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => x.split(',')[0].trim());
function editoresAPA(texto) {        // «Uc, Rosa» → «R. Uc»
  const L = String(texto || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => { const [ap, no] = x.split(',').map(y => y.trim()); return no ? `${ini(no)} ${ap}` : ap; });
  if (!L.length) return '';
  return (L.length === 1 ? L[0] : L.slice(0, -1).join(', ') + ' y ' + L[L.length - 1]) + (L.length > 1 ? ' (Eds.)' : ' (Ed.)');
}
const conPunto = s => (/[.?!]$/.test(s) ? s : s + '.');
const doiURL = d => { d = String(d || '').trim(); if (!d) return ''; if (/^https?:\/\//i.test(d)) return d.replace(/\.$/, ''); return 'https://doi.org/' + d.replace(/^doi:\s*/i, '').replace(/\.$/, ''); };
function construir(tipo, v) {
  const anio = (v.anio || '').trim() || 's. f.', A = autoresAPA(v.autores), url = (v.url || '').trim();
  const aut = s => (s ? conPunto(s) + ' ' : '');
  let r = '';
  if (tipo === 'libro') {
    const extra = [v.edicion ? `${v.edicion.replace(/\D/g, '')}.ª ed.` : '', v.traductor ? `${ini(v.traductor.split(' ').slice(0, 1).join(' '))} ${v.traductor.split(' ').slice(1).join(' ')}, Trad.`.trim() : ''].filter(Boolean).join('; ');
    r = `${aut(A)}(${anio}). *${(v.titulo || 'Título del libro').trim()}*${extra ? ` (${extra})` : ''}. ${conPunto((v.editorial || 'Editorial').trim())}${url ? ' ' + url : ''}${v.original ? ` (Obra original publicada en ${v.original.trim()}).` : ''}`;
  } else if (tipo === 'capitulo') {
    r = `${aut(A)}(${anio}). ${conPunto((v.capitulo || 'Título del capítulo').trim())} En ${editoresAPA(v.editores) || 'A. Editor (Ed.)'}, *${(v.titulo || 'Título del libro').trim()}*${v.paginas ? ` (pp. ${v.paginas.trim()})` : ''}. ${conPunto((v.editorial || 'Editorial').trim())}${url ? ' ' + url : ''}`;
  } else if (tipo === 'articulo') {
    r = `${aut(A)}(${anio}). ${conPunto((v.capitulo || 'Título del artículo').trim())} *${(v.revista || 'Nombre de la revista').trim()}*${v.volumen ? `, *${v.volumen.trim()}*` : ''}${v.numero ? `(${v.numero.trim()})` : ''}${v.paginas ? `, ${v.paginas.trim()}` : ''}.${v.doi ? ' ' + doiURL(v.doi) : ''}`;
  } else if (tipo === 'institucion') {
    r = `${aut((v.institucion || 'Institución').trim())}(${anio}). *${(v.titulo || 'Título del documento').trim()}*.${url ? ' ' + url : ''}`;
  } else if (tipo === 'web') {
    const sitio = (v.sitio || '').trim();
    r = `${aut(A || 'Autor u organización')}(${(v.fecha || '').trim() || 's. f.'}). *${(v.titulo || 'Título de la página').trim()}*.${sitio ? ' ' + conPunto(sitio) : ''}${url ? ' ' + url : ''}`;
  } else if (tipo === 'tesis') {
    r = `${aut(A)}(${anio}). *${(v.titulo || 'Título de la tesis').trim()}* [${(v.grado || 'Tesis de licenciatura').trim()}, ${(v.universidad || 'Institución').trim()}].${v.repositorio ? ' ' + conPunto(v.repositorio.trim()) : ''}${url ? ' ' + url : ''}`;
  } else if (tipo === 'video') {
    r = `${aut((v.canal || 'Canal').trim())}(${(v.fecha || '').trim() || 's. f.'}). *${(v.titulo || 'Título del video').trim()}* [Video]. YouTube.${url ? ' ' + url : ''}`;
  } else if (tipo === 'ia') {
    r = `${aut((v.empresa || 'Empresa').trim())}(${anio}). *${(v.herramienta || 'Herramienta').trim()}*${v.version ? ` (${v.version.trim()})` : ''} [Modelo de lenguaje extenso].${url ? ' ' + url : ''}`;
  }
  // La cita en el texto.
  const ap = tipo === 'institucion' ? [(v.institucion || 'Institución').trim()] : tipo === 'video' ? [(v.canal || 'Canal').trim()] : tipo === 'ia' ? [(v.empresa || 'Empresa').trim()] : apellidos(v.autores);
  const quien = !ap.length ? 'Autor' : ap.length === 1 ? ap[0] : ap.length === 2 ? `${ap[0]} y ${ap[1]}` : `${ap[0]} et al.`;
  const an = (tipo === 'web' || tipo === 'video') ? (((v.fecha || '').match(/\d{4}/) || [''])[0] || 's. f.') : anio;
  const anTxt = v.original && tipo === 'libro' ? `${v.original.trim()}/${an}` : an;
  return { ref: r, par: `(${quien}, ${anTxt})`, nar: `${quien} (${anTxt})` };
}
const htmlRef = r => esc(r).replace(/\*([^*]+)\*/g, '<i>$1</i>');
async function copiar(r, btn, formato) {
  const plano = formato === 'taller' ? r : r.replace(/\*/g, '');
  try {
    if (formato !== 'taller' && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([`<span style="font-family:'Times New Roman';font-size:12pt">${htmlRef(r)}</span>`], { type: 'text/html' }), 'text/plain': new Blob([plano], { type: 'text/plain' }) })]);
    else await navigator.clipboard.writeText(plano);
    const t = btn.textContent; btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = t; }, 1600);
  } catch { prompt('Copia la referencia:', plano); }
}
function pintarGenerador(libre) {
  pararReto();
  let tipo = 'libro'; const v = {};
  RAIZ.innerHTML = `<nav class="apa-nav"><button type="button" class="apa-link" id="apa-volver">← ${libre ? 'Volver' : 'Volver al curso'}</button></nav>
    <header class="apa-lec-cab"><p class="apa-kicker">Herramienta</p><h2>🛠️ Generador de referencias APA 7</h2><p>Elige el tipo de fuente y llena los datos tal como aparecen en la obra. Revisa siempre el resultado: el generador acomoda, pero no sabe si la obra existe.</p></header>
    <div class="apa-gen"><div class="apa-tipos">${TIPOS_REF.map(t => `<button type="button" class="apa-tipo${t.id === tipo ? ' on' : ''}" data-tipo="${t.id}">${esc(t.n)}</button>`).join('')}</div>
      <form class="apa-campos" id="apa-campos" onsubmit="return false"></form>
      <div class="apa-salida"><p class="apa-fmt-l">En tu lista de referencias</p><p class="apa-ref" id="apa-ref"></p>
        <div class="apa-copiar"><button type="button" class="btn-at" id="apa-cw">Copiar para Word</button><button type="button" class="btn-at btn-sec" id="apa-ct" title="Con *asteriscos* para las cursivas, como pide la plataforma">Copiar para el Taller</button></div>
        <p class="apa-fmt-l">En el texto</p><p class="apa-cita" id="apa-cita"></p></div></div>`;
  $('#apa-volver').addEventListener('click', () => (libre && !sesion ? pintarAcceso() : pintarMenu()));
  const campos = () => {
    const T = TIPOS_REF.find(x => x.id === tipo);
    $('#apa-campos').innerHTML = T.campos.map(k => { const [n, a, kind] = CAMPOS_REF[k]; return `<label class="apa-campo"><span><b>${esc(n)}</b><small>${esc(a)}</small></span>${kind === 'textarea' ? `<textarea data-c="${k}" rows="3">${esc(v[k] || '')}</textarea>` : `<input data-c="${k}" type="text" value="${esc(v[k] || '')}">`}</label>`; }).join('');
    $$('[data-c]').forEach(x => x.addEventListener('input', () => { v[x.dataset.c] = x.value; salida(); }));
    salida();
  };
  let actual = { ref: '' };
  const salida = () => { actual = construir(tipo, v); $('#apa-ref').innerHTML = htmlRef(actual.ref); $('#apa-cita').innerHTML = `Entre paréntesis: <b>${esc(actual.par)}</b><br>Narrativa: <b>${esc(actual.nar)}</b>${tipo === 'libro' && v.original ? '<br><small>Los dos años juntos van solo en el texto; en la lista va uno.</small>' : ''}`; };
  $$('.apa-tipo').forEach(b => b.addEventListener('click', () => { tipo = b.dataset.tipo; $$('.apa-tipo').forEach(x => x.classList.toggle('on', x === b)); campos(); }));
  $('#apa-cw').addEventListener('click', e => copiar(actual.ref, e.target, 'word'));
  $('#apa-ct').addEventListener('click', e => copiar(actual.ref, e.target, 'taller'));
  campos();
  window.scrollTo({ top: 0 });
}

// ======================================================= inicio
async function arrancar() {
  RAIZ.innerHTML = '<p class="apa-cargando">Cargando tu avance…</p>';
  await cargarAvance(); pintarMenu();
}
if (sesion) arrancar(); else pintarAcceso();

// Para pruebas: la función que arma las referencias.
export { construir };
