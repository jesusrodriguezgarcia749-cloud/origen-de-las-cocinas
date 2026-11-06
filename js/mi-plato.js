// mi-plato.js — Taller de «Mi Plato, Mi Historia».
// El alumno entra con grupo, nombre y PIN y escribe su ficha pregunta por pregunta: primero
// contesta los puntos de «Ahora hazla tuya» y la plataforma los junta en su respuesta, que él corrige.
// Puede subir el Word de su Entrega 1 y la plataforma acomoda cada respuesta en su pregunta.
// Todo se guarda solo en grupos/{grupo}/alumnos/{alumno}/investigacion/mi-plato (y una copia en el navegador).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { palabras, tieneCita, numsDe, refsDe, estadoEntrega, huella, gramas, porcentajeCopia, fechasApertura, wordMiPlato, ORDEN } from "./mi-plato-word.js?v=2026102901";
import { leerArchivo, parrafosTexto, acomodar } from "./leer-entrega.js?v=2026102901";

const db = getFirestore(initializeApp(firebaseConfig));
const SESSION_KEY = 'oc_sesion_alumno';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const conCursivas = s => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>');
const slug = n => n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fechaLarga = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
const NUM = ['①', '②', '③', '④'];

let D = null, sesion = null, T = null, timer = null, entSel = 'entrega1', APERTURA = {}, COMP = {}, IMPORT = null;
const G = {}; // gramas del compendio por pregunta (para detectar texto copiado)

// ======================================================= acceso
async function cargarGrupos() {
  const s = $('#t-grupo');
  try {
    const snap = await getDocs(query(collection(db, 'grupos'), orderBy('nombre')));
    s.innerHTML = '<option value="">— Elige tu grupo —</option>';
    snap.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.data().nombre; s.appendChild(o); });
  } catch { s.innerHTML = '<option value="">No se pudieron cargar los grupos</option>'; }
}
$('#t-form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#t-error'); err.hidden = true;
  const grupoId = $('#t-grupo').value, nombre = $('#t-nombre').value.trim(), pin = $('#t-pin').value.trim();
  if (!grupoId || !nombre || !pin) { err.textContent = 'Completa grupo, nombre y PIN.'; err.hidden = false; return; }
  try {
    const alumnoId = slug(nombre);
    const snap = await getDoc(doc(db, 'grupos', grupoId, 'alumnos', alumnoId));
    if (!snap.exists() || String(snap.data().pin) !== pin) { err.textContent = 'No encontramos ese nombre y PIN en el grupo elegido. Verifica con tu docente.'; err.hidden = false; return; }
    // El PIN se guarda tal como está en su ficha (texto o número): así la regla de Firestore siempre coincide.
    sesion = { grupoId, alumnoId, nombre: snap.data().nombre, pin: snap.data().pin };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion)); } catch { /* */ }
    entrar();
  } catch (e2) { err.textContent = 'No se pudo entrar: ' + (e2.message || e2); err.hidden = false; }
});
$('#t-sin-cuenta').addEventListener('click', () => { sesion = { anon: true, nombre: 'invitado' }; entrar(); });
$('#t-salir').addEventListener('click', async () => { await guardarYa(); try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ } location.reload(); });

const claveLocal = () => sesion.anon ? 'miplato_invitado' : `miplato_${sesion.grupoId}_${sesion.alumnoId}`;
const vacio = () => ({ platillo: '', respuestas: {}, pasos: {}, ir: {}, refs: { libro: true, lista: [], otras: '' }, entregado: {}, copia: {}, importado: null });

async function entrar() {
  $('#t-acceso').hidden = true; $('#t-app').hidden = false;
  $('#t-quien').textContent = sesion.anon ? 'invitado (sin cuenta)' : sesion.nombre;
  let curso;
  [D, curso] = await Promise.all([fetch('data/mi-plato.json?v=2026102901').then(r => r.json()), fetch('data/curso.json').then(r => r.json())]);
  APERTURA = fechasApertura(curso);
  let local = null; try { local = JSON.parse(lsGet(claveLocal()) || 'null'); } catch { local = null; }
  let remoto = null;
  if (!sesion.anon) {
    try { const s = await getDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'investigacion', 'mi-plato')); if (s.exists()) remoto = s.data().datos || null; }
    catch { /* sin conexión: se usa la copia local */ }
  }
  const t = x => (x && x._t) || 0;
  const subirLocal = !sesion.anon && local && t(local) > t(remoto);   // trabajó sin que se subiera: se sube ahora
  T = Object.assign(vacio(), (t(local) > t(remoto) ? local : remoto) || local || remoto || {});
  T.refs = Object.assign({ libro: true, lista: [], otras: '' }, T.refs || {});
  estado(sesion.anon ? 'Se guarda solo en este dispositivo' : 'Tu avance se guarda en tu cuenta');
  if (subirLocal) { estado('Subiendo a tu cuenta el avance que estaba solo en este dispositivo…'); guardarYa(); }
  // Abre en la entrega que toca según el calendario (la Entrega 1 ya se entregó en papel el 15 de octubre).
  entSel = entregaEnCurso();
  pintarTodo();
  cargarCompendio();
}
// El compendio se carga aparte: solo sirve para avisar si una respuesta está copiada.
async function cargarCompendio() {
  try {
    const bl = await Promise.all([1, 2, 3, 4].map(i => fetch(`data/bloque${i}.json`).then(r => r.json())));
    bl.forEach(b => b.subtemas.forEach(s => { COMP[s.id] = (s.contenido || []).map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); }));
    const cuerpo = $('#e1-checks'); if (cuerpo && cuerpo._checks) cuerpo._checks();
  } catch { /* sin compendio no se revisa la copia */ }
}
function gramasDe(n) {
  if (G[n]) return G[n];
  if (!Object.keys(COMP).length) return null;
  const p = D.preguntas.find(x => x.n === n), ids = p.temas.length ? p.temas : Object.keys(COMP);
  return (G[n] = gramas(ids.map(id => COMP[id] || '').join(' ')));
}
const copiaDe = n => { const g = gramasDe(n); return g ? porcentajeCopia(T.respuestas[n], g) : 0; };

