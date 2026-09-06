// biblioteca.js — lista de fuentes citadas en el compendio, con un filtro
// rápido por Tema y un enlace directo de vuelta al subtema del compendio
// donde se cita cada fuente.

function escaparHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let fuentes = [];
let filtroActivo = 'todos';

function temaDe(id) {
  return id.split('.')[0];
}

function tarjetaFuente(f) {
  return `
    <article class="biblio-card">
      <div class="biblio-card-top">
        <span class="biblio-tipo">${escaparHTML(f.tipo)}</span>
        <span class="biblio-anio">${escaparHTML(f.anio)}</span>
      </div>
      <h2 class="biblio-titulo">${escaparHTML(f.titulo)}</h2>
      <p class="biblio-autor">${escaparHTML(f.autor)}</p>
      <p class="biblio-desc">${escaparHTML(f.descripcion)}</p>
      <a class="biblio-link" href="tema.html?id=${encodeURIComponent(f.tema)}">Ver en el compendio (Tema ${escaparHTML(temaDe(f.tema))}) →</a>
    </article>`;
}

function render() {
  const root = document.getElementById('biblio-root');
  const lista = filtroActivo === 'todos' ? fuentes : fuentes.filter(f => temaDe(f.tema) === filtroActivo);
  root.innerHTML = `<div class="biblio-grid">${lista.map(tarjetaFuente).join('')}</div>`;
}

function renderFiltros() {
  const cont = document.getElementById('biblio-filtros');
  const temas = ['todos', '1', '2', '3', '4'];
  const etiquetas = { todos: 'Todas', 1: 'Tema 1', 2: 'Tema 2', 3: 'Tema 3', 4: 'Tema 4' };

  cont.innerHTML = temas.map(t => `
    <button type="button" class="biblio-filtro-btn${t === filtroActivo ? ' activo' : ''}" data-tema="${t}">${etiquetas[t]}</button>
  `).join('');

  cont.querySelectorAll('.biblio-filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroActivo = btn.dataset.tema;
      renderFiltros();
      render();
    });
  });
}

async function init() {
  const root = document.getElementById('biblio-root');
  root.innerHTML = '<p class="cargando-msg">Cargando biblioteca…</p>';
  try {
    const res = await fetch('data/biblioteca.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();
    fuentes = datos.fuentes;
  } catch (err) {
    root.innerHTML = `<p class="subtema-retry-msg">No se pudo cargar la biblioteca.<br>Motivo: ${escaparHTML(err.message)}</p>`;
    return;
  }
  renderFiltros();
  render();
}

document.addEventListener('DOMContentLoaded', init);
