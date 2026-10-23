// tareas.js — «Tareas»: juegos didácticos del Parcial 2. Cada actividad calificable cuenta como
// una tarea del catálogo (tareas_catalogo/dig-{id}); el docente la abre o la cierra, la califica y
// el alumno la entrega aquí.
// · Cuadro mexica–maya: en equipo (grupos/{g}/equipos/{e}/atlas/act-cuadro-mm) o individual
//   (grupos/{g}/alumnos/{a}/atlas/tarea-cuadro-mm), con la clave que libera el docente.
// · Desarma el platillo: individual (grupos/{g}/alumnos/{a}/atlas/tarea-desarma).
// · ¿Aportó o llegó?: práctica sin calificación.
// · Mi atlas de cada continente vive en el Atlas (atlas.html#miatlas=continente).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, FieldPath, collection, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { CUADRO_MM, PLATILLOS, TEMAS_TAREAS, TAREAS_DIG, califica, catalogoId, sugerirCuadro, MIN_PALABRAS_CELDA, INFLUENCIAS, sugerirInfluencias } from "./clase-datos.js";
import { DocITES } from "./docx-ites.js";
import { INGREDIENTES, CONTINENTES } from "./aporto-datos.js";
import { BALUARTES, CAMPECHE, QUE_INFLUENCIA, PAISES_AM, PLATILLOS_AM } from "./america-datos.js";
import { formacionDe, formaciones, formacionDeTarea, abiertas as inscAbiertas, equipoDe, equiposDe, tareasDeFormacion, enEquipo } from "./equipos.js";

const db = getFirestore(initializeApp(firebaseConfig));
const SESSION_KEY = 'oc_sesion_alumno';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const slug = n => n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };
const palabras = t => (String(t || '').trim().match(/\S+/g) || []).length;
const barajar = a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
const punto = t => /\.$/.test(t) ? t : t + '.';
const fechaHora = ts => { const d = ts && ts.toDate ? ts.toDate() : typeof ts === 'number' ? new Date(ts) : null; return d ? d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; };
let sesion = null; try { sesion = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { sesion = null; }
let EQS = null, GDATA = {}, ESTADO = {}, unsubGrupo = null, detener = null;
const abierta = id => !(ESTADO[id] && ESTADO[id].abierta === false);

// ======================================================= acceso y equipo
async function cargarGruposEn(sel) {
  try { const sn = await getDocs(query(collection(db, 'grupos'), orderBy('nombre'))); sel.innerHTML = '<option value="">— Elige tu grupo —</option>' + sn.docs.map(d => `<option value="${d.id}">${esc(d.data().nombre)}</option>`).join(''); }
  catch { sel.innerHTML = '<option value="">No se pudieron cargar los grupos</option>'; }
}
function formAcceso(cont, alEntrar, titulo = 'Entra con tu nombre y PIN') {
  cont.innerHTML = `<div class="ma-login cl-login"><h3>${titulo}</h3>
    <form id="cl-form"><label for="cl-grupo">Tu grupo</label><select id="cl-grupo"><option value="">Cargando grupos…</option></select>
    <label for="cl-nombre">Tu nombre completo</label><input id="cl-nombre" type="text" autocomplete="name" placeholder="Como te registró tu docente">
    <label for="cl-pin">PIN</label><input id="cl-pin" type="text" inputmode="numeric" placeholder="4 dígitos">
    <button type="submit" class="btn-at">Entrar</button><p class="ma-error" id="cl-error" hidden></p></form></div>`;
  cargarGruposEn($('#cl-grupo'));
  $('#cl-form').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#cl-error'); err.hidden = true;
    const g = $('#cl-grupo').value, n = $('#cl-nombre').value.trim(), pin = $('#cl-pin').value.trim();
    if (!g || !n || !pin) { err.textContent = 'Completa grupo, nombre y PIN.'; err.hidden = false; return; }
    try {
      const id = slug(n), s = await getDoc(doc(db, 'grupos', g, 'alumnos', id));
      if (!s.exists() || String(s.data().pin) !== pin) { err.textContent = 'No encontramos ese nombre y PIN en el grupo elegido. Verifica con tu docente.'; err.hidden = false; return; }
      sesion = { grupoId: g, alumnoId: id, nombre: s.data().nombre, pin };
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion)); } catch { /* */ }
      EQS = null; escucharGrupo(); alEntrar();
    } catch (e2) { err.textContent = 'No se pudo entrar: ' + (e2.message || e2); err.hidden = false; }
  });
}
// Los equipos van por «formaciones»: cada tarea en equipo usa una (ver equipos.js).
async function cargarEquipos(forzar) {
  if (EQS && !forzar) return;
  const [g, sn] = await Promise.all([getDoc(doc(db, 'grupos', sesion.grupoId)), getDocs(collection(db, 'grupos', sesion.grupoId, 'equipos'))]);
  GDATA = g.exists() ? g.data() : {}; EQS = sn.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function equipo(tareaId) {
  try { await cargarEquipos(); } catch { return null; }
  return equipoDe(EQS, formacionDeTarea(GDATA, tareaId), sesion.alumnoId);
}
// une al alumno al equipo del código; si se pasa la tarea, el código debe ser de sus equipos
async function unirseCodigo(codigo, tareaId) {
  codigo = String(codigo || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(codigo)) throw new Error('El código de equipo tiene 4 letras o números.');
  await cargarEquipos(true);
  const t = EQS.find(e => (e.codigo || '').toUpperCase() === codigo);
  if (!t) throw new Error(`No hay un equipo con el código ${codigo} en tu grupo.`);
  const fid = formacionDe(t), F = formaciones(GDATA)[fid] || {};
  if (tareaId && formacionDeTarea(GDATA, tareaId) !== fid) throw new Error(`El código ${codigo} es de otros equipos («${F.nombre}»), no de los de esta tarea. Revisa el código con tu maestro.`);
  const integ = t.integrantes || [];
  if (integ.includes(sesion.alumnoId)) return t;
  if (!inscAbiertas(GDATA, fid)) throw new Error('Las inscripciones a estos equipos están cerradas. Pídele a tu maestro que te agregue.');
  if (t.max && integ.length >= t.max) throw new Error(`«${t.nombre}» ya está completo (${t.max} integrantes). Elige otro equipo.`);
  const previo = equipoDe(EQS, fid, sesion.alumnoId);   // en la misma formación solo se está en un equipo
  if (previo) { const vi = previo.integrantes || [], vn = previo.nombres || [], k = vi.indexOf(sesion.alumnoId);
    await updateDoc(doc(db, 'grupos', sesion.grupoId, 'equipos', previo.id), { integrantes: vi.filter((_, i) => i !== k), nombres: vn.filter((_, i) => i !== k), ultimoAutor: sesion.alumnoId, ultimoPin: sesion.pin }); }
  await updateDoc(doc(db, 'grupos', sesion.grupoId, 'equipos', t.id), { integrantes: [...integ, sesion.alumnoId], nombres: [...(t.nombres || []), sesion.nombre], ultimoAutor: sesion.alumnoId, ultimoPin: sesion.pin });
  await cargarEquipos(true);
  return EQS.find(e => e.id === t.id) || t;
}
// estado de cada tarea (abierta/cerrada) que pone el docente en grupos/{g}.tareasDig
function escucharGrupo() {
  if (unsubGrupo) unsubGrupo();
  if (!sesion) return;
  unsubGrupo = onSnapshot(doc(db, 'grupos', sesion.grupoId), sn => {
    ESTADO = (sn.exists() && sn.data().tareasDig) || {};
    window.dispatchEvent(new CustomEvent('estado-tareas', { detail: sn.exists() ? sn.data() : {} }));
  }, () => {});
}

// ======================================================= portada: temas que se despliegan
const ATLAS_TOTAL = {};
async function totalPaises(cont) {
  if (!ATLAS_TOTAL._ok) { try { const A = await fetch('data/atlas.json').then(r => r.json()); Object.values(A.regiones).forEach(r => { ATLAS_TOTAL[r.cont] = (ATLAS_TOTAL[r.cont] || 0) + r.paises.length; }); ATLAS_TOTAL._ok = true; } catch { /* */ } }
  return ATLAS_TOTAL[cont] || 0;
}
// Avance, entrega y calificación de una tarea para el alumno (o su equipo)
async function estadoDe(a) {
  if (!sesion || !califica(a)) return null;
  const g = sesion.grupoId, al = sesion.alumnoId, eq = enEquipo(a) ? await equipo(a.id) : null;
  const out = { avance: '', entregado: null, cal: null };
  try { const c = await getDoc(doc(db, 'grupos', g, 'alumnos', al, 'tareas', catalogoId(a.id))); if (c.exists() && c.data().calificacion !== undefined && c.data().calificacion !== null) out.cal = c.data().calificacion; } catch { /* */ }
  try {
    if (a.tipo === 'atlas') {
      let c = null;
      if (eq) { const s = await getDoc(doc(db, 'grupos', g, 'equipos', eq.id, 'atlas', a.cont)); if (s.exists()) { const d = s.data(); c = { asign: d.asign || {}, regiones: Object.keys(d.regiones || {}) }; out.entregado = d.entregado || null; } }
      else { const s = await getDoc(doc(db, 'grupos', g, 'alumnos', al, 'atlas', 'mi-atlas')); if (s.exists()) { const d = s.data(), k = ((d.datos || {}).conts || {})[a.cont]; if (k) c = { asign: k.asign || {}, regiones: k.regiones || [] }; const en = ((d.datos || {}).entregas || {})[a.cont]; if (en) out.entregado = { t: en }; } }
      if (c) out.avance = `${Object.keys(c.asign).length}/${await totalPaises(a.cont)} países · ${c.regiones.length} regiones`;
    } else if (a.tipo === 'cuadro') {
      const s = await getDoc(eq ? doc(db, 'grupos', g, 'equipos', eq.id, 'atlas', CUADRO_MM.id) : doc(db, 'grupos', g, 'alumnos', al, 'atlas', 'tarea-cuadro-mm'));
      if (s.exists()) { out.avance = sugerirCuadro(s.data().celdas).detalle; out.entregado = s.data().entregado || null; }
    } else if (a.tipo === 'influencias') {
      const s = await getDoc(eq ? doc(db, 'grupos', g, 'equipos', eq.id, 'atlas', INFLUENCIAS.id) : doc(db, 'grupos', g, 'alumnos', al, 'atlas', 'tarea-influencias'));
      if (s.exists()) { out.avance = sugerirInfluencias(s.data()).detalle; out.entregado = s.data().entregado || null; }
    } else if (a.tipo === 'desarma') {
      const s = await getDoc(doc(db, 'grupos', g, 'alumnos', al, 'atlas', 'tarea-desarma'));
      if (s.exists()) { const m = (s.data().datos || {}).ficha || {}; out.avance = m.nombre ? `${m.nombre}: ${(m.ingredientes || []).length} ingredientes` : ''; out.entregado = s.data().entregado || null; }
    }
  } catch { /* */ }
  return out;
}
function insignia(a, st) {
  if (a.tipo === 'practica') return '<span class="tq tq-practica">Práctica · sin calificación</span>';
  if (a.tipo === 'pronto') return '<span class="tq tq-pronto">Próximamente</span>';
  if (!st) return `<span class="tq">${abierta(a.id) ? 'Tarea' : '🔒 Cerrada'}</span>`;
  if (st.cal !== null) return `<span class="tq tq-cal">Calificada: <b>${st.cal}</b></span>`;
  if (st.entregado) return `<span class="tq tq-ent">Entregada ✓ ${esc(fechaHora(st.entregado.t))}</span>`;
  if (!abierta(a.id)) return '<span class="tq tq-cerr">🔒 Cerrada</span>';
  return st.avance ? '<span class="tq tq-prog">En progreso</span>' : '<span class="tq tq-pend">Pendiente</span>';
}
async function portada() {
  const d0 = new Date(), hoy = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
  // se abre desplegado el tema más reciente que ya empezó
  const actual = [...TEMAS_TAREAS].reverse().find(t => t.fecha <= hoy) || TEMAS_TAREAS[0];
  $('#cl-acceso').innerHTML = sesion ? `<div class="tq-quien">👤 <b>${esc(sesion.nombre)}</b> · aquí ves tu avance y tus calificaciones <button type="button" class="ma-link" id="tq-salir">Salir</button></div>`
    : `<div class="tq-quien">Entra con tu nombre y PIN para ver tu avance, entregar y conocer tus calificaciones. <button type="button" class="btn-at" id="tq-entrar">Entrar</button></div>`;
  if (sesion) $('#tq-salir').addEventListener('click', () => { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ } sesion = null; EQS = null; if (unsubGrupo) unsubGrupo(); portada(); });
  else $('#tq-entrar').addEventListener('click', () => formAcceso($('#cl-acceso'), portada));
  $('#cl-sesiones').innerHTML = TEMAS_TAREAS.map((t, i) => `<details class="tq-tema" data-tema="${i}" ${t === actual ? 'open' : ''}><summary><span class="tq-num">${esc(t.tema)}</span><span><b>${esc(t.titulo)}</b><small>${esc(t.fechaTexto)} · ${t.acts.filter(califica).length} tarea${t.acts.filter(califica).length === 1 ? '' : 's'}</small></span></summary>
    <div class="cl-cards">${t.acts.map(a => `<a class="cl-card ${a.tipo === 'pronto' ? 'cl-pronto' : ''}" href="${a.tipo === 'atlas' ? `atlas.html#miatlas=${a.cont}` : a.tipo === 'pronto' ? '#' : '#' + a.id}" data-act="${a.id}"><span class="cl-ico">${a.icono}</span><b>${esc(a.nombre)}</b><small>${esc(a.modo)}</small><p>${esc(a.desc)}</p><span class="cl-estado" data-st="${a.id}">${insignia(a, null)}</span><p class="cl-avance" data-av="${a.id}"></p></a>`).join('')}</div></details>`).join('');
  $$('.cl-pronto').forEach(x => x.addEventListener('click', e => e.preventDefault()));
  if (sesion) {
    escucharGrupo();
    for (const a of Object.values(TAREAS_DIG).filter(califica)) estadoDe(a).then(st => { const s = $(`[data-st="${a.id}"]`), v = $(`[data-av="${a.id}"]`); if (s) s.innerHTML = insignia(a, st); if (v) v.textContent = st && st.avance ? st.avance : ''; });
    tareasNormales();
  }
}
// Tareas que el docente dejó a mano (no digitales): se acomodan en el tema de su fecha.
async function tareasNormales() {
  let cat = [];
  try { const sn = await getDocs(collection(db, 'grupos', sesion.grupoId, 'tareas_catalogo')); cat = sn.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.parcial === 'p2' && !t.id.startsWith('dig-')).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')); } catch { return; }
  if (!cat.length) return;
  const fechaTxt = f => { if (!f) return ''; const [y, m, d] = f.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' }); };
  const sueltas = [];
  for (const t of cat) {
    let cal = null;
    try { const c = await getDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'tareas', t.id)); if (c.exists() && c.data().calificacion !== undefined && c.data().calificacion !== null) cal = c.data().calificacion; } catch { /* */ }
    const html = `<div class="cl-card cl-normal"><span class="cl-ico">📝</span><b>${esc(t.nombre)}</b><small>Tarea en clase o en papel</small><p>${t.fecha ? `Fecha: ${esc(fechaTxt(t.fecha))}. ` : ''}Se entrega como indique tu maestro.</p><span class="cl-estado">${cal !== null ? `<span class="tq tq-cal">Calificada: <b>${cal}</b></span>` : '<span class="tq tq-pend">Sin calificar todavía</span>'}</span></div>`;
    const i = t.fecha ? TEMAS_TAREAS.map((x, k) => [x, k]).filter(([x]) => x.fecha <= t.fecha).map(([, k]) => k).pop() : undefined;
    const caja = i !== undefined ? $(`.tq-tema[data-tema="${i}"] .cl-cards`) : null;
    if (caja) caja.insertAdjacentHTML('beforeend', html); else sueltas.push(html);
  }
  if (sueltas.length) $('#cl-sesiones').insertAdjacentHTML('beforeend', `<details class="tq-tema" open><summary><span class="tq-num">📝</span><span><b>Otras tareas del parcial</b><small>Las que tu maestro dejó en clase o en papel</small></span></summary><div class="cl-cards">${sueltas.join('')}</div></details>`);
}

