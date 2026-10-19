// actividades.js — Actividades de repaso con valor.
// Desde el Parcial 2 valen 15 de los 25 puntos de participación. El alumno
// entra con su nombre y PIN, elige un tema y responde. Las preguntas que
// falla vuelven a aparecer en la siguiente ronda, hasta que todas le salgan
// bien: en ese momento el tema queda TERMINADO y se guarda en Firestore
// (alumnos/{id}/actividades/tema-N). El avance parcial se recuerda en el
// navegador. Los temas que no cuentan en el bloque actual quedan como
// repaso libre.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { ACTIVIDADES_PARCIAL, NOMBRES_PARCIAL, PARTICIPACION_MIXTA } from "./calculo.js";

// ------------------------------------------------------------ configuración
const SESSION_KEY = 'oc_sesion_alumno';
const TEMAS_INFO = [
  { n: 1, nombre: 'Introducción', archivo: 'data/actividades_bloque1.json' },
  { n: 2, nombre: 'Tipología de la cocina', archivo: 'data/actividades_bloque2.json' },
  { n: 3, nombre: 'Cocinas en el mundo', archivo: 'data/actividades_bloque3.json' },
  { n: 4, nombre: 'Necesidades e influencias', archivo: 'data/actividades_bloque4.json' },
];
// ---------------------------------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let sesion = null;
let terminados = new Set();   // temas ya guardados como terminados
let temaActivo = null;
let todos = [];               // todos los reactivos del tema
let ronda = [];               // reactivos de la ronda actual
let indice = 0;
let correctasRonda = 0;
let contestadoActual = false;
let aciertos = new Set();     // ids contestados bien al menos una vez

const $ = (id) => document.getElementById(id);
function esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }
function slugNombre(n) {
  return n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}
function barajar(arr) {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return c;
}
function bloqueDeTema(n) {
  for (const [p, temas] of Object.entries(ACTIVIDADES_PARCIAL)) if (temas.includes(n)) return p;
  return null;
}
const ptsPorTema = (p) => PARTICIPACION_MIXTA.actividades / ACTIVIDADES_PARCIAL[p].length;

// Avance parcial (en este navegador), por alumno y tema.
const claveAvance = (n) => `act_${sesion.grupoId}_${sesion.alumnoId}_t${n}`;
function leerAvance(n) { try { return new Set(JSON.parse(localStorage.getItem(claveAvance(n))) || []); } catch { return new Set(); } }
function guardarAvance(n) { try { localStorage.setItem(claveAvance(n), JSON.stringify([...aciertos])); } catch { /* sin almacenamiento */ } }
const totalesCache = {};

// ------------------------------------------------------------------ acceso
async function cargarGrupos() {
  const select = $('act-login-grupo');
  try {
    const snap = await getDocs(query(collection(db, 'grupos'), orderBy('nombre')));
    select.innerHTML = '<option value="">— Elige tu grupo —</option>';
    snap.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.data().nombre; select.appendChild(o); });
  } catch { select.innerHTML = '<option value="">No se pudieron cargar los grupos</option>'; }
}

$('act-form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('act-login-error');
  err.hidden = true;
  const grupoId = $('act-login-grupo').value;
  const nombre = $('act-login-nombre').value.trim();
  const pin = $('act-login-pin').value.trim();
  if (!grupoId || !nombre || !pin) return;
  try {
    const alumnoId = slugNombre(nombre);
    const snap = await getDoc(doc(db, 'grupos', grupoId, 'alumnos', alumnoId));
    if (!snap.exists() || String(snap.data().pin) !== pin) {
      err.textContent = 'No encontramos ese nombre y PIN en el grupo elegido. Verifica con tu docente.';
      err.hidden = false;
      return;
    }
    sesion = { grupoId, alumnoId, nombre: snap.data().nombre, pin };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
    await entrar();
  } catch (e2) {
    err.textContent = 'No se pudo entrar: ' + (e2.message || e2);
    err.hidden = false;
  }
});

$('act-salir').addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); location.reload(); });

async function entrar() {
  $('act-login').hidden = true;
  $('act-selector').hidden = false;
  $('act-quien').textContent = sesion.nombre;
  try {
    const snap = await getDocs(collection(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'actividades'));
    terminados = new Set(snap.docs.map(d => d.data()).filter(a => a.completado).map(a => Number(a.tema)));
  } catch { terminados = new Set(); }
  renderSelectorTemas();
}