// ======================================================= guardado
function estado(t, clase = '') { const e = $('#t-estado'); e.textContent = t; e.className = 't-estado ' + clase; }
function cambio() {
  T._t = Date.now(); lsSet(claveLocal(), JSON.stringify(T));
  estado('Guardando…'); clearTimeout(timer); timer = setTimeout(guardarYa, 1200);
}
const hecha = n => palabras(T.respuestas[n]) >= D.minPalabras;
function avance() {
  const a = {}; ORDEN.forEach(k => { a[k] = numsDe(D, k).filter(hecha).length; });
  a.palabras = D.preguntas.reduce((s, p) => s + palabras(T.respuestas[p.n]), 0);
  return a;
}
async function guardarYa() {
  clearTimeout(timer); timer = null;
  if (!T) return;
  if (sesion.anon) { estado('Guardado en este dispositivo ✓', 'ok'); return; }
  try {
    await setDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'investigacion', 'mi-plato'), {
      pinVerificado: sesion.pin, nombre: sesion.nombre, datos: T, platillo: T.platillo || '', avance: avance(), actualizado: serverTimestamp()
    });
    estado('Guardado en tu cuenta ✓', 'ok');
    pendiente = false; clearTimeout(reintento);
  } catch (e) {
    // No se perdió nada: sigue en este dispositivo. Se reintenta solo y se explica por qué falló.
    pendiente = true; clearTimeout(reintento); reintento = setTimeout(guardarYa, 20000);
    const cod = (e && e.code) || '';
    const porque = cod === 'permission-denied'
      ? 'Tu cuenta no aceptó el guardado: quizá tu PIN o tu nombre cambiaron. Toca «Salir», vuelve a entrar con tu nombre y PIN, y se subirá solo.'
      : cod === 'resource-exhausted' ? 'Tu proyecto es demasiado grande para guardarse. Avísale a tu maestro.'
      : 'No hay conexión con tu cuenta. Se vuelve a intentar sola cada 20 segundos.';
    estado(`⚠️ Guardado solo en este dispositivo. ${porque} No cierres esta computadora sin que diga «Guardado en tu cuenta ✓».`, 'mal');
    const b = document.createElement('button'); b.type = 'button'; b.className = 't-reintentar'; b.textContent = '↻ Reintentar ahora';
    b.addEventListener('click', () => { estado('Guardando…'); guardarYa(); });
    $('#t-estado').appendChild(b);
  }
}
let pendiente = false, reintento = null;
window.addEventListener('online', () => { if (pendiente) guardarYa(); });
window.addEventListener('beforeunload', e => { if (timer || pendiente) { guardarYa(); if (pendiente) { e.preventDefault(); e.returnValue = ''; } } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) guardarYa(); });

// ======================================================= apertura por calendario
const abierta = n => D.abrirTodas || !APERTURA[n] || hoyISO() >= APERTURA[n];