// ======================================================= navegación
function ruta() {
  const id = location.hash.slice(1).split('=')[0];
  if (detener) { detener(); detener = null; }
  const mu = location.hash.match(/^#unir-([A-Z0-9]{4})$/i);
  if (mu) return unirPorQR(mu[1].toUpperCase());
  const a = TAREAS_DIG[id];
  if (!a || a.tipo === 'atlas' || a.tipo === 'pronto') { $('#cl-sesiones').hidden = false; $('#cl-acceso').hidden = false; $('#cl-actividad').innerHTML = ''; portada(); return; }
  $('#cl-sesiones').hidden = true; $('#cl-acceso').hidden = true;
  const c = $('#cl-actividad');
  c.innerHTML = `<a class="cl-volver" href="#">← Todas las tareas</a><p class="cl-fecha">Tema ${esc(a.tema)} · ${esc(a.titulo)} · ${esc(a.fechaTexto)}</p><h2 class="cl-h2">${a.icono} ${esc(a.nombre)}</h2>
    ${califica(a) ? '<p class="cl-vale">📌 Cuenta como una tarea del Parcial 2.</p>' : '<p class="cl-vale cl-vale-p">🎯 Práctica para repasar: no lleva calificación.</p>'}<div id="cl-cuerpo"></div>`;
  (a.tipo === 'practica' ? { aporto: actAporto, campeche: actCampeche, 'que-influencia': actQueInfluencia, 'platillos-america': actPlatillosAmerica }[a.id] : { cuadro: actCuadro, desarma: actDesarma, influencias: actInfluencias }[a.tipo])($('#cl-cuerpo'));
  window.scrollTo({ top: 0 });
}
// El QR de un equipo abre tareas.html#unir-CODIGO (vía unir.html): entra, se une y va a su tarea.
const hrefTarea = a => a.tipo === 'atlas' ? `atlas.html#miatlas=${a.cont}` : '#' + a.id;
function unirPorQR(codigo) {
  $('#cl-sesiones').hidden = true; $('#cl-acceso').hidden = true;
  const c = $('#cl-actividad');
  c.innerHTML = `<a class="cl-volver" href="#">← Todas las tareas</a><h2 class="cl-h2">👥 Unirme a mi equipo</h2><div id="cl-cuerpo"></div>`;
  const cuerpo = $('#cl-cuerpo');
  const hacer = async () => {
    cuerpo.innerHTML = `<p class="atlas-ayuda">Uniéndote al equipo con el código <b>${esc(codigo)}</b>…</p>`;
    try {
      const t = await unirseCodigo(codigo);
      const d0 = new Date(), hoy = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
      const ts = tareasDeFormacion(GDATA, formacionDe(t), TAREAS_DIG).sort((x, y) => x.fecha.localeCompare(y.fecha));
      const abiertasT = ts.filter(a => !(((GDATA.tareasDig || {})[a.id] || {}).abierta === false));
      const destino = [...abiertasT].reverse().find(a => a.fecha <= hoy) || abiertasT[0] || ts[ts.length - 1];
      cuerpo.innerHTML = `<div class="cl-unido"><p class="cl-unido-ok">✅ ¡Listo, ${esc(sesion.nombre.split(' ')[0])}! Ya eres parte de <b>«${esc(t.nombre)}»</b>.</p>
        <p>Integrantes: ${esc((t.nombres || []).join(', '))}</p>
        ${destino ? `<a class="btn-at cl-ir" href="${hrefTarea(destino)}">Ir a ${esc(destino.nombre)} →</a>` : '<p class="atlas-ayuda">Tu maestro todavía no asigna una tarea a estos equipos. Te avisará en clase.</p>'}
        ${ts.length > 1 ? `<p class="cl-otras">Este equipo también es para: ${ts.filter(a => a !== destino).map(a => `<a href="${hrefTarea(a)}">${esc(a.nombre)}</a>`).join(' · ')}</p>` : ''}</div>`;
      history.replaceState(null, '', location.pathname + '#');
    } catch (e) {
      cuerpo.innerHTML = `<div class="cl-sin-eq"><p class="ma-msg mal">${esc(e.message || e)}</p><a class="btn-ruta" href="#">Ver mis tareas</a></div>`;
    }
  };
  if (sesion) hacer(); else formAcceso(cuerpo, () => { escucharGrupo(); hacer(); }, `Vas a unirte al equipo <b>${esc(codigo)}</b>. Entra con tu nombre y PIN`);
}
window.addEventListener('hashchange', ruta);
ruta();

// ---- barra común: entregar tarea y aviso de tarea cerrada
function barraEntrega(cont, a, { entregado, alEntregar }) {
  const zona = $('[data-entrega]', cont);
  const pintar = () => {
    const ab = abierta(a.id);
    zona.innerHTML = !ab ? `<div class="cl-cerrada">🔒 Tu maestro cerró esta tarea: ya no se guardan cambios.${entregado() ? ` Entregada el ${esc(punto(fechaHora(entregado().t)))}` : ''}</div>`
      : entregado() ? `<div class="cl-entregada">✅ Entregada el ${esc(entregado().por ? fechaHora(entregado().t) + ' por ' + entregado().por + '.' : punto(fechaHora(entregado().t)))} Aún puedes corregir mientras la tarea siga abierta.</div>`
      : '<div class="cl-entregar"><span>¿Ya terminaron? Entreguen la tarea para que su maestro la califique.</span><button type="button" class="btn-at" data-entregar>📤 Entregar tarea</button></div>';
    const b = $('[data-entregar]', zona); if (b) b.addEventListener('click', async () => { if (!confirm('¿Entregar la tarea? Podrás seguir corrigiendo mientras tu maestro no la cierre.')) return; b.disabled = true; try { await alEntregar(); } catch (e) { alert('No se pudo entregar: ' + (e.message || e)); b.disabled = false; } pintar(); });
    $$('textarea, input:not([type=hidden])', cont).forEach(t => { if (!t.closest('[data-entrega]')) t.readOnly = !ab; });
  };
  window.addEventListener('estado-tareas', pintar);
  pintar();
  return pintar;
}

// ======================================================= 1. CUADRO COMPARATIVO (en equipo o individual, en vivo)
function actCuadro(cont) {
  const entrar = async () => {
    escucharGrupo();
    cont.innerHTML = '<p class="atlas-ayuda">Buscando a tu equipo…</p>';
    const eq = await equipo('cuadro-mm');
    if (eq) return cuadro(cont, eq);
    cont.innerHTML = `<div class="cl-sin-eq"><p><b>Todavía no estás en un equipo.</b> Escribe el código de 4 letras de tu equipo (o escanea el QR que proyecta tu maestro).</p>
      <form id="cl-unir" class="ma-unir"><div><input id="cl-cod" maxlength="4" autocomplete="off" placeholder="ABCD" aria-label="Código del equipo"><button class="btn-at" type="submit">Unirme</button></div></form>
      <p class="ma-msg mal" id="cl-unir-msg" hidden></p><p class="cl-o">o</p><button type="button" class="btn-ruta" id="cl-solo">Hacerla solo (se guarda en tu cuenta)</button></div>`;
    $('#cl-unir').addEventListener('submit', async e => { e.preventDefault(); try { cuadro(cont, await unirseCodigo($('#cl-cod').value, 'cuadro-mm')); } catch (er) { const m = $('#cl-unir-msg'); m.textContent = er.message || er; m.hidden = false; } });
    $('#cl-solo').addEventListener('click', () => cuadro(cont, null));
  };
  if (sesion) entrar(); else formAcceso(cont, entrar, 'Entra con tu nombre y PIN para trabajar en esta tarea');
}
function cuadro(cont, eq) {
  const A = CUADRO_MM, a = TAREAS_DIG['cuadro-mm'], claves = A.filas.flatMap(([f]) => A.columnas.map(([c]) => `${f}_${c}`));
  let S = { celdas: {}, por: {}, entregado: null }, clave = false, pend = new Map(), vuelo = new Map(), pendT = null, existe = false, ultima = '';
  const ref = eq ? doc(db, 'grupos', sesion.grupoId, 'equipos', eq.id, 'atlas', A.id) : doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', 'tarea-cuadro-mm');
  cont.innerHTML = `<div class="ma-barra"><span>${eq ? `👥 <b>${esc(eq.nombre)}</b>: ${esc((eq.nombres || []).join(', '))}` : `👤 <b>${esc(sesion.nombre)}</b> (individual)`}</span><span class="ma-estado" id="cu-estado"></span>
      <button type="button" class="btn-ruta" id="cu-word">⬇ Descargar en Word</button></div>
    <div data-entrega></div>
    <p class="atlas-ayuda">Escriban con sus palabras lo que aprendieron en clase y en el compendio (subtema 3.2). Las filas marcadas <b>🔎 Investiga</b> no vienen en el compendio: búsquenlas en internet${eq ? ', repártanselas entre el equipo' : ''} y anoten de dónde sacaron la información. Se guarda solo${eq ? ' y todos ven al instante lo que escriben los demás' : ''}.</p>
    <p class="cu-progreso" id="cu-progreso"></p>
    <div class="cu-clave" id="cu-clave" hidden><b>🔑 Su maestro liberó la clave.</b> <button type="button" class="btn-at" id="cu-ver-clave" aria-pressed="false">Comparar con la clave</button></div>
    <div class="cu-tabla">${A.filas.map(([f, t, ayuda, inv]) => `<section class="cu-fila ${inv ? 'cu-inv' : ''}"><h3>${inv ? '<span class="cu-tag">🔎 Investiga</span>' : ''}${esc(t)}<small>${esc(ayuda)}</small></h3>
      <div class="cu-celdas">${A.columnas.map(([c, nc], ci) => `<label class="cu-celda cu-${c}"><span>${esc(nc)} <small class="ma-autor" data-autor="${f}_${c}"></small></span><textarea data-k="${f}_${c}" rows="3"></textarea>
        <p class="cu-resp" data-resp="${f}_${c}" hidden><b>${inv ? 'Respuesta de referencia' : 'Según el compendio'}:</b> ${esc(A.respuestas[f][ci])}</p></label>`).join('')}</div>
      ${inv ? `<label class="cu-fuente"><span>📚 Fuente: ¿de dónde lo sacaron? <small class="ma-autor" data-autor="${f}_fuente"></small></span><input data-k="${f}_fuente" type="text" placeholder="Autor o sitio, título y enlace (URL)"></label>` : ''}</section>`).join('')}</div>`;
  const estado = (t, c = '') => { const e = $('#cu-estado'); if (e) { e.textContent = t; e.className = 'ma-estado ' + c; } };
  const pintar = () => {
    const act = document.activeElement;
    $$('[data-k]', cont).forEach(t => { const v = S.celdas[t.dataset.k] || ''; if (t !== act && t.value !== v) t.value = v; });
    $$('[data-autor]', cont).forEach(s => { const au = eq && S.por[s.dataset.autor]; s.textContent = au ? `✍️ ${au}` : ''; });
    const pal = k => ((S.celdas[k] || '').trim().match(/\S+/g) || []).length;
    const n = claves.filter(k => pal(k) >= MIN_PALABRAS_CELDA).length, inv = A.filas.filter(x => x[3]), fu = inv.filter(([f]) => (S.celdas[`${f}_fuente`] || '').trim()).length;
    $$('[data-k]', cont).forEach(t => { const k = t.dataset.k; if (!k.endsWith('_fuente')) t.classList.toggle('cu-corta', pal(k) > 0 && pal(k) < MIN_PALABRAS_CELDA); });
    $('#cu-progreso').innerHTML = `<b>${n} de ${claves.length}</b> celdas llenas · <b>${fu} de ${inv.length}</b> fuentes <span class="ma-barra-p"><i style="width:${Math.round(100 * n / claves.length)}%"></i></span><small class="cu-regla">Una celda cuenta cuando tiene al menos ${MIN_PALABRAS_CELDA} palabras. Las celdas valen 8 puntos y las 4 fuentes de investigación, 2.</small>`;
  };
  const aplicar = d => { const c = { celdas: { ...(d.celdas || {}) }, por: { ...(d.por || {}) }, entregado: d.entregado || null }; [...vuelo.values(), ...pend.values()].forEach(([r, v]) => { c[r[0]][r[1]] = v; }); return c; };
  const firma = () => eq ? { ultimoAutor: sesion.alumnoId, ultimoPin: sesion.pin, ultimoNombre: sesion.nombre } : { pinVerificado: sesion.pin, nombre: sesion.nombre };
  const flush = async () => {
    clearTimeout(pendT); pendT = null; if (!pend.size) return;
    const lote = [...pend.values()]; pend.forEach((v, k) => vuelo.set(k, v)); pend.clear();
    try {
      if (!eq) {
        await setDoc(ref, { celdas: S.celdas, ...firma(), ultimoCambio: ultima, actualizado: serverTimestamp() }, { merge: true });
      } else {
        if (!existe) { const s0 = await getDoc(ref); if (!s0.exists()) await setDoc(ref, { celdas: {}, por: {}, ...firma(), actualizado: serverTimestamp() }); existe = true; }
        const args = []; lote.forEach(([r, v]) => args.push(new FieldPath(...r), v));
        args.push('ultimoAutor', sesion.alumnoId, 'ultimoPin', sesion.pin, 'ultimoNombre', sesion.nombre, 'ultimoCambio', ultima, 'actualizado', serverTimestamp());
        await updateDoc(ref, ...args);
      }
      lote.forEach(([r]) => vuelo.delete(r.join('|')));
      if (!pend.size) estado(eq ? 'Guardado y compartido con tu equipo ✓' : 'Guardado en tu cuenta ✓', 'ok');
    } catch {
      lote.forEach(([r, v]) => { const k = r.join('|'); vuelo.delete(k); if (!pend.has(k)) pend.set(k, [r, v]); });
      estado('No se pudo guardar. Reintentando…', 'mal'); pendT = setTimeout(flush, 4000);
    }
  };
  $$('[data-k]', cont).forEach(t => t.addEventListener('input', () => {
    if (!abierta(a.id)) return;
    const k = t.dataset.k; S.celdas[k] = t.value; S.por[k] = sesion.nombre;
    const [f, c] = k.split('_'); ultima = `escribe ${A.filas.find(x => x[0] === f)[1].toLowerCase()} (${c === 'fuente' ? 'la fuente' : A.columnas.find(x => x[0] === c)[1]})`;
    pend.set('celdas|' + k, [['celdas', k], t.value]); pend.set('por|' + k, [['por', k], sesion.nombre]);
    estado('Guardando…'); clearTimeout(pendT); pendT = setTimeout(flush, 700); pintar();
  }));
  const subs = []; let repEntrega = () => {};
  estado('Conectando…');
  subs.push(onSnapshot(ref, sn => { existe = sn.exists(); S = aplicar(sn.exists() ? sn.data() : {}); if (!pend.size && !vuelo.size) estado(eq ? 'Sincronizado con tu equipo ✓' : 'Guardado en tu cuenta ✓', 'ok'); pintar(); repEntrega(); }, () => estado('Sin conexión. Revisa tu internet.', 'mal')));
  const verClave = d => { clave = !!((d.claves || {})[A.clave]); $('#cu-clave').hidden = !clave; if (!clave) $$('.cu-resp', cont).forEach(p => { p.hidden = true; }); };
  const onEstado = e => verClave(e.detail || {});
  window.addEventListener('estado-tareas', onEstado);
  getDoc(doc(db, 'grupos', sesion.grupoId)).then(s => verClave(s.exists() ? s.data() : {})).catch(() => {});
  $('#cu-ver-clave').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? 'Ocultar la clave' : 'Comparar con la clave'; $$('.cu-resp', cont).forEach(p => { p.hidden = !on; }); });
  repEntrega = barraEntrega(cont, a, {
    entregado: () => S.entregado,
    alEntregar: async () => {
      await flush();
      const en = { t: serverTimestamp(), por: sesion.nombre };
      if (eq) { if (!existe) await setDoc(ref, { celdas: {}, por: {}, ...firma(), actualizado: serverTimestamp() }, { merge: true }); await updateDoc(ref, { entregado: en, ...firma(), ultimoCambio: 'entregó la tarea', actualizado: serverTimestamp() }); }
      else await setDoc(ref, { celdas: S.celdas, entregado: en, ...firma(), actualizado: serverTimestamp() }, { merge: true });
      S.entregado = { t: Date.now(), por: sesion.nombre };
    },
  });
  $('#cu-word').addEventListener('click', async () => {
    await flush();
    const D = new DocITES(); await D.cargarLogo();
    D.portada({ kicker: 'Tema 3.2 · México prehispánico y mestizo', titulo: 'Cocina mexica y cocina maya', subtitulo: 'Cuadro comparativo', etiqueta: eq ? `Equipo «${eq.nombre}»` : 'Alumno', personas: eq ? eq.nombres || [] : [sesion.nombre] });
    D.h1('Cuadro comparativo', 'Dos tradiciones del mismo tronco mesoamericano: maíz, frijol y chile.');
    const celda = k => { const t = (S.celdas[k] || '').trim(), au = eq && S.por[k]; return { runs: [[t || '(sin escribir)', t ? {} : { i: true, color: '9A9389' }], ...(au ? [[`\n✍ ${au}`, { color: '3F7A4F', tam: 8 }]] : [])] }; };
    const cab = (f, t, inv) => { const fu = (S.celdas[`${f}_fuente`] || '').trim(); return inv ? { runs: [[t, { b: true }], [`\n🔎 Investigación${fu ? ' · Fuente: ' + fu : ' · sin fuente'}`, { color: '6B6358', tam: 8, i: !fu }]], fondo: 'F4EFE4' } : { t, b: true, fondo: 'F4EFE4' }; };
    D.tabla([['Apartado', ...A.columnas.map(c => c[1])], ...A.filas.map(([f, t, , inv]) => [cab(f, t, inv), ...A.columnas.map(([c]) => celda(`${f}_${c}`))])], { anchos: [1700, 2560, 2560, 2540] });
    if (clave) {
      D.h1('Comparación con la clave', 'La clave que liberó el maestro (del compendio y, en las filas de investigación, respuestas de referencia), para revisar lo que escribimos.');
      D.tabla([['Apartado', ...A.columnas.map(c => c[1])], ...A.filas.map(([f, t]) => [{ t, b: true, fondo: 'F4EFE4' }, ...A.respuestas[f]])], { anchos: [1700, 2560, 2560, 2540] });
    }
    D.descargar(`Cuadro_mexica_maya_${slug(eq ? 'equipo ' + eq.nombre : sesion.nombre)}`);
  });
  pintar();
  const salir = () => flush();
  window.addEventListener('beforeunload', salir);
  detener = () => { subs.forEach(u => u()); window.removeEventListener('estado-tareas', onEstado); window.removeEventListener('estado-tareas', repEntrega); window.removeEventListener('beforeunload', salir); flush(); };
}

