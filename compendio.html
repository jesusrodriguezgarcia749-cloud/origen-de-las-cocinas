// compendio.js — pantalla principal del compendio: carga los 4 archivos de
// datos (uno por Tema), dibuja cada Tema con sus subtemas como tarjetas que
// llevan a tema.html?id=X, y filtra en vivo según lo que se escriba en el buscador.

const DATA_FILES = [
  'data/bloque1.json', 'data/bloque2.json', 'data/bloque3.json', 'data/bloque4.json',
];

function escaparHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function normalizar(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

let bloques = [];

function tarjetaSubtema(s, bloqueNum, termino) {
  const coincideId = termino && s.id.toLowerCase() === termino.toLowerCase();
  return `
    <a class="subtema-card${coincideId ? ' subtema-card-exacta' : ''}" href="tema.html?id=${encodeURIComponent(s.id)}${termino ? `&buscar=${encodeURIComponent(termino)}` : ''}">
      <span class="subtema-id">${escaparHTML(s.id)}</span>
      <span class="subtema-titulo">${escaparHTML(s.titulo)}</span>
    </a>`;
}

function renderTodo(termino) {
  const root = document.getElementById('compendio-root');
  const vacio = document.getElementById('compendio-vacio');
  const norm = normalizar(termino);

  let huboResultado = false;
  let html = '';

  bloques.forEach(b => {
    let subtemas = b.subtemas;
    if (norm) {
      subtemas = subtemas.filter(s =>
        s.id.toLowerCase() === termino.toLowerCase() ||
        normalizar(s.titulo).includes(norm) ||
        (s.contenido || []).some(linea => normalizar(linea).includes(norm))
      );
    }
    if (subtemas.length === 0) return;
    huboResultado = true;

    html += `
      <section class="tema-block">
        <p class="tema-block-label">Tema ${b.bloque}</p>
        <h2>${escaparHTML(b.nombre)}</h2>
        ${!norm && b.descripcion ? `<p class="tema-block-desc">${escaparHTML(b.descripcion)}</p>` : ''}
        <div class="subtema-grid">
          ${subtemas.map(s => tarjetaSubtema(s, b.bloque, termino)).join('')}
        </div>
      </section>`;
  });

  root.innerHTML = html;
  vacio.hidden = huboResultado;
}

function conectarBuscador() {
  const form = document.getElementById('tema-search-form');
  const input = document.getElementById('tema-search-input');
  const params = new URLSearchParams(window.location.search);
  const inicial = params.get('buscar') || '';
  if (inicial) input.value = inicial;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    renderTodo(input.value.trim());
  });
  input.addEventListener('input', () => {
    renderTodo(input.value.trim());
  });

  return inicial;
}

async function init() {
  const root = document.getElementById('compendio-root');
  root.innerHTML = '<p class="cargando-msg">Cargando compendio…</p>';

  try {
    bloques = await Promise.all(DATA_FILES.map(url => fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} al pedir ${url}`);
      return r.json();
    })));
  } catch (err) {
    root.innerHTML = `<p class="subtema-retry-msg">No se pudo cargar el compendio.<br>Motivo: ${escaparHTML(err.message)}</p>`;
    return;
  }

  const terminoInicial = conectarBuscador();
  renderTodo(terminoInicial);
}

document.addEventListener('DOMContentLoaded', init);
