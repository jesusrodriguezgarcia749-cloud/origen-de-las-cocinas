// mi-atlas.js — «Mi atlas»: mapa en blanco por continente donde el alumno arma sus
// propias regiones culinarias, las colorea y escribe sus fichas. Se guarda en
// grupos/{grupo}/alumnos/{alumno}/atlas/mi-atlas (y una copia en el navegador);
// el docente ve el avance en el Panel docente. Se descarga en Word (.docx).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, deleteField, FieldPath, collection, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const SESSION_KEY = 'oc_sesion_alumno';
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const slug = n => n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
const corto = n => String(n).replace(/ \(.*\)$/, '');
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const palabras = t => (String(t || '').trim().match(/\S+/g) || []).length;

const COLORES = ['#D9A441', '#C0503F', '#3F9A55', '#2E6FA8', '#8E5BA8', '#E07B39', '#2BA3A0', '#B5486E', '#7A8B2E', '#6B5B4B', '#E3C94A', '#4A6FD9'];
const CAMPOS_REGION = [
  ['clima', 'Clima y paisaje', '¿Cómo es el clima? ¿Desierto, selva, costa, montaña? ¿Qué se puede cultivar o criar ahí?'],
  ['ingredientes', 'Ingredientes base', 'Cereales, tubérculos, carnes, especias, frutas… y por qué esos.'],
  ['platillos', 'Platillos representativos', 'Nombre de cada platillo y de qué está hecho.'],
  ['tecnicas', 'Técnicas y utensilios', 'Formas de cocinar y conservar: hornos de barro, fermentación, secado, ahumado…'],
  ['historia', 'Historia e influencias', 'Pueblos, comercio, colonización o migraciones que cambiaron su cocina.'],
  ['dato', 'Dato curioso', 'Algo que sorprenda a tus compañeros.'],
  ['fuentes', 'Fuentes consultadas (APA 7)', 'Autor, A. (año). Título. Editorial o sitio. URL'],
];
const CAMPOS_PAIS = [['platillos', 'Platillos de este país'], ['notas', 'Notas e investigación']];

let editando = null;
// ---- modo equipo: el atlas vive en grupos/{g}/equipos/{e}/atlas/{continente} y se edita en vivo
let modo = 'personal', EQ = null, TE = {}, unsub = null, pend = new Map(), pendT = null, existe = {};
let A = null, sesion = null, T = null, cont = 'africa', regSel = null, paisSel = null, timer = null, iniciado = false;
let PAIS = {}, CONT_DE = {};

// ======================================================= arranque
async function iniciar() {
  if (iniciado) return; iniciado = true;
  A = await fetch('data/atlas.json').then(r => r.json());
  Object.entries(A.regiones).forEach(([k, r]) => r.paises.forEach(p => { PAIS[p.id] = { ...p, cont: r.cont }; }));
  let s = null; try { s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { s = null; }
  if (s && s.grupoId && s.alumnoId && s.pin) { sesion = s; entrar(); } else cargarGrupos();
}
window.addEventListener('abrir-miatlas', iniciar);
if (!$('#panel-miatlas').hidden || location.hash.startsWith('#miatlas')) iniciar();
window.addEventListener('abrir-miatlas', () => { if (T) setTimeout(ajustarVista, 30); });

async function cargarGrupos() {
  const sel = $('#ma-grupo');
  try {
    const snap = await getDocs(query(collection(db, 'grupos'), orderBy('nombre')));
    sel.innerHTML = '<option value="">— Elige tu grupo —</option>';
    snap.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.data().nombre; sel.appendChild(o); });
  } catch { sel.innerHTML = '<option value="">No se pudieron cargar los grupos</option>'; }
}
$('#ma-form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#ma-error'); err.hidden = true;
  const grupoId = $('#ma-grupo').value, nombre = $('#ma-nombre').value.trim(), pin = $('#ma-pin').value.trim();
  if (!grupoId || !nombre || !pin) { err.textContent = 'Completa grupo, nombre y PIN.'; err.hidden = false; return; }
  try {
    const alumnoId = slug(nombre);
    const snap = await getDoc(doc(db, 'grupos', grupoId, 'alumnos', alumnoId));
    if (!snap.exists() || String(snap.data().pin) !== pin) { err.textContent = 'No encontramos ese nombre y PIN en el grupo elegido. Verifica con tu docente.'; err.hidden = false; return; }
    sesion = { grupoId, alumnoId, nombre: snap.data().nombre, pin };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion)); } catch { /* */ }
    entrar();
  } catch (e2) { err.textContent = 'No se pudo entrar: ' + (e2.message || e2); err.hidden = false; }
});
$('#ma-sin-cuenta').addEventListener('click', () => { sesion = { anon: true, nombre: 'invitado' }; entrar(); });
$('#ma-salir').addEventListener('click', async () => { await flushEquipo(); await guardarYa(); try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ } location.hash = '#miatlas'; location.reload(); });