// ======================================================= pantalla
function pintarTodo() {
  const c = $('#t-etapa');
  c.innerHTML = `<section class="mp-platillo">
      <label class="e1-sub"><span><b>🍽️ Mi platillo</b><small>El que elegiste al inicio del cuatrimestre. Aparece en el título de tu ficha.</small></span>
        <input id="mp-plat" type="text" maxlength="90" placeholder="Por ejemplo: cochinita pibil" value="${esc(T.platillo)}"></label>
      <div class="mp-import-cta">
        <p><b>📥 ¿Ya tienes tu Entrega 1 en Word?</b> Súbela y la plataforma acomoda cada respuesta en su pregunta. Después solo revisas que todo quedó en su lugar.${T.importado ? ` <span class="t-entregada">✓ Subiste tu Entrega 1 el ${new Date(T.importado.t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>` : ''}</p>
        <div class="mp-import-btns"><label class="btn-lab mp-file">📄 Subir mi Word (.docx)<input type="file" id="mp-file" accept=".docx,.txt"></label>
        <button type="button" class="btn-lab-l" id="mp-pegar">📋 Mejor pego el texto</button></div>
        <p class="t-error" id="mp-import-err" hidden></p>
      </div>
      <div id="mp-import"></div>
    </section>
    <h3 class="mp-h3">Tu ficha tiene tres partes</h3>
    <p class="lab-ayuda">Son las tres entregas de «Mi Plato, Mi Historia». Toca una para trabajar sus preguntas. Las preguntas de cada entrega se van abriendo conforme las vemos en clase.</p>
    <div class="mp-pasos" id="c-ent">${ORDEN.map(tarjetaEntrega).join('')}</div>
    <div id="c-lista"></div>`;
  $('#mp-plat').addEventListener('input', e => { T.platillo = e.target.value; cambio(); const ck = $('#e1-checks'); if (ck && ck._checks) ck._checks(); });
  $('#mp-file').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) await importar(() => leerArchivo(f)); });
  $('#mp-pegar').addEventListener('click', pintarPegar);
  $$('#c-ent .mp-paso').forEach(b => b.addEventListener('click', () => { entSel = b.dataset.e; $$('#c-ent .mp-paso').forEach(x => x.setAttribute('aria-pressed', String(x === b))); pintarGuiada(); $('#c-lista').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  pintarGuiada();
}
// ---- Las tres partes de la ficha, como pasos: cuál ya pasó, cuál está en curso y cuál viene después
const LIMITE = { entrega1: '2026-10-15', entrega2: '2026-11-27', entregaFinal: '2026-12-04' };
const entregaEnCurso = () => { const h = hoyISO(); return h <= LIMITE.entrega1 ? 'entrega1' : h <= LIMITE.entrega2 ? 'entrega2' : 'entregaFinal'; };
function tarjetaEntrega(k, i) {
  const ns = numsDe(D, k), h = ns.filter(hecha).length, ab = ns.filter(abierta), cur = entregaEnCurso(), idx = ORDEN.indexOf(k), idxCur = ORDEN.indexOf(cur);
  const etapa = idx < idxCur ? 'pasada' : idx === idxCur ? 'actual' : 'futura';
  const est = estadoEntrega(T, D, k);
  const tag = etapa === 'pasada' ? (h === ns.length ? '✅ Ya en tu ficha' : '📥 Pásala a tu ficha') : etapa === 'actual' ? '✍️ Ahora' : '⏳ Después';
  const abiertasTxt = ab.length === ns.length ? 'todas abiertas' : ab.length ? `abiertas: ${ab[0]} a ${ab[ab.length - 1]} · las demás se abren en clase` : 'se abren en clase';
  return `<button type="button" class="mp-paso ${etapa}" aria-pressed="${k === entSel}" data-e="${k}">
    <span class="mp-paso-n">${i + 1}</span>
    <span class="mp-paso-txt"><b>${esc(D.entregas[k].corto)}</b> · preguntas ${ns[0]} a ${ns[ns.length - 1]}
      <small>${etapa === 'pasada' ? 'Se entregó el 15 de octubre' : `Se entrega el ${esc(D.entregas[k].fecha.toLowerCase())}`}${etapa !== 'pasada' ? ` · ${abiertasTxt}` : ''}${est.entregada ? ' · 📬 entregada' : ''}</small></span>
    <span class="mp-paso-tag">${tag}</span><span class="mp-paso-cuenta">${h}/${ns.length}</span></button>`;
}
function refrescarChips() {
  $$('#c-ent .mp-paso').forEach(b => { const ns = numsDe(D, b.dataset.e); b.querySelector('.mp-paso-cuenta').textContent = `${ns.filter(hecha).length}/${ns.length}`; });
}

// ======================================================= importar la Entrega 1
function errImport(msg) { const e = $('#mp-import-err'); e.textContent = msg; e.hidden = !msg; }
function pintarPegar() {
  errImport('');
  $('#mp-import').innerHTML = `<div class="mp-import-box"><p class="lab-ayuda">Copia todo el texto de tu Entrega 1 (desde la primera pregunta hasta las referencias) y pégalo aquí. Deja el número de cada pregunta: «1.», «2.», etc.</p>
    <textarea id="mp-texto" rows="10" class="t-resp" placeholder="1. ¿Qué platillo elijo y por qué me interesa investigarlo?&#10;Mi platillo es…"></textarea>
    <div class="e1-nav"><button type="button" class="btn-lab-l" id="mp-cancelar">Cancelar</button><button type="button" class="btn-lab" id="mp-leer">Acomodar mis respuestas →</button></div></div>`;
  $('#mp-cancelar').addEventListener('click', () => { $('#mp-import').innerHTML = ''; });
  $('#mp-leer').addEventListener('click', () => { const t = $('#mp-texto').value; if (!t.trim()) { errImport('Primero pega tu texto.'); return; } importar(async () => parrafosTexto(t)); });
}
async function importar(obtener) {
  errImport('');
  let parrafos;
  try { parrafos = await obtener(); } catch (e) { errImport(e.message || String(e)); return; }
  const { resp, refs } = acomodar(parrafos, D.preguntas);
  const ns = Object.keys(resp).map(Number).sort((a, b) => a - b);
  if (!ns.length) { errImport('No pudimos reconocer tus preguntas. Revisa que cada una lleve su número («1.», «2.»…) o la pregunta escrita, o pega el texto con el botón «Mejor pego el texto».'); return; }
  IMPORT = { resp, refs };
  pintarRevision();
}
function pintarRevision() {
  const { resp, refs } = IMPORT, lista = D.preguntas.filter(p => p.n <= 12 || resp[p.n]);
  const encontradas = lista.filter(p => resp[p.n]).length;
  $('#mp-import').innerHTML = `<div class="mp-import-box">
    <h3 class="t-h3">Revisa cómo quedaron tus respuestas</h3>
    <p class="lab-ayuda">Encontramos <b>${encontradas}</b> respuesta${encontradas === 1 ? '' : 's'}. Revisa que cada una esté en su pregunta; puedes corregir aquí mismo. Las que no encontramos, pégalas en su cuadro. Al final toca <b>Pasar a mi ficha</b>.</p>
    ${lista.map(p => { const ya = (T.respuestas[p.n] || '').trim(), hay = !!resp[p.n];
      return `<div class="mp-rev ${hay ? '' : 'falta'}"><label class="mp-rev-usar"><input type="checkbox" data-u="${p.n}" ${hay && !ya ? 'checked' : ''}> <b>${p.n}.</b> ${esc(p.texto)}</label>
        <p class="mp-rev-est">${hay ? '✓ La encontramos' : '✗ No la encontramos: pégala aquí si la tienes'}${ya ? ' · ⚠️ Ya tienes una respuesta en tu ficha: si marcas esta casilla, se reemplaza' : ''}</p>
        <textarea data-r="${p.n}" rows="${hay ? 5 : 2}">${esc(resp[p.n] || '')}</textarea></div>`; }).join('')}
    ${refs.length ? `<h4 class="e1-h">📚 Referencias que encontramos</h4><div class="e1-refs">${refs.map((r, i) => `<label><input type="checkbox" data-ref="${i}" checked> <span>${esc(r)}</span></label>`).join('')}</div>` : ''}
    <div class="e1-nav"><button type="button" class="btn-lab-l" id="mp-cancelar">Cancelar</button><button type="button" class="btn-lab" id="mp-pasar">✓ Pasar a mi ficha</button></div></div>`;
  $$('#mp-import textarea[data-r]').forEach(ta => ta.addEventListener('input', () => { const n = +ta.dataset.r; IMPORT.resp[n] = ta.value; const ch = $(`#mp-import [data-u="${n}"]`); if (ta.value.trim() && !(T.respuestas[n] || '').trim()) ch.checked = true; }));
  $('#mp-cancelar').addEventListener('click', () => { IMPORT = null; $('#mp-import').innerHTML = ''; });
  $('#mp-pasar').addEventListener('click', () => {
    const usar = $$('#mp-import [data-u]').filter(c => c.checked).map(c => +c.dataset.u).filter(n => (IMPORT.resp[n] || '').trim());
    if (!usar.length) { alert('No marcaste ninguna respuesta para pasar.'); return; }
    usar.forEach(n => { T.respuestas[n] = IMPORT.resp[n].trim(); });
    const nuevas = $$('#mp-import [data-ref]').filter(c => c.checked).map(c => IMPORT.refs[+c.dataset.ref]).filter(r => !String(T.refs.otras || '').includes(r));
    if (nuevas.length) T.refs.otras = [String(T.refs.otras || '').trim(), ...nuevas].filter(Boolean).join('\n');
    T.importado = { t: Date.now(), n: usar };
    // Si en su Word escribió el nombre del platillo en la pregunta 1 y aún no lo captura, no lo adivinamos: se lo pedimos.
    IMPORT = null; cambio(); guardarYa();
    entSel = 'entrega1'; pintarTodo();
    alert(`✓ Pasamos ${usar.length} respuesta${usar.length === 1 ? '' : 's'} a tu ficha. Ahora revísalas una por una: corrígelas con lo que te dijo tu maestro y agrega tus citas.`);
  });
  $('#mp-import').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ======================================================= preguntas guiadas
const pasoDe = ent => Math.max(0, (T.ir || {})[ent] || 0);
const fijarPaso = (ent, v) => { T.ir = T.ir || {}; T.ir[ent] = v; };
const oracion = x => { let t = String(x || '').trim(); if (!t) return ''; t = t.charAt(0).toUpperCase() + t.slice(1); return /[.!?»)]$/.test(t) ? t : t + '.'; };
const extracto = t => { const s = String(t || '').replace(/\s+/g, ' ').trim(); const m = s.match(/^(.{0,260}?[.!?])(\s|$)/); return m ? m[1] : s.slice(0, 260) + (s.length > 260 ? '…' : ''); };
const mencionaPlatillo = t => { const p = (T.platillo || '').trim(); if (!p) return true; const k = p.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ]{4,}/g) || []; const x = String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return !k.length || k.some(w => x.includes(w)) || /mi platillo/.test(x); };