// ======================================================= 2. ¿APORTÓ O LLEGÓ? (práctica)
function actAporto(cont) {
  const NIVELES = [
    { id: 'basico', n: 'Básico', ico: '🌱', preg: 10, desc: '10 ingredientes conocidos para calentar.', pool: x => x.niv === 1 },
    { id: 'intermedio', n: 'Intermedio', ico: '🔥', preg: 20, desc: '20 ingredientes, con algunas trampas.', pool: x => x.niv <= 2 },
    { id: 'experto', n: 'Experto', ico: '🏆', preg: 20, desc: '20 con muchas trampas y, si llegó, ¿de qué continente es originario?', pool: () => true },
  ];
  const SEG = 10, NC = Object.fromEntries(CONTINENTES);
  let reto = lsGet('clase_aporto_reto') === '1', N = null, items = [], i = 0, bien = 0, contB = 0, contT = 0, pts = 0, racha = 0, mejorRacha = 0, fallos = [], reloj = null, t0 = 0;
  const parar = () => { clearInterval(reloj); reloj = null; };
  detener = parar;
  const mejor = id => lsGet('clase_aporto_mejor_' + id) || '—';
  const origenHTML = x => `<p class="ap-orig">📍 <b>Origen:</b> ${esc(x.origen)}</p>${x.r === 'l' ? `<p class="ap-orig">⛵ <b>Llegó a México:</b> ${esc(x.llego)}</p>` : ''}<p class="ap-dato">${esc(x.dato)}</p>`;
  const elegir = nv => {
    const pool = barajar(INGREDIENTES.filter(nv.pool));
    if (nv.id === 'basico') return pool.slice(0, nv.preg);
    const dif = nv.id === 'experto' ? 3 : 2, duros = pool.filter(x => x.niv === dif), resto = pool.filter(x => x.niv !== dif);
    const k = Math.min(duros.length, Math.round(nv.preg * (nv.id === 'experto' ? 0.5 : 0.6)));
    return barajar([...duros.slice(0, k), ...resto.slice(0, nv.preg - k)]);
  };
  const inicio = () => {
    parar();
    cont.innerHTML = `<p class="atlas-ayuda">¿Este ingrediente <b>ya estaba en México antes de 1521</b> o <b>llegó después</b>, con la conquista y el comercio? Al responder verás de dónde es originario: aprovecha para estudiar. Hay ${INGREDIENTES.length} ingredientes.</p>
      <div class="ap-niveles">${NIVELES.map(nv => `<button type="button" class="ap-nivel" data-n="${nv.id}"><span>${nv.ico}</span><b>${nv.n}</b><small>${esc(nv.desc)}</small><em>Tu mejor marca: ${mejor(nv.id)}</em></button>`).join('')}</div>
      <label class="ap-reto"><input type="checkbox" id="ap-reto" ${reto ? 'checked' : ''}> ⏱ <b>Modo reto:</b> ${SEG} segundos por pregunta; respondiendo rápido ganas más puntos y sumas racha.</label>
      <button type="button" class="btn-ruta" id="ap-estudiar">📚 Estudiar la tabla de ingredientes</button>`;
    $('#ap-reto').addEventListener('change', e => { reto = e.target.checked; lsSet('clase_aporto_reto', reto ? '1' : '0'); });
    $$('.ap-nivel', cont).forEach(b => b.addEventListener('click', () => { N = NIVELES.find(x => x.id === b.dataset.n); nueva(); }));
    $('#ap-estudiar').addEventListener('click', estudiar);
  };
  const nueva = () => { items = elegir(N); i = 0; bien = 0; contB = 0; contT = 0; pts = 0; racha = 0; mejorRacha = 0; fallos = []; pregunta(); };
  const marcador = () => `<div class="ap-marcador"><span>${N.ico} ${N.n} · ${i + 1} de ${items.length}</span><span>✅ ${bien}${N.id === 'experto' ? ` · 🌍 ${contB}/${contT}` : ''}</span>${reto ? `<span>⭐ ${pts} pts · 🔥 racha ${racha}</span>` : ''}</div>`;
  const pregunta = () => {
    parar();
    if (i >= items.length) return fin();
    const x = items[i];
    cont.innerHTML = `${marcador()}${reto ? '<div class="ap-tiempo"><i id="ap-t"></i></div>' : ''}
      <div class="ap-carta"><span class="ap-emo">${x.e}</span><b>${esc(x.n)}</b></div>
      <div class="ap-botones"><button type="button" class="ap-bot ap-a" data-r="a">🇲🇽 Ya estaba en México antes de 1521</button><button type="button" class="ap-bot ap-l" data-r="l">⛵ Llegó a México desde 1521</button></div>
      <div id="ap-fb" aria-live="polite"></div>`;
    $$('.ap-bot', cont).forEach(b => b.addEventListener('click', () => responder(b.dataset.r)));
    if (reto) { t0 = Date.now(); reloj = setInterval(() => { const q = Math.max(0, SEG - (Date.now() - t0) / 1000), b = $('#ap-t'); if (b) b.style.width = (100 * q / SEG) + '%'; if (q <= 0) { parar(); responder(null); } }, 100); }
  };
  const quedan = () => reto ? Math.max(0, SEG - (Date.now() - t0) / 1000) : 0;
  const responder = r => {
    const q = quedan(); parar();
    const x = items[i], ok = r === x.r;
    $$('.ap-bot', cont).forEach(b => { b.disabled = true; if (b.dataset.r === x.r) b.classList.add('ok'); else if (b.dataset.r === r) b.classList.add('mal'); });
    if (ok) { bien++; racha++; mejorRacha = Math.max(mejorRacha, racha); if (reto) pts += 100 + Math.round(10 * q); } else { racha = 0; fallos.push(x); }
    const tit = r === null ? `⏱ Se acabó el tiempo: ${esc(x.n)} ${x.r === 'a' ? 'ya estaba en México' : 'llegó desde 1521'}.` : ok ? '¡Correcto!' : `No: ${esc(x.n)} ${x.r === 'a' ? 'ya estaba en México antes de 1521' : 'llegó a México desde 1521'}.`;
    // experto: si llegó y acertó, ¿de qué continente es originario?
    if (ok && x.r === 'l' && N.id === 'experto') {
      $('#ap-fb').innerHTML = `<div class="aviso ok"><strong>${tit}</strong> Ahora, ¿de qué continente es originario?</div>
        <div class="ap-conts">${CONTINENTES.map(([k, n]) => `<button type="button" class="ap-bot ap-c" data-c="${k}">${n}</button>`).join('')}</div>`;
      $$('.ap-c', cont).forEach(b => b.addEventListener('click', () => {
        const bueno = x.cont.includes(b.dataset.c); contT++; if (bueno) { contB++; if (reto) pts += 50; } else if (!fallos.includes(x)) fallos.push(x);
        $$('.ap-c', cont).forEach(c => { c.disabled = true; if (x.cont.includes(c.dataset.c)) c.classList.add('ok'); else if (c === b) c.classList.add('mal'); });
        mostrar(`<div class="aviso ${bueno ? 'ok' : 'mal'}"><strong>${bueno ? '¡Exacto!' : `No: es originario de ${x.cont.map(c => NC[c]).join(' / ')}.`}</strong>${origenHTML(x)}</div>`);
      }));
      return;
    }
    mostrar(`<div class="aviso ${ok ? 'ok' : 'mal'}"><strong>${tit}</strong>${origenHTML(x)}</div>`);
  };
  const mostrar = html => {
    const fb = $('#ap-fb'); fb.innerHTML = html + `<button class="btn-at" id="ap-sig" type="button">${i + 1 < items.length ? 'Siguiente →' : 'Ver resultado'}</button>`;
    $('#ap-sig').addEventListener('click', () => { i++; pregunta(); }); $('#ap-sig').focus({ preventScroll: true });
    const mk = cont.querySelector('.ap-marcador'); if (mk) mk.outerHTML = marcador();
  };
  const fin = () => {
    parar();
    const marca = reto ? pts : bien, clave = 'clase_aporto_mejor_' + N.id, previa = Number((lsGet(clave) || '0').split(' ')[0]) || 0, record = marca > previa;
    if (record) lsSet(clave, reto ? `${pts} pts` : `${bien}/${items.length}`);
    cont.innerHTML = `<div class="resumen"><h3>${N.ico} ${N.n}: ${bien} de ${items.length}</h3>
      <p>${N.id === 'experto' ? `Continentes acertados: ${contB} de ${contT}. ` : ''}${reto ? `⭐ <b>${pts} puntos</b> · mejor racha: ${mejorRacha}. ` : ''}${record ? '🏅 ¡Nueva mejor marca!' : ''}</p>
      <p>${!fallos.length ? '¡Ronda perfecta! Ya dominas este nivel.' : 'Estudia los que fallaste:'}</p>
      ${fallos.length ? `<ul class="ap-fallos">${fallos.map(x => `<li>${x.e} <b>${esc(x.n)}</b>: ${x.r === 'a' ? 'ya estaba en México antes de 1521' : 'llegó a México desde 1521'}.${origenHTML(x)}</li>`).join('')}</ul>` : ''}
      <div class="ap-fin-bot"><button class="btn-at" id="ap-otra" type="button">Otra ronda</button><button class="btn-ruta" id="ap-niv" type="button">Cambiar de nivel</button><button class="btn-ruta" id="ap-est" type="button">📚 Estudiar la tabla</button></div></div>`;
    $('#ap-otra').addEventListener('click', nueva); $('#ap-niv').addEventListener('click', inicio); $('#ap-est').addEventListener('click', estudiar);
  };
  // ---- tabla para estudiar, con filtros y buscador
  const estudiar = () => {
    parar();
    const F = [['todos', 'Todos'], ['a', '🇲🇽 Ya estaban'], ...CONTINENTES.map(([k, n]) => ['c:' + k, `⛵ De ${n}`])];
    let f = 'todos', qq = '';
    cont.innerHTML = `<button type="button" class="ma-link" id="ap-volver">← Volver al juego</button>
      <p class="atlas-ayuda">Los ${INGREDIENTES.length} ingredientes del juego: de dónde es originario cada uno y cómo llegó a México. Estúdialos y vuelve a jugar.</p>
      <div class="atlas-zoom" id="ap-filtros">${F.map(([k, n]) => `<button type="button" class="chip-at" data-f="${k}" aria-pressed="${k === f}">${n}</button>`).join('')}</div>
      <input id="ap-buscar" class="ap-buscar" type="search" placeholder="Buscar un ingrediente…" aria-label="Buscar un ingrediente">
      <p class="ap-cuenta" id="ap-cuenta"></p><div class="ap-tabla" id="ap-tabla"></div>`;
    const sin = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const pintar = () => {
      const xs = INGREDIENTES.filter(x => (f === 'todos' || (f === 'a' ? x.r === 'a' : x.r === 'l' && x.cont[0] === f.slice(2))) && (!qq || sin(x.n).includes(sin(qq)))).sort((a, b) => a.r.localeCompare(b.r) || a.n.localeCompare(b.n, 'es'));
      $('#ap-cuenta').textContent = `${xs.length} ingrediente${xs.length === 1 ? '' : 's'}`;
      $('#ap-tabla').innerHTML = xs.map(x => `<div class="ap-fila ap-${x.r}"><span class="ap-fe">${x.e}</span><div><b>${esc(x.n)}</b> <small class="ap-tag">${x.r === 'a' ? '🇲🇽 Ya estaba' : `⛵ Llegó · ${x.cont.map(c => NC[c]).join(' / ')}`}</small>${origenHTML(x)}</div></div>`).join('') || '<p class="atlas-ayuda">No hay ingredientes con ese nombre.</p>';
    };
    $$('#ap-filtros .chip-at').forEach(b => b.addEventListener('click', () => { f = b.dataset.f; $$('#ap-filtros .chip-at').forEach(x => x.setAttribute('aria-pressed', String(x === b))); pintar(); }));
    $('#ap-buscar').addEventListener('input', e => { qq = e.target.value.trim(); pintar(); });
    $('#ap-volver').addEventListener('click', inicio);
    pintar(); window.scrollTo({ top: 0 });
  };
  inicio();
}