const claveLocal = () => sesion.anon ? 'miatlas_invitado' : `miatlas_${sesion.grupoId}_${sesion.alumnoId}`;
const vacioCont = () => ({ regiones: [], asign: {}, paises: {} });
async function entrar() {
  $('#ma-acceso').hidden = true; $('#ma-app').hidden = false;
  $('#ma-quien').textContent = sesion.anon ? 'invitado (sin cuenta)' : sesion.nombre;
  let local = null; try { local = JSON.parse(lsGet(claveLocal()) || 'null'); } catch { local = null; }
  let remoto = null;
  if (!sesion.anon) {
    try { const s = await getDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', 'mi-atlas')); if (s.exists()) remoto = s.data().datos || null; }
    catch { /* sin conexión */ }
  }
  const t = x => (x && x._t) || 0;
  T = (t(local) > t(remoto) ? local : remoto) || local || remoto || { conts: {} };
  T.conts = T.conts || {};
  cont = T.ultimo && A.continentes[T.ultimo] ? T.ultimo : 'africa';
  estado(sesion.anon ? 'Se guarda solo en este dispositivo' : 'Tu trabajo se guarda en tu cuenta');
  const eq = $('#ma-equipo'); eq.value = T.equipo || '';
  if (!eq._listo) { eq._listo = true; eq.addEventListener('input', () => { T.equipo = eq.value; cambio(); }); }
  if (!sesion.anon) {
    try {
      const sn = await getDocs(collection(db, 'grupos', sesion.grupoId, 'equipos'));
      sn.forEach(d => { const x = d.data(); if ((x.integrantes || []).includes(sesion.alumnoId)) EQ = { id: d.id, ...x }; });
    } catch { /* sin equipos */ }
  }
  if (EQ) modo = lsGet('miatlas_modo') === 'personal' ? 'personal' : 'equipo';
  pintarModo(); pintarConts(); cambiarModo(modo);
}
function pintarModo() {
  const m = $('#ma-modo');
  if (!EQ) { m.hidden = true; return; }
  m.hidden = false;
  m.innerHTML = [['equipo', `👥 Atlas del equipo «${esc(EQ.nombre)}»`], ['personal', '👤 Mi atlas personal']].map(([k, t]) => `<button type="button" class="chip-at" data-m="${k}" aria-pressed="${k === modo}">${t}</button>`).join('')
    + `<p class="ma-integrantes">${modo === 'equipo' ? `Integrantes: ${esc((EQ.nombres || []).join(', '))}. Todo lo que escriban se ve en vivo en los celulares de todos.` : 'Este es tu trabajo individual: tu equipo no lo ve.'}</p>`;
  $$('button', m).forEach(b => b.addEventListener('click', () => { if (b.dataset.m !== modo) cambiarModo(b.dataset.m); }));
}
async function cambiarModo(mo) {
  await flushEquipo(); if (timer) await guardarYa();
  modo = mo; lsSet('miatlas_modo', mo); regSel = null; paisSel = null; editando = null;
  $('.ma-equipo').hidden = modo === 'equipo';
  pintarModo();
  if (modo === 'equipo') { estado('Conectando con tu equipo…'); escuchar(); }
  else { if (unsub) { unsub(); unsub = null; } estado(sesion.anon ? 'Se guarda solo en este dispositivo' : 'Tu trabajo se guarda en tu cuenta'); dibujar(); }
}

// ---- sincronización del equipo
const refEq = k => doc(db, 'grupos', sesion.grupoId, 'equipos', EQ.id, 'atlas', k);
function aEspejo(d) {
  const regs = Object.entries(d.regiones || {}).map(([id, r]) => ({ ...r, id })).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  return { regiones: regs, asign: { ...(d.asign || {}) }, paises: JSON.parse(JSON.stringify(d.paises || {})), por: JSON.parse(JSON.stringify(d.por || {})) };
}
function aplicarPendientes(c) {
  pend.forEach(([ruta, v]) => {
    const [raiz, a, b] = ruta;
    if (raiz === 'asign') { if (v === null) delete c.asign[a]; else c.asign[a] = v; }
    else if (raiz === 'regiones') {
      if (b === undefined) { if (v === null) c.regiones = c.regiones.filter(r => r.id !== a); else if (!c.regiones.some(r => r.id === a)) c.regiones.push({ ...v, id: a }); }
      else { const r = c.regiones.find(x => x.id === a); if (r) r[b] = v; }
    } else if (raiz === 'paises') { c.paises[a] = c.paises[a] || {}; c.paises[a][b] = v; }
  });
}
function escuchar() {
  if (unsub) unsub();
  const k = cont;
  TE[k] = TE[k] || { ...vacioCont(), por: {} };
  dibujar();
  unsub = onSnapshot(refEq(k), sn => {
    existe[k] = sn.exists();
    if (k !== cont || modo !== 'equipo') return;
    const nuevo = aEspejo(sn.exists() ? sn.data() : {}); aplicarPendientes(nuevo);
    TE[k] = nuevo;
    if (!pend.size) estado(sn.metadata && sn.metadata.hasPendingWrites ? 'Guardando…' : 'Sincronizado con tu equipo ✓', 'ok');
    refrescarVivo();
  }, () => estado('No se pudo conectar con tu equipo. Revisa tu internet.', 'mal'));
}
function encolar(ruta, valor, rapido) {
  pend.set(ruta.join('\u0001'), [ruta, valor]);
  estado('Guardando…'); clearTimeout(pendT); pendT = setTimeout(flushEquipo, rapido ? 250 : 800);
}
async function flushEquipo() {
  clearTimeout(pendT); pendT = null;
  if (modo !== 'equipo' || !pend.size || !EQ) return;
  const lote = [...pend.values()]; pend.clear();
  const k = cont, ref = refEq(k);
  try {
    if (!existe[k]) { const s0 = await getDoc(ref); if (!s0.exists()) await setDoc(ref, { regiones: {}, asign: {}, paises: {}, por: {}, ultimoAutor: sesion.alumnoId, ultimoPin: sesion.pin, actualizado: serverTimestamp() }); existe[k] = true; }
    const args = [];
    lote.forEach(([ruta, v]) => { args.push(new FieldPath(...ruta), v === null ? deleteField() : v); });
    args.push('ultimoAutor', sesion.alumnoId, 'ultimoPin', sesion.pin, 'actualizado', serverTimestamp());
    await updateDoc(ref, ...args);
    if (!pend.size) estado('Sincronizado con tu equipo ✓', 'ok');
  } catch (e) {
    lote.forEach(([ruta, v]) => { const key = ruta.join('\u0001'); if (!pend.has(key)) pend.set(key, [ruta, v]); });
    estado('No se pudo guardar en el equipo. Reintentando…', 'mal'); clearTimeout(pendT); pendT = setTimeout(flushEquipo, 4000);
  }
}
window.addEventListener('beforeunload', () => { if (pend.size) flushEquipo(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pend.size) flushEquipo(); });
// Repinta lo que cambió sin quitarle el cursor a quien está escribiendo.
function refrescarVivo() {
  colorear();
  const act = document.activeElement;
  if (!(act && $('#ma-panel').contains(act) && /INPUT|TEXTAREA/.test(act.tagName)) && !editando) panel();
  const firma = c => JSON.stringify([c.regiones.map(r => [r.id, r.nombre, r.color]), c.asign]);
  const c = C();
  if ($('#ma-fichas').dataset.firma !== firma(c)) {
    const foco = act && act.dataset && act.dataset.rf && act.closest('details') ? { id: act.closest('details').dataset.id, rf: act.dataset.rf, a: act.selectionStart, b: act.selectionEnd } : null;
    fichas();
    if (foco) { const e = $(`#ficha-${foco.id} [data-rf="${foco.rf}"]`); if (e) { e.focus(); try { e.setSelectionRange(foco.a, foco.b); } catch { /* */ } } }
  } else {
    $$('#ma-fichas [data-rf]').forEach(t => { const r = c.regiones.find(x => x.id === t.closest('details').dataset.id); if (r && t !== act && t.value !== (r[t.dataset.rf] || '')) t.value = r[t.dataset.rf] || ''; });
    pintarAutores();
  }
}
function pintarAutores() {
  if (modo !== 'equipo') return;
  const c = C();
  $$('#ma-fichas [data-autor]').forEach(sp => { const [rid, f] = sp.dataset.autor.split('|'); const a = ((c.por || {})[rid] || {})[f]; sp.textContent = a ? `✍️ ${a}` : ''; });
}

// ======================================================= guardado
function estado(t, c = '') { const e = $('#ma-estado'); e.textContent = t; e.className = 'ma-estado ' + c; }
function C() { if (modo === 'equipo') return (TE[cont] = TE[cont] || { ...vacioCont(), por: {} }); return (T.conts[cont] = T.conts[cont] || vacioCont()); }
function cambio() {
  T._t = Date.now(); T.ultimo = cont; lsSet(claveLocal(), JSON.stringify(T));
  estado('Guardando…'); clearTimeout(timer); timer = setTimeout(guardarYa, 1200);
}
function paisesDe(k) { return Object.values(PAIS).filter(p => p.cont === k); }
function resumen() {
  const out = {};
  Object.keys(A.continentes).forEach(k => {
    const c = T.conts[k]; if (!c) return;
    const total = paisesDe(k).length, hechos = Object.keys(c.asign).filter(i => PAIS[i] && PAIS[i].cont === k).length;
    const fichas = c.regiones.filter(r => CAMPOS_REGION.filter(([f]) => (r[f] || '').trim()).length >= 4).length;
    out[k] = { regiones: c.regiones.length, clasificados: hechos, total, fichas, palabras: c.regiones.reduce((s, r) => s + CAMPOS_REGION.reduce((x, [f]) => x + palabras(r[f]), 0), 0) };
  });
  return out;
}
async function guardarYa() {
  clearTimeout(timer); timer = null;
  if (!T || !sesion) return;
  if (sesion.anon) { estado('Guardado en este dispositivo ✓', 'ok'); return; }
  try {
    await setDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', 'mi-atlas'), {
      pinVerificado: sesion.pin, nombre: sesion.nombre, equipo: (T.equipo || '').trim(), datos: T, avance: resumen(), actualizado: serverTimestamp()
    });
    estado('Guardado en tu cuenta ✓', 'ok');
  } catch {
    estado('Guardado solo en este dispositivo (no se pudo subir a tu cuenta). Avísale a tu docente.', 'mal');
  }
}
window.addEventListener('beforeunload', () => { if (timer) guardarYa(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) guardarYa(); });

