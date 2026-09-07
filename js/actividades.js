// actividades.js — zona de repaso libre, cliente puro (sin Firebase, sin
// login, sin valor oficial). El alumno elige un Tema, contesta reactivos
// uno por uno con retroalimentación inmediata, y ve un resumen al final.
// Respaldo en localStorage solo para recordar el progreso si recarga.

const TEMAS_INFO = [
  { n: 1, nombre: 'Introducción', archivo: 'data/actividades_bloque1.json' },
  { n: 2, nombre: 'Tipología de la cocina', archivo: 'data/actividades_bloque2.json' },
  { n: 3, nombre: 'Cocinas en el mundo', archivo: 'data/actividades_bloque3.json' },
  { n: 4, nombre: 'Necesidades e influencias', archivo: 'data/actividades_bloque4.json' },
];

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function barajar(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

let temaActivo = null;
let reactivos = [];
let indice = 0;
let respuestas = {}; // { reactivoId: { elegido, correcto } }
let contestadoActual = false;

function renderSelectorTemas() {
  const cont = document.getElementById('act-lista-temas');
  cont.innerHTML = TEMAS_INFO.map(t => `
    <button type="button" class="act-tema-card" data-tema="${t.n}">
      <span class="act-tema-num">Tema ${t.n}</span>
      <span class="act-tema-nombre">${esc(t.nombre)}</span>
    </button>
  `).join('');
  cont.querySelectorAll('.act-tema-card').forEach(btn => {
    btn.addEventListener('click', () => iniciarTema(Number(btn.dataset.tema)));
  });
}

async function iniciarTema(n) {
  const info = TEMAS_INFO.find(t => t.n === n);
  const root = document.getElementById('act-reactivo-root');
  document.getElementById('act-selector').hidden = true;
  document.getElementById('act-resumen').hidden = true;
  document.getElementById('act-curso').hidden = false;
  root.innerHTML = '<p class="empty-inline">Cargando…</p>';

  try {
    const res = await fetch(info.archivo, { cache: 'no-store' });
    const datos = await res.json();
    reactivos = barajar(datos.reactivos);
  } catch (e) {
    root.innerHTML = `<p class="subtema-retry-msg">No se pudo cargar este tema. Intenta de nuevo.</p>`;
    return;
  }

  temaActivo = n;
  indice = 0;
  respuestas = {};
  renderReactivoActual();
}

function renderReactivoActual() {
  contestadoActual = false;
  const r = reactivos[indice];
  const root = document.getElementById('act-reactivo-root');
  document.getElementById('act-avance').textContent = `Pregunta ${indice + 1} de ${reactivos.length}`;

  let cuerpo = '';
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

  root.innerHTML = `
    <div class="reactivo-card">
      <div class="reactivo-head"><span class="reactivo-tipo">${etiquetaTipo(r.tipo)}</span></div>
      <h3 class="reactivo-pregunta">${esc(r.pregunta)}</h3>
      ${cuerpo}
      <div id="act-feedback"></div>
    </div>`;

  if (r.tipo === 'relacionar') {
    document.getElementById('btn-comprobar').addEventListener('click', () => comprobarRelacionar(r));
  } else {
    root.querySelectorAll('.quiz-option').forEach(l => {
      l.addEventListener('click', () => {
        if (contestadoActual) return;
        comprobarOpcion(r, Number(l.dataset.idx));
      });
    });
  }

  document.getElementById('btn-act-anterior').disabled = indice === 0;
  document.getElementById('btn-act-siguiente').textContent = indice === reactivos.length - 1 ? 'Ver resumen' : 'Siguiente →';
}

function etiquetaTipo(t) {
  return { opcion_multiple: 'Opción múltiple', verdadero_falso: 'Verdadero o falso', relacionar: 'Relaciona columnas' }[t] || '';
}

function marcarFeedback(r, correcto) {
  contestadoActual = true;
  respuestas[r.id] = { correcto };
  const fb = document.getElementById('act-feedback');
  fb.innerHTML = `
    <div class="act-feedback ${correcto ? 'act-feedback-ok' : 'act-feedback-mal'}">
      <p class="act-feedback-titulo">${correcto ? '✓ Correcto' : '✗ Incorrecto'}</p>
      <p>${esc(r.explicacion || '')}</p>
    </div>`;
}

function comprobarOpcion(r, idx) {
  const root = document.getElementById('act-reactivo-root');
  root.querySelectorAll('.quiz-option').forEach(l => {
    l.classList.remove('selected');
    if (Number(l.dataset.idx) === r.correcta) l.classList.add('opcion-correcta-act');
    if (Number(l.dataset.idx) === idx && idx !== r.correcta) l.classList.add('opcion-elegida-mal-act');
  });
  marcarFeedback(r, idx === r.correcta);
}

function comprobarRelacionar(r) {
  const selects = document.querySelectorAll('.relacionar-select');
  let todoCorrecto = true;
  selects.forEach(sel => {
    const i = Number(sel.dataset.idx);
    const elegido = sel.value === '' ? null : Number(sel.value);
    if (elegido !== i) todoCorrecto = false;
    sel.disabled = true;
  });
  document.getElementById('btn-comprobar').remove();
  marcarFeedback(r, todoCorrecto);
}

document.getElementById('btn-act-siguiente').addEventListener('click', () => {
  if (indice < reactivos.length - 1) {
    indice++;
    renderReactivoActual();
  } else {
    mostrarResumen();
  }
});

document.getElementById('btn-act-anterior').addEventListener('click', () => {
  if (indice > 0) { indice--; renderReactivoActual(); }
});

document.getElementById('btn-salir-act').addEventListener('click', () => {
  document.getElementById('act-curso').hidden = true;
  document.getElementById('act-resumen').hidden = true;
  document.getElementById('act-selector').hidden = false;
});

function mostrarResumen() {
  document.getElementById('act-curso').hidden = true;
  document.getElementById('act-resumen').hidden = false;
  const total = reactivos.length;
  const correctas = Object.values(respuestas).filter(r => r.correcto).length;
  const contestadas = Object.keys(respuestas).length;
  document.getElementById('act-resumen').innerHTML = `
    <div class="resultado-hero ${correctas / total >= 0.8 ? 'res-ok' : correctas / total >= 0.6 ? 'res-riesgo' : 'res-bajo'}">
      <p class="res-etq">Tema ${temaActivo}</p>
      <p class="res-calif">${correctas} / ${total}</p>
      <p class="res-sub">${contestadas} de ${total} preguntas contestadas</p>
    </div>
    <button class="btn btn-primary btn-block" id="btn-repetir">Repetir este tema</button>
    <button class="btn btn-ghost-dark btn-block" id="btn-otro-tema" style="margin-top:10px;">Elegir otro tema</button>
  `;
  document.getElementById('btn-repetir').addEventListener('click', () => iniciarTema(temaActivo));
  document.getElementById('btn-otro-tema').addEventListener('click', () => {
    document.getElementById('act-resumen').hidden = true;
    document.getElementById('act-selector').hidden = false;
  });
}

document.addEventListener('DOMContentLoaded', renderSelectorTemas);