// ======================================================= 3. DESARMA EL PLATILLO (individual, en la cuenta)
function actDesarma(cont) {
  if (!sesion) { formAcceso(cont, () => actDesarma(cont), 'Entra con tu nombre y PIN: esta tarea se guarda en tu cuenta'); return; }
  escucharGrupo();
  const a = TAREAS_DIG.desarma, ref = doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', 'tarea-desarma');
  const local = `clase_miplatillo_${sesion.grupoId}_${sesion.alumnoId}`;
  let M = normDesarma({}), entregado = null, timer = null, rep = () => {};
  try { M = normDesarma(JSON.parse(lsGet(local) || 'null') || {}); } catch { /* */ }
  cont.innerHTML = `<p class="atlas-ayuda">La cocina mexicana no es «prehispánica» ni «española»: es <b>mestiza</b>. <b>1.</b> Practica con los platillos de ejemplo. <b>2.</b> Investiga un platillo nuevo: esa es la tarea que se califica. <b>3.</b> Aparte, arma la ficha del platillo de tu proyecto con la misma estructura.</p>
    <h3 class="de-paso">1 · Practica <small>no lleva calificación</small></h3>
    <div class="atlas-zoom" id="de-platos">${PLATILLOS.map((p, i) => `<button type="button" class="chip-at" data-p="${p.id}" aria-pressed="${i === 0}">${p.emoji} ${esc(p.nombre)}</button>`).join('')}</div>
    <div id="de-juego"></div>
    <div class="ma-barra de-barra"><span>👤 <b>${esc(sesion.nombre)}</b></span><span class="ma-estado" id="de-estado"></span></div>
    ${fichaDesarmaHTML('fh', '2 · La tarea: investiga un platillo nuevo', 'Elige un platillo mexicano <b>distinto</b> al de tu proyecto y a los de la práctica (pregúntale a tu maestro si tienes duda). Investígalo en internet y anota tus fuentes. <b>Esta es la que se califica.</b>', 'Ejemplo: pozole, tamales colados, chiles rellenos…', true)}
    ${fichaDesarmaHTML('pr', '3 · Para tu proyecto: el platillo de «Mi Plato, Mi Historia»', 'Es la pregunta 14 de tu proyecto: <i>¿qué parte de mi platillo es herencia prehispánica y qué parte fue adoptada tras la conquista?</i> Hazla con la misma estructura y descárgala en Word para agregarla a tu proyecto. <b>No cuenta para la tarea de hoy.</b>', 'El platillo de tu proyecto', false)}`;
  const estado = (t, c = 'ok') => { const e = $('#de-estado'); if (e) { e.textContent = t; e.className = 'ma-estado ' + c; } };
  const subir = async () => { clearTimeout(timer); timer = null; try { await setDoc(ref, { datos: M, pinVerificado: sesion.pin, nombre: sesion.nombre, actualizado: serverTimestamp() }, { merge: true }); estado('Guardado en tu cuenta ✓'); } catch { estado('Guardado solo en este dispositivo (no se pudo subir).', 'mal'); } };
  // la ficha calificada se congela cuando el maestro cierra la tarea; la del proyecto siempre se puede editar
  const guardar = k => { if (k === 'ficha' && !abierta(a.id)) return false; M._t = Date.now(); lsSet(local, JSON.stringify(M)); estado('Guardando…', ''); clearTimeout(timer); timer = setTimeout(subir, 1000); return true; };
  const fichas = { ficha: conectarFichaDesarma($('#de-fh'), () => M.ficha, () => guardar('ficha'), 'ficha'), proyecto: conectarFichaDesarma($('#de-pr'), () => M.proyecto, () => guardar('proyecto'), 'proyecto') };
  getDoc(ref).then(s => {
    if (!s.exists()) return; const d = s.data(); entregado = d.entregado || null; rep();
    if (d.datos && (d.datos._t || 0) > (M._t || 0)) { M = normDesarma(d.datos); fichas.ficha.cargar(); fichas.proyecto.cargar(); }
    estado('Guardado en tu cuenta ✓');
  }).catch(() => {});
  // ---- práctica con platillos de ejemplo
  const juego = id => {
    const p = PLATILLOS.find(x => x.id === id), resp = {}, orden = barajar(p.ing);
    $$('#de-platos .chip-at').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === id)));
    $('#de-juego').innerHTML = `<div class="de-plato"><h3>${p.emoji} ${esc(p.nombre)} <small class="cl-tag">práctica</small></h3><p>${esc(p.intro)}</p>
      <ul class="de-ings">${orden.map(([n], i) => `<li data-i="${i}"><span>${esc(n)}</span><div><button type="button" data-v="n">🌎 De América</button><button type="button" data-v="l">⛵ Llegó después</button></div></li>`).join('')}</ul>
      <button type="button" class="btn-at" id="de-revisar">Revisar</button><div id="de-res" aria-live="polite"></div></div>`;
    $$('#de-juego .de-ings li').forEach(li => li.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { resp[li.dataset.i] = b.dataset.v; li.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); li.classList.remove('ok', 'mal'); })));
    $('#de-revisar').addEventListener('click', () => {
      let bien = 0, sin = 0;
      orden.forEach(([, v], i) => { const li = $(`#de-juego .de-ings li[data-i="${i}"]`); if (!resp[i]) { sin++; return; } const ok = resp[i] === v; if (ok) bien++; li.classList.toggle('ok', ok); li.classList.toggle('mal', !ok); });
      const am = orden.filter(([, v]) => v === 'n').map(([n]) => n), ll = orden.filter(([, v]) => v === 'l').map(([n]) => n);
      $('#de-res').innerHTML = sin ? `<p class="ma-msg mal">Te faltan ${sin} ingrediente${sin === 1 ? '' : 's'} por clasificar.</p>`
        : `<div class="aviso ${bien === orden.length ? 'ok' : 'mal'}"><strong>${bien} de ${orden.length} correctas.</strong> ${bien === orden.length ? '¡Perfecto!' : 'Los marcados en rojo están en la otra columna.'}<br>
          <b>🌎 De América (${am.length}):</b> ${esc(am.join(', '))}.<br><b>⛵ Llegaron después de 1521 (${ll.length}):</b> ${esc(ll.join(', '))}.<br>
          ${esc(p.nombre)} es mestizo: ${Math.round(100 * am.length / orden.length)} % de sus ingredientes son americanos y ${Math.round(100 * ll.length / orden.length)} % llegaron después.</div>`;
    });
  };
  $$('#de-platos .chip-at').forEach(b => b.addEventListener('click', () => juego(b.dataset.p)));
  juego(PLATILLOS[0].id);
  rep = barraEntrega($('#de-fh'), a, {
    entregado: () => entregado,
    alEntregar: async () => {
      if (!(M.ficha.nombre || '').trim() || !(M.ficha.ingredientes || []).length) throw new Error('Escribe el nombre del platillo que investigaste y al menos un ingrediente.');
      await subir(); await setDoc(ref, { entregado: { t: serverTimestamp(), por: sesion.nombre }, pinVerificado: sesion.pin, nombre: sesion.nombre }, { merge: true }); entregado = { t: Date.now() };
    },
  });
  $$('[data-de-word]', cont).forEach(b => b.addEventListener('click', () => wordDesarma(b.dataset.deWord === 'fh' ? M.ficha : M.proyecto, b.dataset.deWord === 'fh')));
  const salir = () => { if (timer) subir(); };
  window.addEventListener('beforeunload', salir);
  detener = () => { window.removeEventListener('beforeunload', salir); window.removeEventListener('estado-tareas', rep); salir(); };
}
// ---- Ficha de un platillo (la de la tarea y la del proyecto usan la misma)
const DE_ING = [['n', '🌎 De América'], ['l', '⛵ Llegó después'], ['x', '❓ No sé']];
const DE_TEC = [['n', '🌎 Prehispánica'], ['l', '⛵ Llegó con los europeos'], ['x', '❓ No sé']];
const DE_DE = [['europa', 'Europa'], ['asia', 'Asia'], ['africa', 'África'], ['otro', 'Otro / no sé']];
const DE_COLOR = { america: '#3F9A55', europa: '#2E6FA8', asia: '#B5486E', africa: '#E07B39', otro: '#8E5BA8', sin: '#C9C0B2' };
const DE_NOM = { america: 'América', europa: 'Europa', asia: 'Asia', africa: 'África', otro: 'Otro o sin saber de dónde', sin: 'Sin clasificar' };
const DE_PREG = [
  ['q1', '¿Qué parte de este platillo es herencia prehispánica?', 'Los ingredientes y las técnicas que ya existían antes de 1521…'],
  ['q2', '¿Qué se adoptó después de la conquista y de dónde llegó?', 'Por ejemplo: el cerdo y la manteca llegaron de Europa; la canela, de Asia…'],
  ['q3', '¿Por qué decimos que es un platillo mestizo?', 'Explica con tus palabras cómo se mezclaron las dos tradiciones…'],
];
const fichaVacia = () => ({ nombre: '', region: '', historia: '', ingredientes: [], tecnicas: [], q1: '', q2: '', q3: '', fuentes: '' });
// antes solo había el platillo del proyecto ({nombre, ingredientes, reflexion}): pasa a la ficha del proyecto
function normDesarma(d) {
  d = d || {};
  if (!d.ficha && !d.proyecto && (d.nombre || (d.ingredientes || []).length || d.reflexion)) return { ficha: fichaVacia(), proyecto: { ...fichaVacia(), nombre: d.nombre || '', ingredientes: d.ingredientes || [], q1: d.reflexion || '' }, _t: d._t || 0 };
  return { ficha: { ...fichaVacia(), ...(d.ficha || {}) }, proyecto: { ...fichaVacia(), ...(d.proyecto || {}) }, _t: d._t || 0 };
}
const origenDe = x => x.o === 'n' ? 'america' : x.o === 'l' ? (x.de || 'otro') : 'sin';
function fichaDesarmaHTML(p, titulo, ayuda, ejemplo, calificada) {
  return `<section class="de-mio ${calificada ? 'de-cal' : 'de-proy'}" id="de-${p}"><h3 class="de-paso">${titulo}</h3><p class="atlas-ayuda">${ayuda}</p>
    <div class="de-acc"><button type="button" class="btn-ruta" data-de-word="${p}">⬇ Descargar en Word</button></div>
    ${calificada ? '<div data-entrega></div>' : ''}
    <h4 class="de-sub">📋 Ficha del platillo</h4>
    <div class="de-campos"><label>Nombre del platillo<input data-f="nombre" placeholder="${esc(ejemplo)}"></label><label>Estado o región de donde es<input data-f="region" placeholder="Ejemplo: Campeche, Puebla, Oaxaca…"></label></div>
    <label class="de-lbl">Su historia: ¿dónde y cómo surgió?<textarea data-f="historia" rows="3" placeholder="Cuenta en pocas líneas su origen…"></textarea></label>
    <h4 class="de-sub">🧺 Ingredientes</h4>
    <label class="de-lbl">Sus ingredientes principales, uno por renglón<textarea data-lista="ingredientes" rows="5" placeholder="Maíz\nCerdo\nChile\nCebolla…"></textarea></label>
    <p class="de-hint">Clasifica cada uno. Si llegó después de 1521, elige también de dónde llegó.</p>
    <ul class="de-ings de-mios" data-clas="ingredientes"></ul>
    <div class="de-graf" data-graf></div>
    <h4 class="de-sub">🔥 Técnicas</h4>
    <label class="de-lbl">¿Cómo se prepara? Las técnicas, una por renglón<textarea data-lista="tecnicas" rows="3" placeholder="Nixtamalizar\nCocer en el pib\nFreír en manteca…"></textarea></label>
    <p class="de-hint">Prehispánicas: nixtamalizar, cocer en comal, al vapor o en el pib, moler en metate. Llegaron con los europeos: freír en manteca o aceite, hornear, guisar con vino.</p>
    <ul class="de-ings de-mios" data-clas="tecnicas"></ul>
    <h4 class="de-sub">💭 Conclusión</h4>
    ${DE_PREG.map(([k, t, ph]) => `<label class="de-lbl">${t}<textarea data-f="${k}" rows="3" placeholder="${esc(ph)}"></textarea><small class="de-pal" data-pal="${k}"></small></label>`).join('')}
    <h4 class="de-sub">📚 Fuentes</h4>
    <label class="de-lbl">¿De dónde sacaste la información? (autor o sitio, título y enlace)<textarea data-f="fuentes" rows="3" placeholder="Autor, A. (año). Título. Sitio. URL"></textarea></label></section>`;
}
function conectarFichaDesarma(sec, F, guardar, tipo) {
  const pintarPal = () => DE_PREG.forEach(([k]) => { const n = palabras(F()[k]); const s = $(`[data-pal="${k}"]`, sec); if (s) s.textContent = `${n} palabra${n === 1 ? '' : 's'}${tipo === 'ficha' ? (n >= 25 ? ' ✓' : ' · escribe al menos 25') : ''}`; });
  const grafica = () => {
    const ings = F().ingredientes || [], g = $('[data-graf]', sec);
    if (!ings.length) { g.innerHTML = ''; return; }
    const cuenta = {}; ings.forEach(x => { const k = origenDe(x); cuenta[k] = (cuenta[k] || 0) + 1; });
    const ks = Object.keys(DE_COLOR).filter(k => cuenta[k]), am = Math.round(100 * (cuenta.america || 0) / ings.length);
    g.innerHTML = `<p><b>¿De dónde vienen sus ingredientes?</b> ${am} % de América y ${Math.round(100 * ings.filter(x => x.o === 'l').length / ings.length)} % llegaron después.</p>
      <div class="de-barra-o">${ks.map(k => `<i style="flex:${cuenta[k]};background:${DE_COLOR[k]}" title="${DE_NOM[k]}: ${cuenta[k]}"></i>`).join('')}</div>
      <p class="de-ley">${ks.map(k => `<span><i style="background:${DE_COLOR[k]}"></i>${DE_NOM[k]} (${cuenta[k]})</span>`).join('')}</p>`;
  };
  const clasif = lista => {
    const ul = $(`[data-clas="${lista}"]`, sec), xs = F()[lista] || [], OPC = lista === 'ingredientes' ? DE_ING : DE_TEC;
    ul.innerHTML = xs.map((x, i) => `<li><span>${esc(x.n)}</span><div>${OPC.map(([v, t]) => `<button type="button" data-i="${i}" data-v="${v}" aria-pressed="${x.o === v}">${t}</button>`).join('')}</div>
      ${lista === 'ingredientes' && x.o === 'l' ? `<div class="de-de"><small>¿De dónde llegó?</small>${DE_DE.map(([v, t]) => `<button type="button" data-i="${i}" data-de="${v}" aria-pressed="${x.de === v}">${t}</button>`).join('')}</div>` : ''}</li>`).join('');
    $$('button[data-v]', ul).forEach(b => b.addEventListener('click', () => { const x = F()[lista][+b.dataset.i]; const antes = x.o; x.o = b.dataset.v; if (x.o !== 'l') delete x.de; if (!guardar()) { x.o = antes; return; } clasif(lista); grafica(); }));
    $$('button[data-de]', ul).forEach(b => b.addEventListener('click', () => { const x = F()[lista][+b.dataset.i]; const antes = x.de; x.de = b.dataset.de; if (!guardar()) { x.de = antes; return; } clasif(lista); grafica(); }));
  };
  $$('[data-f]', sec).forEach(i => i.addEventListener('input', () => { F()[i.dataset.f] = i.value; guardar(); if (i.dataset.f.startsWith('q')) pintarPal(); }));
  $$('[data-lista]', sec).forEach(t => t.addEventListener('input', () => {
    const k = t.dataset.lista, viejos = Object.fromEntries((F()[k] || []).map(x => [x.n.toLowerCase(), x]));
    F()[k] = t.value.split('\n').map(x => x.trim()).filter(Boolean).map(n => { const v = viejos[n.toLowerCase()]; return v ? { ...v, n } : { n, o: '' }; });
    guardar(); clasif(k); if (k === 'ingredientes') grafica();
  }));
  const cargar = () => {
    $$('[data-f]', sec).forEach(i => { i.value = F()[i.dataset.f] || ''; });
    $$('[data-lista]', sec).forEach(t => { t.value = (F()[t.dataset.lista] || []).map(x => x.n).join('\n'); });
    clasif('ingredientes'); clasif('tecnicas'); grafica(); pintarPal();
  };
  cargar();
  return { cargar };
}
// gráfica de barras de los orígenes, como imagen para el Word
async function graficaDesarmaPNG(ings) {
  const cuenta = {}; ings.forEach(x => { const k = origenDe(x); cuenta[k] = (cuenta[k] || 0) + 1; });
  const ks = Object.keys(DE_COLOR).filter(k => cuenta[k]), W = 1600, fila = 90, H = 60 + ks.length * fila;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
  const max = Math.max(...ks.map(k => cuenta[k])), x0 = 420, ancho = W - x0 - 160;
  ks.forEach((k, i) => {
    const y = 30 + i * fila;
    c.fillStyle = '#1C1B19'; c.font = 'bold 40px Arial'; c.textBaseline = 'middle'; c.textAlign = 'right'; c.fillText(DE_NOM[k].replace(' o sin saber de dónde', ''), x0 - 24, y + fila / 2 - 8);
    c.fillStyle = DE_COLOR[k]; c.fillRect(x0, y + 8, Math.max(8, ancho * cuenta[k] / max), fila - 32);
    c.fillStyle = '#1C1B19'; c.textAlign = 'left'; c.fillText(`${cuenta[k]} (${Math.round(100 * cuenta[k] / ings.length)} %)`, x0 + ancho * cuenta[k] / max + 18, y + fila / 2 - 8);
  });
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), W, H };
}
async function wordDesarma(F, calificada) {
  if (!(F.nombre || '').trim() || !(F.ingredientes || []).length) { alert('Escribe el nombre del platillo y al menos un ingrediente.'); return; }
  const D = new DocITES(); await D.cargarLogo();
  D.portada({ kicker: calificada ? 'Tema 3.2 · Tarea: Desarma el platillo' : 'Proyecto «Mi Plato, Mi Historia» · Pregunta 14', titulo: F.nombre.trim(), subtitulo: '¿Qué parte es herencia prehispánica y qué parte fue adoptada tras la conquista?', etiqueta: 'Alumno', personas: [sesion.nombre] });
  D.h1('Ficha del platillo');
  D.ficha([['Platillo', F.nombre], ['Estado o región', F.region], ['Historia', F.historia]]);
  const ings = F.ingredientes, nom = { n: 'De América (prehispánico)', l: 'Llegó después de 1521', x: 'Por investigar', '': 'Sin clasificar' }, fondo = { n: 'E3F1E6', l: 'DCE7F3', x: 'F1F1F1', '': 'FFFFFF' };
  D.h1('Ingredientes', `${ings.filter(x => x.o === 'n').length} de América · ${ings.filter(x => x.o === 'l').length} llegaron después de 1521 · ${ings.filter(x => !x.o || x.o === 'x').length} por investigar`);
  D.tabla([['Ingrediente', 'Origen', '¿De dónde llegó?'], ...ings.map(x => [{ t: x.n, b: true }, { t: nom[x.o || ''], fondo: fondo[x.o || ''] }, x.o === 'l' ? DE_NOM[x.de || 'otro'] : x.o === 'n' ? 'América' : '—'])], { anchos: [3120, 3120, 3120], cebra: false });
  try { const g = await graficaDesarmaPNG(ings); D.h2('¿De dónde vienen sus ingredientes?'); D.imagen(g.bytes, g.W, g.H, 14); } catch { /* sin gráfica */ }
  const tecs = F.tecnicas || [], nomT = { n: 'Prehispánica', l: 'Llegó con los europeos', x: 'Por investigar', '': 'Sin clasificar' };
  D.h1('Técnicas');
  if (tecs.length) D.tabla([['Técnica', 'Origen'], ...tecs.map(x => [{ t: x.n, b: true }, { t: nomT[x.o || ''], fondo: fondo[x.o || ''] }])], { anchos: [4680, 4680], cebra: false }); else D.texto('');
  D.h1('Conclusión');
  DE_PREG.forEach(([k, t]) => { D.h2(t); D.texto(F[k]); });
  D.h1('Fuentes consultadas'); D.texto(F.fuentes);
  D.descargar(`${calificada ? 'Desarma_el_platillo' : 'Mi_platillo_pregunta14'}_${slug(F.nombre)}_${slug(sesion.nombre)}`);
}