// ======================================================= continentes y mapa
function pintarConts() {
  const z = $('#ma-conts'); z.innerHTML = '';
  Object.entries(A.continentes).forEach(([k, c]) => {
    const b = document.createElement('button'); b.className = 'chip-at'; b.type = 'button'; b.setAttribute('aria-pressed', String(k === cont));
    b.textContent = `${c.nombre} · ${c.sub}`;
    b.addEventListener('click', async () => { await flushEquipo(); cont = k; regSel = null; paisSel = null; editando = null; T.ultimo = k; $$('#ma-conts .chip-at').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (modo === 'equipo') escuchar(); else dibujar(); });
    z.appendChild(b);
  });
}
const el = (tag, attrs, padre) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (padre) padre.appendChild(e); return e; };
function cajaCont() {
  const [x, y, w, h] = A.mundo.cajas[cont], m = .06; return [x - w * m, y - h * m, w * (1 + 2 * m), h * (1 + 2 * m)];
}
function dibujar() {
  const svg = $('#ma-svg'); svg.innerHTML = '';
  ajustarVista();
  el('rect', { class: 'mar', x: -2000, y: -2000, width: 6000, height: 6000 }, svg);
  el('path', { class: 'grat', d: A.mundo.grat }, svg);
  const g = el('g', {}, svg);
  A.mundo.paises.forEach(p => {
    const mio = p.i && PAIS[p.i] && PAIS[p.i].cont === cont;
    const e = el('path', { d: p.d, class: 'pais' + (mio ? ' ma-pais' : ' ma-fuera') }, g);
    if (mio) { e.dataset.i = p.i; e.dataset.n = p.n; }
  });
  A.mundo.islas.forEach(i => { if (PAIS[i.i] && PAIS[i.i].cont === cont) { const c = el('circle', { class: 'isla ma-pais', cx: i.x, cy: i.y, r: 4.5 }, g); c.dataset.i = i.i; c.dataset.n = i.n; } });
  if (!svg._listo) {
    svg._listo = true;
    let tipT = null;
    svg.addEventListener('click', ev => {
      const t = ev.target, id = t.dataset && t.dataset.i; if (!id) return;
      tocarPais(id);
      const tip = $('#ma-tip'), r = svg.parentElement.getBoundingClientRect();
      const reg = regionDe(id);
      tip.textContent = corto(PAIS[id].n) + (reg ? ' · ' + reg.nombre : ' · sin región');
      tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px'; tip.hidden = false;
      clearTimeout(tipT); tipT = setTimeout(() => { tip.hidden = true; }, 2200);
    });
  }
  colorear(); panel(); fichas();
}
function ajustarVista() {
  const svg = $('#ma-svg'), rc = svg.getBoundingClientRect(), ar = rc.width && rc.height ? rc.width / rc.height : 1.6;
  let [x, y, w, h] = cajaCont(); if (w / h > ar) { const n = w / ar; y -= (n - h) / 2; h = n; } else { const n = h * ar; x -= (n - w) / 2; w = n; }
  svg.setAttribute('viewBox', [x, y, w, h].join(' '));
}
function regionDe(id) { const c = C(), rid = c.asign[id]; return rid ? c.regiones.find(r => r.id === rid) : null; }
function colorear() {
  $$('#ma-svg .ma-pais').forEach(e => {
    const r = regionDe(e.dataset.i);
    e.style.fill = r ? r.color : '';
    e.classList.toggle('ma-sel', e.dataset.i === paisSel);
    e.classList.toggle('ma-de-sel', !!(regSel && r && r.id === regSel));
  });
  const total = paisesDe(cont).length, hechos = Object.keys(C().asign).filter(i => PAIS[i] && PAIS[i].cont === cont).length;
  $('#ma-progreso').innerHTML = `<b>${A.continentes[cont].nombre}:</b> ${hechos} de ${total} países clasificados · ${pl(C().regiones.length, 'región creada', 'regiones creadas')}
    <span class="ma-barra-p"><i style="width:${total ? Math.round(100 * hechos / total) : 0}%"></i></span>`;
}
function tocarPais(id) {
  const c = C();
  if (regSel) {
    const nuevo = c.asign[id] === regSel ? null : regSel;
    if (nuevo) c.asign[id] = nuevo; else delete c.asign[id];
    if (modo === 'equipo') encolar(['asign', id], nuevo, true); else cambio();
    paisSel = id; colorear(); panel(); fichas();
  } else { paisSel = id; colorear(); panel(); }
}

