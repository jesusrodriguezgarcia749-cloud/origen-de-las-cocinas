// mi-atlas.js — «Mi atlas»: mapa en blanco por continente donde el alumno arma sus
// propias regiones culinarias, las colorea y escribe sus fichas. Se guarda en
// grupos/{grupo}/alumnos/{alumno}/atlas/mi-atlas (y una copia en el navegador);
// el docente ve el avance en el Panel docente. Se descarga en Word (.docx).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, deleteField, FieldPath, collection, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { DocITES, mapaContinentePNG, ABREV } from "./docx-ites.js";

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
let ultimaNota = '';
const nota = d => { ultimaNota = d; };
const nomCampo = f => ({ nombre: 'el nombre', ...Object.fromEntries(CAMPOS_REGION.map(([k, t]) => [k, t])) })[f] || f;
let codigoPendiente = null, abiertos = true, eqDocUnsub = null, msgModo = '';
let vuelo = new Map();
let modo = 'personal', EQ = null, TE = {}, unsub = null, pend = new Map(), pendT = null, existe = {};
let A = null, sesion = null, T = null, cont = 'africa', regSel = null, paisSel = null, timer = null, iniciado = false;
let PAIS = {}, CONT_DE = {};

// ======================================================= arranque
async function iniciar() {
  if (iniciado) return; iniciado = true;
  A = await fetch('data/atlas.json').then(r => r.json());
  Object.entries(A.regiones).forEach(([k, r]) => r.paises.forEach(p => { PAIS[p.id] = { ...p, cont: r.cont }; }));
  const mc = location.hash.match(/unir-([A-Z0-9]{4})/i); if (mc) codigoPendiente = mc[1].toUpperCase();
  if (codigoPendiente) { const av = document.createElement('p'); av.className = 'ma-aviso-unir'; av.innerHTML = `👥 Vas a unirte al equipo con el código <b>${esc(codigoPendiente)}</b>. Entra con tu nombre y PIN.`; $('.ma-login h2').after(av); }
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
  if (!sesion.anon) { try { const g = await getDoc(doc(db, 'grupos', sesion.grupoId)); abiertos = !g.exists() || g.data().equiposAbiertos !== false; } catch { /* */ } }
  if (EQ) modo = lsGet('miatlas_modo') === 'personal' ? 'personal' : 'equipo';
  pintarConts(); await cambiarModo(modo);
  if (codigoPendiente && !sesion.anon) { const c = codigoPendiente; codigoPendiente = null; history.replaceState(null, '', '#miatlas'); await unirse(c); }
}
// ---- unirse a un equipo con su código (o el QR, que trae el código en la dirección)
const refEquipo = id => doc(db, 'grupos', sesion.grupoId, 'equipos', id);
const firmaAlumno = () => ({ ultimoAutor: sesion.alumnoId, ultimoPin: sesion.pin });
async function unirse(codigo) {
  codigo = String(codigo || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(codigo)) { avisoModo('El código de equipo tiene 4 letras o números.', 'mal'); return; }
  try {
    const sn = await getDocs(collection(db, 'grupos', sesion.grupoId, 'equipos'));
    let t = null; sn.forEach(d => { if ((d.data().codigo || '').toUpperCase() === codigo) t = { id: d.id, ...d.data() }; });
    if (!t) { avisoModo(`No encontramos un equipo con el código ${codigo} en tu grupo. Revísalo con tu maestro.`, 'mal'); return; }
    const integ = t.integrantes || [], noms = t.nombres || [];
    if (integ.includes(sesion.alumnoId)) { EQ = t; avisoModo(`Ya eres parte de «${t.nombre}».`, 'ok'); await cambiarModo('equipo'); return; }
    const g = await getDoc(doc(db, 'grupos', sesion.grupoId)); abiertos = !g.exists() || g.data().equiposAbiertos !== false;
    if (!abiertos) { avisoModo('Las inscripciones a equipos ya están cerradas. Pídele a tu maestro que te cambie.', 'mal'); return; }
    if (t.max && integ.length >= t.max) { avisoModo(`«${t.nombre}» ya está completo (${t.max} integrantes). Elige otro equipo.`, 'mal'); return; }
    if (EQ && EQ.id !== t.id) {   // salir del equipo anterior
      const v = await getDoc(refEquipo(EQ.id));
      if (v.exists()) { const vi = v.data().integrantes || [], vn = v.data().nombres || [], k = vi.indexOf(sesion.alumnoId);
        if (k >= 0) await updateDoc(refEquipo(EQ.id), { integrantes: vi.filter((_, i) => i !== k), nombres: vn.filter((_, i) => i !== k), ...firmaAlumno() }); }
    }
    await updateDoc(refEquipo(t.id), { integrantes: [...integ, sesion.alumnoId], nombres: [...noms, sesion.nombre], ...firmaAlumno() });
    EQ = { ...t, integrantes: [...integ, sesion.alumnoId], nombres: [...noms, sesion.nombre] };
    avisoModo(`¡Listo! Ya eres parte de «${t.nombre}». ${t.nombre.startsWith('Equipo ') ? 'Pónganle nombre a su equipo con ✏️.' : ''}`, 'ok');
    await cambiarModo('equipo');
  } catch (e) { avisoModo('No se pudo unir al equipo: ' + (e.message || e), 'mal'); }
}
function avisoModo(t, c) { msgModo = t ? `<p class="ma-msg ${c || ''}">${esc(t)}</p>` : ''; pintarModo(); }
function escucharEquipo() {
  if (eqDocUnsub) { eqDocUnsub(); eqDocUnsub = null; }
  if (!EQ || sesion.anon) return;
  eqDocUnsub = onSnapshot(refEquipo(EQ.id), sn => {
    if (!sn.exists()) { EQ = null; if (modo === 'equipo') cambiarModo('personal'); else pintarModo(); return; }
    const d = sn.data();
    if (!(d.integrantes || []).includes(sesion.alumnoId)) { EQ = null; avisoModo('Ya no formas parte de ese equipo.', 'mal'); if (modo === 'equipo') cambiarModo('personal'); return; }
    const cambio = d.nombre !== EQ.nombre || JSON.stringify(d.nombres) !== JSON.stringify(EQ.nombres);
    EQ = { id: sn.id, ...d };
    const act = document.activeElement;
    if (cambio && !(act && $('#ma-modo').contains(act))) pintarModo();
  });
}
function pintarModo() {
  const m = $('#ma-modo');
  if (!sesion || sesion.anon) { m.hidden = true; return; }
  m.hidden = false;
  const formCodigo = (txt, bot) => `<form class="ma-unir" id="ma-unir"><label for="ma-codigo">${txt}</label><div><input id="ma-codigo" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="ABCD" aria-label="Código del equipo"><button type="submit" class="btn-at">${bot}</button></div></form>`;
  if (!EQ) {
    m.innerHTML = msgModo + (abiertos ? formCodigo('👥 ¿Tu maestro formó equipos? Escanea el QR de tu equipo o escribe su código de 4 letras:', 'Unirme') : '<p class="ma-integrantes">Trabajas en tu atlas personal. (Las inscripciones a equipos están cerradas.)</p>');
  } else {
    m.innerHTML = [['equipo', `👥 Atlas del equipo «${esc(EQ.nombre)}»`], ['personal', '👤 Mi atlas personal']].map(([k, t]) => `<button type="button" class="chip-at" data-m="${k}" aria-pressed="${k === modo}">${t}</button>`).join('')
      + `<p class="ma-integrantes">${modo === 'equipo' ? `Integrantes: ${esc((EQ.nombres || []).join(', '))}. Todo lo que escriban se ve en vivo en los celulares de todos.` : 'Este es tu trabajo individual: tu equipo no lo ve.'}</p>`
      + msgModo
      + `<div class="ma-eq-acc"><button type="button" class="ma-link" id="ma-renombrar">✏️ Cambiar el nombre del equipo</button>${abiertos ? '<button type="button" class="ma-link" id="ma-cambiar">🔁 Cambiarme de equipo</button>' : ''}</div><div id="ma-eq-form"></div>`;
    $$('[data-m]', m).forEach(b => b.addEventListener('click', () => { if (b.dataset.m !== modo) { msgModo = ''; cambiarModo(b.dataset.m); } }));
    $('#ma-renombrar').addEventListener('click', () => {
      $('#ma-eq-form').innerHTML = `<form class="ma-unir" id="ma-ren-form"><label for="ma-ren">Nombre del equipo</label><div><input id="ma-ren" maxlength="40" value="${esc(EQ.nombre)}"><button type="submit" class="btn-at">Guardar</button></div></form>`;
      const i = $('#ma-ren'); i.focus(); i.select();
      $('#ma-ren-form').addEventListener('submit', async e => {
        e.preventDefault(); const n = i.value.trim(); if (!n) return;
        try { await updateDoc(refEquipo(EQ.id), { nombre: n, ...firmaAlumno() }); EQ.nombre = n; avisoModo('Nombre del equipo actualizado ✓', 'ok'); }
        catch (er) { avisoModo('No se pudo cambiar el nombre: ' + (er.message || er), 'mal'); }
      });
    });
    const bc = $('#ma-cambiar');
    if (bc) bc.addEventListener('click', () => { $('#ma-eq-form').innerHTML = formCodigo('Escribe el código del equipo al que te quieres cambiar:', 'Cambiarme'); conectarCodigo(); $('#ma-codigo').focus(); });
  }
  conectarCodigo();
}
function conectarCodigo() {
  const f = $('#ma-unir'); if (!f || f._listo || f.id !== 'ma-unir') return; f._listo = true;
  f.addEventListener('submit', e => { e.preventDefault(); unirse($('#ma-codigo').value); });
}
async function cambiarModo(mo) {
  await flushEquipo(); if (timer) await guardarYa();
  if (mo === 'equipo' && !EQ) mo = 'personal';
  modo = mo; lsSet('miatlas_modo', mo); regSel = null; paisSel = null; editando = null;
  escucharEquipo();
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
  [...vuelo.values(), ...pend.values()].forEach(([ruta, v]) => {
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
  const lote = [...pend.values()]; pend.forEach((v, k) => vuelo.set(k, v)); pend.clear();
  const k = cont, ref = refEq(k);
  try {
    if (!existe[k]) { const s0 = await getDoc(ref); if (!s0.exists()) await setDoc(ref, { regiones: {}, asign: {}, paises: {}, por: {}, ultimoAutor: sesion.alumnoId, ultimoPin: sesion.pin, actualizado: serverTimestamp() }); existe[k] = true; }
    const args = [];
    lote.forEach(([ruta, v]) => { args.push(new FieldPath(...ruta), v === null ? deleteField() : v); });
    args.push('ultimoAutor', sesion.alumnoId, 'ultimoPin', sesion.pin, 'ultimoNombre', sesion.nombre, 'ultimoCambio', ultimaNota, 'actualizado', serverTimestamp());
    await updateDoc(ref, ...args);
    lote.forEach(([ruta]) => vuelo.delete(ruta.join('\u0001')));
    if (!pend.size) estado('Sincronizado con tu equipo ✓', 'ok');
  } catch (e) {
    lote.forEach(([ruta, v]) => { const key = ruta.join('\u0001'); vuelo.delete(key); if (!pend.has(key)) pend.set(key, [ruta, v]); });
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
  const firma = firmaFichas;
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
function firmaFichas(c) { return JSON.stringify([c.regiones.map(r => [r.id, r.nombre, r.color]), Object.keys(c.asign).sort().map(k => [k, c.asign[k]])]); }
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
      pinVerificado: sesion.pin, nombre: sesion.nombre, equipo: (T.equipo || '').trim(), datos: T, avance: resumen(), ultimoCambio: ultimaNota, ultimoCont: cont, actualizado: serverTimestamp()
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
  // nombres de los países (los que caben)
  const [, , cw, ch] = A.mundo.cajas[cont], fs = cw / 70, min = (cw * ch) / 1800;
  const ge = el('g', { class: 'ma-etq' }, svg);
  A.mundo.paises.forEach(p => {
    if (!(p.i && PAIS[p.i] && PAIS[p.i].cont === cont && p.c && p.a >= min)) return;
    const f = Math.min(fs * 1.15, Math.max(fs * .6, fs * Math.sqrt(p.a / (min * 5))));
    const t = el('text', { x: p.c[0], y: p.c[1], 'font-size': f.toFixed(2), 'stroke-width': (f / 4).toFixed(2) }, ge); t.textContent = ABREV[p.i] || corto(p.n);
  });
  A.mundo.islas.forEach(i => { if (PAIS[i.i] && PAIS[i.i].cont === cont) { const t = el('text', { x: i.x + fs * .7, y: i.y, 'font-size': (fs * .7).toFixed(2), 'stroke-width': (fs / 6).toFixed(2), class: 'izq' }, ge); t.textContent = i.n; } });
  svg.classList.toggle('sin-nombres', lsGet('miatlas_nombres') === '0');
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
  const sinN = lsGet('miatlas_nombres') === '0';
  $('#ma-progreso').innerHTML = `<b>${A.continentes[cont].nombre}:</b> ${hechos} de ${total} países clasificados · ${pl(C().regiones.length, 'región creada', 'regiones creadas')}
    <span class="ma-barra-p"><i style="width:${total ? Math.round(100 * hechos / total) : 0}%"></i></span>
    <button type="button" class="chip-at ma-nombres" aria-pressed="${!sinN}">🏷️ ${sinN ? 'Mostrar' : 'Ocultar'} nombres</button>`;
  $('#ma-progreso .ma-nombres').addEventListener('click', () => { lsSet('miatlas_nombres', sinN ? '1' : '0'); $('#ma-svg').classList.toggle('sin-nombres', !sinN); colorear(); });
}
function tocarPais(id) {
  const c = C();
  if (regSel) {
    const nuevo = c.asign[id] === regSel ? null : regSel;
    nota(`${nuevo ? 'pintó' : 'quitó'} ${corto(PAIS[id].n)} ${nuevo ? 'en' : 'de'} ${(c.regiones.find(r => r.id === regSel) || {}).nombre || 'una región'}`);
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
    return `<div class="ma-reg-fila"><button type="button" class="ma-reg" data-id="${r.id}" aria-pressed="${r.id === regSel}" style="--c:${r.color}"><i></i><span>${esc(r.nombre)}</span><small>${pl(n, 'país', 'países')}</small></button><button type="button" class="ma-editar" data-edit="${r.id}" aria-label="Cambiar nombre o color de ${esc(r.nombre)}" title="Cambiar nombre o color">✏️ <span>Nombre y color</span></button></div>`;
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
      nota(`renombró la región «${n}»`); r.nombre = n; r.color = col; editando = null;
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
    const nueva = { nombre: n, color, orden: Date.now() }; nota(`creó la región «${n}»`);
    C().regiones.push({ id, ...nueva }); regSel = id;
    if (modo === 'equipo') encolar(['regiones', id], nueva, true); else cambio();
    panel(); fichas(); colorear();
    const f = document.getElementById('ficha-' + id); if (f) f.open = true;
  });
  $$('[data-pf]', p).forEach(t => t.addEventListener('input', () => { const c2 = C(); c2.paises[paisSel] = c2.paises[paisSel] || {}; c2.paises[paisSel][t.dataset.pf] = t.value; nota(`escribe sobre ${corto(PAIS[paisSel].n)}`); if (modo === 'equipo') encolar(['paises', paisSel, t.dataset.pf], t.value); else cambio(); }));
}
function siguienteColor() { const usados = C().regiones.map(r => r.color); const i = COLORES.findIndex(c => !usados.includes(c)); return i < 0 ? C().regiones.length % COLORES.length : i; }

// ======================================================= fichas de región
function fichas() {
  const c = C(), cont$ = $('#ma-fichas');
  if (!c.regiones.length) { cont$.innerHTML = ''; cont$.dataset.firma = firmaFichas(c); return; }
  const abiertas = new Set($$('#ma-fichas details[open]').map(d => d.dataset.id));
  cont$.dataset.firma = firmaFichas(c);
  cont$.innerHTML = `<h3 class="ma-h3">${modo === 'equipo' ? 'Fichas de las regiones del equipo' : 'Fichas de mis regiones'}</h3>` + c.regiones.map(r => {
    const ps = Object.entries(c.asign).filter(([, x]) => x === r.id).map(([i]) => corto(PAIS[i] ? PAIS[i].n : i)).sort((a, b) => a.localeCompare(b, 'es'));
    const llenos = CAMPOS_REGION.filter(([f]) => (r[f] || '').trim()).length;
    return `<details class="ma-ficha" id="ficha-${r.id}" data-id="${r.id}" style="--c:${r.color}" ${abiertas.has(r.id) || r.id === regSel ? 'open' : ''}>
      <summary><i></i><b>${esc(r.nombre)}</b><small>${pl(ps.length, 'país', 'países')} · ${llenos} de ${CAMPOS_REGION.length} apartados</small></summary>
      <div class="ma-ficha-cuerpo">
        <label class="ma-campo">Nombre de la región<input data-rf="nombre" value="${esc(r.nombre)}" maxlength="60"></label>
        <div class="ma-ficha-color"><span>Color en el mapa:</span>${COLORES.map(col => `<button type="button" data-fcol="${col}" aria-label="Usar este color" aria-pressed="${col === r.color}" style="--c:${col}"></button>`).join('')}</div>
        <p class="ma-paises"><b>Países:</b> ${ps.length ? esc(ps.join(', ')) : '<i>todavía ninguno: elige esta región y toca países en el mapa</i>'}</p>
        ${CAMPOS_REGION.map(([f, t, ph]) => `<label class="ma-campo"><span>${t} <small class="ma-autor" data-autor="${r.id}|${f}"></small></span><textarea data-rf="${f}" rows="${f === 'fuentes' ? 3 : 3}" placeholder="${esc(ph)}">${esc(r[f] || '')}</textarea></label>`).join('')}
        <div class="ma-ficha-pie"><span class="ma-cuenta">${CAMPOS_REGION.reduce((x, [f]) => x + palabras(r[f]), 0)} palabras</span><button type="button" class="ma-borrar" data-del="${r.id}">Eliminar región</button></div>
      </div></details>`;
  }).join('');
  $$('#ma-fichas [data-rf]').forEach(t => t.addEventListener('input', () => {
    const r = C().regiones.find(x => x.id === t.closest('details').dataset.id); r[t.dataset.rf] = t.value; nota(`escribe ${nomCampo(t.dataset.rf).toLowerCase()} de «${r.nombre}»`);
    if (modo === 'equipo') { encolar(['regiones', r.id, t.dataset.rf], t.value); if (t.dataset.rf !== 'nombre') { const c3 = C(); c3.por[r.id] = c3.por[r.id] || {}; c3.por[r.id][t.dataset.rf] = sesion.nombre; encolar(['por', r.id, t.dataset.rf], sesion.nombre); pintarAutores(); } } else cambio();
    if (t.dataset.rf === 'nombre') { panel(); t.closest('details').querySelector('summary b').textContent = t.value; }
    else t.closest('details').querySelector('.ma-cuenta').textContent = CAMPOS_REGION.reduce((x, [f]) => x + palabras(r[f]), 0) + ' palabras';
  }));
  pintarAutores();
  $$('#ma-fichas [data-fcol]').forEach(b => b.addEventListener('click', () => {
    const r = C().regiones.find(x => x.id === b.closest('details').dataset.id), col = b.dataset.fcol; if (r.color === col) return;
    r.color = col; nota(`cambió el color de «${r.nombre}»`);
    if (modo === 'equipo') encolar(['regiones', r.id, 'color'], col, true); else cambio();
    colorear(); panel(); fichas();
  }));
  $$('#ma-fichas [data-del]').forEach(b => b.addEventListener('click', () => {
    const c2 = C(), r = c2.regiones.find(x => x.id === b.dataset.del);
    if (!confirm(`¿Eliminar la región «${r.nombre}»? Sus países quedarán sin región y se borrará lo que escribiste en su ficha.`)) return;
    nota(`eliminó la región «${r.nombre}»`); c2.regiones = c2.regiones.filter(x => x.id !== r.id);
    Object.keys(c2.asign).forEach(i => { if (c2.asign[i] === r.id) { delete c2.asign[i]; if (modo === 'equipo') encolar(['asign', i], null, true); } });
    if (modo === 'equipo') { encolar(['regiones', r.id], null, true); encolar(['por', r.id], null, true); } else cambio();
    if (regSel === r.id) regSel = null; colorear(); panel(); fichas();
  }));
}

// ======================================================= Word (.docx) con el diseño del Aula
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
    const D = new DocITES(); await D.cargarLogo();
    const equipo = modo === 'equipo' ? (EQ.nombres || []) : (T.equipo || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
    const nos = modo === 'equipo' || equipo.length > 1;
    D.portada({
      kicker: 'Tema 3 · Cocinas en el mundo', titulo: 'Atlas de las cocinas del mundo',
      subtitulo: `Regiones culinarias propuestas por ${nos ? 'nuestro equipo' : 'mí'}: ${conts.map(k => A.continentes[k].nombre).join(', ')}`,
      etiqueta: modo === 'equipo' ? `Equipo «${EQ.nombre}»` : equipo.length ? 'Equipo' : 'Alumno',
      personas: equipo.length ? equipo : [sesion.anon ? '______________________________' : sesion.nombre],
    });
    for (const k of conts) {
      const c = CONTS[k], con = A.continentes[k];
      const total = paisesDe(k).length, hechos = Object.keys(c.asign).filter(i => PAIS[i] && PAIS[i].cont === k).length;
      D.h1(`${con.nombre}`, `Subtema ${con.sub} · ${nos ? 'Clasificamos' : 'Clasifiqué'} ${hechos} de ${total} países en ${pl(c.regiones.length, 'región culinaria', 'regiones culinarias')}.`);
      const colorDe = id => { const r = c.asign[id] && c.regiones.find(z => z.id === c.asign[id]); return r ? r.color : null; };
      const png = await mapaContinentePNG(A, PAIS, k, colorDe, { nombres: true });
      D.imagen(png.bytes, png.W, png.H, Math.min(16.5, 18 * png.W / png.H));
      // leyenda: región, color, países
      const filas = [['', 'Región', 'Países']];
      c.regiones.forEach(r => {
        const ps = Object.entries(c.asign).filter(([, x]) => x === r.id).map(([i]) => corto(PAIS[i] ? PAIS[i].n : i)).sort((a, b) => a.localeCompare(b, 'es'));
        filas.push([{ t: '', fondo: r.color }, { t: r.nombre, b: true }, ps.join(', ') || '—']);
      });
      if (filas.length > 1) D.tabla(filas, { anchos: [500, 2600, 6260] });
      for (const r of c.regiones) {
        const ps = Object.entries(c.asign).filter(([, x]) => x === r.id).length;
        D.h2(r.nombre, r.color, `· ${pl(ps, 'país', 'países')}`);
        const por = (c.por || {})[r.id] || {};
        D.ficha(CAMPOS_REGION.map(([f, t]) => [t, r[f], modo === 'equipo' ? por[f] : null]));
      }
      const notas = Object.entries(c.paises).filter(([i, v]) => PAIS[i] && PAIS[i].cont === k && ((v.platillos || '').trim() || (v.notas || '').trim()));
      if (notas.length) {
        D.h2('Notas por país', '8A8072');
        D.tabla([['País', 'Platillos', 'Notas e investigación'], ...notas.sort((a, b) => PAIS[a[0]].n.localeCompare(PAIS[b[0]].n, 'es')).map(([i, v]) => [{ t: corto(PAIS[i].n), b: true }, (v.platillos || '').trim() || '—', (v.notas || '').trim() || '—'])], { anchos: [2200, 3000, 4160] });
      }
      const sinReg = paisesDe(k).filter(p => !c.asign[p.id]).map(p => corto(p.n)).sort((a, b) => a.localeCompare(b, 'es'));
      if (sinReg.length) D.nota(`${nos ? 'Países que aún no clasificamos' : 'Países que aún no clasifiqué'}: ${sinReg.join(', ')}.`);
      if (k !== conts[conts.length - 1]) D.saltoPagina();
    }
    D.descargar(`Atlas_${slug(modo === 'equipo' ? 'equipo ' + EQ.nombre : (T.equipo || '').trim() ? 'equipo ' + (sesion.anon ? '' : sesion.nombre) : (sesion.anon ? 'borrador' : sesion.nombre))}`);
  } catch (e) { alert('No se pudo generar el Word: ' + (e.message || e)); }
  finally { b.disabled = false; b.textContent = '⬇ Descargar en Word'; }
}
$('#ma-word').addEventListener('click', descargarWord);
window.addEventListener('resize', () => { if (T && !$('#ma-app').hidden && !$('#panel-miatlas').hidden) { clearTimeout(window._maR); window._maR = setTimeout(ajustarVista, 250); } });
