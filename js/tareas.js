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
import { CUADRO_MM, APORTO, PLATILLOS, TEMAS_TAREAS, TAREAS_DIG, califica, catalogoId, sugerirCuadro, INFLUENCIAS, sugerirInfluencias } from "./clase-datos.js";
import { DocITES } from "./docx-ites.js";
import { formacionDe, formaciones, formacionDeTarea, abiertas as inscAbiertas, equipoDe, equiposDe, tareasDeFormacion, enEquipo } from "./equipos.js";

const db = getFirestore(initializeApp(firebaseConfig));
const SESSION_KEY = 'oc_sesion_alumno';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const slug = n => n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };
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
      if (s.exists()) { const m = s.data().datos || {}; out.avance = m.nombre ? `${m.nombre}: ${(m.ingredientes || []).length} ingredientes` : ''; out.entregado = s.data().entregado || null; }
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
  ({ cuadro: actCuadro, practica: actAporto, desarma: actDesarma, influencias: actInfluencias })[a.tipo]($('#cl-cuerpo'));
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
    const n = claves.filter(k => (S.celdas[k] || '').trim()).length;
    $('#cu-progreso').innerHTML = `<b>${n} de ${claves.length}</b> celdas llenas <span class="ma-barra-p"><i style="width:${Math.round(100 * n / claves.length)}%"></i></span>`;
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
  const RONDA = 10; let items = [], i = 0, bien = 0, fallos = [];
  const nueva = () => { items = barajar(APORTO).slice(0, RONDA); i = 0; bien = 0; fallos = []; pregunta(); };
  const pregunta = () => {
    if (i >= items.length) return fin();
    const [n, e] = items[i];
    cont.innerHTML = `<p class="atlas-ayuda">¿Este ingrediente lo <b>aportó México al mundo</b> o <b>llegó a México</b> a partir de 1521?</p>
      <div class="ap-marcador">Ingrediente ${i + 1} de ${items.length} · aciertos ${bien} · tu mejor ronda: ${lsGet('clase_aporto_mejor') || '—'}/${RONDA}</div>
      <div class="ap-carta"><span class="ap-emo">${e}</span><b>${esc(n)}</b></div>
      <div class="ap-botones"><button type="button" class="ap-bot ap-a" data-r="a">🇲🇽 México lo aportó al mundo</button><button type="button" class="ap-bot ap-l" data-r="l">⛵ Llegó a México desde 1521</button></div>
      <div id="ap-fb" aria-live="polite"></div>`;
    $$('.ap-bot', cont).forEach(b => b.addEventListener('click', () => responder(b.dataset.r)));
  };
  const responder = r => {
    const [n, , ok, por] = items[i], acierto = r === ok;
    if (acierto) bien++; else fallos.push(items[i]);
    $$('.ap-bot', cont).forEach(b => { b.disabled = true; if (b.dataset.r === ok) b.classList.add('ok'); else if (b.dataset.r === r) b.classList.add('mal'); });
    $('#ap-fb').innerHTML = `<div class="aviso ${acierto ? 'ok' : 'mal'}"><strong>${acierto ? '¡Correcto!' : `No: ${esc(n)} ${ok === 'a' ? 'lo aportó México al mundo' : 'llegó a México desde 1521'}.`}</strong> ${esc(por)}</div><button class="btn-at" id="ap-sig" type="button">${i + 1 < items.length ? 'Siguiente →' : 'Ver resultado'}</button>`;
    $('#ap-sig').addEventListener('click', () => { i++; pregunta(); }); $('#ap-sig').focus({ preventScroll: true });
  };
  const fin = () => {
    if (bien > Number(lsGet('clase_aporto_mejor') || 0)) lsSet('clase_aporto_mejor', String(bien));
    cont.innerHTML = `<div class="resumen"><h3>${bien} de ${items.length}</h3><p>${bien === items.length ? '¡Ronda perfecta! Dominas la tabla «México aportó al mundo / Llegaron a México».' : 'Repasa los que fallaste:'}</p>
      ${fallos.length ? `<ul>${fallos.map(([n, e, ok, por]) => `<li>${e} <b>${esc(n)}</b>: ${ok === 'a' ? 'México lo aportó al mundo' : 'llegó a México desde 1521'}. ${esc(por)}</li>`).join('')}</ul>` : ''}
      <button class="btn-at" id="ap-otra" type="button">Otra ronda</button></div>`;
    $('#ap-otra').addEventListener('click', nueva);
  };
  nueva();
}