// ======================================================= panel lateral
function panel() {
  const c = C(), p = $('#ma-panel');
  const listaReg = c.regiones.map(r => {
    const n = Object.values(c.asign).filter(x => x === r.id).length;
    if (r.id === editando) return `<form class="ma-edit" data-id="${r.id}" style="--c:${r.color}">
      <input type="text" maxlength="60" value="${esc(r.nombre)}" aria-label="Nuevo nombre de la región">
      <div class="ma-colores" role="radiogroup" aria-label="Color de la región">${COLORES.map((col, i) => `<button type="button" role="radio" aria-checked="${col === r.color}" aria-label="Color ${i + 1}" data-c="${col}" style="--c:${col}"></button>`).join('')}</div>
      <div class="ma-edit-bot"><button type="submit" class="btn-at">Guardar cambios</button><button type="button" class="ma-link" data-cancel>Cancelar</button></div></form>`;
    return `<div class="ma-reg-fila"><button type="button" class="ma-reg" data-id="${r.id}" aria-pressed="${r.id === regSel}" style="--c:${r.color}"><i></i><span>${esc(r.nombre)}</span><small>${pl(n, 'país', 'países')}</small></button><button type="button" class="ma-editar" data-edit="${r.id}" aria-label="Cambiar nombre o color de ${esc(r.nombre)}" title="Cambiar nombre o color">✏️</button></div>`;
  }).join('');
  const pais = paisSel && PAIS[paisSel], regP = paisSel && regionDe(paisSel);
  p.innerHTML = `<p class="ficha-sub">${esc(A.continentes[cont].nombre)}</p><h2>${modo === 'equipo' ? 'Regiones del equipo' : 'Mis regiones'}</h2>
    ${c.regiones.length ? `<div class="ma-regs">${listaReg}</div><p class="ficha-mini">${regSel ? '🖌️ Estás pintando con <b>' + esc(c.regiones.find(r => r.id === regSel).nombre) + '</b>: toca países en el mapa. Toca la región otra vez para dejar de pintar.' : 'Elige una región para pintar sus países en el mapa.'}</p>` : '<p class="ficha-mini">Aún no tienes regiones. Crea la primera: piensa en zonas con clima, ingredientes e historia parecidos.</p>'}
    <form class="ma-nueva" id="ma-nueva">
      <input id="ma-nueva-n" type="text" maxlength="60" placeholder="Nombre de la región (p. ej., Magreb)" aria-label="Nombre de la nueva región">
      <div class="ma-colores" role="radiogroup" aria-label="Color de la región">${COLORES.map((col, i) => `<button type="button" role="radio" aria-checked="${i === siguienteColor()}" aria-label="Color ${i + 1}" data-c="${col}" style="--c:${col}"></button>`).join('')}</div>
      <button type="submit" class="btn-at">+ Crear región</button>
    </form>
    ${pais ? `<div class="ma-pais-card"><p class="fp-nombre">📍 ${esc(corto(pais.n))}</p><p class="ficha-mini">${regP ? `En tu región <b>${esc(regP.nombre)}</b>` : 'Todavía no está en ninguna de tus regiones.'}</p>
      ${CAMPOS_PAIS.map(([f, t]) => `<label class="ma-campo">${t}<textarea data-pf="${f}" rows="2" placeholder="${f === 'platillos' ? 'Ejemplo: tajín, cuscús…' : 'Lo que investigaste de este país'}">${esc(((C().paises[paisSel] || {})[f]) || '')}</textarea></label>`).join('')}</div>` : ''}`;
  $$('.ma-reg', p).forEach(b => b.addEventListener('click', () => { regSel = regSel === b.dataset.id ? null : b.dataset.id; colorear(); panel(); }));
  $$('[data-edit]', p).forEach(b => b.addEventListener('click', () => { editando = b.dataset.edit; panel(); const i = $('.ma-edit input', p); if (i) { i.focus(); i.select(); } }));
  const fe = $('.ma-edit', p);
  if (fe) {
    const r = C().regiones.find(x => x.id === fe.dataset.id); let col = r.color;
    $$('.ma-colores button', fe).forEach(b => b.addEventListener('click', () => { col = b.dataset.c; $$('.ma-colores button', fe).forEach(x => x.setAttribute('aria-checked', String(x === b))); fe.style.setProperty('--c', col); }));
    fe.querySelector('[data-cancel]').addEventListener('click', () => { editando = null; panel(); });
    fe.addEventListener('submit', e => {
      e.preventDefault(); const n = fe.querySelector('input').value.trim(); if (!n) { fe.querySelector('input').focus(); return; }
      r.nombre = n; r.color = col; editando = null;
      if (modo === 'equipo') { encolar(['regiones', r.id, 'nombre'], n, true); encolar(['regiones', r.id, 'color'], col, true); } else cambio();
      panel(); fichas(); colorear();
      estado('Región actualizada ✓', 'ok');
    });
  }
  let color = COLORES[siguienteColor()];
  $$('.ma-colores button', p).forEach(b => b.addEventListener('click', () => { color = b.dataset.c; $$('.ma-colores button', p).forEach(x => x.setAttribute('aria-checked', String(x === b))); }));
  $('#ma-nueva').addEventListener('submit', e => {
    e.preventDefault(); const n = $('#ma-nueva-n').value.trim(); if (!n) { $('#ma-nueva-n').focus(); return; }
    const id = 'r' + Date.now().toString(36);
    const nueva = { nombre: n, color, orden: Date.now() };
    C().regiones.push({ id, ...nueva }); regSel = id;
    if (modo === 'equipo') encolar(['regiones', id], nueva, true); else cambio();
    panel(); fichas(); colorear();
    const f = document.getElementById('ficha-' + id); if (f) f.open = true;
  });
  $$('[data-pf]', p).forEach(t => t.addEventListener('input', () => { const c2 = C(); c2.paises[paisSel] = c2.paises[paisSel] || {}; c2.paises[paisSel][t.dataset.pf] = t.value; if (modo === 'equipo') encolar(['paises', paisSel, t.dataset.pf], t.value); else cambio(); }));
}
function siguienteColor() { const usados = C().regiones.map(r => r.color); const i = COLORES.findIndex(c => !usados.includes(c)); return i < 0 ? C().regiones.length % COLORES.length : i; }