// ======================================================= JUEGOS DE PRÁCTICA del 3.2 (segunda parte)
// Motor común: niveles, modo reto con reloj, mejor marca, repaso de fallos y tabla para estudiar.
function juegoPreguntas(cont, C) {
  const SEG = C.seg || 15;
  let reto = lsGet('clase_' + C.clave + '_reto') === '1', N = null, items = [], i = 0, bien = 0, pts = 0, racha = 0, mejorRacha = 0, fallos = [], reloj = null, t0 = 0, malos = 0;
  const parar = () => { clearInterval(reloj); reloj = null; };
  detener = parar;
  const mejor = id => lsGet(`clase_${C.clave}_mejor_${id}`) || '—';
  const inicio = () => {
    parar();
    cont.innerHTML = `<p class="atlas-ayuda">${C.intro}</p>
      <div class="ap-niveles">${C.niveles.map(nv => `<button type="button" class="ap-nivel" data-n="${nv.id}"><span>${nv.ico}</span><b>${nv.n}</b><small>${esc(nv.desc)}</small><em>Tu mejor marca: ${mejor(nv.id)}</em></button>`).join('')}</div>
      <label class="ap-reto"><input type="checkbox" id="ap-reto" ${reto ? 'checked' : ''}> ⏱ <b>Modo reto:</b> ${SEG} segundos por pregunta; respondiendo rápido ganas más puntos y sumas racha.</label>
      <button type="button" class="btn-ruta" id="ap-estudiar">📚 ${esc(C.estudiar.boton)}</button>`;
    $('#ap-reto').addEventListener('change', e => { reto = e.target.checked; lsSet('clase_' + C.clave + '_reto', reto ? '1' : '0'); });
    $$('.ap-nivel', cont).forEach(b => b.addEventListener('click', () => { N = C.niveles.find(x => x.id === b.dataset.n); nueva(); }));
    $('#ap-estudiar').addEventListener('click', estudiar);
  };
  const nueva = () => { items = barajar(C.items.filter(N.filtro)).slice(0, N.preg); i = 0; bien = 0; pts = 0; racha = 0; mejorRacha = 0; fallos = []; malos = 0; pregunta(); };
  const marcador = () => `${C.cabecera ? C.cabecera(bien, malos) : ''}<div class="ap-marcador"><span>${N.ico} ${N.n} · ${C.termina ? `pregunta ${i + 1}` : `${Math.min(i + 1, items.length)} de ${items.length}`}</span><span>✅ ${bien}</span>${reto ? `<span>⭐ ${pts} pts · 🔥 racha ${racha}</span>` : ''}</div>`;
  const terminado = () => i >= items.length || (C.termina && C.termina(bien, malos));
  const pregunta = () => {
    parar();
    if (terminado()) return fin();
    const x = items[i], P = C.preparar(x);
    cont.innerHTML = `<div id="ap-mk">${marcador()}</div>${reto ? '<div class="ap-tiempo"><i id="ap-t"></i></div>' : ''}
      <div class="ap-carta jp-carta">${P.carta}</div>
      <div class="jp-opciones ${P.clase || ''}">${P.opciones.map(o => `<button type="button" class="ap-bot jp-op" data-v="${esc(o.v)}" ${o.style ? `style="${o.style}"` : ''}>${o.t}</button>`).join('')}</div>
      <div id="ap-fb" aria-live="polite"></div>`;
    $$('.jp-op', cont).forEach(b => b.addEventListener('click', () => responder(b.dataset.v, P)));
    if (reto) { t0 = Date.now(); reloj = setInterval(() => { const q = Math.max(0, SEG - (Date.now() - t0) / 1000), b = $('#ap-t'); if (b) b.style.width = (100 * q / SEG) + '%'; if (q <= 0) { parar(); responder(null, P); } }, 100); }
  };
  const responder = (v, P) => {
    const q = reto ? Math.max(0, SEG - (Date.now() - t0) / 1000) : 0; parar();
    const x = items[i], ok = v !== null && P.correctas.includes(v);
    $$('.jp-op', cont).forEach(b => { b.disabled = true; if (P.correctas.includes(b.dataset.v)) b.classList.add('ok'); else if (b.dataset.v === v) b.classList.add('mal'); });
    if (ok) { bien++; racha++; mejorRacha = Math.max(mejorRacha, racha); if (reto) pts += 100 + Math.round(10 * q); } else { malos++; racha = 0; fallos.push(x); }
    const tit = v === null ? '⏱ Se acabó el tiempo.' : ok ? (C.bien ? C.bien(x, bien) : '¡Correcto!') : (C.mal ? C.mal(x, malos) : 'No es esa.');
    $('#ap-fb').innerHTML = `<div class="aviso ${ok ? 'ok' : 'mal'}"><strong>${tit}</strong>${C.explicar(x, ok)}</div><div id="jp-extra"></div><button class="btn-at" id="ap-sig" type="button">${terminado() || i + 1 >= items.length ? 'Ver resultado' : 'Siguiente →'}</button>`;
    if (C.despues) C.despues(x, v, $('#jp-extra'));
    $('#ap-mk').innerHTML = marcador();
    if (C.escena) C.escena(ok, bien, malos);
    $('#ap-sig').addEventListener('click', () => { i++; pregunta(); }); $('#ap-sig').focus({ preventScroll: true });
  };
  const fin = async () => {
    parar();
    if (C.escenaFinal) { const e = C.escenaFinal(bien, malos); if (e) { cont.innerHTML = ''; await e; } }
    const marca = reto ? pts : bien, clave = `clase_${C.clave}_mejor_${N.id}`, previa = Number((lsGet(clave) || '0').split(/[ /]/)[0]) || 0, record = marca > previa;
    if (record) lsSet(clave, reto ? `${pts} pts` : `${bien}/${Math.min(i, items.length)}`);
    cont.innerHTML = `<div class="resumen">${C.final ? C.final(bien, malos) : ''}<h3>${N.ico} ${N.n}: ${bien} acierto${bien === 1 ? '' : 's'} de ${Math.min(i, items.length)}</h3>
      <p>${reto ? `⭐ <b>${pts} puntos</b> · mejor racha: ${mejorRacha}. ` : ''}${record ? '🏅 ¡Nueva mejor marca!' : ''}</p>
      <p>${!fallos.length ? '¡Sin errores! Ya dominas este nivel.' : 'Estudia los que fallaste:'}</p>
      ${fallos.length ? `<ul class="ap-fallos">${fallos.map(x => `<li>${C.repaso(x)}</li>`).join('')}</ul>` : ''}
      <div class="ap-fin-bot"><button class="btn-at" id="ap-otra" type="button">Otra ronda</button>${C.niveles.length > 1 ? '<button class="btn-ruta" id="ap-niv" type="button">Cambiar de nivel</button>' : ''}<button class="btn-ruta" id="ap-est" type="button">📚 Estudiar</button></div></div>`;
    $('#ap-otra').addEventListener('click', nueva); const bn = $('#ap-niv'); if (bn) bn.addEventListener('click', inicio); $('#ap-est').addEventListener('click', estudiar);
  };
  const estudiar = () => {
    parar();
    const E = C.estudiar; let f = E.filtros[0][0], qq = '';
    cont.innerHTML = `<button type="button" class="ma-link" id="ap-volver">← Volver al juego</button>
      <p class="atlas-ayuda">${E.intro}</p>
      ${E.filtros.length > 1 ? `<div class="atlas-zoom" id="ap-filtros">${E.filtros.map(([k, n]) => `<button type="button" class="chip-at" data-f="${k}" aria-pressed="${k === f}">${n}</button>`).join('')}</div>` : ''}
      <input id="ap-buscar" class="ap-buscar" type="search" placeholder="Buscar…" aria-label="Buscar">
      <p class="ap-cuenta" id="ap-cuenta"></p><div class="ap-tabla ${E.clase || ''}" id="ap-tabla"></div>`;
    const sin = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const pintar = () => {
      const fn = E.filtros.find(x => x[0] === f)[2];
      const xs = C.items.filter(x => fn(x) && (!qq || sin(E.texto(x)).includes(sin(qq))));
      $('#ap-cuenta').textContent = `${xs.length} ${xs.length === 1 ? E.uno : E.varios}`;
      $('#ap-tabla').innerHTML = xs.map(E.fila).join('') || '<p class="atlas-ayuda">No hay resultados.</p>';
    };
    $$('#ap-filtros .chip-at').forEach(b => b.addEventListener('click', () => { f = b.dataset.f; $$('#ap-filtros .chip-at').forEach(x => x.setAttribute('aria-pressed', String(x === b))); pintar(); }));
    $('#ap-buscar').addEventListener('input', e => { qq = e.target.value.trim(); pintar(); });
    $('#ap-volver').addEventListener('click', inicio);
    pintar(); window.scrollTo({ top: 0 });
  };
  inicio();
}

