// atlas.js — Atlas interactivo de Origen de las Cocinas
// Cuatro secciones: mapa de regiones, juego «¿De dónde viene?», rutas animadas y línea del tiempo.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, padre) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (padre) padre.appendChild(e); return e; };
  const h = (tag, attrs = {}, html) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (html !== undefined) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const guarda = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lee = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let A = null, RUTAS = null;
  const listo = {};

  // ---------------- Pestañas
  const tabs = [...document.querySelectorAll('.atlas-tabs button')];
  function abrir(nombre, extra) {
    if (!document.getElementById('panel-' + nombre)) nombre = 'mapa';
    tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === nombre)));
    document.querySelectorAll('.atlas-panel').forEach(p => { p.hidden = p.id !== 'panel-' + nombre; });
    if (!listo[nombre]) { listo[nombre] = true; ({ mapa: iniciarMapa, juego: iniciarJuego, donde: iniciarDonde, comparar: iniciarComparar, rutas: iniciarRutas, tiempo: iniciarTiempo })[nombre](extra); }
    else if (extra) ({ mapa: (x) => (A.regiones[x] ? elegirRegion(x) : zoomA(x, true)), rutas: (x) => elegirRuta(x), comparar: (x) => compararDesdeHash(x), juego() {}, donde() {}, tiempo() {} })[nombre](extra);
  }
  tabs.forEach(b => b.addEventListener('click', () => { history.replaceState(null, '', '#' + b.dataset.tab); abrir(b.dataset.tab); }));

  fetch('data/atlas.json').then(r => r.json()).then(d => {
    A = d;
    const [tab, extra] = (location.hash.slice(1) || 'mapa').split('=');
    abrir(tab, extra);
    window.addEventListener('hashchange', () => { const [t, x] = (location.hash.slice(1) || 'mapa').split('='); abrir(t, x); });
  }).catch(() => { $('#panel-mapa').innerHTML = '<p class="aviso mal">No se pudo cargar el Atlas. Revisa tu conexión y recarga la página.</p>'; });

  // ---------------- Dibujo del mundo (lo usan el mapa y el juego)
  function dibujarMundo(svg, conRegiones) {
    const M = A.mundo;
    svg.setAttribute('viewBox', `0 0 ${M.w} ${M.h}`);
    el('rect', { class: 'mar', x: -2000, y: -2000, width: 6000, height: 6000 }, svg);
    el('path', { class: 'grat', d: M.grat }, svg);
    const g = el('g', {}, svg);
    M.paises.forEach(p => {
      const reg = conRegiones && p.r ? A.regiones[p.r] : null;
      const e = el('path', { d: p.d, class: 'pais' + (reg ? ' con-region' : '') }, g);
      if (reg) { e.style.fill = reg.color; e.dataset.r = p.r; }
      e.dataset.n = p.n; if (p.i) e.dataset.i = p.i;
    });
    return g;
  }

  // ================= 1. MAPA DE REGIONES
  let vb = null, mapaSvg = null;
  function iniciarMapa(extra) {
    mapaSvg = $('#mapa-svg');
    dibujarMundo(mapaSvg, true);
    const gi = el('g', {}, mapaSvg);
    A.mundo.islas.forEach(i => {
      const c = el('circle', { class: 'isla', cx: i.x, cy: i.y, r: 4.5 }, gi);
      c.style.fill = A.regiones[i.r].color; c.dataset.r = i.r; c.dataset.n = i.n; c.dataset.i = i.i;
    });
    vb = [0, 0, A.mundo.w, A.mundo.h];
    const tip = $('#mapa-tip'), caja = mapaSvg.parentElement;
    mapaSvg.addEventListener('pointermove', ev => {
      const t = ev.target; if (!t.dataset || !t.dataset.n || ev.pointerType === 'touch') { tip.hidden = true; return; }
      const r = caja.getBoundingClientRect();
      tip.textContent = t.dataset.r ? `${t.dataset.n} · ${A.regiones[t.dataset.r].nombre}` : t.dataset.n;
      tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px'; tip.hidden = false;
    });
    mapaSvg.addEventListener('pointerleave', () => { tip.hidden = true; });
    let tipT = null;
    mapaSvg.addEventListener('click', ev => {
      const t = ev.target, r = t.dataset && t.dataset.r; if (!r) return;
      elegirRegion(r, t.dataset.i, false);
      const rc = caja.getBoundingClientRect();
      tip.textContent = `${t.dataset.n} · ${A.regiones[r].nombre}`; tip.style.left = (ev.clientX - rc.left) + 'px'; tip.style.top = (ev.clientY - rc.top) + 'px'; tip.hidden = false;
      clearTimeout(tipT); tipT = setTimeout(() => { tip.hidden = true; }, 2600);
    });
    iniciarBuscador();

    // botones de continente
    const z = $('#mapa-zoom');
    const mk = (k, txt) => { const b = h('button', { class: 'chip-at', 'aria-pressed': 'false', 'data-k': k }, esc(txt)); b.addEventListener('click', () => zoomA(k, true)); z.appendChild(b); };
    mk('mundo', 'Mundo'); Object.entries(A.continentes).forEach(([k, c]) => mk(k, `${c.nombre} · ${c.sub}`));

    // lista de regiones
    const lista = $('#mapa-lista');
    Object.entries(A.continentes).forEach(([k, c]) => {
      const col = h('div'); col.appendChild(h('h4', {}, `${esc(c.nombre)} · ${c.sub}`));
      Object.entries(A.regiones).filter(([, r]) => r.cont === k).forEach(([rk, r]) => {
        const b = h('button', { type: 'button' }, `<i style="background:${r.color}"></i>${esc(r.nombre)}`);
        b.addEventListener('click', () => { elegirRegion(rk); mapaSvg.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' }); });
        col.appendChild(b);
      });
      lista.appendChild(col);
    });
    fichaVacia();
    if (extra && A.regiones[extra]) elegirRegion(extra); else zoomA(extra && A.continentes[extra] ? extra : 'mundo', false);
  }
  function fichaVacia() {
    const f = $('#mapa-ficha'); f.style.removeProperty('--ficha-color');
    f.innerHTML = `<p class="ficha-sub">Tema 3 · Cocinas en el mundo</p><h2>Elige una región</h2><p class="ficha-vacia">El mundo está dividido en ${Object.keys(A.regiones).length} regiones culinarias de los cinco continentes que estudiamos. Cada color es una región: tócala para conocer su clima, sus ingredientes, sus platillos y un dato que no debes olvidar.</p>`;
  }
  function elegirRegion(k, paisId, zoomPais = true) {
    const r = A.regiones[k]; if (!r) return;
    mapaSvg.classList.add('hay-activa');
    mapaSvg.querySelectorAll('[data-r]').forEach(p => p.classList.toggle('activa', p.dataset.r === k));
    zoomA(r.cont, true);
    const f = $('#mapa-ficha'); f.style.setProperty('--ficha-color', r.color);
    f.innerHTML = `<p class="ficha-sub">${esc(A.continentes[r.cont].nombre)} · subtema ${r.sub}</p>
      <h2>${esc(r.nombre)}</h2>
      <h3>Clima y paisaje</h3><p style="margin:0;font-size:.92rem">${esc(r.clima)}</p>
      <h3>Ingredientes base</h3><div class="ficha-chips">${r.ingredientes.map(i => `<span>${esc(i)}</span>`).join('')}</div>
      <h3>Platillos representativos</h3><ul>${r.platillos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <p class="ficha-dato"><strong>Dato clave:</strong> ${esc(r.dato)}</p>
      <h3>Países de esta región (${r.paises.length})</h3>
      <p class="ficha-mini">Toca un país para verlo en el mapa y conocer sus platillos emblemáticos.</p>
      <div class="ficha-paises">${r.paises.map(p => `<button type="button" data-id="${esc(p.id)}" aria-pressed="false">${esc(p.n.replace(/ \(.*\)$/, ''))}</button>`).join('')}</div>
      <div class="ficha-pais" id="ficha-pais" aria-live="polite" hidden></div>
      <a class="ficha-link" href="tema.html?id=${r.sub}">Leer el subtema ${r.sub} en el compendio →</a>`;
    f.querySelectorAll('.ficha-paises button').forEach(b => b.addEventListener('click', () => marcarPais(b.dataset.id, true)));
    history.replaceState(null, '', '#mapa=' + k);
    if (paisId) marcarPais(paisId, zoomPais);
  }
  function marcarPais(id, acercar) {
    const k = PAIS[id] && PAIS[id].r, r = A.regiones[k]; if (!r) return;
    const p = r.paises.find(x => x.id === id);
    mapaSvg.querySelectorAll('.pais-sel').forEach(e => e.classList.remove('pais-sel'));
    const els = [...mapaSvg.querySelectorAll(`[data-i="${CSS.escape(id)}"]`)];
    els.forEach(e => { e.classList.add('pais-sel'); e.parentNode.appendChild(e); });
    document.querySelectorAll('#mapa-ficha .ficha-paises button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    const fp = $('#ficha-pais');
    if (fp) {
      fp.hidden = false;
      const nota = (p.n.match(/\((.*)\)$/) || [])[1];
      fp.innerHTML = `<p class="fp-nombre">📍 ${esc(p.n.replace(/ \(.*\)$/, ''))}</p>${nota ? `<p class="fp-nota">${esc(nota.charAt(0).toUpperCase() + nota.slice(1))}.</p>` : ''}
        ${p.p ? `<p class="fp-tit">Platillos emblemáticos</p><div class="ficha-chips">${p.p.map(x => `<span>${esc(x)}</span>`).join('')}</div>`
        : '<p class="fp-reto"><strong>Reto:</strong> aún no registramos un platillo emblemático de este país. ¡Investígalo y compártelo en clase!</p>'}`;
    }
    if (acercar && els.length) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      els.forEach(e => { const b = e.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
      if (x1 - x0 > A.mundo.w / 2) return; // países que cruzan el mapa (Rusia, EE. UU. con Alaska): basta el continente
      const min = 150, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = Math.max(min, (x1 - x0) * 1.6), hh = Math.max(min * .6, (y1 - y0) * 1.6);
      zoomCaja([cx - w / 2, cy - hh / 2, w, hh], true);
    }
  }
  // ---- índice de países y buscador
  const PAIS = {};
  const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function indexarPaises() { if (Object.keys(PAIS).length) return; Object.entries(A.regiones).forEach(([k, r]) => r.paises.forEach(p => { PAIS[p.id] = { ...p, r: k }; })); }
  function iniciarBuscador() {
    indexarPaises();
    const inp = $('#mapa-buscar'), ul = $('#mapa-sugerencias'); let act = -1, res = [];
    const cerrar = () => { ul.hidden = true; ul.innerHTML = ''; act = -1; inp.setAttribute('aria-expanded', 'false'); };
    const elegir = p => { inp.value = p.n.replace(/ \(.*\)$/, ''); cerrar(); elegirRegion(p.r, p.id, true); mapaSvg.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' }); };
    inp.addEventListener('input', () => {
      const q = norm(inp.value.trim()); if (!q) return cerrar();
      const todos = Object.values(PAIS);
      res = [...todos.filter(p => norm(p.n).startsWith(q)), ...todos.filter(p => !norm(p.n).startsWith(q) && norm(p.n).includes(q))].slice(0, 8);
      ul.innerHTML = res.length ? res.map((p, i) => `<li role="option" id="sug-${i}" data-i="${i}"><i style="background:${A.regiones[p.r].color}"></i><span>${esc(p.n.replace(/ \(.*\)$/, ''))}</span><small>${esc(A.regiones[p.r].nombre)}</small></li>`).join('')
        : '<li class="sin">No encontramos ese país. Revisa cómo se escribe.</li>';
      ul.hidden = false; act = -1; inp.setAttribute('aria-expanded', 'true');
      ul.querySelectorAll('li[data-i]').forEach(li => li.addEventListener('mousedown', e => { e.preventDefault(); elegir(res[+li.dataset.i]); }));
    });
    inp.addEventListener('keydown', e => {
      const lis = [...ul.querySelectorAll('li[data-i]')]; if (ul.hidden || !lis.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length; lis.forEach((l, i) => l.classList.toggle('act', i === act)); inp.setAttribute('aria-activedescendant', 'sug-' + act); }
      else if (e.key === 'Enter') { e.preventDefault(); elegir(res[act >= 0 ? act : 0]); }
      else if (e.key === 'Escape') cerrar();
    });
    inp.addEventListener('blur', () => setTimeout(cerrar, 150));
  }
  function zoomA(k, animar) {
    if (!mapaSvg) return;
    document.querySelectorAll('#mapa-zoom .chip-at').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    if (k === 'mundo') { mapaSvg.classList.remove('hay-activa'); mapaSvg.querySelectorAll('.activa').forEach(p => p.classList.remove('activa')); fichaVacia(); }
    zoomCaja(k === 'mundo' || !A.mundo.cajas[k] ? [0, 0, A.mundo.w, A.mundo.h] : A.mundo.cajas[k].slice(), animar, k === 'mundo' ? 0 : 0.08);
  }
  function zoomCaja(dest, animar, m = 0, svg = mapaSvg) {
    // conservar la proporción del mapa y dejar margen
    const rc = svg.getBoundingClientRect(); const ar = rc.width && rc.height ? rc.width / rc.height : A.mundo.w / A.mundo.h; let [x, y, w, hh] = dest;
    x -= w * m; y -= hh * m; w *= 1 + 2 * m; hh *= 1 + 2 * m;
    if (w / hh > ar) { const n = w / ar; y -= (n - hh) / 2; hh = n; } else { const n = hh * ar; x -= (n - w) / 2; w = n; }
    dest = [x, y, w, hh];
    const st = svg === mapaSvg ? { get: () => vb, set: v => { vb = v; } } : { get: () => svg.getAttribute('viewBox').split(' ').map(Number), set: () => {} };
    cancelAnimationFrame(svg._anim);
    if (!animar || reducido) { st.set(dest); svg.setAttribute('viewBox', dest.join(' ')); return; }
    const ini = st.get().slice(), t0 = performance.now(), dur = 650;
    const paso = t => { const p = Math.min(1, (t - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; const v = ini.map((a, i) => a + (dest[i] - a) * e); st.set(v); svg.setAttribute('viewBox', v.join(' ')); if (p < 1) svg._anim = requestAnimationFrame(paso); };
    svg._anim = requestAnimationFrame(paso);
  }

  // ================= 2. ¿DE DÓNDE VIENE?
  const RONDA = 10;
  let J = null, juegoSvg = null;
  function iniciarJuego() {
    juegoSvg = $('#juego-svg');
    dibujarMundo(juegoSvg, false);
    const gz = el('g', {}, juegoSvg);
    const claves = Object.keys(A.zonas);
    claves.forEach((k, i) => {
      const z = A.zonas[k];
      const g = el('g', { class: 'zona', 'data-z': k, tabindex: '0', role: 'button', 'aria-label': z.nombre }, gz);
      el('circle', { class: 'aro', cx: z.x, cy: z.y, r: 15 }, g);
      const t = el('text', { class: 'num', x: z.x, y: z.y + 4 }, g); t.textContent = i + 1;
      const c = el('text', { class: 'cuenta', x: z.x + 17, y: z.y - 10 }, g); c.dataset.cuenta = k;
      const tt = el('title', {}, g); tt.textContent = z.nombre;
      g.addEventListener('click', () => colocar(k));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); colocar(k); } });
    });
    const zb = $('#juego-zonas');
    claves.forEach((k, i) => { const b = h('button', { class: 'chip-at', type: 'button' }, `${i + 1}. ${esc(A.zonas[k].nombre)}`); b.addEventListener('click', () => colocar(k)); zb.appendChild(b); });
    nuevaRonda();
  }
  function nuevaRonda() {
    const todos = A.ingredientes.slice();
    for (let i = todos.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [todos[i], todos[j]] = [todos[j], todos[i]]; }
    J = { items: todos.slice(0, RONDA), sel: null, hechos: {}, aciertos: 0 };
    juegoSvg.querySelectorAll('[data-cuenta]').forEach(t => { t.textContent = ''; });
    $('#juego-aviso').innerHTML = '';
    const band = $('#juego-bandeja'); band.innerHTML = '';
    J.items.forEach(it => {
      const b = h('button', { class: 'ing', type: 'button', 'aria-pressed': 'false', 'data-id': it.id }, `<span class="emo" aria-hidden="true">${it.e}</span>${esc(it.n)}`);
      b.addEventListener('click', () => { if (J.hechos[it.id] || b.dataset.arrastrado) { delete b.dataset.arrastrado; return; } seleccionar(it.id); });
      arrastrable(b, it.id);
      band.appendChild(b);
    });
    marcador();
  }
  function marcador() {
    const n = Object.keys(J.hechos).length, mejor = lee('atlas_mejor') || '—';
    $('#juego-marcador').textContent = `Aciertos ${J.aciertos} de ${n} · quedan ${RONDA - n} · tu mejor ronda: ${mejor}/${RONDA}`;
  }
  function seleccionar(id) {
    J.sel = J.sel === id ? null : id;
    document.querySelectorAll('#juego-bandeja .ing').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === J.sel)));
    juegoSvg.classList.toggle('esperando', !!J.sel);
    const it = J.items.find(i => i.id === J.sel);
    $('#juego-instruccion').textContent = it ? `¿De dónde viene ${it.n.toLowerCase()}? Toca su lugar de origen en el mapa o en la lista de abajo.` : 'Elige un ingrediente y después toca en el mapa el lugar donde se domesticó. En computadora también puedes arrastrarlo.';
  }
  function colocar(zona, id) {
    id = id || J.sel; if (!id || J.hechos[id]) return;
    const it = J.items.find(i => i.id === id), bien = it.z === zona;
    J.hechos[id] = { zona, bien }; if (bien) J.aciertos++;
    const b = $(`#juego-bandeja .ing[data-id="${id}"]`); b.classList.add(bien ? 'ok' : 'mal'); b.setAttribute('aria-pressed', 'false'); b.disabled = true;
    b.insertAdjacentHTML('beforeend', bien ? ' ✓' : ' ✗');
    const cuenta = juegoSvg.querySelector(`[data-cuenta="${it.z}"]`); cuenta.textContent = (cuenta.textContent ? cuenta.textContent + ' ' : '') + it.e;
    $('#juego-aviso').innerHTML = `<div class="aviso ${bien ? 'ok' : 'mal'}"><strong>${bien ? '¡Correcto!' : `No: ${esc(it.n.toLowerCase())} viene de ${esc(A.zonas[it.z].nombre)}.`}</strong> ${esc(it.t)}</div>`;
    J.sel = null; seleccionar(null);
    marcador();
    if (Object.keys(J.hechos).length === RONDA) finRonda();
  }
  function finRonda() {
    const prev = Number(lee('atlas_mejor') || 0); if (J.aciertos > prev) guarda('atlas_mejor', String(J.aciertos));
    marcador();
    const mal = J.items.filter(i => !J.hechos[i.id].bien);
    const msj = J.aciertos === RONDA ? '¡Ronda perfecta! Ya sabes leer el intercambio de ingredientes del mundo.' : J.aciertos >= 7 ? 'Muy bien. Repasa los que fallaste:' : 'Vale la pena repasar el subtema de cada uno:';
    $('#juego-aviso').innerHTML = `<div class="resumen"><h3>${J.aciertos} de ${RONDA}</h3><p>${msj}</p>${mal.length ? `<ul>${mal.map(i => `<li><strong>${esc(i.n)}</strong>: ${esc(A.zonas[i.z].nombre)}. ${esc(i.t)}</li>`).join('')}</ul>` : ''}<button class="btn-at" id="otra-ronda" type="button">Otra ronda</button></div>`;
    $('#otra-ronda').addEventListener('click', nuevaRonda);
  }
  function arrastrable(b, id) {
    let fantasma = null, inicio = null, zonaSobre = null;
    const zonaEn = (x, y) => { const e = document.elementFromPoint(x, y); const g = e && e.closest && e.closest('.zona'); return g ? g.dataset.z : null; };
    b.addEventListener('pointerdown', ev => { if (J.hechos[id] || ev.pointerType === 'touch') return; inicio = [ev.clientX, ev.clientY]; b.setPointerCapture(ev.pointerId); });
    b.addEventListener('pointermove', ev => {
      if (!inicio) return;
      if (!fantasma && Math.hypot(ev.clientX - inicio[0], ev.clientY - inicio[1]) > 8) { fantasma = b.cloneNode(true); fantasma.classList.add('fantasma'); document.body.appendChild(fantasma); seleccionar(id); }
      if (!fantasma) return;
      fantasma.style.left = ev.clientX + 'px'; fantasma.style.top = ev.clientY + 'px';
      fantasma.style.display = 'none'; const z = zonaEn(ev.clientX, ev.clientY); fantasma.style.display = '';
      if (z !== zonaSobre) { juegoSvg.querySelectorAll('.zona').forEach(g => g.classList.toggle('sobre', g.dataset.z === z)); zonaSobre = z; }
    });
    const fin = ev => {
      if (!inicio) return; inicio = null;
      if (fantasma) { fantasma.remove(); fantasma = null; b.dataset.arrastrado = '1'; juegoSvg.querySelectorAll('.zona.sobre').forEach(g => g.classList.remove('sobre')); const z = zonaEn(ev.clientX, ev.clientY); zonaSobre = null; if (z) colocar(z, id); }
    };
    b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', () => { inicio = null; if (fantasma) { fantasma.remove(); fantasma = null; } });
  }

  // ================= 2b. ¿DÓNDE QUEDA?
  const RONDA_D = 10, EXCLUIR = ['SAH', 'SOL', 'CYN', 'FLK'];
  let DQ = null, dondeSvg = null, dondeCont = 'mundo';
  function iniciarDonde() {
    indexarPaises();
    dondeSvg = $('#donde-svg');
    dibujarMundo(dondeSvg, false);
    const gi = el('g', {}, dondeSvg);
    A.mundo.islas.forEach(i => { const c = el('circle', { class: 'isla isla-d', cx: i.x, cy: i.y, r: 4.5 }, gi); c.dataset.i = i.i; c.dataset.n = i.n; });
    const f = $('#donde-filtros');
    [['mundo', 'Todo el mundo'], ...Object.entries(A.continentes).map(([k, c]) => [k, c.nombre])].forEach(([k, n]) => {
      const b = h('button', { class: 'chip-at', type: 'button', 'aria-pressed': String(k === dondeCont), 'data-k': k }, esc(n));
      b.addEventListener('click', () => { dondeCont = k; f.querySelectorAll('.chip-at').forEach(x => x.setAttribute('aria-pressed', String(x === b))); rondaDonde(); });
      f.appendChild(b);
    });
    dondeSvg.addEventListener('click', ev => { const id = ev.target.dataset && ev.target.dataset.i; if (id) responderDonde(id, ev.target.dataset.n); });
    $('#donde-pista').addEventListener('click', pistaDonde);
    $('#donde-sig').addEventListener('click', siguienteDonde);
    rondaDonde();
  }
  function rondaDonde() {
    const pool = Object.values(PAIS).filter(p => !EXCLUIR.includes(p.id) && (dondeCont === 'mundo' || A.regiones[p.r].cont === dondeCont));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    DQ = { items: pool.slice(0, RONDA_D), i: 0, aciertos: 0, pistas: 0, fallos: [] };
    zoomCaja(dondeCont === 'mundo' ? [0, 0, A.mundo.w, A.mundo.h] : A.mundo.cajas[dondeCont].slice(), true, dondeCont === 'mundo' ? 0 : 0.06, dondeSvg);
    $('#donde-aviso').innerHTML = '';
    preguntaDonde();
  }
  function preguntaDonde() {
    dondeSvg.querySelectorAll('.d-ok,.d-mal,.d-pista').forEach(e => e.classList.remove('d-ok', 'd-mal', 'd-pista'));
    DQ.resp = false; DQ.pista = false;
    const p = DQ.items[DQ.i];
    $('#donde-pregunta').innerHTML = `<span>País ${DQ.i + 1} de ${DQ.items.length}</span>¿Dónde queda <strong>${esc(p.n.replace(/ \(.*\)$/, ''))}</strong>?`;
    $('#donde-pista').hidden = false; $('#donde-sig').hidden = true;
    $('#donde-aviso').innerHTML = '';
    marcadorDonde();
  }
  function marcadorDonde() {
    const mejor = lee('atlas_donde_' + dondeCont) || '—';
    $('#donde-marcador').textContent = `Aciertos ${DQ.aciertos} · tu mejor ronda aquí: ${mejor}/${RONDA_D}`;
  }
  function pistaDonde() {
    if (DQ.resp || DQ.pista) return;
    const p = DQ.items[DQ.i], r = A.regiones[p.r]; DQ.pista = true; DQ.pistas++;
    dondeSvg.querySelectorAll('[data-i]').forEach(e => { if (PAIS[e.dataset.i] && PAIS[e.dataset.i].r === p.r) e.classList.add('d-pista'); });
    if (dondeCont === 'mundo') zoomCaja(A.mundo.cajas[r.cont].slice(), true, 0.06, dondeSvg);
    $('#donde-aviso').innerHTML = `<div class="aviso">Pista: está en <strong>${esc(r.nombre)}</strong> (${esc(A.continentes[r.cont].nombre)}). La región quedó resaltada.</div>`;
    $('#donde-pista').hidden = true;
  }
  function responderDonde(id, nombre) {
    if (DQ.resp) return;
    const p = DQ.items[DQ.i], bien = id === p.id; DQ.resp = true;
    if (bien) DQ.aciertos++; else DQ.fallos.push(p);
    dondeSvg.querySelectorAll('.d-pista').forEach(e => e.classList.remove('d-pista'));
    const correcto = [...dondeSvg.querySelectorAll(`[data-i="${CSS.escape(p.id)}"]`)];
    correcto.forEach(e => { e.classList.add('d-ok'); e.parentNode.appendChild(e); });
    if (!bien) dondeSvg.querySelectorAll(`[data-i="${CSS.escape(id)}"]`).forEach(e => e.classList.add('d-mal'));
    const pl = p.p ? ` Platillos emblemáticos: ${p.p.slice(0, 2).join(', ')}.` : '';
    $('#donde-aviso').innerHTML = `<div class="aviso ${bien ? 'ok' : 'mal'}"><strong>${bien ? '¡Correcto!' : `Tocaste ${esc(nombre)}. ${esc(p.n.replace(/ \(.*\)$/, ''))} está marcado en verde.`}</strong> Está en ${esc(A.regiones[p.r].nombre)}.${esc(pl)}</div>`;
    $('#donde-pista').hidden = true; $('#donde-sig').hidden = false;
    $('#donde-sig').textContent = DQ.i + 1 < DQ.items.length ? 'Siguiente país →' : 'Ver resultado';
    $('#donde-sig').focus({ preventScroll: true });
    marcadorDonde();
  }
  function siguienteDonde() {
    if (DQ.i + 1 < DQ.items.length) { DQ.i++; preguntaDonde(); return; }
    const clave = 'atlas_donde_' + dondeCont, prev = Number(lee(clave) || 0); if (DQ.aciertos > prev) guarda(clave, String(DQ.aciertos));
    const n = DQ.items.length;
    $('#donde-pregunta').innerHTML = `<span>Ronda terminada</span><strong>${DQ.aciertos} de ${n}</strong> países ubicados${DQ.pistas ? ` (usaste ${DQ.pistas} pista${DQ.pistas > 1 ? 's' : ''})` : ''}`;
    $('#donde-sig').hidden = true;
    $('#donde-aviso').innerHTML = `<div class="resumen"><p>${DQ.aciertos === n ? '¡Ronda perfecta! Ya ubicas muy bien esta parte del mundo.' : 'Repasa los que fallaste: en el Mapa del mundo puedes buscarlos y ver sus platillos.'}</p>${DQ.fallos.length ? `<ul>${DQ.fallos.map(p => `<li><strong>${esc(p.n.replace(/ \(.*\)$/, ''))}</strong>: ${esc(A.regiones[p.r].nombre)}</li>`).join('')}</ul>` : ''}<button class="btn-at" id="donde-otra" type="button">Otra ronda</button></div>`;
    $('#donde-otra').addEventListener('click', rondaDonde);
    marcadorDonde();
  }

  // ================= 2c. COMPARAR REGIONES
  function iniciarComparar(extra) {
    indexarPaises();
    const opts = Object.entries(A.continentes).map(([ck, c]) => `<optgroup label="${esc(c.nombre)}">${Object.entries(A.regiones).filter(([, r]) => r.cont === ck).map(([k, r]) => `<option value="${k}">${esc(r.nombre)}</option>`).join('')}</optgroup>`).join('');
    ['#comp-a', '#comp-b'].forEach(s => { $(s).innerHTML = opts; $(s).addEventListener('change', pintarComparar); });
    $('#comp-a').value = 'am-meso'; $('#comp-b').value = 'am-and';
    $('#comp-cambiar').addEventListener('click', () => { const a = $('#comp-a').value; $('#comp-a').value = $('#comp-b').value; $('#comp-b').value = a; pintarComparar(); });
    if (extra) compararDesdeHash(extra); else pintarComparar();
  }
  function compararDesdeHash(x) { const [a, b] = String(x).split(','); if (A.regiones[a]) $('#comp-a').value = a; if (A.regiones[b]) $('#comp-b').value = b; pintarComparar(); }
  function pintarComparar() {
    const ka = $('#comp-a').value, kb = $('#comp-b').value, a = A.regiones[ka], b = A.regiones[kb];
    history.replaceState(null, '', `#comparar=${ka},${kb}`);
    const fila = (t, fa, fb) => `<tr><th scope="row">${t}</th><td>${fa(a)}</td><td>${fb ? fb(b) : fa(b)}</td></tr>`;
    const chips = r => `<div class="ficha-chips">${r.ingredientes.map(i => `<span>${esc(i)}</span>`).join('')}</div>`;
    const lista = r => `<ul>${r.platillos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`;
    const paises = r => `<p class="comp-paises">${r.paises.map(p => esc(p.n.replace(/ \(.*\)$/, ''))).join(', ')}</p>`;
    $('#comp-tabla').innerHTML = `<table class="comp-tabla"><thead><tr><th></th>${[a, b].map((r, i) => `<th scope="col" style="--c:${r.color}"><span class="comp-color"></span>${esc(r.nombre)}<small>${esc(A.continentes[r.cont].nombre)} · subtema ${r.sub}</small></th>`).join('')}</tr></thead><tbody>
      ${fila('Clima y paisaje', r => esc(r.clima))}
      ${fila('Ingredientes base', chips)}
      ${fila('Platillos representativos', lista)}
      ${fila(`Países e islas`, r => `<b>${r.paises.length}</b>${paises(r)}`)}
      ${fila('Dato clave', r => esc(r.dato))}
    </tbody></table>`;
    const igual = ka === kb;
    $('#comp-pensar').innerHTML = igual ? '<p class="aviso">Elegiste la misma región dos veces: cambia una para comparar.</p>' : `<h3>Para pensar y comentar en clase</h3><ol>
      <li>¿Qué diferencia de clima y paisaje ves entre ${esc(a.nombre)} y ${esc(b.nombre)}? ¿Cómo explica eso sus ingredientes base?</li>
      <li>¿Comparten algún ingrediente o técnica? Si es así, ¿fue por el clima, por el comercio o por la conquista y la migración?</li>
      <li>Elige un platillo de cada región: ¿qué dice de la historia y la forma de vida de quienes lo crearon?</li></ol>`;
  }

  // ================= 3. RUTAS
  const VIAJERO = { galeon: '⛵', sahara: '🐪', chile: '🌶️', cafe: '☕', seda: '🐫', polinesia: '🛶' };
  let R = null, rutaSvg = null, actual = -1, reproduciendo = false, rafRuta = null, temporizador = null;
  function iniciarRutas(extra) {
    $('#ruta-titulo').textContent = 'Cargando rutas…';
    fetch('data/atlas_rutas.json').then(r => r.json()).then(d => {
      RUTAS = d.rutas; rutaSvg = $('#ruta-svg');
      const sel = $('#rutas-sel');
      RUTAS.forEach(r => { const b = h('button', { class: 'chip-at', 'aria-pressed': 'false', 'data-id': r.id }, `${VIAJERO[r.id] || ''} ${esc(r.titulo)}`); b.addEventListener('click', () => elegirRuta(r.id)); sel.appendChild(b); });
      $('#ruta-play').addEventListener('click', () => reproduciendo ? detener() : reproducir());
      $('#ruta-sig').addEventListener('click', () => { detener(); irA(Math.min(actual + 1, R.paradas.length - 1)); });
      $('#ruta-ant').addEventListener('click', () => { detener(); irA(Math.max(actual - 1, 0)); });
      elegirRuta(RUTAS.some(r => r.id === extra) ? extra : RUTAS[0].id);
    }).catch(() => { $('#ruta-titulo').textContent = 'No se pudieron cargar las rutas. Revisa tu conexión.'; });
  }
  function elegirRuta(id) {
    if (!RUTAS) return; detener();
    R = RUTAS.find(r => r.id === id) || RUTAS[0];
    document.querySelectorAll('#rutas-sel .chip-at').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === R.id)));
    $('#ruta-titulo').textContent = R.titulo; $('#ruta-intro').textContent = `${R.intro} (Subtema ${R.sub}.)`;
    rutaSvg.innerHTML = ''; rutaSvg.setAttribute('viewBox', `0 0 ${R.w} ${R.h}`); rutaSvg.setAttribute('aria-label', 'Mapa de la ruta: ' + R.titulo);
    el('rect', { class: 'mar', x: 0, y: 0, width: R.w, height: R.h }, rutaSvg);
    el('path', { class: 'grat', d: R.grat }, rutaSvg);
    const gt = el('g', {}, rutaSvg); R.fondo.forEach(d => el('path', { class: 'tierra-r', d }, gt));
    R.tramos.forEach((t, i) => { el('path', { class: 'tramo-guia', d: t.d, stroke: t.color }, rutaSvg); });
    R._paths = R.tramos.map(t => { const p = el('path', { class: 'tramo', d: t.d, stroke: t.color }, rutaSvg); const L = p.getTotalLength(); p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; return { p, L, hecho: 0 }; });
    const gp = el('g', {}, rutaSvg);
    R._paradas = R.paradas.map((s, i) => {
      const g = el('g', { class: 'parada' }, gp); el('circle', { cx: s.x, cy: s.y, r: 6 }, g);
      const izq = s.x > R.w * 0.78; const t = el('text', { x: s.x + (izq ? -10 : 10), y: s.y - 9, 'text-anchor': izq ? 'end' : 'start' }, g); t.textContent = s.nombre;
      g.style.cursor = 'pointer'; g.addEventListener('click', () => { detener(); irA(i); });
      return g;
    });
    R._viajero = el('text', { class: 'viajero', x: -100, y: -100 }, rutaSvg); R._viajero.textContent = VIAJERO[R.id] || '●';
    const pts = $('#ruta-puntos'); pts.innerHTML = '';
    R.paradas.forEach((s, i) => { const b = h('button', { type: 'button', 'aria-label': `Parada ${i + 1}: ${s.nombre}` }); b.addEventListener('click', () => { detener(); irA(i); }); pts.appendChild(b); });
    actual = -1;
    $('#ruta-tarjeta').innerHTML = `<p class="paso">${R.paradas.length} paradas</p><h3>Presiona «Reproducir» o toca una parada</h3><p>La línea punteada muestra el camino completo; la línea de color se dibuja paso a paso.</p>`;
    history.replaceState(null, '', '#rutas=' + R.id);
    pintarParadas();
  }
  function objetivoDe(i) { // cuánto de cada tramo debe estar dibujado al llegar a la parada i
    const s = R.paradas[i];
    return R._paths.map((t, k) => k < s.tramo ? t.L : k === s.tramo ? t.L * s.frac : (R.paradas.slice(0, i + 1).some(q => q.tramo > k) ? t.L : 0));
  }
  function irA(i, alTerminar) {
    if (!R || i < 0) return;
    const desde = R._paths.map(t => t.hecho), hasta = objetivoDe(i);
    actual = i; pintarParadas();
    const s = R.paradas[i];
    $('#ruta-tarjeta').innerHTML = `<p class="paso">Parada ${i + 1} de ${R.paradas.length}</p><h3>${esc(s.nombre)}</h3><p>${esc(s.texto)}</p>`;
    cancelAnimationFrame(rafRuta);
    const dur = reducido ? 1 : 1500, t0 = performance.now();
    const paso = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      let punta = null;
      R._paths.forEach((tr, k) => {
        tr.hecho = desde[k] + (hasta[k] - desde[k]) * e; tr.p.style.strokeDashoffset = tr.L - tr.hecho;
        if (hasta[k] !== desde[k] || (k === s.tramo)) punta = { tr, k };
      });
      if (punta) { const q = punta.tr.p.getPointAtLength(Math.max(0, Math.min(punta.tr.L, punta.tr.hecho))); R._viajero.setAttribute('x', q.x); R._viajero.setAttribute('y', q.y - 2); }
      if (p < 1) rafRuta = requestAnimationFrame(paso); else if (alTerminar) alTerminar();
    };
    rafRuta = requestAnimationFrame(paso);
  }
  function pintarParadas() {
    R._paradas.forEach((g, i) => { g.classList.toggle('vista', i < actual); g.classList.toggle('actual', i === actual); });
    document.querySelectorAll('#ruta-puntos button').forEach((b, i) => { b.className = i < actual ? 'vista' : i === actual ? 'actual' : ''; });
  }
  function reproducir() {
    reproduciendo = true; $('#ruta-play').textContent = '⏸ Pausa';
    if (actual >= R.paradas.length - 1) { R._paths.forEach(t => { t.hecho = 0; t.p.style.strokeDashoffset = t.L; }); actual = -1; }
    const sig = () => { if (!reproduciendo) return; if (actual >= R.paradas.length - 1) { detener(); return; } irA(actual + 1, () => { temporizador = setTimeout(sig, 2600); }); };
    sig();
  }
  function detener() { reproduciendo = false; clearTimeout(temporizador); const b = $('#ruta-play'); if (b) b.textContent = '▶ Reproducir'; }

  // ================= 4. LÍNEA DEL TIEMPO
  const COLOR_SUB = { '3.3': '#8C6D46', '4.1': '#3F7A4F', '4.2': '#A66F1E', '4.3': '#7A4E8C', '4.4': '#A63D2F', '4.5': '#2F6690' };
  const NOMBRE_SUB = { '4.1': '4.1 Necesidad de alimentarse', '4.2': '4.2 Roma', '4.3': '4.3 La realeza', '4.4': '4.4 El restaurante', '4.5': '4.5 Cocina profesional', '3.3': '3.3 Asia' };
  const ERAS = [[-Infinity, 'Prehistoria'], [-3000, 'Antigüedad'], [476, 'Edad Media'], [1453, 'Edad Moderna'], [1789, 'Siglo XIX y Revolución'], [1900, 'Siglo XX'], [2000, 'Siglo XXI']];
  const eraDe = a => { let n = ERAS[0][1]; ERAS.forEach(([d, x]) => { if (a >= d) n = x; }); return n; };
  function iniciarTiempo() {
    const L = A.tiempo.slice().sort((a, b) => a.a - b.a);
    const cont = $('#linea'); let era = null;
    L.forEach(ev => {
      const e = eraDe(ev.a); if (e !== era) { era = e; cont.appendChild(h('div', { class: 'era', 'data-era': e }, esc(e))); }
      const d = h('article', { class: 'evento', 'data-s': ev.s }, `<span class="st">${esc(ev.s)}</span><span class="fecha">${esc(ev.f)}</span><h4>${esc(ev.t)}</h4><p>${esc(ev.x)}</p>`);
      d.style.setProperty('--ev-color', COLOR_SUB[ev.s] || 'var(--ink-soft)');
      cont.appendChild(d);
    });
    const fil = $('#tiempo-filtros');
    const subs = ['todos', ...Object.keys(NOMBRE_SUB).filter(s => L.some(e => e.s === s)).sort()];
    subs.forEach(s => { const b = h('button', { class: 'chip-at', 'aria-pressed': String(s === 'todos'), 'data-s': s }, s === 'todos' ? 'Todos' : esc(NOMBRE_SUB[s])); b.addEventListener('click', () => filtrar(s)); fil.appendChild(b); });
    nuevoReto();
  }
  function filtrar(s) {
    document.querySelectorAll('#tiempo-filtros .chip-at').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === s)));
    document.querySelectorAll('#linea .evento').forEach(e => e.classList.toggle('oculto', s !== 'todos' && e.dataset.s !== s));
    document.querySelectorAll('#linea .era').forEach(era => {
      let n = era.nextElementSibling, alguno = false;
      while (n && !n.classList.contains('era')) { if (!n.classList.contains('oculto')) alguno = true; n = n.nextElementSibling; }
      era.style.display = alguno ? '' : 'none';
    });
  }
  let racha = 0;
  function nuevoReto() {
    const L = A.tiempo; let a, b;
    do { a = L[Math.floor(Math.random() * L.length)]; b = L[Math.floor(Math.random() * L.length)]; } while (a === b || Math.abs(a.a - b.a) < 3);
    const r = $('#reto'), mejor = Number(lee('atlas_racha') || 0);
    r.innerHTML = `<h3>Reto: ¿qué pasó primero?</h3><p>Elige el acontecimiento más antiguo. Racha actual: <strong>${racha}</strong> · tu mejor racha: <strong>${mejor}</strong></p>
      <div class="reto-ops">${[a, b].map((e, i) => `<button type="button" data-i="${i}">${esc(e.t)}<small>Subtema ${esc(e.s)}</small></button>`).join('')}</div><div class="reto-pie" id="reto-pie"></div>`;
    const ops = [...r.querySelectorAll('.reto-ops button')], par = [a, b];
    ops.forEach(btn => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i), bien = par[i].a <= par[1 - i].a;
      ops.forEach((o, k) => { o.disabled = true; o.classList.add(par[k].a <= par[1 - k].a ? 'ok' : 'mal'); o.querySelector('small').textContent = par[k].f; });
      racha = bien ? racha + 1 : 0; if (racha > mejor) guarda('atlas_racha', String(racha));
      $('#reto-pie').innerHTML = `<span>${bien ? '¡Bien! ' : 'Casi. '}${esc(par[0].t)}: ${esc(par[0].f)} · ${esc(par[1].t)}: ${esc(par[1].f)}</span><button class="btn-at" type="button" id="reto-sig">Otro reto</button>`;
      $('#reto-sig').addEventListener('click', nuevoReto);
    }));
  }
})();