// ======================================================= fichas de región
function fichas() {
  const c = C(), cont$ = $('#ma-fichas');
  if (!c.regiones.length) { cont$.innerHTML = ''; cont$.dataset.firma = JSON.stringify([[], c.asign]); return; }
  const abiertas = new Set($$('#ma-fichas details[open]').map(d => d.dataset.id));
  cont$.dataset.firma = JSON.stringify([c.regiones.map(r => [r.id, r.nombre, r.color]), c.asign]);
  cont$.innerHTML = `<h3 class="ma-h3">${modo === 'equipo' ? 'Fichas de las regiones del equipo' : 'Fichas de mis regiones'}</h3>` + c.regiones.map(r => {
    const ps = Object.entries(c.asign).filter(([, x]) => x === r.id).map(([i]) => corto(PAIS[i] ? PAIS[i].n : i)).sort((a, b) => a.localeCompare(b, 'es'));
    const llenos = CAMPOS_REGION.filter(([f]) => (r[f] || '').trim()).length;
    return `<details class="ma-ficha" id="ficha-${r.id}" data-id="${r.id}" style="--c:${r.color}" ${abiertas.has(r.id) || r.id === regSel ? 'open' : ''}>
      <summary><i></i><b>${esc(r.nombre)}</b><small>${pl(ps.length, 'país', 'países')} · ${llenos} de ${CAMPOS_REGION.length} apartados</small></summary>
      <div class="ma-ficha-cuerpo">
        <label class="ma-campo">Nombre de la región<input data-rf="nombre" value="${esc(r.nombre)}" maxlength="60"></label>
        <p class="ma-paises"><b>Países:</b> ${ps.length ? esc(ps.join(', ')) : '<i>todavía ninguno: elige esta región y toca países en el mapa</i>'}</p>
        ${CAMPOS_REGION.map(([f, t, ph]) => `<label class="ma-campo"><span>${t} <small class="ma-autor" data-autor="${r.id}|${f}"></small></span><textarea data-rf="${f}" rows="${f === 'fuentes' ? 3 : 3}" placeholder="${esc(ph)}">${esc(r[f] || '')}</textarea></label>`).join('')}
        <div class="ma-ficha-pie"><span class="ma-cuenta">${CAMPOS_REGION.reduce((x, [f]) => x + palabras(r[f]), 0)} palabras</span><button type="button" class="ma-borrar" data-del="${r.id}">Eliminar región</button></div>
      </div></details>`;
  }).join('');
  $$('#ma-fichas [data-rf]').forEach(t => t.addEventListener('input', () => {
    const r = C().regiones.find(x => x.id === t.closest('details').dataset.id); r[t.dataset.rf] = t.value;
    if (modo === 'equipo') { encolar(['regiones', r.id, t.dataset.rf], t.value); if (t.dataset.rf !== 'nombre') { const c3 = C(); c3.por[r.id] = c3.por[r.id] || {}; c3.por[r.id][t.dataset.rf] = sesion.nombre; encolar(['por', r.id, t.dataset.rf], sesion.nombre); pintarAutores(); } } else cambio();
    if (t.dataset.rf === 'nombre') { panel(); t.closest('details').querySelector('summary b').textContent = t.value; }
    else t.closest('details').querySelector('.ma-cuenta').textContent = CAMPOS_REGION.reduce((x, [f]) => x + palabras(r[f]), 0) + ' palabras';
  }));
  pintarAutores();
  $$('#ma-fichas [data-del]').forEach(b => b.addEventListener('click', () => {
    const c2 = C(), r = c2.regiones.find(x => x.id === b.dataset.del);
    if (!confirm(`¿Eliminar la región «${r.nombre}»? Sus países quedarán sin región y se borrará lo que escribiste en su ficha.`)) return;
    c2.regiones = c2.regiones.filter(x => x.id !== r.id);
    Object.keys(c2.asign).forEach(i => { if (c2.asign[i] === r.id) { delete c2.asign[i]; if (modo === 'equipo') encolar(['asign', i], null, true); } });
    if (modo === 'equipo') { encolar(['regiones', r.id], null, true); encolar(['por', r.id], null, true); } else cambio();
    if (regSel === r.id) regSel = null; colorear(); panel(); fichas();
  }));
}