// ------------------------------------------------------- selector de temas
async function totalDe(t) {
  if (totalesCache[t.n]) return totalesCache[t.n];
  try { const d = await (await fetch(t.archivo)).json(); totalesCache[t.n] = d.reactivos.length; } catch { totalesCache[t.n] = 0; }
  return totalesCache[t.n];
}

function renderSelectorTemas() {
  const cont = $('act-lista-temas');
  const resumen = Object.keys(ACTIVIDADES_PARCIAL).map(p => {
    const temas = ACTIVIDADES_PARCIAL[p];
    const hechos = temas.filter(n => terminados.has(n)).length;
    const valor = p === 'final'
      ? 'cuentan dentro de «Tareas y participación»'
      : `<strong>${(hechos * ptsPorTema(p)).toFixed(1)} de ${PARTICIPACION_MIXTA.actividades} pts</strong>`;
    return `<div class="act-resumen-bloque"><b>${NOMBRES_PARCIAL[p]}</b> · ${hechos} de ${temas.length} temas terminados · ${valor}</div>`;
  }).join('');
  $('act-resumen-puntos').innerHTML = resumen;

  cont.innerHTML = TEMAS_INFO.map(t => {
    const bloque = bloqueDeTema(t.n);
    const hecho = terminados.has(t.n);
    const etiqueta = bloque
      ? `<span class="act-badge act-badge-valor">Cuenta para el ${NOMBRES_PARCIAL[bloque]}${bloque === 'final' ? '' : ` · ${ptsPorTema(bloque).toFixed(1)} pts`}</span>`
      : '<span class="act-badge">Repaso libre</span>';
    return `
    <button type="button" class="act-tema-card${hecho ? ' act-terminado' : ''}" data-tema="${t.n}">
      <span class="act-tema-num">Tema ${t.n}${hecho ? ' · ✔ Terminado' : ''}</span>
      <span class="act-tema-nombre">${esc(t.nombre)}</span>
      ${etiqueta}
      <span class="act-tema-avance" data-avance="${t.n}"></span>
    </button>`;
  }).join('');
  cont.querySelectorAll('.act-tema-card').forEach(btn => btn.addEventListener('click', () => iniciarTema(Number(btn.dataset.tema))));
  // Avance de los temas no terminados (lo que ya sabe bien en este navegador).
  TEMAS_INFO.forEach(async t => {
    const el = cont.querySelector(`[data-avance="${t.n}"]`);
    if (!el) return;
    if (terminados.has(t.n)) { el.textContent = '¡Ya lo dominas! Puedes repasarlo cuando quieras.'; return; }
    const total = await totalDe(t);
    const bien = leerAvance(t.n).size;
    if (bien > 0 && total) el.innerHTML = `<span class="act-mini-barra"><span style="width:${Math.round(bien / total * 100)}%"></span></span>${bien} de ${total} correctas`;
  });
}

// ----------------------------------------------------------------- un tema
async function iniciarTema(n) {
  const info = TEMAS_INFO.find(t => t.n === n);
  $('act-selector').hidden = true;
  $('act-resumen').hidden = true;
  $('act-curso').hidden = false;
  $('act-reactivo-root').innerHTML = '<p class="empty-inline">Cargando…</p>';
  try {
    const datos = await (await fetch(info.archivo, { cache: 'no-store' })).json();
    todos = datos.reactivos;
  } catch {
    $('act-reactivo-root').innerHTML = '<p class="subtema-retry-msg">No se pudo cargar este tema. Intenta de nuevo.</p>';
    return;
  }
  temaActivo = n;
  totalesCache[n] = todos.length;
  aciertos = terminados.has(n) ? new Set() : leerAvance(n);
  const pendientes = todos.filter(r => !aciertos.has(r.id));
  iniciarRonda(pendientes.length ? pendientes : todos);
}

function iniciarRonda(lista) {
  ronda = barajar(lista);
  indice = 0;
  correctasRonda = 0;
  renderReactivoActual();
}

function actualizarBarra() {
  const total = todos.length;
  const bien = terminados.has(temaActivo) ? total : aciertos.size;
  $('act-avance').innerHTML = `Pregunta ${indice + 1} de ${ronda.length} · <b>${bien} de ${total}</b> dominadas`;
  $('act-progreso-tema').style.width = Math.round((bien / total) * 100) + '%';
}

