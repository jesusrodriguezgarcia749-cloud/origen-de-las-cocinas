// glosario-pagina.js — la página del glosario: buscador, filtros por tema y tipo, y letras.
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const REVISAR = new URLSearchParams(location.search).has('revisar');
  let D = null, tema = '', cat = '';
  fetch('data/glosario.json').then(r => r.json()).then(d => {
    D = d;
    if (!d.publicado && !REVISAR) { $('#gl-lista').innerHTML = '<div class="gl-vacio"><b>📚 El glosario está en preparación.</b><p>Muy pronto podrás consultar aquí los platillos, ingredientes y técnicas del curso.</p></div>'; document.querySelector('.gl-barra').hidden = true; return; }
    if (!d.publicado) $('#gl-aviso').innerHTML = `<div class="gl-revision">🔎 <b>Modo revisión:</b> los alumnos todavía no ven el glosario. ${esc(d.revision || '')} Cuando esté listo, pide que se publique.</div>`;
    $('#gl-temas').innerHTML = `<button type="button" class="gl-chip act" data-tema="">Todos los temas</button>` + Object.entries(d.temas).map(([k, n]) => `<button type="button" class="gl-chip" data-tema="${k}">${esc(n)}</button>`).join('');
    $('#gl-cats').innerHTML = `<button type="button" class="gl-chip act" data-cat="">Todo</button>` + Object.entries(d.categorias).map(([k, n]) => `<button type="button" class="gl-chip" data-cat="${k}">${esc(n)}</button>`).join('');
    document.querySelectorAll('[data-tema]').forEach(b => b.addEventListener('click', () => { tema = b.dataset.tema; document.querySelectorAll('[data-tema]').forEach(x => x.classList.toggle('act', x === b)); pintar(); }));
    document.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; document.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('act', x === b)); pintar(); }));
    $('#gl-buscar').addEventListener('input', pintar);
    pintar();
    if (location.hash) irA(location.hash.slice(1));
  }).catch(() => { $('#gl-lista').innerHTML = '<p>No se pudo cargar el glosario. Revisa tu conexión.</p>'; });

  function pintar() {
    const q = norm($('#gl-buscar').value.trim());
    const L = D.terminos.filter(e => (!tema || e.tema.split('.')[0] === tema) && (!cat || e.c === cat) && (!q || norm([e.t, ...(e.v || []), e.d, e.o].join(' ')).includes(q)));
    const grupos = {};
    L.forEach(e => { const l = norm(e.t)[0].toUpperCase(); (grupos[l] = grupos[l] || []).push(e); });
    const letras = Object.keys(grupos).sort();
    $('#gl-cuenta').textContent = `${L.length} término${L.length === 1 ? '' : 's'}${q || tema || cat ? ' encontrados' : ' en el glosario'}`;
    $('#gl-letras').innerHTML = letras.map(l => `<a href="#letra-${l}">${l}</a>`).join('');
    $('#gl-lista').innerHTML = letras.length ? letras.map(l => `<section class="gl-letra" id="letra-${l}"><h2>${l}</h2><div class="gl-grid">${grupos[l].map(e => `
      <article class="gl-ent" id="${e.id}"><h3>${esc(e.t)}</h3><p class="gl-meta"><span class="gl-cat">${esc(D.categorias[e.c] || e.c)}</span>${e.o ? ` · ${esc(e.o)}` : ''} · <a href="tema.html?id=${encodeURIComponent(e.tema)}">subtema ${esc(e.tema)}</a></p>
        <p>${esc(e.d)}</p>${(e.v || []).length ? `<p class="gl-tamb">También: ${e.v.map(esc).join(', ')}</p>` : ''}</article>`).join('')}</div></section>`).join('')
      : '<div class="gl-vacio"><b>No encontramos ese término.</b><p>Prueba con otra palabra o pregúntale a tu maestro: quizá lo agreguemos.</p></div>';
  }
  function irA(id) { const el = document.getElementById(id); if (el) { el.classList.add('gl-dest'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.classList.remove('gl-dest'), 3000); } }
  addEventListener('hashchange', () => { if (D && !location.hash.startsWith('#letra-')) irA(location.hash.slice(1)); });
})();