// ---- Escenas a pantalla completa de «Defiende Campeche» (4-5 s, se saltan tocando) y sonidos sintetizados
const CP_SON = { ctx: null };
const cpSonidoOn = () => lsGet('clase_campeche_sonido') !== '0';
function cpAudio() { if (!CP_SON.ctx) { try { CP_SON.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (CP_SON.ctx.state === 'suspended') CP_SON.ctx.resume(); return CP_SON.ctx; }
function cpRuido(a, dur, frec, tipo, vol, t0) {
  const n = a.createBufferSource(), b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 2);
  const f = a.createBiquadFilter(); f.type = tipo; f.frequency.value = frec; const g = a.createGain(); g.gain.value = vol;
  n.buffer = b; n.connect(f).connect(g).connect(a.destination); n.start(t0);
}
function cpTono(a, frec, dur, tipo, vol, t0, hasta) {
  const o = a.createOscillator(), g = a.createGain(); o.type = tipo; o.frequency.setValueAtTime(frec, t0); if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .05);
}
function cpSonido(tipo) {
  if (!cpSonidoOn()) return; const a = cpAudio(); if (!a) return; const t = a.currentTime;
  if (tipo === 'obra') { for (let k = 0; k < 7; k++) { cpRuido(a, .07, 2600, 'bandpass', .5, t + .15 + k * .38); cpTono(a, 180, .12, 'square', .08, t + .15 + k * .38, 90); } }
  if (tipo === 'bandera') { [523, 659, 784, 1047].forEach((f, k) => cpTono(a, f, .35, 'triangle', .22, t + k * .13)); }
  if (tipo === 'olas') { cpRuido(a, 2.2, 500, 'lowpass', .25, t); }
  if (tipo === 'canon') { cpRuido(a, 1.2, 380, 'lowpass', 1, t); cpTono(a, 110, .9, 'sine', .7, t, 35); }
  if (tipo === 'victoria') { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, k) => cpTono(a, f, .45, 'triangle', .22, t + k * .16)); cpRuido(a, .4, 3000, 'highpass', .15, t + 1.3); cpRuido(a, .4, 3000, 'highpass', .15, t + 1.8); }
  if (tipo === 'derrota') { [392, 349, 311, 262].forEach((f, k) => cpTono(a, f, .6, 'sawtooth', .12, t + k * .32)); cpRuido(a, 1.2, 300, 'lowpass', .8, t + .2); }
}
function cpEscena(tipo, o = {}) {
  return new Promise(res => {
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches, dur = quieto ? 1800 : (tipo === 'victoria' || tipo === 'derrota' ? 5200 : 4600);
    const el = document.createElement('div'); el.className = `cp-escena cp-${tipo}${quieto ? ' cp-quieto' : ''}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'assertive');
    const v = o.n || 0, pied = ['#D8C3A0', '#CDB592', '#E0CBA6', '#C9AE86', '#D4BE98', '#BFA27A', '#DCC7A2', '#C4AA82'][v % 8], band = ['#C0503F', '#2E6FA8', '#D9A441', '#3F9A55', '#8E5BA8', '#C0503F', '#2BA3A0', '#E07B39'][v % 8];
    const hileras = 6, garitas = v % 3 === 2 ? 2 : 1, canones = 1 + (v % 3);
    const baluarte = () => {
      let r = '';
      for (let h = 0; h < hileras; h++) { const y = 300 - h * 30, x0 = 40 + h * 9, ancho = 320 - h * 18, n = 7 - (h % 2); let row = ''; for (let k = 0; k < n; k++) { const w = ancho / n; row += `<rect x="${(x0 + k * w).toFixed(1)}" y="${y}" width="${(w - 3).toFixed(1)}" height="27" rx="2" fill="${pied}" stroke="#8A7458" stroke-width="1.5"/>`; } r += `<g class="cp-hil" style="--d:${(.15 + h * .38).toFixed(2)}s">${row}<g class="cp-polvo"><circle cx="${x0 + 10}" cy="${y + 28}" r="10"/><circle cx="${x0 + ancho - 10}" cy="${y + 28}" r="12"/></g></g>`; }
      const top = 300 - (hileras - 1) * 30, xt = 40 + (hileras - 1) * 9, at = 320 - (hileras - 1) * 18;
      let alm = ''; for (let k = 0; k < 6; k++) alm += `<rect x="${xt + k * (at / 6) + 2}" y="${top - 18}" width="${at / 12}" height="18" fill="${pied}" stroke="#8A7458" stroke-width="1.5"/>`;
      let gar = ''; for (let k = 0; k < garitas; k++) { const gx = garitas === 1 ? xt + at - 34 : (k ? xt + at - 34 : xt + 6); gar += `<g><rect x="${gx}" y="${top - 58}" width="28" height="40" rx="3" fill="${pied}" stroke="#8A7458" stroke-width="1.5"/><path d="M${gx - 4} ${top - 58} L${gx + 14} ${top - 78} L${gx + 32} ${top - 58} Z" fill="#9C4A35"/><rect x="${gx + 10}" y="${top - 46}" width="8" height="14" fill="#3A2E22"/></g>`; }
      let can = ''; for (let k = 0; k < canones; k++) can += `<rect x="${xt + 40 + k * 46}" y="${top - 30}" width="30" height="9" rx="4" fill="#2F2F33" transform="rotate(-12 ${xt + 40 + k * 46} ${top - 26})"/>`;
      const trab = [0, 1, 2].map(k => `<g class="cp-trab" style="--t:${k * .9}s"><circle cx="0" cy="-34" r="6" fill="#4A3426"/><line x1="0" y1="-28" x2="0" y2="-8" stroke="#4A3426" stroke-width="4"/><line x1="0" y1="-8" x2="-6" y2="8" stroke="#4A3426" stroke-width="4"/><line x1="0" y1="-8" x2="6" y2="8" stroke="#4A3426" stroke-width="4"/><line x1="0" y1="-22" x2="9" y2="-34" stroke="#4A3426" stroke-width="3.5"/><rect x="4" y="-46" width="16" height="11" rx="2" fill="${pied}" stroke="#8A7458"/></g>`).join('');
      return `<svg viewBox="0 0 400 380" class="cp-svg" aria-hidden="true"><rect x="0" y="328" width="400" height="60" fill="#3E7C9B"/><path class="cp-ola" d="M0 334 q25 -8 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#9FD0E3" stroke-width="3" fill="none"/>
        <rect x="20" y="320" width="360" height="12" fill="#B39A73"/>${r}<g class="cp-alm">${alm}${gar}${can}</g>
        <g class="cp-mastil"><line x1="${xt + at / 2}" y1="${top - 18}" x2="${xt + at / 2}" y2="${top - 110}" stroke="#3A2E22" stroke-width="4"/><path class="cp-bandera" d="M${xt + at / 2} ${top - 110} l46 10 l-46 12 z" fill="${band}"/></g>
        <g class="cp-trabs">${trab}</g></svg>`;
    };
    const barco = (x = 0, s = 1) => `<g transform="translate(${x} 0) scale(${s})"><path d="M60 270 L340 270 L300 320 L100 320 Z" fill="#5A3A22" stroke="#2E1E12" stroke-width="3"/><rect x="195" y="120" width="8" height="150" fill="#2E1E12"/><path d="M203 128 L290 175 L203 225 Z" fill="#EDE3CF" stroke="#8A7458"/><path d="M195 135 L120 180 L195 228 Z" fill="#EDE3CF" stroke="#8A7458"/><rect x="203" y="96" width="40" height="26" fill="#1C1B19"/><text x="223" y="115" font-size="18" text-anchor="middle" fill="#fff">☠</text><circle cx="130" cy="290" r="6" fill="#1C1B19"/><circle cx="170" cy="290" r="6" fill="#1C1B19"/><circle cx="210" cy="290" r="6" fill="#1C1B19"/><circle cx="250" cy="290" r="6" fill="#1C1B19"/></g>`;
    const pirata = () => `<svg viewBox="0 0 400 380" class="cp-svg" aria-hidden="true"><rect x="0" y="300" width="400" height="80" fill="#2F6A86"/><path class="cp-ola" d="M0 306 q25 -8 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#9FD0E3" stroke-width="3" fill="none"/><g class="cp-barco">${barco()}</g><g class="cp-fogon"><circle cx="70" cy="285" r="22" fill="#FFD166"/><circle cx="50" cy="275" r="30" fill="#EDE3CF" opacity=".85"/><circle cx="25" cy="262" r="26" fill="#D8D2C4" opacity=".7"/></g></svg>`;
    const final = ok => {
      const pts = Array.from({ length: 6 }, (_, k) => { const an = Math.PI / 3 * k - Math.PI / 2, rr = k % 2 ? 125 : 140; return [200 + rr * Math.cos(an), 190 + rr * Math.sin(an) * .82]; });
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], marcas = [pts[0], mid(pts[0], pts[1]), pts[1], pts[2], pts[3], mid(pts[3], pts[4]), pts[4], pts[5]];   // los 8 baluartes
      return `<svg viewBox="0 0 400 380" class="cp-svg" aria-hidden="true"><rect x="0" y="0" width="400" height="380" fill="${ok ? '#1F3A57' : '#3A1E1E'}"/>
        <polygon class="cp-hex" points="${pts.map(p => p.join(',')).join(' ')}" fill="${ok ? 'rgba(217,164,65,.18)' : 'rgba(192,80,63,.2)'}" stroke="${ok ? '#D9A441' : '#C0503F'}" stroke-width="8" stroke-linejoin="round"/>
        ${marcas.map((p, k) => `<g class="cp-punto" style="--d:${(1 + k * .25).toFixed(2)}s"><circle cx="${p[0]}" cy="${p[1]}" r="15" fill="${ok ? '#F2D27A' : '#7A2A22'}" stroke="#fff" stroke-width="3"/></g>`).join('')}
        <text x="200" y="205" text-anchor="middle" font-size="56">${ok ? '🏰' : '🔥'}</text>
        ${ok ? Array.from({ length: 5 }, (_, k) => `<g class="cp-fuego" style="--d:${(2 + k * .35).toFixed(2)}s;--x:${60 + k * 70}px;--y:${50 + (k % 2) * 40}px">${Array.from({ length: 10 }, (_, j) => `<circle r="4" fill="${['#F2D27A', '#E07B39', '#9FD0E3', '#F7A9C4', '#B7E4A1'][j % 5]}" style="--a:${j * 36}deg"/>`).join('')}</g>`).join('') : [0, 1, 2].map(k => `<g class="cp-barco-f" style="--d:${(.6 + k * .4).toFixed(2)}s">${barco(-40 + k * 120, .38)}</g>`).join('')}</svg>`;
    };
    const textos = {
      baluarte: [`¡Baluarte de ${o.nombre} levantado!`, `${v + 1} de 8 baluartes`],
      pirata: ['¡Se acerca un barco pirata!', `${o.n} de 4 barcos`],
      victoria: ['¡Campeche quedó amurallado!', 'Los 8 baluartes resistieron a los piratas'],
      derrota: ['¡Lorencillo saqueó la villa!', 'Estudia y vuelve a defenderla'],
    }[tipo];
    el.innerHTML = `<div class="cp-cielo"></div>${tipo === 'baluarte' ? baluarte() : tipo === 'pirata' ? pirata() : final(tipo === 'victoria')}
      <div class="cp-letrero"><b>${esc(textos[0])}</b><span>${esc(textos[1])}</span></div><small class="cp-saltar">Toca para continuar</small>`;
    document.body.appendChild(el); document.body.classList.add('cp-sin-scroll');
    if (tipo === 'baluarte') { cpSonido('obra'); setTimeout(() => cpSonido('bandera'), quieto ? 0 : 2900); }
    if (tipo === 'pirata') { cpSonido('olas'); setTimeout(() => { cpSonido('canon'); el.classList.add('cp-tiembla'); }, quieto ? 0 : 2100); }
    if (tipo === 'victoria' || tipo === 'derrota') cpSonido(tipo);
    let hecho = false;
    const cerrar = () => { if (hecho) return; hecho = true; el.classList.add('cp-fuera'); setTimeout(() => { el.remove(); document.body.classList.remove('cp-sin-scroll'); res(); }, 280); };
    const t = setTimeout(cerrar, dur);
    el.addEventListener('click', () => { clearTimeout(t); cerrar(); });
    const tecla = e => { if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); clearTimeout(t); cerrar(); document.removeEventListener('keydown', tecla); } };
    document.addEventListener('keydown', tecla);
  });
}

// ---- 🏰 Defiende Campeche: cada acierto levanta un baluarte; cada error acerca un barco pirata
function actCampeche(cont) {
  const META = BALUARTES.length, BARCOS = 4;
  if (!cont._cpSon) { cont._cpSon = true; cont.addEventListener('click', e => { const b = e.target.closest('#cp-son'); if (!b) return; const on = !cpSonidoOn(); lsSet('clase_campeche_sonido', on ? '1' : '0'); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '🔊 Sonido' : '🔇 Sin sonido'; if (on) { cpAudio(); cpSonido('bandera'); } }); }
  juegoPreguntas(cont, {
    clave: 'campeche', seg: 20,
    intro: 'Es 1686: después del saqueo de Lorencillo, la Corona decide amurallar Campeche. <b>Cada respuesta correcta levanta uno de los 8 baluartes</b>; cada error acerca un barco pirata. Si llegan <b>4 barcos</b> antes de terminar la muralla, ¡saquean la villa!',
    niveles: [{ id: 'muralla', n: 'Defender la muralla', ico: '🏰', preg: 40, desc: 'Levanta los 8 baluartes antes de que lleguen 4 barcos piratas.', filtro: () => true }],
    items: CAMPECHE,
    termina: (b, m) => b >= META || m >= BARCOS,
    escena: (ok, b, m) => ok ? (b <= META ? cpEscena('baluarte', { n: b - 1, nombre: BALUARTES[b - 1] }) : null) : (m <= BARCOS ? cpEscena('pirata', { n: m }) : null),
    escenaFinal: (b, m) => b >= META ? cpEscena('victoria') : m >= BARCOS ? cpEscena('derrota') : null,
    cabecera: (b, m) => `<button type="button" class="cp-son" id="cp-son" aria-pressed="${cpSonidoOn()}">${cpSonidoOn() ? '🔊 Sonido' : '🔇 Sin sonido'}</button><div class="cp-muralla" aria-label="${Math.min(b, META)} de ${META} baluartes y ${Math.min(m, BARCOS)} de ${BARCOS} barcos">
      <div class="cp-bal">${BALUARTES.map((n, k) => `<span class="${k < b ? 'si' : ''}" title="Baluarte de ${n}">${k < b ? '🏰' : '🧱'}</span>`).join('')}</div>
      <div class="cp-mar">${Array.from({ length: BARCOS }, (_, k) => `<span class="${k < m ? 'si' : ''}">${k < m ? '🏴‍☠️' : '🌊'}</span>`).join('')}</div></div>`,
    preparar: x => { const ops = barajar(x.o); return { carta: `<span class="jp-q">${esc(x.q)}</span>`, opciones: ops.map(o => ({ v: o, t: esc(o) })), correctas: [x.o[0]], clase: 'jp-lista' }; },
    bien: (x, b) => b <= META ? `¡Correcto! Se levanta el baluarte de ${BALUARTES[b - 1]}.` : '¡Correcto!',
    mal: (x, m) => `No. 🏴‍☠️ Se acerca un barco pirata (${Math.min(m, BARCOS)} de ${BARCOS}). La respuesta era: ${esc(x.o[0])}.`,
    explicar: x => `<p class="ap-dato">${esc(x.x)}</p>`,
    final: (b, m) => b >= META ? '<p class="cp-final ok">🏰 ¡Campeche quedó amurallado! Los piratas ya no pudieron entrar.</p>' : m >= BARCOS ? '<p class="cp-final mal">🏴‍☠️ ¡Llegaron los piratas y saquearon la villa! Estudia y vuelve a defenderla.</p>' : '',
    repaso: x => `<b>${esc(x.q)}</b><br>✔ ${esc(x.o[0])}. <span class="ap-dato">${esc(x.x)}</span>`,
    estudiar: { boton: 'Estudiar la historia de Campeche', intro: 'Todas las preguntas del juego con su respuesta. Salen del compendio, subtema 3.2: «Campeche: piratas, murallas y mestizaje de puerto» y «El recetario campechano».', filtros: [['todos', 'Todas', () => true]], uno: 'pregunta', varios: 'preguntas', texto: x => x.q + ' ' + x.o[0] + ' ' + x.x,
      fila: x => `<div class="ap-fila"><span class="ap-fe">🏰</span><div><b>${esc(x.q)}</b><p class="ap-orig">✔ ${esc(x.o[0])}</p><p class="ap-dato">${esc(x.x)}</p></div></div>` },
  });
}

// ---- ⚖️ ¿Qué influencia es?: las siete influencias de la cocina campechana
function actQueInfluencia(cont) {
  const L = INFLUENCIAS.lista, nom = k => (L.find(x => x[0] === k) || [])[1];
  juegoPreguntas(cont, {
    clave: 'influencia', seg: 12,
    intro: 'El maestro Rafael E. Meneses López identifica <b>siete influencias</b> en la cocina campechana. Aparece un ingrediente, una técnica, un platillo o un hecho: ¿a qué influencia corresponde? Es el calentamiento para la tarea en equipo de las siete influencias.',
    niveles: [{ id: 'ronda', n: 'Ronda de 15', ico: '⚖️', preg: 15, desc: '15 preguntas al azar de las siete influencias.', filtro: () => true }, { id: 'todas', n: 'Todas', ico: '🏆', preg: 99, desc: `Las ${QUE_INFLUENCIA.length} preguntas, para dominarlas.`, filtro: () => true }],
    items: QUE_INFLUENCIA,
    preparar: x => ({ carta: `<span class="ap-emo">${x.e}</span><b class="jp-q">${esc(x.q)}</b>`, opciones: L.map(([k, n, col]) => ({ v: k, t: esc(n), style: `--c:${col}` })), correctas: [x.c], clase: 'jp-infl' }),
    mal: x => `No: es la influencia ${nom(x.c).toLowerCase()}.`,
    explicar: x => `<p class="ap-dato">${esc(x.x)}</p>`,
    repaso: x => `${x.e} <b>${esc(x.q)}</b> → ${esc(nom(x.c))}. <span class="ap-dato">${esc(x.x)}</span>`,
    estudiar: { boton: 'Estudiar las siete influencias', intro: 'Cada influencia con su explicación del compendio y los ejemplos del juego.', filtros: [['todos', 'Todas', () => true], ...L.map(([k, n]) => [k, n, x => x.c === k])], uno: 'ejemplo', varios: 'ejemplos', texto: x => x.q + ' ' + nom(x.c),
      fila: x => { const I = L.find(y => y[0] === x.c); return `<div class="ap-fila" style="border-left-color:${I[2]}"><span class="ap-fe">${x.e}</span><div><b>${esc(x.q)}</b> <small class="ap-tag">${esc(I[1])}</small><p class="ap-dato">${esc(x.x)}</p></div></div>`; } },
  });
}

// ---- 🌎 Platillos de América: ¿de qué país es? Al responder se ilumina en el mapa
let MAPA_AM = null;
async function mapaAmerica() {
  if (MAPA_AM) return MAPA_AM;
  const A = await fetch('data/atlas.json').then(r => r.json()), ids = new Set();
  Object.values(A.regiones).forEach(r => { if (r.cont === 'america') r.paises.forEach(p => ids.add(p.id)); });
  MAPA_AM = { A, ids }; return MAPA_AM;
}
function actPlatillosAmerica(cont) {
  const todos = Object.keys(PAISES_AM);
  juegoPreguntas(cont, {
    clave: 'platillosam', seg: 12,
    intro: 'Un recorrido por la mesa de América: Centroamérica, el Caribe, los Andes, la Amazonía y Brasil, el Cono Sur, Norteamérica y las migraciones. Aparece un platillo: <b>¿de qué país es?</b> Al responder se ilumina en el mapa y ves qué raíces tiene. Te sirve para tu Mi atlas: América.',
    niveles: [{ id: 'basico', n: 'Básico', ico: '🌱', preg: 10, desc: 'Los platillos más famosos del continente.', filtro: x => x.niv === 1 }, { id: 'experto', n: 'Experto', ico: '🏆', preg: 16, desc: 'Todos, incluidas las cocinas chifa, nikkei, andina, amazónica y de las migraciones.', filtro: () => true }],
    items: PLATILLOS_AM,
    preparar: x => { const malas = barajar(todos.filter(k => !x.ok.includes(k))).slice(0, 3), ops = barajar([x.ok[0], ...malas]); return { carta: `<span class="ap-emo">${x.e}</span><b>${esc(x.p)}</b><small class="jp-pista">${esc(x.d)}</small>`, opciones: ops.map(k => ({ v: k, t: esc(PAISES_AM[k]) })), correctas: x.ok }; },
    mal: x => `No: es de ${x.ok.map(k => PAISES_AM[k]).join(' y ')}.`,
    explicar: x => `<p class="ap-orig">🌱 <b>Raíces:</b> ${esc(x.raices)}</p><p class="ap-dato">${esc(x.x)}</p>`,
    despues: async (x, v, el) => {
      try {
        const { A, ids } = await mapaAmerica(), [bx, by, bw, bh] = A.mundo.cajas.america;
        el.innerHTML = `<svg class="jp-mapa" viewBox="${bx} ${by} ${bw} ${bh}" role="img" aria-label="Mapa de América: ${esc(x.ok.map(k => PAISES_AM[k]).join(' y '))}">${A.mundo.paises.filter(p => p.i && ids.has(p.i)).map(p => `<path d="${p.d}" class="${x.ok.includes(p.i) ? 'si' : p.i === v ? 'no' : ''}"/>`).join('')}</svg>`;
      } catch { /* sin mapa */ }
    },
    repaso: x => `${x.e} <b>${esc(x.p)}</b>: ${esc(x.ok.map(k => PAISES_AM[k]).join(' y '))}. <span class="ap-dato">Raíces: ${esc(x.raices)}. ${esc(x.x)}</span>`,
    estudiar: { boton: 'Estudiar los platillos de América', intro: 'Los platillos del juego, con su país y sus raíces.', filtros: [['todos', 'Todos', () => true], ['cen', 'México y Centroamérica', x => x.ok.some(k => ['MEX', 'GTM', 'SLV', 'CRI', 'NIC'].includes(k))], ['car', 'Caribe', x => x.ok.some(k => ['CUB', 'DOM', 'PRI', 'JAM'].includes(k))], ['sur', 'Sudamérica', x => x.ok.some(k => ['PER', 'BOL', 'ECU', 'BRA', 'ARG', 'URY', 'PRY', 'CHL'].includes(k))], ['nor', 'Norteamérica', x => x.ok.some(k => ['USA', 'CAN'].includes(k))]], uno: 'platillo', varios: 'platillos', texto: x => x.p + ' ' + x.ok.map(k => PAISES_AM[k]).join(' ') + ' ' + x.raices,
      fila: x => `<div class="ap-fila"><span class="ap-fe">${x.e}</span><div><b>${esc(x.p)}</b> <small class="ap-tag">${esc(x.ok.map(k => PAISES_AM[k]).join(' / '))}</small><p class="ap-orig">${esc(x.d)}</p><p class="ap-orig">🌱 ${esc(x.raices)}</p><p class="ap-dato">${esc(x.x)}</p></div></div>` },
  });
}

// ======================================================= 4. LAS SIETE INFLUENCIAS (en equipo o individual, en vivo, con votación)
// Documento vivo genérico: guarda campo por campo, mezcla los cambios de los demás y no le quita el cursor a nadie.
// copia sin referencias; las fechas de Firestore se vuelven milisegundos
const plano = v => v && typeof v.toMillis === 'function' ? v.toMillis() : Array.isArray(v) ? v.map(plano) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plano(x)])) : v;
function docVivo(ref, eq, alCambiar) {
  let S = {}, pend = new Map(), vuelo = new Map(), t = null, existe = false, ultima = '';
  const base = () => eq ? { ultimoAutor: sesion.alumnoId, ultimoPin: sesion.pin, ultimoNombre: sesion.nombre } : { pinVerificado: sesion.pin, nombre: sesion.nombre };
  const fijar = (obj, ruta, v) => { let o = obj; ruta.slice(0, -1).forEach(k => { o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {}; o = o[k]; }); o[ruta[ruta.length - 1]] = v; };
  const flush = async () => {
    clearTimeout(t); t = null; if (!pend.size) return;
    const lote = [...pend.values()]; pend.forEach((v, k) => vuelo.set(k, v)); pend.clear();
    try {
      if (!existe) { const s0 = await getDoc(ref); if (!s0.exists()) await setDoc(ref, { ...base(), actualizado: serverTimestamp() }); existe = true; }
      const args = []; lote.forEach(([r, v]) => args.push(new FieldPath(...r), v));
      args.push(...Object.entries(base()).flat(), 'ultimoCambio', ultima, 'actualizado', serverTimestamp());
      await updateDoc(ref, ...args);
      lote.forEach(([r]) => vuelo.delete(r.join('|')));
      alCambiar(S, pend.size ? 'guardando' : 'ok');
    } catch {
      lote.forEach(([r, v]) => { const k = r.join('|'); vuelo.delete(k); if (!pend.has(k)) pend.set(k, [r, v]); });
      alCambiar(S, 'error'); t = setTimeout(flush, 4000);
    }
  };
  const unsub = onSnapshot(ref, sn => {
    existe = sn.exists(); S = sn.exists() ? plano(sn.data()) : {};
    [...vuelo.values(), ...pend.values()].forEach(([r, v]) => fijar(S, r, v));
    alCambiar(S, pend.size || vuelo.size ? 'guardando' : 'ok');
  }, () => alCambiar(S, 'error'));
  return {
    get S() { return S; },
    poner(ruta, v, nota, rapido) { fijar(S, ruta, v); pend.set(ruta.join('|'), [ruta, v]); if (nota) ultima = nota; clearTimeout(t); t = setTimeout(flush, rapido ? 250 : 700); alCambiar(S, 'guardando'); },
    flush, cerrar() { unsub(); return flush(); },
    async entregar() { await flush(); if (!existe) { await setDoc(ref, { ...base(), actualizado: serverTimestamp() }, { merge: true }); existe = true; } await updateDoc(ref, { entregado: { t: serverTimestamp(), por: sesion.nombre }, ...base(), ultimoCambio: 'entregó la tarea', actualizado: serverTimestamp() }); S.entregado = { t: Date.now(), por: sesion.nombre }; },
  };
}
function actInfluencias(cont) {
  const entrar = async () => {
    escucharGrupo();
    cont.innerHTML = '<p class="atlas-ayuda">Buscando a tu equipo…</p>';
    const eq = await equipo('influencias');
    if (eq) return influencias(cont, eq);
    cont.innerHTML = `<div class="cl-sin-eq"><p><b>Todavía no estás en un equipo.</b> Escribe el código de 4 letras de tu equipo (o escanea el QR que proyecta tu maestro).</p>
      <form id="cl-unir" class="ma-unir"><div><input id="cl-cod" maxlength="4" autocomplete="off" placeholder="ABCD" aria-label="Código del equipo"><button class="btn-at" type="submit">Unirme</button></div></form>
      <p class="ma-msg mal" id="cl-unir-msg" hidden></p><p class="cl-o">o</p><button type="button" class="btn-ruta" id="cl-solo">Hacerla solo (se guarda en tu cuenta)</button></div>`;
    $('#cl-unir').addEventListener('submit', async e => { e.preventDefault(); try { influencias(cont, await unirseCodigo($('#cl-cod').value, 'influencias')); } catch (er) { const m = $('#cl-unir-msg'); m.textContent = er.message || er; m.hidden = false; } });
    $('#cl-solo').addEventListener('click', () => influencias(cont, null));
  };
  if (sesion) entrar(); else formAcceso(cont, entrar, 'Entra con tu nombre y PIN para trabajar en esta tarea');
}
function influencias(cont, eq) {
  const a = TAREAS_DIG.influencias, I = INFLUENCIAS;
  const ref = eq ? doc(db, 'grupos', sesion.grupoId, 'equipos', eq.id, 'atlas', I.id) : doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', 'tarea-influencias');
  cont.innerHTML = `<div class="ma-barra"><span>${eq ? `👥 <b>${esc(eq.nombre)}</b>: ${esc((eq.nombres || []).join(', '))}` : `👤 <b>${esc(sesion.nombre)}</b> (individual)`}</span><span class="ma-estado" id="in-estado"></span>
      <button type="button" class="btn-ruta" id="in-word">⬇ Descargar en Word</button></div>
    <div data-entrega></div>
    <div id="in-voto"></div>
    <p class="atlas-ayuda">El maestro <b>Rafael Enrique Meneses López</b>, de la Escuela de Gastronomía del Instituto Campechano, identifica siete influencias en la cocina campechana. Elijan un platillo y demuestren cuáles se ven en él: un ingrediente, una técnica, su nombre o su historia (compendio, subtema 3.2).</p>
    <section class="in-paso"><h3><span class="tq-num">1</span> Nuestro platillo</h3>
      <div class="in-platos">${I.platillos.map(p => `<button type="button" class="chip-at" data-plato="${esc(p)}">${esc(p)}</button>`).join('')}<button type="button" class="chip-at" data-plato="__otro">Otro…</button></div>
      <label class="in-otro" hidden>¿Cuál?<input id="in-otro" maxlength="60" placeholder="Nombre del platillo campechano"></label>
      <p class="in-elegido" id="in-elegido"></p></section>
    <section class="in-paso"><h3><span class="tq-num">2</span> Las siete influencias <small id="in-cuenta"></small></h3>
      <div class="in-grid">${I.lista.map(([k, n, col, pista]) => `<article class="in-inf" data-inf="${k}" style="--c:${col}">
        <header><b>${esc(n)}</b><small class="ma-autor" data-autor="${k}"></small><div class="in-si"><button type="button" data-si="${k}" data-v="1">Sí está</button><button type="button" data-si="${k}" data-v="0">No está</button></div></header>
        <details><summary>Pista del compendio</summary><p>${esc(pista)}</p></details>
        <textarea data-ev="${k}" rows="3" placeholder="¿En qué se nota en nuestro platillo? (ingrediente, técnica, nombre, historia)"></textarea></article>`).join('')}</div></section>
    <section class="in-paso"><h3><span class="tq-num">3</span> Nuestro argumento</h3>
      <label class="de-lbl">¿Por qué nuestro platillo representa la cocina campechana y sus influencias? <small class="ma-autor" data-autor="argumento"></small><textarea id="in-arg" rows="5" placeholder="Nuestro platillo representa la cocina campechana porque…"></textarea></label>
      <label class="de-lbl">Fuentes consultadas (APA 7) <small class="ma-autor" data-autor="fuentes"></small><textarea id="in-fuentes" rows="3" placeholder="Autor, A. (año). Título. Editorial o sitio. URL"></textarea></label></section>`;
  const estado = (t, c = '') => { const e = $('#in-estado'); if (e) { e.textContent = t; e.className = 'ma-estado ' + c; } };
  const pintar = S => {
    const act = document.activeElement, inf = S.inf || {}, por = S.por || {};
    const p = S.platillo || '';
    $$('[data-plato]', cont).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.plato === p || (b.dataset.plato === '__otro' && p && !I.platillos.includes(p)))));
    const esOtro = p && !I.platillos.includes(p); $('.in-otro', cont).hidden = !(esOtro || S._otro); if ($('#in-otro') !== act && esOtro) $('#in-otro').value = p;
    $('#in-elegido').innerHTML = p ? `🍽️ <b>${esc(p)}</b>${por.platillo ? ` <small class="ma-autor">✍️ ${esc(por.platillo)}</small>` : ''}` : '<i>Todavía no eligen platillo.</i>';
    I.lista.forEach(([k]) => {
      const v = inf[k] || {};
      $$(`[data-si="${k}"]`, cont).forEach(b => b.setAttribute('aria-pressed', String(v.si === (b.dataset.v === '1') && v.si !== undefined)));
      const ta = $(`[data-ev="${k}"]`, cont); if (ta !== act && ta.value !== (v.ev || '')) ta.value = v.ev || '';
      $(`[data-inf="${k}"]`, cont).classList.toggle('si', v.si === true); $(`[data-inf="${k}"]`, cont).classList.toggle('no', v.si === false);
      const au = eq && por[k]; $(`[data-autor="${k}"]`, cont).textContent = au ? `✍️ ${au}` : '';
    });
    [['in-arg', 'argumento'], ['in-fuentes', 'fuentes']].forEach(([id, f]) => { const ta = $('#' + id); if (ta !== act && ta.value !== (S[f] || '')) ta.value = S[f] || ''; const au = eq && por[f]; $(`[data-autor="${f}"]`, cont).textContent = au ? `✍️ ${au}` : ''; });
    const si = I.lista.filter(([k]) => inf[k] && inf[k].si).length;
    $('#in-cuenta').textContent = `· ${si} de 7 presentes`;
    repEntrega();
  };
  let repEntrega = () => {};
  const V = docVivo(ref, eq, (S, st) => { pintar(S); estado(st === 'ok' ? (eq ? 'Sincronizado con tu equipo ✓' : 'Guardado en tu cuenta ✓') : st === 'error' ? 'No se pudo guardar. Reintentando…' : 'Guardando…', st === 'ok' ? 'ok' : st === 'error' ? 'mal' : ''); });
  const puede = () => abierta(a.id);
  const autor = campo => V.poner(['por', campo], sesion.nombre);
  $$('[data-plato]', cont).forEach(b => b.addEventListener('click', () => {
    if (!puede()) return;
    if (b.dataset.plato === '__otro') { V.S._otro = true; $('.in-otro', cont).hidden = false; $('#in-otro').focus(); return; }
    V.poner(['platillo'], b.dataset.plato, `eligió ${b.dataset.plato}`, true); autor('platillo');
  }));
  $('#in-otro').addEventListener('input', e => { if (!puede()) return; V.poner(['platillo'], e.target.value.trim(), 'escribe el nombre del platillo'); autor('platillo'); });
  $$('[data-si]', cont).forEach(b => b.addEventListener('click', () => { if (!puede()) return; const k = b.dataset.si; V.poner(['inf', k, 'si'], b.dataset.v === '1', `marcó la influencia ${I.lista.find(x => x[0] === k)[1].toLowerCase()}`, true); autor(k); }));
  $$('[data-ev]', cont).forEach(ta => ta.addEventListener('input', () => { if (!puede()) return; const k = ta.dataset.ev; V.poner(['inf', k, 'ev'], ta.value, `escribe la evidencia ${I.lista.find(x => x[0] === k)[1].toLowerCase()}`); autor(k); }));
  $('#in-arg').addEventListener('input', e => { if (!puede()) return; V.poner(['argumento'], e.target.value, 'escribe el argumento'); autor('argumento'); });
  $('#in-fuentes').addEventListener('input', e => { if (!puede()) return; V.poner(['fuentes'], e.target.value, 'escribe las fuentes'); autor('fuentes'); });
  repEntrega = barraEntrega(cont, a, { entregado: () => V.S.entregado, alEntregar: async () => { if (!(V.S.platillo || '').trim()) throw new Error('Primero elijan su platillo.'); await V.entregar(); } });
  // ---- votación en vivo (la abre el docente desde el Monitor)
  const refVoto = doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', 'tarea-voto-influencias');
  let miVoto = null;
  getDoc(refVoto).then(s => { miVoto = s.exists() ? s.data().voto || null : null; }).catch(() => {});
  const pintarVoto = async det => {
    const z = $('#in-voto'); if (!z) return;
    const ab = ((det || {}).votaciones || {})[I.votacion] === 'abierta';
    if (!ab) { z.innerHTML = ''; return; }
    let cands = [];
    try {
      await cargarEquipos(true);
      cands = (await Promise.all(equiposDe(EQS, formacionDeTarea(GDATA, 'influencias')).map(async d => { const s = await getDoc(doc(db, 'grupos', sesion.grupoId, 'equipos', d.id, 'atlas', I.id)).catch(() => null); const pl = s && s.exists() ? (s.data().platillo || '') : ''; return pl ? { id: d.id, eq: d.nombre, pl } : null; }))).filter(Boolean);
    } catch { /* */ }
    z.innerHTML = `<div class="in-votacion"><h3>🗳️ Votación abierta</h3><p>¿Qué platillo representa <b>mejor</b> las siete influencias de la cocina campechana? Vota por los argumentos, no por amistad${eq ? ' (no puedes votar por tu propio equipo)' : ''}.</p>
      <div class="in-cands">${cands.map(c => `<button type="button" data-voto="${c.id}" aria-pressed="${miVoto === c.id}" ${eq && c.id === eq.id ? 'disabled' : ''}><b>${esc(c.pl)}</b><small>${esc(c.eq)}</small></button>`).join('') || '<p class="atlas-ayuda">Todavía ningún equipo eligió platillo.</p>'}</div>
      <p class="ma-msg ok" id="in-voto-msg">${miVoto ? '✓ Tu voto quedó registrado. Puedes cambiarlo mientras la votación siga abierta.' : ''}</p></div>`;
    $$('[data-voto]', z).forEach(b => b.addEventListener('click', async () => {
      try { await setDoc(refVoto, { voto: b.dataset.voto, pinVerificado: sesion.pin, nombre: sesion.nombre, actualizado: serverTimestamp() }); miVoto = b.dataset.voto; $$('[data-voto]', z).forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#in-voto-msg').textContent = '✓ Tu voto quedó registrado. Puedes cambiarlo mientras la votación siga abierta.'; }
      catch (e) { $('#in-voto-msg').textContent = 'No se pudo registrar tu voto: ' + (e.message || e); }
    }));
  };
  const onEst = e => pintarVoto(e.detail);
  window.addEventListener('estado-tareas', onEst);
  getDoc(doc(db, 'grupos', sesion.grupoId)).then(s => pintarVoto(s.exists() ? s.data() : {})).catch(() => {});
  // ---- Word
  $('#in-word').addEventListener('click', async () => {
    await V.flush(); const S = V.S, inf = S.inf || {}, por = S.por || {};
    const D = new DocITES(); await D.cargarLogo();
    D.portada({ kicker: 'Tema 3.2 · Campeche y el resto de América', titulo: S.platillo || 'Nuestro platillo campechano', subtitulo: 'Las siete influencias de la cocina campechana', etiqueta: eq ? `Equipo «${eq.nombre}»` : 'Alumno', personas: eq ? eq.nombres || [] : [sesion.nombre] });
    const si = I.lista.filter(([k]) => inf[k] && inf[k].si).length;
    D.h1('Las siete influencias', `En ${S.platillo || 'nuestro platillo'} encontramos ${si} de las 7 influencias que identifica el maestro Rafael Enrique Meneses López.`);
    D.tabla([['Influencia', '¿Está presente?', '¿En qué se nota?'], ...I.lista.map(([k, n, col]) => { const v = inf[k] || {}; return [{ runs: [['■ ', { color: col.slice(1), b: true }], [n, { b: true }], ...(eq && por[k] ? [[`\n✍ ${por[k]}`, { color: '3F7A4F', tam: 8 }]] : [])] }, { t: v.si === true ? 'Sí' : v.si === false ? 'No' : '—', b: v.si === true, fondo: v.si === true ? 'E3F1E6' : null }, (v.ev || '').trim() || '—']; })], { anchos: [2300, 1500, 5560] });
    D.h1('Nuestro argumento'); D.texto(S.argumento);
    D.h2('Fuentes consultadas'); D.texto(S.fuentes);
    D.descargar(`Siete_influencias_${slug(eq ? 'equipo ' + eq.nombre : sesion.nombre)}`);
  });
  const salir = () => V.flush();
  window.addEventListener('beforeunload', salir);
  detener = () => { V.cerrar(); window.removeEventListener('estado-tareas', onEst); window.removeEventListener('estado-tareas', repEntrega); window.removeEventListener('beforeunload', salir); };
}
