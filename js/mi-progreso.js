// mi-progreso.js — vista de calificación del alumno para Origen de las Cocinas.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, getDocs, collection, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";
import { calcularParcial, calcularCuatrimestre, NOMBRES_PARCIAL, NOMBRES_ENTREGA_PROYECTO } from "./calculo.js";

const app = initializeApp(firebaseConfig);
const auth_db = getFirestore(app);
const db = auth_db;

const SESSION_KEY = 'oc_sesion_alumno';
let sesion = null;
let datosCache = null;

function slugNombre(n) {
  return n.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}
function esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }

async function cargarGrupos() {
  const select = document.getElementById('pg-grupo');
  const snap = await getDocs(query(collection(db, 'grupos'), orderBy('nombre')));
  select.innerHTML = '<option value="">— Elige tu grupo —</option>';
  snap.forEach(d => {
    const o = document.createElement('option');
    o.value = d.id; o.textContent = d.data().nombre;
    select.appendChild(o);
  });
}

document.getElementById('form-login-prog').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('pg-error');
  err.hidden = true;
  const grupoId = document.getElementById('pg-grupo').value;
  const nombre = document.getElementById('pg-nombre').value.trim();
  const pin = document.getElementById('pg-pin').value.trim();
  if (!grupoId || !nombre || !pin) return;

  try {
    const alumnoId = slugNombre(nombre);
    const snap = await getDoc(doc(db, 'grupos', grupoId, 'alumnos', alumnoId));
    if (!snap.exists() || String(snap.data().pin) !== pin) {
      err.textContent = 'No encontramos ese nombre y PIN. Verifica con tu docente.';
      err.hidden = false;
      return;
    }
    sesion = { grupoId, alumnoId, nombre: snap.data().nombre };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
    await entrar();
  } catch (e2) {
    err.textContent = 'No se pudo entrar: ' + (e2.message || e2);
    err.hidden = false;
  }
});

document.getElementById('pg-salir').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});

async function entrar() {
  document.getElementById('prog-login').hidden = true;
  document.getElementById('prog-app').hidden = false;
  document.getElementById('pg-whoami').textContent = `Hola, ${sesion.nombre}`;
  await cargarAvisos();
  await cargarDatos();
  renderParciales();
  renderResumen();
}

async function cargarAvisos() {
  const cont = document.getElementById('prog-avisos');
  try {
    const snap = await getDocs(query(collection(db, 'grupos', sesion.grupoId, 'avisos'), orderBy('creado', 'desc')));
    if (snap.empty) { cont.innerHTML = ''; return; }
    cont.innerHTML = snap.docs.slice(0, 3).map(d => {
      const a = d.data();
      return `<div class="aviso-card"><div class="aviso-card-top"><span class="aviso-card-titulo">${esc(a.titulo || '')}</span></div><div class="aviso-card-texto">${esc(a.texto || '')}</div></div>`;
    }).join('');
  } catch { cont.innerHTML = ''; }
}