// ======================================================= Word (.docx) con el mapa
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(archivos) {
  const enc = new TextEncoder(), partes = [], central = []; let off = 0;
  const d = new Date(), hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const [nombre, contenido] of archivos) {
    const n = enc.encode(nombre), b = typeof contenido === 'string' ? enc.encode(contenido) : contenido, c = crc32(b);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, hora, true); h.setUint16(12, dia, true);
    h.setUint32(14, c, true); h.setUint32(18, b.length, true); h.setUint32(22, b.length, true); h.setUint16(26, n.length, true);
    partes.push(new Uint8Array(h.buffer), n, b);
    const k = new DataView(new ArrayBuffer(46));
    k.setUint32(0, 0x02014b50, true); k.setUint16(4, 20, true); k.setUint16(6, 20, true); k.setUint16(8, 0x0800, true); k.setUint16(12, hora, true); k.setUint16(14, dia, true);
    k.setUint32(16, c, true); k.setUint32(20, b.length, true); k.setUint32(24, b.length, true); k.setUint16(28, n.length, true); k.setUint32(42, off, true);
    central.push(new Uint8Array(k.buffer), n);
    off += 30 + n.length + b.length;
  }
  const tam = central.reduce((s, x) => s + x.length, 0), f = new DataView(new ArrayBuffer(22));
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, archivos.length, true); f.setUint16(10, archivos.length, true); f.setUint32(12, tam, true); f.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(f.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
const xe = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function wP(texto, o = {}) {
  const pPr = `<w:pPr>${o.estilo ? `<w:pStyle w:val="${o.estilo}"/>` : ''}${o.antes ? `<w:spacing w:before="${o.antes}"/>` : ''}${o.centro ? '<w:jc w:val="center"/>' : ''}</w:pPr>`;
  const run = (t, b, i, col) => t ? `<w:r><w:rPr>${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}${col ? `<w:color w:val="${col}"/>` : ''}</w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>` : '';
  const runs = Array.isArray(texto) ? texto.map(([t, b, i, col]) => run(t, b, i, col)).join('') : run(texto, o.negrita, o.cursiva, o.color);
  return `<w:p>${pPr}${runs}</w:p>`;
}
const parrafos = (t, vacio) => { const ps = String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean); return ps.length ? ps.map(x => wP(x)).join('') : wP(vacio || '(sin escribir)', { cursiva: true, color: '888888' }); };
async function mapaPNG(k, CONTS) {
  const c = CONTS[k] || vacioCont();
  const [x, y, w, h] = (() => { const [a, b, cw, ch] = A.mundo.cajas[k], m = .05; return [a - cw * m, b - ch * m, cw * (1 + 2 * m), ch * (1 + 2 * m)]; })();
  const W = 1600, H = Math.round(W * h / w);
  const color = id => { const r = c.asign[id] && c.regiones.find(z => z.id === c.asign[id]); return r ? r.color : '#E8E1D3'; };
  let s = `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}"><rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" fill="#EAF1F3"/>`;
  A.mundo.paises.forEach(p => { const mio = p.i && PAIS[p.i] && PAIS[p.i].cont === k; s += `<path d="${p.d}" fill="${mio ? color(p.i) : '#F4F1EA'}" stroke="#FFFFFF" stroke-width="${w / 900}"/>`; });
  A.mundo.islas.forEach(i => { if (PAIS[i.i] && PAIS[i.i].cont === k) s += `<circle cx="${i.x}" cy="${i.y}" r="${w / 160}" fill="${color(i.i)}" stroke="#555" stroke-width="${w / 1600}"/>`; });
  s += '</svg>';
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(img, 0, 0, W, H);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), W, H };
}
async function descargarWord() {
  let CONTS = T.conts;
  if (modo === 'equipo') {
    await flushEquipo(); CONTS = {};
    await Promise.all(Object.keys(A.continentes).map(async k => { try { const sn = await getDoc(refEq(k)); if (sn.exists()) CONTS[k] = aEspejo(sn.data()); } catch { /* */ } }));
    CONTS[cont] = CONTS[cont] || C();
  } else await guardarYa();
  const conts = Object.keys(A.continentes).filter(k => CONTS[k] && (CONTS[k].regiones.length || Object.keys(CONTS[k].paises).length));
  if (!conts.length) { alert('Todavía no tienes regiones creadas. Crea al menos una y clasifica algunos países.'); return; }
  const b = $('#ma-word'); b.disabled = true; b.textContent = 'Preparando…';
  try {
    const imgs = [], cuerpo = [];
    cuerpo.push(wP('Mi atlas de las cocinas del mundo', { estilo: 'Titulo', centro: true }));
    const equipo = modo === 'equipo' ? (EQ.nombres || []) : (T.equipo || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
    if (equipo.length) { cuerpo.push(wP(modo === 'equipo' ? `Equipo «${EQ.nombre}»:` : 'Equipo:', { centro: true, negrita: true })); equipo.forEach(n => cuerpo.push(wP(n, { centro: true }))); }
    else cuerpo.push(wP(sesion.anon ? 'Alumno: ____________________' : `Alumno: ${sesion.nombre}`, { centro: true }));
    cuerpo.push(wP('Origen de las Cocinas · ITES René Descartes', { centro: true }));
    cuerpo.push(wP(new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), { centro: true }));
    for (const k of conts) {
      const c = CONTS[k], con = A.continentes[k];
      cuerpo.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
      cuerpo.push(wP(`${con.nombre} (subtema ${con.sub})`, { estilo: 'Titulo1' }));
      const total = paisesDe(k).length, hechos = Object.keys(c.asign).filter(i => PAIS[i] && PAIS[i].cont === k).length;
      cuerpo.push(wP(`${modo === 'equipo' ? 'Clasificamos' : 'Clasifiqué'} ${hechos} de ${total} países en ${pl(c.regiones.length, 'región culinaria', 'regiones culinarias')}.`));
      const png = await mapaPNG(k, CONTS), n = imgs.length + 1; imgs.push(png.bytes);
      const cx = 5943600, cy = Math.round(cx * png.H / png.W);
      cuerpo.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Mapa ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="mapa${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
      // leyenda
      c.regiones.forEach(r => cuerpo.push(wP([['■ ', true, false, r.color.slice(1)], [r.nombre, true]])));
      const sinReg = paisesDe(k).filter(p => !c.asign[p.id]).map(p => corto(p.n)).sort((a, b) => a.localeCompare(b, 'es'));
      for (const r of c.regiones) {
        const ps = Object.entries(c.asign).filter(([, x]) => x === r.id).map(([i]) => corto(PAIS[i] ? PAIS[i].n : i)).sort((a, b) => a.localeCompare(b, 'es'));
        cuerpo.push(wP([['■ ', true, false, r.color.slice(1)], [r.nombre]], { estilo: 'Titulo2' }));
        cuerpo.push(wP([['Países: ', true], [ps.length ? ps.join(', ') + '.' : 'ninguno todavía.']]));
        CAMPOS_REGION.forEach(([f, t]) => { const au = modo === 'equipo' && ((c.por || {})[r.id] || {})[f]; cuerpo.push(wP(au ? [[t, true], [`  (escribió: ${au})`, false, true, '888888']] : t, { negrita: true, antes: 160 })); cuerpo.push(parrafos(r[f])); });
      }
      const notas = Object.entries(c.paises).filter(([i, v]) => PAIS[i] && PAIS[i].cont === k && ((v.platillos || '').trim() || (v.notas || '').trim()));
      if (notas.length) {
        cuerpo.push(wP('Notas por país', { estilo: 'Titulo2' }));
        notas.sort((a, b) => PAIS[a[0]].n.localeCompare(PAIS[b[0]].n, 'es')).forEach(([i, v]) => {
          cuerpo.push(wP(corto(PAIS[i].n), { negrita: true, antes: 160 }));
          if ((v.platillos || '').trim()) cuerpo.push(wP([['Platillos: ', true], [v.platillos.trim()]]));
          if ((v.notas || '').trim()) cuerpo.push(parrafos(v.notas));
        });
      }
      if (sinReg.length) cuerpo.push(wP([[modo === 'equipo' ? 'Países que aún no clasificamos: ' : 'Países que aún no clasifiqué: ', true, false, '888888'], [sinReg.join(', ') + '.', false, true, '888888']], { antes: 200 }));
    }
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${cuerpo.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const estilo = (id, nombre, tam, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nombre}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/>${extra}</w:pPr><w:rPr><w:b/><w:sz w:val="${tam}"/><w:szCs w:val="${tam}"/></w:rPr></w:style>`;
    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="es-MX"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${estilo('Titulo', 'Title', 40)}${estilo('Titulo1', 'heading 1', 32, '<w:outlineLvl w:val="0"/>')}${estilo('Titulo2', 'heading 2', 26, '<w:outlineLvl w:val="1"/>')}</w:styles>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${imgs.map((_, i) => `<Relationship Id="rImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/mapa${i + 1}.png"/>`).join('')}</Relationships>`;
    const blob = zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/_rels/document.xml.rels', rels],
      ['word/document.xml', documento],
      ['word/styles.xml', estilos],
      ...imgs.map((bytes, i) => [`word/media/mapa${i + 1}.png`, bytes]),
    ]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Mi_atlas_${slug(modo === 'equipo' ? 'equipo ' + EQ.nombre : (T.equipo || '').trim() ? 'equipo ' + (sesion.anon ? '' : sesion.nombre) : (sesion.anon ? 'borrador' : sesion.nombre))}.docx`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { alert('No se pudo generar el Word: ' + (e.message || e)); }
  finally { b.disabled = false; b.textContent = '⬇ Descargar en Word'; }
}
$('#ma-word').addEventListener('click', descargarWord);
window.addEventListener('resize', () => { if (T && !$('#ma-app').hidden && !$('#panel-miatlas').hidden) { clearTimeout(window._maR); window._maR = setTimeout(ajustarVista, 250); } });
