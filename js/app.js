// Bases Culinarias — app.js
// Cubre la interacción de UI compartida entre páginas: menú móvil, buscador,
// y el botón de música de fondo (donde exista el markup correspondiente).

document.addEventListener('DOMContentLoaded', () => {
  // Menú móvil
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = !nav.classList.contains('open');
      nav.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      nav.style.display = isOpen ? 'flex' : '';
    });
  }

  // Buscador (por ahora redirige al compendio con el término como query param;
  // en la siguiente fase esto filtrará contra el índice de subtemas real)
  const searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('search-input').value.trim();
      if (q) {
        window.location.href = `compendio.html?buscar=${encodeURIComponent(q)}`;
      }
    });
  }

  // Música de fondo — apagada por defecto (los navegadores bloquean el
  // autoplay con sonido de todos modos); recuerda la preferencia del usuario
  // entre páginas mientras dure la sesión del navegador.
  const musica = document.getElementById('bg-music');
  const musicaBtn = document.getElementById('bg-music-toggle');
  if (musica && musicaBtn) {
    const PREF_KEY = 'bc_musica_activa';
    musica.volume = 0.35;

    const activar = () => {
      musica.play().catch(() => { /* el navegador puede bloquear hasta que haya interacción */ });
      musicaBtn.setAttribute('aria-pressed', 'true');
      musicaBtn.textContent = '🔊';
      sessionStorage.setItem(PREF_KEY, '1');
    };
    const desactivar = () => {
      musica.pause();
      musicaBtn.setAttribute('aria-pressed', 'false');
      musicaBtn.textContent = '🎵';
      sessionStorage.setItem(PREF_KEY, '0');
    };

    musicaBtn.addEventListener('click', () => {
      if (musica.paused) activar(); else desactivar();
    });

    // Si el usuario ya la había activado en esta misma sesión de navegación,
    // la retoma automáticamente al cambiar de página.
    if (sessionStorage.getItem(PREF_KEY) === '1') activar();
  }
});

// ---------------------------------------------------------------------------
// Modo claro / oscuro: botón 🌙/☀️ del encabezado. La preferencia se guarda en
// el navegador; si no hay preferencia, se respeta la del sistema.
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const raiz = document.documentElement;
  const btn = document.querySelector('.theme-toggle');
  const pintar = () => {
    const oscuro = raiz.getAttribute('data-theme') === 'dark';
    if (btn) {
      btn.textContent = oscuro ? '☀️' : '🌙';
      btn.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
  };
  pintar();
  btn?.addEventListener('click', () => {
    const oscuro = raiz.getAttribute('data-theme') === 'dark';
    if (oscuro) raiz.removeAttribute('data-theme'); else raiz.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('aula_tema', oscuro ? 'light' : 'dark'); } catch { /* sin almacenamiento */ }
    pintar();
  });

  // Botón "volver arriba": aparece al bajar en páginas largas.
  const arriba = document.createElement('button');
  arriba.className = 'to-top';
  arriba.type = 'button';
  arriba.setAttribute('aria-label', 'Volver arriba');
  arriba.textContent = '↑';
  document.body.appendChild(arriba);
  arriba.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const revisar = () => arriba.classList.toggle('visible', window.scrollY > 700);
  window.addEventListener('scroll', revisar, { passive: true });
  revisar();
});

// ---------------------------------------------------------------------------
// App instalable (PWA): el service worker guarda una copia de las páginas para
// poder leer el compendio sin internet. Siempre intenta primero la versión en
// línea, así que los cambios publicados se ven de inmediato.
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    const base = location.pathname.replace(/[^/]*$/, '').replace(/diapositivas\/$/, '');
    navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(() => { /* sin soporte */ });
  });
}