function pintarGuiada() {
  const ent = entSel, E = D.entregas[ent], NS = numsDe(D, ent), tot = NS.length;
  const paso = Math.min(tot, pasoDe(ent)); fijarPaso(ent, paso);
  const est = estadoEntrega(T, D, ent);
  $('#c-lista').innerHTML = `<div class="t-entrega"><b>${esc(E.nombre)}</b> · ${esc(E.fecha)}<p>${esc(E.req)}</p><p>Vas pregunta por pregunta. <b>Todo se guarda solo</b> mientras escribes.${est.entregada ? ` <span class="t-entregada">${est.modificada ? '✏️ Entregada y modificada después' : '📬 Entregada'} el ${new Date(est.t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>` : ''}</p>
      ${ent !== 'entrega1' ? (() => { const f1 = numsDe(D, 'entrega1').filter(n => !hecha(n)).length; return f1 ? `<p class="t-recuerda">📥 Te falta${f1 === 1 ? '' : 'n'} <b>${f1} de 12</b> preguntas de la Entrega 1 en tu ficha. Entran a tu Word de esta entrega: súbelas con <b>«Subir mi Word»</b> (arriba) o tócale a <b>Entrega 1</b> y escríbelas. <button type="button" class="btn-lab-l" id="ir-e1">Ir a la Entrega 1 →</button></p>` : `<p class="t-nota">Las preguntas ${ent === 'entrega2' ? '1 a 12' : '1 a 20'} ya están en tu ficha y entran solas a tu Word. Si quieres corregirlas, toca su entrega arriba.</p>`; })() : ''}</div>
    <nav class="e1-pasos" aria-label="Preguntas de la ${esc(E.nombre)}">${NS.map((n, i) => `<button type="button" data-p="${i}" class="${paso === i ? 'actual' : ''} ${hecha(n) ? 'hecha' : ''} ${abierta(n) ? '' : 'cerrada'}" title="${abierta(n) ? '' : 'Se abre el ' + fechaLarga(APERTURA[n])}">${hecha(n) ? '✓' : abierta(n) ? n : '🔒'}</button>`).join('')}<button type="button" data-p="${tot}" class="e1-desc ${paso === tot ? 'actual' : ''}">📚 Referencias y Word</button></nav>
    <div id="e1-cuerpo"></div>`;
  const ir = v => { fijarPaso(ent, v); cambio(); pintarGuiada(); $('#c-lista').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const be1 = $('#ir-e1'); if (be1) be1.addEventListener('click', () => { const b = $('#c-ent [data-e="entrega1"]'); if (b) b.click(); });
  $$('.e1-pasos button').forEach(b => b.addEventListener('click', () => ir(+b.dataset.p)));
  const cuerpo = $('#e1-cuerpo');
  if (paso === tot) return pintarFinal(ent, cuerpo, ir);
  const n = NS[paso], p = D.preguntas.find(x => x.n === n);
  const nav = `<div class="e1-nav">${paso ? '<button type="button" class="btn-lab-l" id="e1-ant">← Pregunta anterior</button>' : '<span></span>'}<button type="button" class="btn-lab" id="e1-sig">${paso < tot - 1 ? `Siguiente: pregunta ${NS[paso + 1]} →` : 'Siguiente: referencias y Word →'}</button></div>`;
  if (!abierta(n)) {
    cuerpo.innerHTML = `<article class="t-preg e1"><p class="e1-n">Pregunta ${n} · ${paso + 1} de ${tot} · ${esc(p.titulo)}</p><h3>${esc(p.texto)}</h3>
      <div class="e1-base vacia"><p class="e1-k">🔒 Esta pregunta se abre el ${esc(fechaLarga(APERTURA[n]))}</p><p>Ese día la vemos en clase. Mientras, puedes adelantar tu investigación en el compendio${p.temas.length ? `: ${p.temas.map(t => `<a href="tema.html?id=${t}" target="_blank" rel="noopener">${t}</a>`).join(' · ')}` : ''}.</p></div>${nav}</article>`;
  } else {
    T.pasos[n] = T.pasos[n] || p.pasos.map(() => '');
    const previas = p.ver.filter(v => (T.respuestas[v] || '').trim());
    cuerpo.innerHTML = `<article class="t-preg e1">
      <p class="e1-n">Pregunta ${n} · ${paso + 1} de ${tot} · ${esc(p.titulo)}</p><h3>${esc(p.texto)}</h3>
      ${previas.length ? `<div class="e1-base"><p class="e1-k">📌 Lo que ya escribiste y te sirve aquí</p>${previas.map(v => `<p><b>Pregunta ${v}:</b> ${esc(extracto(T.respuestas[v]))}</p>`).join('')}<small>Conecta tu respuesta con lo que ya investigaste, sin repetirlo igual.</small></div>` : ''}
      <h4 class="e1-h">✍️ Ahora hazla tuya</h4>
      <p class="lab-ayuda">Contesta cada punto con tus palabras. Con eso la plataforma te arma tu respuesta.</p>
      ${p.pasos.map(([t, a], i) => `<label class="e1-sub"><span><b>${NUM[i]} ${esc(t)}</b><small>${esc(a)}</small></span><textarea data-i="${i}" rows="3">${esc(T.pasos[n][i] || '')}</textarea></label>`).join('')}
      <details class="t-pistas"><summary>Dónde investigar y cómo citar</summary><ul>
        ${p.temas.length ? `<li><b>Compendio:</b> ${p.temas.map(t => `<a href="tema.html?id=${t}" target="_blank" rel="noopener">${t}</a>`).join(' · ')}</li>` : ''}
        ${p.pista ? `<li>${esc(p.pista)}</li>` : ''}
        <li>Si usas el libro o el compendio del curso, escribe el dato con tus palabras y al final pon <b>${esc(D.libro.cita)}</b>.</li>
        <li>Si usas otra fuente, cítala igual: (Apellido, año). Si no tiene año: (Apellido, s. f.). Agrégala en «Referencias y Word».</li>
        <li>Si copias una frase exacta, ponla entre comillas «así» y agrega la cita.</li></ul></details>
      <h4 class="e1-h">📝 Tu respuesta</h4>
      <p class="lab-ayuda">Toca <b>Armar mi respuesta</b> para juntar lo que escribiste arriba. Después léela completa y corrígela para que suene a ti: esto es lo que va a tu Word.</p>
      <button type="button" class="btn-lab-l" id="e1-armar">🧩 Armar mi respuesta con lo anterior</button>
      <textarea class="t-resp" id="e1-final" rows="9" placeholder="Aquí queda tu respuesta completa (al menos 4 renglones).">${esc(T.respuestas[n] || '')}</textarea>
      <ul class="e1-checks" id="e1-checks"></ul>${nav}</article>`;
    const checks = () => {
      const t = T.respuestas[n] || '', w = palabras(t), sub = (T.pasos[n] || []).filter(x => palabras(x) >= 3).length, cp = w ? copiaDe(n) : 0;
      T.copia = T.copia || {}; T.copia[n] = cp;
      const L = [
        [w >= D.minPalabras, w >= D.minPalabras ? `${w} palabras ✓` : `${w} palabras: busca al menos ${D.minPalabras} (unos 4 renglones)`],
        [tieneCita(t), tieneCita(t) ? 'Tiene al menos una cita en APA ✓' : `Falta una cita en APA: ${D.libro.cita} o (Apellido, año)`],
        [!!w && !!T.platillo.trim() && mencionaPlatillo(t), !T.platillo.trim() ? 'Escribe arriba el nombre de tu platillo' : !w ? `Tu respuesta debe hablar de tu platillo (${T.platillo.trim()})` : mencionaPlatillo(t) ? 'Habla de tu platillo ✓' : `No mencionas tu platillo (${T.platillo.trim()}): tu respuesta debe hablar de él`],
        ...(w ? [[cp <= D.maxCopia, cp <= D.maxCopia ? `Escrita con tus palabras ✓` : `El ${cp} % es igual al compendio: explícalo con tus palabras (o pon la frase exacta entre comillas con su cita)`]] : []),
      ];
      if (!(T.importado && (T.importado.n || []).includes(n))) L.splice(2, 0, [sub === p.pasos.length, `Contestaste ${sub} de ${p.pasos.length} puntos de «Ahora hazla tuya»`]);
      $('#e1-checks').innerHTML = L.map(([ok, txt]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${esc(txt.replace(/\s*✓$/, ''))}</li>`).join('');
    };
    $('#e1-checks')._checks = checks;
    $$('.e1-sub textarea', cuerpo).forEach(ta => ta.addEventListener('input', () => { T.pasos[n][+ta.dataset.i] = ta.value; cambio(); checks(); }));
    $('#e1-final').addEventListener('input', e2 => { T.respuestas[n] = e2.target.value; cambio(); checks(); refrescarChips(); });
    $('#e1-armar').addEventListener('click', () => {
      const nuevo = (T.pasos[n] || []).map(oracion).filter(Boolean).join(' ');
      if (!nuevo) { alert('Primero contesta los puntos de «Ahora hazla tuya».'); return; }
      if ((T.respuestas[n] || '').trim() && !confirm('Ya tienes una respuesta. ¿Reemplazarla por una nueva armada con lo que escribiste arriba?\n\n(Si prefieres conservarla, toca «Cancelar» y agrega tú las ideas nuevas).')) return;
      T.respuestas[n] = nuevo; $('#e1-final').value = nuevo; cambio(); checks(); refrescarChips(); $('#e1-final').focus();
    });
    checks();
  }
  const ba = $('#e1-ant'); if (ba) ba.addEventListener('click', () => ir(paso - 1));
  $('#e1-sig').addEventListener('click', () => ir(paso + 1));
}

// ======================================================= referencias en APA
const TIPOS = {
  libro: { nombre: 'Libro', campos: ['autor', 'anio', 'titulo', 'editorial', 'url'] },
  web: { nombre: 'Página web', campos: ['autor', 'anio', 'dia', 'titulo', 'sitio', 'url'] },
  video: { nombre: 'Video de YouTube', campos: ['canal', 'anio', 'dia', 'titulo', 'url'] },
  articulo: { nombre: 'Artículo de revista', campos: ['autor', 'anio', 'titulo', 'revista', 'volumen', 'numero', 'paginas', 'url'] },
};
const ETQ = {
  autor: ['Autor', 'Apellido(s) y nombre(s). Si son dos, sepáralos con «;». Si es una institución, escribe su nombre completo.', 'García Pérez, María José; López, Ana'],
  canal: ['Canal de YouTube', 'Tal como aparece en YouTube.', 'Cocina con historia'],
  anio: ['Año', 'Déjalo vacío si no tiene fecha (se escribe «s. f.»).', '2021'],
  dia: ['Día y mes (opcional)', 'Si la página o el video dicen la fecha exacta.', '5 de marzo'],
  titulo: ['Título', 'Como aparece en la fuente.', ''],
  editorial: ['Editorial', '', 'Fondo de Cultura Económica'],
  sitio: ['Nombre del sitio', 'Si es igual al autor, déjalo vacío.', 'México Desconocido'],
  revista: ['Nombre de la revista', '', 'Estudios de Cultura Maya'],
  volumen: ['Volumen', '', '45'], numero: ['Número', '', '2'], paginas: ['Páginas', '', '35-60'],
  url: ['Enlace (URL o DOI)', '', 'https://…'],
};
const inicial = n => n.split(/[\s-]+/).filter(Boolean).map(x => x.charAt(0).toUpperCase() + '.').join(' ');
function autoresAPA(txt) {
  const L = String(txt || '').split(';').map(x => x.trim()).filter(Boolean).map(a => {
    const [ap, no] = a.split(',').map(x => (x || '').trim());
    return no ? { ref: `${ap}, ${inicial(no)}`, cita: ap } : { ref: ap, cita: ap, inst: true };
  });
  if (!L.length) return { ref: '', cita: '' };
  const ref = L.length === 1 ? L[0].ref : L.slice(0, -1).map(x => x.ref).join(', ') + ', y ' + L[L.length - 1].ref;
  const cita = L.length === 1 ? L[0].cita : L.length === 2 ? `${L[0].cita} y ${L[1].cita}` : `${L[0].cita} et al.`;
  return { ref: /\.$/.test(ref) ? ref : ref + '.', cita };
}
function armarAPA(tipo, v) {
  const s = k => String(v[k] || '').trim();
  const a = tipo === 'video' ? { ref: s('canal') ? (/\.$/.test(s('canal')) ? s('canal') : s('canal') + '.') : '', cita: s('canal') } : autoresAPA(s('autor'));
  const anio = s('anio') || 's. f.', fecha = s('anio') && s('dia') && tipo !== 'libro' && tipo !== 'articulo' ? `${s('anio')}, ${s('dia')}` : anio;
  const tit = s('titulo').replace(/\.$/, ''), url = s('url');
  let apa = '';
  if (tipo === 'libro') apa = `${a.ref} (${anio}). *${tit}*. ${s('editorial') ? s('editorial') + '.' : ''} ${url}`;
  if (tipo === 'web') apa = `${a.ref} (${fecha}). *${tit}*. ${s('sitio') && s('sitio') !== s('autor') ? s('sitio') + '.' : ''} ${url}`;
  if (tipo === 'video') apa = `${a.ref} (${fecha}). *${tit}* [Video]. YouTube. ${url}`;
  if (tipo === 'articulo') apa = `${a.ref} (${anio}). ${tit}. *${s('revista')}*${s('volumen') ? `, *${s('volumen')}*` : ''}${s('numero') ? `(${s('numero')})` : ''}${s('paginas') ? `, ${s('paginas')}` : ''}. ${url}`;
  apa = apa.replace(/\s+/g, ' ').replace(/\s+\./g, '.').trim();
  return { apa, cita: `(${a.cita || 'Autor'}, ${anio})`, ok: !!(a.ref && tit) };
}

function pintarFinal(ent, cuerpo, ir) {
  const E = D.entregas[ent], NS = numsDe(D, ent), todas = D.preguntas.filter(p => p.n <= E.hasta).map(p => p.n);
  let tipo = 'web';
  cuerpo.innerHTML = `<article class="t-preg e1">
    <p class="e1-n">Último paso</p><h3>Referencias y descarga de tu ficha</h3>
    <h4 class="e1-h">📚 Tus referencias en APA</h4>
    <p class="lab-ayuda">Cada fuente que citaste en tus respuestas va aquí. Pide <b>al menos ${E.minRefs}</b>. La plataforma te las escribe en formato APA: solo llena los datos.</p>
    <div class="e1-refs"><label><input type="checkbox" id="rf-libro" ${T.refs.libro !== false ? 'checked' : ''}> <span>${conCursivas(D.libro.apa)} <small class="mp-cita">En tu texto: ${esc(D.libro.cita)}</small></span></label>
      ${(T.refs.lista || []).map((r, i) => `<div class="mp-ref"><span>${conCursivas(r.apa)} <small class="mp-cita">En tu texto: ${esc(r.cita)}</small></span><button type="button" class="link-btn" data-borrar="${i}">Quitar</button></div>`).join('')}</div>
    <div class="mp-armador"><p class="e1-k">➕ Agregar una fuente</p>
      <div class="lab-chips" id="rf-tipos">${Object.entries(TIPOS).map(([k, t]) => `<button type="button" class="chip-lab" data-t="${k}" aria-pressed="${k === tipo}">${t.nombre}</button>`).join('')}</div>
      <div id="rf-campos" class="mp-campos"></div>
      <p class="mp-prev" id="rf-prev"></p>
      <button type="button" class="btn-lab-l" id="rf-agregar">Agregar a mis referencias</button></div>
    <p class="t-recuerda">👵 <b>¿Entrevistaste a un familiar o a un cocinero?</b> En APA eso es una <i>comunicación personal</i>: se cita solo dentro del texto y <b>no</b> va en la lista de referencias. Así: (M. Pérez, comunicación personal, 3 de octubre de 2026).</p>
    <label class="e1-sub"><span><b>Otras referencias</b><small>Si ya la tienes escrita en APA, pégala aquí, una por renglón. Para cursivas, enciérralas entre asteriscos: *Título del libro*.</small></span><textarea id="e1-otras" rows="3">${esc(T.refs.otras || '')}</textarea></label>
    <h4 class="e1-h">Antes de ${E.entregar ? 'entregar' : 'descargar'}</h4><ul class="e1-checks" id="e1-rev"></ul>
    <button type="button" class="btn-lab e1-word" id="e1-word">⬇ Descargar mi ficha en Word (preguntas 1 a ${E.hasta})</button>
    <p class="t-nota">Sale con la portada oficial del ITES y en formato APA 7: Times New Roman 12, doble espacio, número de página y referencias en orden alfabético con sangría francesa. Puedes descargarla las veces que quieras.</p>
    <div class="t-entregar" id="t-entregar"></div>
    <div class="e1-nav"><button type="button" class="btn-lab-l" id="e1-ant">← Pregunta ${NS[NS.length - 1]}</button><span></span></div></article>`;
  const V = {};
  const campos = () => {
    $('#rf-campos').innerHTML = TIPOS[tipo].campos.map(k => `<label class="mp-campo ${['volumen', 'numero', 'paginas', 'anio'].includes(k) ? 'corto' : ''}"><span>${esc(ETQ[k][0])}${ETQ[k][1] ? `<small>${esc(ETQ[k][1])}</small>` : ''}</span><input data-k="${k}" type="text" placeholder="${esc(ETQ[k][2])}" value="${esc(V[k] || '')}"></label>`).join('');
    $$('#rf-campos input').forEach(i => i.addEventListener('input', () => { V[i.dataset.k] = i.value; prev(); }));
    prev();
  };
  const prev = () => { const r = armarAPA(tipo, V); $('#rf-prev').innerHTML = r.ok ? `Así queda: ${conCursivas(r.apa)}<br><small>En tu texto la citas así: <b>${esc(r.cita)}</b></small>` : '<small>Llena al menos el autor (o canal) y el título.</small>'; };
  $$('#rf-tipos .chip-lab').forEach(b => b.addEventListener('click', () => { tipo = b.dataset.t; $$('#rf-tipos .chip-lab').forEach(x => x.setAttribute('aria-pressed', String(x === b))); campos(); }));
  $('#rf-agregar').addEventListener('click', () => {
    const r = armarAPA(tipo, V); if (!r.ok) { alert('Llena al menos el autor (o el canal) y el título.'); return; }
    T.refs.lista = [...(T.refs.lista || []), { tipo, datos: { ...V }, apa: r.apa, cita: r.cita }]; cambio(); pintarFinal(ent, cuerpo, ir);
  });
  $$('[data-borrar]', cuerpo).forEach(b => b.addEventListener('click', () => { if (!confirm('¿Quitar esta referencia?')) return; T.refs.lista.splice(+b.dataset.borrar, 1); cambio(); pintarFinal(ent, cuerpo, ir); }));
  $('#rf-libro').addEventListener('change', e => { T.refs.libro = e.target.checked; cambio(); rev(); });
  $('#e1-otras').addEventListener('input', e => { T.refs.otras = e.target.value; cambio(); rev(); });
  campos();

  const rev = () => {
    const abiertas = todas.filter(abierta), conTexto = abiertas.filter(n => palabras(T.respuestas[n])), faltan = abiertas.filter(n => !hecha(n)), sinCita = abiertas.filter(n => !tieneCita(T.respuestas[n]));
    const copiadas = conTexto.filter(n => copiaDe(n) > D.maxCopia), nr = refsDe(T, D).length;
    const L = [
      [!!T.platillo.trim(), T.platillo.trim() ? `Tu platillo: ${T.platillo.trim()} ✓` : 'Escribe arriba el nombre de tu platillo (va en el título)'],
      [!faltan.length, faltan.length ? `Preguntas sin terminar (menos de ${D.minPalabras} palabras): ${faltan.join(', ')}` : `Las ${abiertas.length} preguntas tienen respuesta ✓`],
      [!sinCita.length, sinCita.length ? `Preguntas sin cita (Autor, año): ${sinCita.join(', ')}` : 'Todas tus respuestas tienen al menos una cita ✓'],
      [!copiadas.length && conTexto.length > 0, copiadas.length ? `Preguntas muy parecidas al compendio: ${copiadas.join(', ')}. Escríbelas con tus palabras.` : conTexto.length ? 'Tus respuestas están escritas con tus palabras ✓' : 'Todavía no hay respuestas que revisar'],
      [nr >= E.minRefs, `${nr} referencia${nr === 1 ? '' : 's'} ${nr >= E.minRefs ? '✓' : `· te faltan ${E.minRefs - nr} para el mínimo de ${E.minRefs}`}`],
    ];
    const cerradas = todas.filter(n => !abierta(n));
    if (cerradas.length) L.push([true, `Las preguntas ${cerradas.join(', ')} todavía no se abren: las contestarás cuando las veamos en clase`]);
    $('#e1-rev').innerHTML = L.map(([ok, txt]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${esc(txt.replace(/\s*✓$/, ''))}</li>`).join('');
    if (!E.entregar) { $('#t-entregar').innerHTML = '<p class="t-nota">La Entrega 1 ya la entregaste en papel. Aquí la dejas lista y corregida, porque entra completa a tu Entrega 2.</p>'; return; }
    const est = estadoEntrega(T, D, ent), fecha = t => new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    $('#t-entregar').innerHTML = est.entregada
      ? `<p class="${est.modificada ? 't-aviso' : 't-bien'}">${est.modificada ? `✏️ Entregaste el ${fecha(est.t)}, pero cambiaste tu trabajo después. Tu maestro verá que fue modificado. Si ya terminaste tus cambios, vuelve a entregar.` : `📬 Entregaste el ${fecha(est.t)}. Tu maestro ya puede descargarla. Si cambias algo, tendrás que volver a entregar.`}</p>${est.modificada ? '<button type="button" class="btn-lab" id="t-entregar-btn">📬 Volver a entregar</button>' : ''}`
      : `<p class="lab-ayuda">Cuando termines, marca tu trabajo como entregado: tu maestro verá la fecha y podrá descargarlo.${L.some(([ok]) => !ok) ? ' Todavía hay puntos pendientes en la lista de arriba; puedes entregar así, pero revísalos.' : ''}</p><button type="button" class="btn-lab" id="t-entregar-btn">📬 Entregar mi ${esc(E.corto)}</button>`;
    const b = $('#t-entregar-btn');
    if (b) b.addEventListener('click', async () => {
      if (sesion.anon) { alert('Para entregar necesitas entrar con tu nombre y PIN (sin cuenta solo se guarda en este dispositivo).'); return; }
      const pend = L.filter(([ok]) => !ok).length;
      if (!confirm(pend ? `Tienes ${pend} punto${pend === 1 ? '' : 's'} pendiente${pend === 1 ? '' : 's'} en la lista. ¿Entregar de todos modos?` : '¿Entregar tu trabajo? Tu maestro verá la fecha y podrá descargarlo.')) return;
      T.entregado = T.entregado || {}; T.entregado[ent] = { t: Date.now(), huella: huella(T, D, ent) };
      cambio(); await guardarYa(); rev();
    });
  };
  // Volver a revisar cuando termine de cargar el compendio.
  const r0 = $('#e1-rev'); r0._checks = rev; r0.id = 'e1-rev'; const ck = document.createElement('span'); ck.id = 'e1-checks'; ck.hidden = true; ck._checks = rev; cuerpo.appendChild(ck);
  $('#e1-ant').addEventListener('click', () => ir(NS.length - 1));
  $('#e1-word').addEventListener('click', async () => { await guardarYa(); await wordMiPlato(T, D, ent, sesion.anon ? '' : sesion.nombre); });
  rev();
}

// ======================================================= inicio
(async () => {
  let s = null; try { s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { s = null; }
  if (s && s.grupoId && s.alumnoId && s.pin) { sesion = s; entrar(); } else cargarGrupos();
})();
