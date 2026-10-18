// lector.js — lectura en voz alta de los subtemas del compendio.
// Usa la voz del propio dispositivo (Web Speech API): no necesita internet
// extra ni archivos de audio. Lee bloque por bloque (títulos, párrafos,
// listas, recuadros y tablas), resalta lo que va leyendo, recuerda dónde te
// quedaste y puede continuar sola con el siguiente subtema.
(function () {
  if (!('speechSynthesis' in window) || !document.getElementById('tema-root')) return;

  const synth = window.speechSynthesis;
  const CLAVE = 'lector_' + location.pathname.split('/').filter(Boolean)[0];
  const leerPref = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; } };
  const guardarPref = (cambios) => { try { localStorage.setItem(CLAVE, JSON.stringify(Object.assign(leerPref(), cambios))); } catch { /* sin almacenamiento */ } };

  const estado = { bloques: [], i: 0, leyendo: false, voz: null, sesion: 0, wake: null };

  // ---------------------------------------------------------------- estilos
  const css = document.createElement('style');
  css.textContent = `
  .lector-abrir{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;align-items:center;gap:8px;
    background:var(--charcoal);color:#fff;border:0;border-radius:999px;padding:11px 18px;font:600 .92rem var(--font-body,sans-serif);cursor:pointer;box-shadow:0 8px 24px -8px rgba(0,0,0,.45)}
  .lector-abrir:hover{filter:brightness(1.15)}
  .lector-barra{position:fixed;left:0;right:0;bottom:0;z-index:61;background:var(--charcoal);color:#fff;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));
    box-shadow:0 -8px 24px -10px rgba(0,0,0,.5);font-family:var(--font-body,sans-serif)}
  .lector-barra[hidden]{display:none}
  .lector-fila{max-width:820px;margin:0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .lector-btn{width:46px;height:46px;border-radius:50%;border:0;background:var(--saffron);color:#111;font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .lector-btn.sec{width:40px;height:40px;background:rgba(255,255,255,.12);color:#fff;font-size:1rem}
  .lector-btn:focus-visible,.lector-barra select:focus-visible{outline:3px solid #fff;outline-offset:2px}
  .lector-info{flex:1;min-width:140px;font-size:.82rem;line-height:1.3;opacity:.9}
  .lector-info b{display:block;font-size:.9rem;opacity:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lector-progreso{height:4px;background:rgba(255,255,255,.15);border-radius:4px;margin-top:6px;overflow:hidden}
  .lector-progreso span{display:block;height:100%;width:0;background:var(--saffron);transition:width .3s}
  .lector-opciones{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:.8rem}
  .lector-barra select{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:6px 8px;font-size:.8rem;max-width:180px}
  .lector-barra select option{color:#111}
  .lector-barra label{display:flex;align-items:center;gap:5px;cursor:pointer}
  .lector-actual{background:rgba(201,160,74,.22)!important;border-radius:6px;box-shadow:0 0 0 6px rgba(201,160,74,.22);transition:background .3s}
  body.lector-on .tema-card [data-lector]{cursor:pointer}
  body.lector-on .music-toggle,body.lector-on .to-top{bottom:calc(178px + env(safe-area-inset-bottom,0px))!important}
  body.lector-on .tema-main{padding-bottom:190px}
  @media (max-width:560px){.lector-opciones{width:100%}.lector-barra select{max-width:none;flex:1}}`;
  document.head.appendChild(css);

  // --------------------------------------------------------------- interfaz
  const abrir = document.createElement('button');
  abrir.type = 'button';
  abrir.className = 'lector-abrir';
  abrir.innerHTML = '🎧 <span>Escuchar</span>';
  abrir.setAttribute('aria-label', 'Escuchar este subtema en voz alta');

  const barra = document.createElement('div');
  barra.className = 'lector-barra';
  barra.hidden = true;
  barra.setAttribute('role', 'region');
  barra.setAttribute('aria-label', 'Lectura en voz alta');
  barra.innerHTML = `
    <div class="lector-fila">
      <button type="button" class="lector-btn sec" data-acc="atras" aria-label="Párrafo anterior">⏮</button>
      <button type="button" class="lector-btn" data-acc="play" aria-label="Reproducir">▶</button>
      <button type="button" class="lector-btn sec" data-acc="adelante" aria-label="Párrafo siguiente">⏭</button>
      <div class="lector-info"><b class="lector-titulo">Listo para leer</b><span class="lector-pista">Toca un párrafo para leer desde ahí.</span>
        <div class="lector-progreso"><span></span></div></div>
      <button type="button" class="lector-btn sec" data-acc="cerrar" aria-label="Cerrar lector">✕</button>
    </div>
    <div class="lector-fila lector-opciones" style="margin-top:8px">
      <select data-opt="vel" aria-label="Velocidad">
        <option value="0.75">0.75×</option><option value="0.9">0.9×</option><option value="1" selected>1×</option>
        <option value="1.15">1.15×</option><option value="1.3">1.3×</option><option value="1.5">1.5×</option>
      </select>
      <select data-opt="voz" aria-label="Voz"></select>
      <label><input type="checkbox" data-opt="seguir"> Seguir con el siguiente subtema</label>
    </div>`;
  document.body.append(abrir, barra);

  const $ = (sel) => barra.querySelector(sel);
  const btnPlay = $('[data-acc="play"]');
  const selVel = $('[data-opt="vel"]');
  const selVoz = $('[data-opt="voz"]');
  const chkSeguir = $('[data-opt="seguir"]');
  const pref = leerPref();
  if (pref.vel) selVel.value = String(pref.vel);
  chkSeguir.checked = !!pref.seguir;

  // ------------------------------------------------------------------ voces
  function cargarVoces() {
    const voces = synth.getVoices().filter(v => /^es([-_]|$)/i.test(v.lang));
    if (!voces.length) {
      selVoz.innerHTML = '<option value="">Voz del sistema</option>';
      return;
    }
    const rango = (v) => (/MX/i.test(v.lang) ? 0 : /US|419/i.test(v.lang) ? 1 : 2) + (v.localService ? 0 : 0.5);
    voces.sort((a, b) => rango(a) - rango(b));
    selVoz.innerHTML = voces.map(v => `<option value="${v.name}">${v.name.replace(/Microsoft |Google /, '')} (${v.lang})</option>`).join('');
    const guardada = voces.find(v => v.name === leerPref().voz);
    estado.voz = guardada || voces[0];
    selVoz.value = estado.voz.name;
  }
  cargarVoces();
  if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = cargarVoces;

  // ------------------------------------------------------- texto a leer
  const limpiar = (t) => t
    .replace(/\((?:[^()]*?\d{4}[^()]*?)\)/g, (m) => m.replace(/\/\d{4}/g, ''))
    .replace(/\bca\.\s/g, 'cerca de ')
    .replace(/(^|\s)s\.\s?(?=[XVI]+\b)(X{0,3}(?:IX|IV|V?I{0,3}))\b/g, '$1siglo $2')
    .replace(/\bet al\./g, 'y colaboradores')
    .replace(/\bpp?\.\s?(\d)/g, 'página $1')
    .replace(/[→⟶]/g, ', ')
    .replace(/[«»“”"]/g, '')
    .replace(/\s·\s/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  function trozos(texto) {
    const frases = texto.split(/(?<=[.!?;:])\s+/);
    const out = [];
    let actual = '';
    frases.forEach(f => {
      if ((actual + ' ' + f).length > 220 && actual) { out.push(actual); actual = f; }
      else actual = actual ? actual + ' ' + f : f;
    });
    if (actual) out.push(actual);
    return out;
  }

  function prepararBloques() {
    const card = document.querySelector('#tema-root .tema-card');
    estado.bloques = [];
    if (!card) return;
    const elementos = card.querySelectorAll('h1, h3, p:not(.tema-block-label):not(.tema-buscar-nota), li, blockquote, .tema-recuadro-tag, .tema-callout-tag, tr');
    elementos.forEach(el => {
      if (el.closest('li') && el.tagName !== 'LI') return; // evita leer dos veces
      let texto;
      if (el.tagName === 'TR') {
        texto = [...el.children].map(c => c.textContent.trim()).filter(Boolean).join('. ');
      } else if (el.tagName === 'H1') {
        const id = card.querySelector('.tema-id');
        texto = (id ? id.textContent.trim() + '. ' : '') + el.textContent;
      } else if (el.matches('.tema-recuadro-tag, .tema-callout-tag')) {
        texto = el.textContent.toLowerCase().replace(/^./, c => c.toUpperCase()) + '.';
      } else {
        texto = el.textContent;
      }
      texto = limpiar(texto);
      if (!texto) return;
      if (!/[.!?:;]$/.test(texto)) texto += '.';
      el.dataset.lector = String(estado.bloques.length);
      estado.bloques.push({ el, texto });
    });
    const titulo = card.querySelector('h1');
    $('.lector-titulo').textContent = titulo ? (card.querySelector('.tema-id')?.textContent.trim() + ' ' + titulo.textContent) : 'Subtema';
    actualizarProgreso();
  }

  // ------------------------------------------------------------- lectura
  function marcar(i) {
    document.querySelectorAll('.lector-actual').forEach(e => e.classList.remove('lector-actual'));
    const b = estado.bloques[i];
    if (!b) return;
    b.el.classList.add('lector-actual');
    const r = b.el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 170) b.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function actualizarProgreso() {
    const total = estado.bloques.length || 1;
    $('.lector-progreso span').style.width = Math.round((estado.i / total) * 100) + '%';
  }

  function leerBloque() {
    const sesion = ++estado.sesion;
    synth.cancel();
    const b = estado.bloques[estado.i];
    if (!b) { terminar(); return; }
    marcar(estado.i);
    actualizarProgreso();
    guardarPref({ pos: { url: location.search, i: estado.i } });
    const partes = trozos(b.texto);
    partes.forEach((parte, k) => {
      const u = new SpeechSynthesisUtterance(parte);
      u.lang = estado.voz ? estado.voz.lang : 'es-MX';
      if (estado.voz) u.voice = estado.voz;
      u.rate = parseFloat(selVel.value) || 1;
      if (k === partes.length - 1) {
        u.onend = () => {
          if (sesion !== estado.sesion || !estado.leyendo) return;
          estado.i++;
          leerBloque();
        };
      }
      u.onerror = (e) => {
        if (sesion !== estado.sesion || e.error === 'interrupted' || e.error === 'canceled') return;
        detener();
        $('.lector-pista').textContent = 'No se pudo usar la voz de este dispositivo. Intenta con otro navegador.';
      };
      synth.speak(u);
    });
  }

  async function pedirPantalla() {
    try { if ('wakeLock' in navigator && !estado.wake) estado.wake = await navigator.wakeLock.request('screen'); } catch { /* no disponible */ }
  }
  function soltarPantalla() {
    try { if (estado.wake) estado.wake.release(); } catch { /* nada */ }
    estado.wake = null;
  }

  function reproducir(desde) {
    if (!estado.bloques.length) prepararBloques();
    if (typeof desde === 'number') estado.i = desde;
    if (estado.i >= estado.bloques.length) estado.i = 0;
    estado.leyendo = true;
    btnPlay.textContent = '⏸';
    btnPlay.setAttribute('aria-label', 'Pausar');
    $('.lector-pista').textContent = 'Leyendo… Toca un párrafo para saltar a él.';
    pedirPantalla();
    leerBloque();
  }

  function detener() {
    estado.leyendo = false;
    estado.sesion++;
    synth.cancel();
    btnPlay.textContent = '▶';
    btnPlay.setAttribute('aria-label', 'Reproducir');
    soltarPantalla();
  }

  function terminar() {
    const sig = document.querySelector('#tema-pager a.next');
    if (chkSeguir.checked && sig && typeof window.irASubtema === 'function') {
      const id = new URL(sig.href).searchParams.get('id');
      estado.continuar = true;
      window.irASubtema(id);
      return;
    }
    detener();
    document.querySelectorAll('.lector-actual').forEach(e => e.classList.remove('lector-actual'));
    estado.i = 0;
    actualizarProgreso();
    $('.lector-pista').textContent = sig ? 'Terminó el subtema. Activa «Seguir con el siguiente» para continuar sola.' : 'Terminaste el compendio. ¡Felicidades!';
  }

  // ------------------------------------------------------------- eventos
  abrir.addEventListener('click', () => {
    barra.hidden = false;
    abrir.hidden = true;
    document.body.classList.add('lector-on');
    prepararBloques();
    const p = leerPref().pos;
    const desde = p && p.url === location.search && p.i > 0 && p.i < estado.bloques.length ? p.i : 0;
    if (desde) $('.lector-pista').textContent = 'Retomo donde te quedaste.';
    reproducir(desde);
  });

  barra.addEventListener('click', (e) => {
    const acc = e.target.closest('[data-acc]')?.dataset.acc;
    if (!acc) return;
    if (acc === 'play') estado.leyendo ? detener() : reproducir();
    if (acc === 'adelante') reproducir(Math.min(estado.i + 1, estado.bloques.length - 1));
    if (acc === 'atras') reproducir(Math.max(estado.i - 1, 0));
    if (acc === 'cerrar') {
      detener();
      barra.hidden = true;
      abrir.hidden = false;
      document.body.classList.remove('lector-on');
      document.querySelectorAll('.lector-actual').forEach(el => el.classList.remove('lector-actual'));
    }
  });

  selVel.addEventListener('change', () => { guardarPref({ vel: selVel.value }); if (estado.leyendo) reproducir(); });
  selVoz.addEventListener('change', () => {
    estado.voz = synth.getVoices().find(v => v.name === selVoz.value) || estado.voz;
    guardarPref({ voz: selVoz.value });
    if (estado.leyendo) reproducir();
  });
  chkSeguir.addEventListener('change', () => guardarPref({ seguir: chkSeguir.checked }));

  // Tocar un párrafo mientras el lector está abierto: leer desde ahí.
  document.getElementById('tema-root').addEventListener('click', (e) => {
    if (barra.hidden || e.target.closest('a')) return;
    const el = e.target.closest('[data-lector]');
    if (el) reproducir(Number(el.dataset.lector));
  });

  // Cuando tema.js pinta otro subtema (al continuar o al navegar).
  document.addEventListener('tema:renderizado', () => {
    estado.bloques = [];
    if (barra.hidden) return;
    prepararBloques();
    if (estado.continuar) { estado.continuar = false; reproducir(0); }
    else { detener(); estado.i = 0; actualizarProgreso(); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado.leyendo) pedirPantalla();
  });
  window.addEventListener('pagehide', () => synth.cancel());
})();