async function cargarDatos() {
  const base = ['grupos', sesion.grupoId, 'alumnos', sesion.alumnoId];
  const [tareasSnap, partSnap, asisSnap, unifP1, unifP2, exaP1, exaP2, exaFinal, practicoP2, proyE1, proyE2, proyEF] = await Promise.all([
    getDocs(collection(db, ...base, 'tareas')).catch(() => null),
    getDocs(collection(db, ...base, 'participaciones')).catch(() => null),
    getDocs(collection(db, ...base, 'asistencias')).catch(() => null),
    getDoc(doc(db, ...base, 'uniformes', 'p1')).catch(() => null),
    getDoc(doc(db, ...base, 'uniformes', 'p2')).catch(() => null),
    getDoc(doc(db, ...base, 'examenes', 'p1')).catch(() => null),
    getDoc(doc(db, ...base, 'examenes', 'p2')).catch(() => null),
    getDoc(doc(db, ...base, 'examenes', 'final')).catch(() => null),
    getDoc(doc(db, ...base, 'practico', 'p2')).catch(() => null),
    getDoc(doc(db, ...base, 'proyecto', 'entrega1')).catch(() => null),
    getDoc(doc(db, ...base, 'proyecto', 'entrega2')).catch(() => null),
    getDoc(doc(db, ...base, 'proyecto', 'entregaFinal')).catch(() => null),
  ]);

  datosCache = {
    tareas: tareasSnap ? tareasSnap.docs.map(d => d.data()) : [],
    participaciones: partSnap ? partSnap.docs.map(d => d.data()) : [],
    asistencias: asisSnap ? asisSnap.docs.map(d => d.data()) : [],
    uniformes: {
      p1: unifP1 && unifP1.exists() ? unifP1.data() : null,
      p2: unifP2 && unifP2.exists() ? unifP2.data() : null,
    },
    examenes: {
      p1: exaP1 && exaP1.exists() ? exaP1.data() : null,
      p2: exaP2 && exaP2.exists() ? exaP2.data() : null,
      final: exaFinal && exaFinal.exists() ? exaFinal.data() : null,
    },
    practico: {
      p2: practicoP2 && practicoP2.exists() ? practicoP2.data() : null,
    },
    proyecto: {
      entrega1: proyE1 && proyE1.exists() ? proyE1.data() : null,
      entrega2: proyE2 && proyE2.exists() ? proyE2.data() : null,
      entregaFinal: proyEF && proyEF.exists() ? proyEF.data() : null,
    },
  };
}

function filaRubro(nombre, pts, tope, extra) {
  return `<div class="res-row"><span>${nombre}${extra ? ` <small class="res-extra">${extra}</small>` : ''}</span><strong>${pts.toFixed(1)} / ${tope}</strong></div>`;
}

function renderListaActividades(lista, vacio) {
  if (!lista || lista.length === 0) return `<p class="empty-inline">${vacio}</p>`;
  const filas = lista.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    .map(x => `<li>${esc(x.fecha || 'sin fecha')} — ${esc(x.nombre || '')}${x.calificacion !== undefined && x.calificacion !== null ? `: <strong>${Number(x.calificacion).toFixed(1)}/10</strong>` : ''}</li>`).join('');
  return `<ul style="margin:6px 0 0; padding-left:18px; font-size:.9em;">${filas}</ul>`;
}

