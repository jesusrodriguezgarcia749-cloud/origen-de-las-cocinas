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
    if (!listo[nombre]) { listo[nombre] = true; ({ mapa: iniciarMapa, juego: iniciarJuego, rutas: iniciarRutas, tiempo: iniciarTiempo })[nombre](extra); }
    else if (extra) ({ mapa: (x) => zoomA(x, true), rutas: (x) => elegirRuta(x), juego() {}, tiempo() {} })[nombre](extra);
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
      e.dataset.n = p.n;
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
      c.style.fill = A.regiones[i.r].color; c.dataset.r = i.r; c.dataset.n = i.n;
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
    mapaSvg.addEventListener('click', ev => { const r = ev.target.dataset && ev.target.dataset.r; if (r) elegirRegion(r); });

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
  function elegirRegion(k) {
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
      <a class="ficha-link" href="tema.html?id=${r.sub}">Leer el subtema ${r.sub} en el compendio →</a>`;
    history.replaceState(null, '', '#mapa=' + k);
  }
  let anim = null;
  function zoomA(k, animar) {
    if (!mapaSvg) return;
    document.querySelectorAll('#mapa-zoom .chip-at').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    if (k === 'mundo') { mapaSvg.classList.remove('hay-activa'); mapaSvg.querySelectorAll('.activa').forEach(p => p.classList.remove('activa')); fichaVacia(); }
    let dest = k === 'mundo' || !A.mundo.cajas[k] ? [0, 0, A.mundo.w, A.mundo.h] : A.mundo.cajas[k].slice();
    // conservar la proporción del mapa y dejar margen
    const rc = mapaSvg.getBoundingClientRect(); const ar = rc.width && rc.height ? rc.width / rc.height : A.mundo.w / A.mundo.h; let [x, y, w, hh] = dest; const m = k === 'mundo' ? 0 : 0.08;
    x -= w * m; y -= hh * m; w *= 1 + 2 * m; hh *= 1 + 2 * m;
    if (w / hh > ar) { const n = w / ar; y -= (n - hh) / 2; hh = n; } else { const n = hh * ar; x -= (n - w) / 2; w = n; }
    dest = [x, y, w, hh];
    cancelAnimationFrame(anim);
    if (!animar || reducido) { vb = dest; mapaSvg.setAttribute('viewBox', vb.join(' ')); return; }
    const ini = vb.slice(), t0 = performance.now(), dur = 650;
    const paso = t => { const p = Math.min(1, (t - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; vb = ini.map((v, i) => v + (dest[i] - v) * e); mapaSvg.setAttribute('viewBox', vb.join(' ')); if (p < 1) anim = requestAnimationFrame(paso); };
    anim = requestAnimationFrame(paso);
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