function etiquetaTipo(t) {
  return { opcion_multiple: 'Opción múltiple', verdadero_falso: 'Verdadero o falso', relacionar: 'Relaciona columnas', caso: 'Caso (multirreactivo)', completar: 'Completa el enunciado', jerarquizar: 'Jerarquización', abierta_breve: 'Respuesta breve' }[t] || '';
}

function renderReactivoActual() {
  contestadoActual = false;
  const r = ronda[indice];
  actualizarBarra();
  let cuerpo;
  if (r.tipo === 'relacionar') {
    const derechas = barajar(r.pares.map((p, i) => ({ t: p.derecha, i })));
    cuerpo = `<div class="relacionar-list">${r.pares.map((p, i) => `
      <div class="relacionar-row">
        <span class="relacionar-izq">${esc(p.izquierda)}</span>
        <select class="relacionar-select" data-idx="${i}">
          <option value="">— Elige —</option>
          ${derechas.map(d => `<option value="${d.i}">${esc(d.t)}</option>`).join('')}
        </select>
      </div>`).join('')}</div>
      <button class="btn btn-primary btn-block" id="btn-comprobar" style="margin-top:14px;">Comprobar</button>`;
  } else {
    const ops = barajar(r.opciones.map((o, i) => ({ t: o, i })));
    cuerpo = `<div class="quiz-options">${ops.map(o => `
      <label class="quiz-option" data-idx="${o.i}">
        <input type="radio" name="q-${r.id}" value="${o.i}">
        <span>${esc(o.t)}</span>
      </label>`).join('')}</div>`;
  }
  $('act-reactivo-root').innerHTML = `
    <div class="reactivo-card">
      <div class="reactivo-head"><span class="reactivo-tipo">${etiquetaTipo(r.tipo)}</span></div>
      <h3 class="reactivo-pregunta">${esc(r.pregunta)}</h3>
      ${cuerpo}
      <div id="act-feedback"></div>
    </div>`;
  if (r.tipo === 'relacionar') {
    $('btn-comprobar').addEventListener('click', () => comprobarRelacionar(r));
  } else {
    $('act-reactivo-root').querySelectorAll('.quiz-option').forEach(l => l.addEventListener('click', () => {
      if (!contestadoActual) comprobarOpcion(r, Number(l.dataset.idx));
    }));
  }
  $('btn-act-siguiente').disabled = true;
  $('btn-act-siguiente').textContent = indice === ronda.length - 1 ? 'Ver resultado de la ronda' : 'Siguiente →';
}

function marcarFeedback(r, correcto) {
  contestadoActual = true;
  if (correcto) { aciertos.add(r.id); correctasRonda++; if (!terminados.has(temaActivo)) guardarAvance(temaActivo); }
  actualizarBarra();
  $('act-feedback').innerHTML = `
    <div class="act-feedback ${correcto ? 'act-feedback-ok' : 'act-feedback-mal'}">
      <p class="act-feedback-titulo">${correcto ? '✓ Correcto' : '✗ Incorrecto · esta pregunta volverá en la siguiente ronda'}</p>
      <p>${esc(r.explicacion || '')}</p>
    </div>`;
  $('btn-act-siguiente').disabled = false;
}

function comprobarOpcion(r, idx) {
  $('act-reactivo-root').querySelectorAll('.quiz-option').forEach(l => {
    if (Number(l.dataset.idx) === r.correcta) l.classList.add('opcion-correcta-act');
    if (Number(l.dataset.idx) === idx && idx !== r.correcta) l.classList.add('opcion-elegida-mal-act');
  });
  marcarFeedback(r, idx === r.correcta);
}

function comprobarRelacionar(r) {
  let todoCorrecto = true;
  document.querySelectorAll('.relacionar-select').forEach(sel => {
    const elegido = sel.value === '' ? null : Number(sel.value);
    if (elegido !== Number(sel.dataset.idx)) todoCorrecto = false;
    sel.disabled = true;
  });
  $('btn-comprobar').remove();
  marcarFeedback(r, todoCorrecto);
}

$('btn-act-siguiente').addEventListener('click', () => {
  if (!contestadoActual) return;
  if (indice < ronda.length - 1) { indice++; renderReactivoActual(); }
  else finDeRonda();
});

$('btn-salir-act').addEventListener('click', volverASelector);
function volverASelector() {
  $('act-curso').hidden = true;
  $('act-resumen').hidden = true;
  $('act-selector').hidden = false;
  renderSelectorTemas();
}

