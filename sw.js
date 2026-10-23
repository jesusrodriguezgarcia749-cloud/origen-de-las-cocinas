// sw.js — permite instalar el Aula Virtual como app y leerla sin conexión.
// Estrategia "primero la red": siempre se pide la versión en línea; solo si
// no hay internet se usa la copia guardada. Firebase y Google nunca se cachean.
const CACHE = 'aula-v20';
const BASICOS = ['./', 'index.html', 'compendio.html', 'tema.html', 'calendario.html', 'proyecto.html', 'rubricas.html',
  'biblioteca.html', 'actividades.html', 'atlas.html', 'css/atlas.css', 'js/atlas.js', 'js/mi-atlas.js', 'js/docx-ites.js', 'tareas.html', 'css/tareas.css', 'js/tareas.js', 'js/clase-datos.js', 'js/equipos.js', 'unir.html', 'js/vendor/qrcode.js', 'data/atlas.json', 'css/styles.css', 'css/index.css', 'css/extra.css', 'css/compendio.css',
  'css/tema.css', 'js/app.js', 'js/curso.js', 'js/compendio.js', 'js/tema.js', 'js/lector.js', 'data/curso.json', 'assets/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