function renderParciales() {
  const cont = document.getElementById('prog-parciales');
  const PARCIALES = ['p1', 'p2', 'final'];
  let html = '';

  PARCIALES.forEach(p => {
    const r = calcularParcial(p, datosCache);
    const esFinal = p === 'final';
    const esP2 = p === 'p2';

    let filasDetalle;
    if (esFinal) {
      filasDetalle =
        filaRubro('Examen', r.examen.pts, r.examen.tope, r.examen.calificacion !== null ? `${r.examen.calificacion}/10` : 'sin capturar') +
        filaRubro(NOMBRES_ENTREGA_PROYECTO.entrega1, r.proyecto.detalle.entrega1.pts, r.proyecto.detalle.entrega1.tope, r.proyecto.detalle.entrega1.calificacion !== null ? `${r.proyecto.detalle.entrega1.calificacion}/10` : 'sin capturar') +
        filaRubro(NOMBRES_ENTREGA_PROYECTO.entrega2, r.proyecto.detalle.entrega2.pts, r.proyecto.detalle.entrega2.tope, r.proyecto.detalle.entrega2.calificacion !== null ? `${r.proyecto.detalle.entrega2.calificacion}/10` : 'sin capturar') +
        filaRubro(NOMBRES_ENTREGA_PROYECTO.entregaFinal, r.proyecto.detalle.entregaFinal.pts, r.proyecto.detalle.entregaFinal.tope, r.proyecto.detalle.entregaFinal.calificacion !== null ? `${r.proyecto.detalle.entregaFinal.calificacion}/10` : 'sin capturar') +
        filaRubro('Tareas y Participación', r.tareasParticipacion.pts, r.tareasParticipacion.tope) +
        filaRubro('Asistencia', r.asistencia.pts, r.asistencia.tope, `${r.asistencia.presentes}/${r.asistencia.total} clases`);
    } else if (esP2) {
      filasDetalle =
        filaRubro('Examen escrito', r.examenEscrito.pts, r.examenEscrito.tope, r.examenEscrito.calificacion !== null ? `${r.examenEscrito.calificacion}/10` : 'sin capturar') +
        filaRubro('Examen práctico', r.practico.pts, r.practico.tope, r.practico.calificacion !== null ? `${r.practico.calificacion}/10` : 'sin capturar') +
        filaRubro('Tareas', r.tareas.pts, r.tareas.tope, r.tareas.promedio !== null ? `prom. ${r.tareas.promedio.toFixed(1)}/10` : 'sin capturar') +
        filaRubro('Participación', r.participacion.pts, r.participacion.tope, `${r.participacion.cantidad} de ${r.participacion.meta} participaciones`) +
        filaRubro('Asistencia', r.asistencia.pts, r.asistencia.tope, `${r.asistencia.presentes}/${r.asistencia.total} clases`) +
        filaRubro('Uniformes', r.uniformes.pts, r.uniformes.tope, `${r.uniformes.faltas} falta(s)`);
    } else {
      filasDetalle =
        filaRubro('Examen', r.examen.pts, r.examen.tope, r.examen.calificacion !== null ? `${r.examen.calificacion}/10` : 'sin capturar') +
        filaRubro('Tareas', r.tareas.pts, r.tareas.tope, r.tareas.promedio !== null ? `prom. ${r.tareas.promedio.toFixed(1)}/10` : 'sin capturar') +
        filaRubro('Participación', r.participacion.pts, r.participacion.tope, `${r.participacion.cantidad} de ${r.participacion.meta} participaciones`) +
        filaRubro('Asistencia', r.asistencia.pts, r.asistencia.tope, `${r.asistencia.presentes}/${r.asistencia.total} clases`) +
        filaRubro('Uniformes', r.uniformes.pts, r.uniformes.tope, `${r.uniformes.faltas} falta(s)`);
    }

    const listaTareas = esFinal ? [...r.tareasParticipacion.lista] : r.tareas.lista;
    const listaPart = esFinal ? null : r.participacion.lista;

    html += `
      <div class="res-card">
        <h4>${NOMBRES_PARCIAL[p]}</h4>
        ${filasDetalle}
        <details class="prog-detalle-bloque" style="margin-top:8px;">
          <summary>Ver fechas — Tareas${listaPart ? ' y Participación' : ''}</summary>
          <p class="field-hint" style="margin:8px 0 2px;">Tareas:</p>
          ${renderListaActividades(listaTareas, 'Sin tareas capturadas.')}
          ${listaPart ? `<p class="field-hint" style="margin:10px 0 2px;">Participación:</p>${renderListaActividades(listaPart, 'Sin participación capturada.')}` : ''}
        </details>
        <div class="res-row res-total"><span>Total</span><strong>${r.total.toFixed(1)} / 100 pts</strong></div>
      </div>`;
  });

  cont.innerHTML = html;
}

function renderResumen() {
  const resultados = {};
  ['p1', 'p2', 'final'].forEach(p => { resultados[p] = calcularParcial(p, datosCache); });
  const total = calcularCuatrimestre(resultados);
  document.getElementById('prog-resumen').innerHTML = `
    <div class="score-display">Calificación final del cuatrimestre: ${(total / 10).toFixed(1)} / 10</div>
    <p class="field-hint">Parcial 1 (25%) + Parcial 2 (25%) + Examen Final (50%).</p>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarGrupos();
  const g = sessionStorage.getItem(SESSION_KEY);
  if (g) {
    try {
      sesion = JSON.parse(g);
      const snap = await getDoc(doc(db, 'grupos', sesion.grupoId, 'alumnos', sesion.alumnoId));
      if (snap.exists()) { await entrar(); return; }
    } catch { /* sesión inválida */ }
    sessionStorage.removeItem(SESSION_KEY);
  }
});