// ======================================================= 3. DESARMA EL PLATILLO (individual, en la cuenta)
function actDesarma(cont) {
  if (!sesion) { formAcceso(cont, () => actDesarma(cont), 'Entra con tu nombre y PIN: esta tarea se guarda en tu cuenta'); return; }
  escucharGrupo();
  const a = TAREAS_DIG.desarma, ref = doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'atlas', 'tarea-desarma');
  const local = `clase_miplatillo_${sesion.grupoId}_${sesion.alumnoId}`;
  let M = { nombre: '', alumno: sesion.nombre, ingredientes: [], reflexion: '', _t: 0 }, entregado = null, timer = null, rep = () => {};
  try { M = { ...M, ...(JSON.parse(lsGet(local) || 'null') || {}) }; } catch { /* */ }
  cont.innerHTML = `<p class="atlas-ayuda">La cocina mexicana no es «prehispánica» ni «española»: es <b>mestiza</b>. Primero practica con un platillo de ejemplo; después hazlo con el platillo de tu proyecto.</p>
    <div class="atlas-zoom" id="de-platos">${PLATILLOS.map((p, i) => `<button type="button" class="chip-at" data-p="${p.id}" aria-pressed="${i === 0}">${p.emoji} ${esc(p.nombre)}</button>`).join('')}</div>
    <div id="de-juego"></div>
    <section class="de-mio"><h3>✍️ La tarea: el platillo de tu proyecto</h3>
      <p class="atlas-ayuda">Es la pregunta 14 de «Mi Plato, Mi Historia»: <i>¿qué parte de mi platillo es herencia prehispánica y qué parte fue adoptada tras la conquista?</i> Si un ingrediente no lo sabes, márcalo como «No sé» e investígalo.</p>
      <div class="ma-barra"><span>👤 <b>${esc(sesion.nombre)}</b></span><span class="ma-estado" id="de-estado"></span><button type="button" class="btn-ruta" id="de-word">⬇ Descargar en Word</button></div>
      <div data-entrega></div>
      <label class="de-lbl">Tu platillo<input id="de-nombre" value="${esc(M.nombre)}" placeholder="Ejemplo: relleno negro"></label>
      <label class="de-lbl">Sus ingredientes principales, uno por renglón<textarea id="de-ings" rows="5" placeholder="Pavo\nChile seco quemado\nAchiote\nHuevo…">${esc((M.ingredientes || []).map(x => x.n).join('\n'))}</textarea></label>
      <div id="de-clasif"></div>
      <label class="de-lbl">Mi conclusión: ¿qué parte es herencia prehispánica y qué parte fue adoptada? ¿Por qué?<textarea id="de-refl" rows="5" placeholder="Mi platillo es mestizo porque…">${esc(M.reflexion)}</textarea></label></section>`;
  const estado = (t, c = 'ok') => { const e = $('#de-estado'); if (e) { e.textContent = t; e.className = 'ma-estado ' + c; } };
  const subir = async () => { clearTimeout(timer); timer = null; try { await setDoc(ref, { datos: M, pinVerificado: sesion.pin, nombre: sesion.nombre, actualizado: serverTimestamp() }, { merge: true }); estado('Guardado en tu cuenta ✓'); } catch { estado('Guardado solo en este dispositivo (no se pudo subir).', 'mal'); } };
  const guardar = () => { if (!abierta(a.id)) return; M._t = Date.now(); lsSet(local, JSON.stringify(M)); estado('Guardando…', ''); clearTimeout(timer); timer = setTimeout(subir, 1000); };
  // trae lo de la cuenta si es más nuevo
  getDoc(ref).then(s => {
    if (!s.exists()) return; const d = s.data(); entregado = d.entregado || null; rep();
    if (d.datos && (d.datos._t || 0) > (M._t || 0)) { M = { ...M, ...d.datos }; $('#de-nombre').value = M.nombre || ''; $('#de-ings').value = (M.ingredientes || []).map(x => x.n).join('\n'); $('#de-refl').value = M.reflexion || ''; pintarClasif(); }
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
  // ---- el platillo del proyecto
  const OPC = [['n', '🌎 De América'], ['l', '⛵ Llegó después'], ['x', '❓ No sé']];
  const pintarClasif = () => {
    $('#de-clasif').innerHTML = (M.ingredientes || []).length ? `<ul class="de-ings de-mios">${M.ingredientes.map((x, i) => `<li><span>${esc(x.n)}</span><div>${OPC.map(([v, t]) => `<button type="button" data-i="${i}" data-v="${v}" aria-pressed="${x.o === v}">${t}</button>`).join('')}</div></li>`).join('')}</ul>` : '';
    $$('#de-clasif button').forEach(b => b.addEventListener('click', () => { if (!abierta(a.id)) return; M.ingredientes[+b.dataset.i].o = b.dataset.v; guardar(); pintarClasif(); }));
  };
  $('#de-ings').addEventListener('input', e => {
    const viejos = Object.fromEntries((M.ingredientes || []).map(x => [x.n.toLowerCase(), x.o]));
    M.ingredientes = e.target.value.split('\n').map(x => x.trim()).filter(Boolean).map(n => ({ n, o: viejos[n.toLowerCase()] || '' })); guardar(); pintarClasif();
  });
  $('#de-nombre').addEventListener('input', e => { M.nombre = e.target.value; guardar(); });
  $('#de-refl').addEventListener('input', e => { M.reflexion = e.target.value; guardar(); });
  pintarClasif();
  rep = barraEntrega($('.de-mio', cont), a, {
    entregado: () => entregado,
    alEntregar: async () => {
      if (!(M.nombre || '').trim() || !(M.ingredientes || []).length) throw new Error('Escribe el nombre de tu platillo y al menos un ingrediente.');
      await subir(); await setDoc(ref, { entregado: { t: serverTimestamp(), por: sesion.nombre }, pinVerificado: sesion.pin, nombre: sesion.nombre }, { merge: true }); entregado = { t: Date.now() };
    },
  });
  $('#de-word').addEventListener('click', async () => {
    if (!(M.nombre || '').trim() || !(M.ingredientes || []).length) { alert('Escribe el nombre de tu platillo y al menos un ingrediente.'); return; }
    const D = new DocITES(); await D.cargarLogo();
    D.portada({ kicker: 'Proyecto «Mi Plato, Mi Historia» · Pregunta 14', titulo: M.nombre.trim(), subtitulo: '¿Qué parte es herencia prehispánica y qué parte fue adoptada tras la conquista?', etiqueta: 'Alumno', personas: [sesion.nombre] });
    const nom = { n: 'De América (prehispánico)', l: 'Llegó después de 1521', x: 'Por investigar', '': 'Sin clasificar' };
    const fondo = { n: 'E3F1E6', l: 'F7E6D8', x: 'F1F1F1', '': 'FFFFFF' };
    D.h1('Mis ingredientes', `${M.ingredientes.filter(x => x.o === 'n').length} de América · ${M.ingredientes.filter(x => x.o === 'l').length} llegaron después de 1521 · ${M.ingredientes.filter(x => !x.o || x.o === 'x').length} por investigar`);
    D.tabla([['Ingrediente', 'Origen'], ...M.ingredientes.map(x => [{ t: x.n, b: true }, { t: nom[x.o || ''], fondo: fondo[x.o || ''] }])], { anchos: [4680, 4680], cebra: false });
    D.h1('Mi conclusión'); D.texto(M.reflexion);
    D.descargar(`Mi_platillo_pregunta14_${slug(sesion.nombre)}`);
  });
  const salir = () => { if (timer) subir(); };
  window.addEventListener('beforeunload', salir);
  detener = () => { window.removeEventListener('beforeunload', salir); window.removeEventListener('estado-tareas', rep); salir(); };
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