async function finDeRonda() {
  $('act-curso').hidden = true;
  const res = $('act-resumen');
  res.hidden = false;
  const total = todos.length;
  const pendientes = todos.filter(r => !aciertos.has(r.id));
  const yaEstaba = terminados.has(temaActivo);
  const bloque = bloqueDeTema(temaActivo);

  if (pendientes.length === 0 && !yaEstaba) {
    res.innerHTML = '<p class="empty-inline">Guardando tu resultado…</p>';
    try {
      await setDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId, 'actividades', `tema-${temaActivo}`), {
        tema: temaActivo, completado: true, correcto: true, pinVerificado: sesion.pin, total, nombre: sesion.nombre, fecha: serverTimestamp(),
      });
      terminados.add(temaActivo);
      try { localStorage.removeItem(claveAvance(temaActivo)); } catch { /* nada */ }
    } catch (e) {
      res.innerHTML = `<div class="resultado-hero res-bajo"><p class="res-etq">Tema ${temaActivo}</p><p class="res-sub">Terminaste, pero no se pudo guardar (${esc(e.message || e)}). Revisa tu conexión y vuelve a contestar la última ronda.</p></div>
        <button class="btn btn-primary btn-block" id="btn-otro-tema">Elegir otro tema</button>`;
      $('btn-otro-tema').addEventListener('click', volverASelector);
      return;
    }
    res.innerHTML = `
      <div class="resultado-hero res-ok act-celebra">
        <p class="res-etq">Tema ${temaActivo} · ✔ Terminado</p>
        <p class="res-calif">${total} / ${total}</p>
        <p class="res-sub">${bloque === 'final' ? '¡Listo! Este tema ya cuenta en tu participación del Examen Final. Ya aparece en Mi progreso.' : bloque ? `¡Listo! Sumaste <strong>${ptsPorTema(bloque).toFixed(1)} puntos</strong> de participación del ${NOMBRES_PARCIAL[bloque]}. Ya aparece en Mi progreso.` : '¡Dominaste este tema! (Repaso libre: no suma puntos).'}</p>
      </div>
      <button class="btn btn-primary btn-block" id="btn-otro-tema">Elegir otro tema</button>`;
  } else if (yaEstaba) {
    res.innerHTML = `
      <div class="resultado-hero res-ok"><p class="res-etq">Tema ${temaActivo} · repaso</p>
        <p class="res-calif">${correctasRonda} / ${ronda.length}</p>
        <p class="res-sub">Este tema ya lo tenías terminado: tu puntaje se queda igual, aunque en este repaso falles alguna.</p></div>
      <button class="btn btn-primary btn-block" id="btn-repetir">Repasarlo otra vez</button>
      <button class="btn btn-ghost-dark btn-block" id="btn-otro-tema" style="margin-top:10px;">Elegir otro tema</button>`;
  } else {
    res.innerHTML = `
      <div class="resultado-hero ${aciertos.size / total >= 0.8 ? 'res-riesgo' : 'res-bajo'}">
        <p class="res-etq">Tema ${temaActivo} · fin de la ronda</p>
        <p class="res-calif">${aciertos.size} / ${total}</p>
        <p class="res-sub">Te ${pendientes.length === 1 ? 'falta 1 pregunta' : `faltan ${pendientes.length} preguntas`}. El tema se termina cuando todas te salgan bien. Lee con calma la retroalimentación y vuelve a intentarlo.</p>
      </div>
      <button class="btn btn-primary btn-block" id="btn-pendientes">Contestar las que me faltan (${pendientes.length})</button>
      <button class="btn btn-ghost-dark btn-block" id="btn-otro-tema" style="margin-top:10px;">Seguir después</button>`;
    $('btn-pendientes').addEventListener('click', () => { res.hidden = true; $('act-curso').hidden = false; iniciarRonda(pendientes); });
  }
  const rep = $('btn-repetir');
  if (rep) rep.addEventListener('click', () => { res.hidden = true; $('act-curso').hidden = false; iniciarRonda(todos); });
  $('btn-otro-tema').addEventListener('click', volverASelector);
}

// ------------------------------------------------------------------ inicio
document.addEventListener('DOMContentLoaded', async () => {
  await cargarGrupos();
  const g = sessionStorage.getItem(SESSION_KEY);
  if (g) {
    try {
      sesion = JSON.parse(g);
      const snap = await getDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId));
      if (snap.exists() && String(snap.data().pin) === String(sesion.pin)) { await entrar(); return; }
    } catch { /* sesión inválida */ }
    sessionStorage.removeItem(SESSION_KEY);
  }
});
