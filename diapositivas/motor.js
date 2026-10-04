/* =====================================================================
   MOTOR DE DIAPOSITIVAS — Origen de las Cocinas
   Este archivo NO se edita. Lo usan todas las presentaciones.
   ===================================================================== */
(function () {
  const REVEAL = "https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/";

  /* ---------- 1. Estilos ---------- */
  function link(href) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href;
    document.head.appendChild(l);
  }
  link(REVEAL + "dist/reveal.css");
  link("https://fonts.googleapis.com/css2?family=Alegreya:wght@500;700;800&family=Alegreya+Sans:wght@400;500;700&display=swap");

  const css = `
  :root{--maiz-azul:#1F2F4D;--chile:#B3261E;--maiz:#E9B44C;--nopal:#5E7A34;--masa:#FFFDF7;--piedra:#5B5B66}
  html,body{height:100%;margin:0;background:var(--masa)}
  .reveal{font-family:"Alegreya Sans",Georgia,serif;color:var(--maiz-azul);font-size:38px}
  .reveal .slides{text-align:left}
  .reveal .slides section{padding:0 1.2em;box-sizing:border-box}
  .reveal h1,.reveal h2,.reveal h3{font-family:"Alegreya",Georgia,serif;color:var(--maiz-azul);margin:0 0 .6em;line-height:1.1;letter-spacing:-.01em}
  .reveal h1{font-size:2.6em;font-weight:800}
  .reveal h2{font-size:1.7em;font-weight:700}
  .reveal p{line-height:1.45;margin:.4em 0}
  .reveal .backgrounds .slide-background{background:repeating-linear-gradient(135deg,var(--chile) 0 14px,var(--maiz) 14px 28px,var(--nopal) 28px 42px,var(--maiz-azul) 42px 56px) bottom/100% 14px no-repeat,var(--masa)}
  .d-portada h1{max-width:13em}
  .d-portada .sub{font-size:.9em;color:var(--piedra);border-left:6px solid var(--chile);padding-left:.6em}
  .d-portada .materia{font-family:"Alegreya",serif;font-size:.7em;color:var(--nopal);margin-bottom:1.2em}
  .reveal ul.puntos{list-style:none;margin:0;padding:0}
  .reveal ul.puntos li{position:relative;padding-left:1.3em;margin:.55em 0;line-height:1.35}
  .reveal ul.puntos li::before{content:"";position:absolute;left:0;top:.42em;width:.55em;height:.55em;background:var(--maiz);border:3px solid var(--maiz-azul);border-radius:50%;box-sizing:border-box}
  .d-imagen figure{margin:0;text-align:center}
  .d-imagen img{max-height:55vh;max-width:100%;border:6px solid #fff;box-shadow:0 0 0 2px var(--maiz-azul);margin:0}
  .d-imagen figcaption,.d-video .pie{font-size:.65em;color:var(--piedra);margin-top:.6em;text-align:center}
  .vacio{border:3px dashed var(--piedra);color:var(--piedra);padding:2em 1em;text-align:center;font-size:.6em;line-height:1.5}
  .marco-video{position:relative;width:100%;max-width:960px;margin:0 auto;aspect-ratio:16/9;background:#000}
  .marco-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .d-pregunta{text-align:center}
  .d-pregunta .preg{font-family:"Alegreya",serif;font-size:1.5em;font-weight:700;max-width:16em;margin:0 auto .8em}
  .d-pregunta .resp{display:inline-block;background:var(--maiz-azul);color:var(--masa);padding:.35em .9em;font-weight:700;font-size:1.1em}
  .d-pregunta .pista{font-size:.5em;color:var(--piedra)}
  .d-cita blockquote{font-family:"Alegreya",serif;font-size:2em;font-weight:800;color:var(--chile);margin:0;box-shadow:none;width:auto;background:none;padding:0;font-style:normal}
  .d-cita .autor{color:var(--piedra);font-size:.7em;margin-top:.8em}
  .d-cierre h2{color:var(--chile)}
  .volver{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:12px;z-index:30;font:500 15px "Alegreya Sans",sans-serif;color:var(--maiz-azul);background:var(--masa);border:2px solid var(--maiz-azul);padding:6px 12px;text-decoration:none}
  .volver:focus-visible{outline:3px solid var(--chile);outline-offset:2px}
  .reveal .progress{color:var(--chile);height:5px}
  .reveal .controls{color:var(--maiz-azul)}
  .reveal .slide-number{background:transparent;color:var(--piedra);font-family:"Alegreya Sans",sans-serif;bottom:22px}
  @media (prefers-reduced-motion:reduce){.reveal .slides section{transition:none!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- 2. Utilidades ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Acepta el enlace completo de YouTube o solo el ID
  function idYoutube(v) {
    if (!v) return "";
    const m = String(v).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(String(v).trim()) ? String(v).trim() : "";
  }

  /* ---------- 3. Plantillas ---------- */
  const P = (typeof PRESENTACION !== "undefined") ? PRESENTACION : { materia: "", diapositivas: [] };
  const plantillas = {
    portada: d => `
      <div class="materia">${esc(P.materia)}</div>
      <h1>${esc(d.titulo)}</h1>
      ${d.subtitulo ? `<p class="sub">${esc(d.subtitulo)}</p>` : ""}`,
    tema: d => `
      <h2>${esc(d.titulo)}</h2>
      <ul class="puntos">${(d.puntos || []).map(p => `<li${d.pasoAPaso ? ' class="fragment"' : ""}>${esc(p)}</li>`).join("")}</ul>`,
    imagen: d => `
      <h2>${esc(d.titulo)}</h2>
      <figure>
        <img data-src="${esc(d.imagen)}" alt="${esc(d.pie || d.titulo)}" data-ruta="${esc(d.imagen)}">
        ${d.pie ? `<figcaption>${esc(d.pie)}</figcaption>` : ""}
      </figure>`,
    video: d => {
      const id = idYoutube(d.youtube);
      return `
      <h2>${esc(d.titulo)}</h2>
      ${id
        ? `<div class="marco-video"><iframe data-src="https://www.youtube-nocookie.com/embed/${id}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${esc(d.titulo)}"></iframe></div>`
        : `<div class="vacio">Aquí va el video. Copia el enlace del video de YouTube y pégalo en el campo youtube.</div>`}
      ${d.pie ? `<p class="pie">${esc(d.pie)}</p>` : ""}`;
    },
    pregunta: d => `
      <p class="preg">${esc(d.pregunta)}</p>
      <p class="fragment"><span class="resp">${esc(d.respuesta)}</span></p>
      <p class="pista">Avanza para ver la respuesta.</p>`,
    cita: d => `
      <blockquote>“${esc(d.texto)}”</blockquote>
      ${d.autor ? `<p class="autor">${esc(d.autor)}</p>` : ""}`,
    cierre: d => `
      <h2>${esc(d.titulo)}</h2>
      ${d.texto ? `<p>${esc(d.texto)}</p>` : ""}`
  };

  function crear(d) {
    const sec = document.createElement("section");
    const fn = plantillas[d.tipo];
    sec.className = "d-" + (fn ? d.tipo : "tema");
    sec.innerHTML = fn ? fn(d) : `<div class="vacio">Tipo de diapositiva desconocido: “${esc(d.tipo)}”. Usa portada, tema, imagen, video, pregunta, cita o cierre.</div>`;
    if (d.notas) {
      const n = document.createElement("aside");
      n.className = "notes"; n.textContent = d.notas;
      sec.appendChild(n);
    }
    return sec;
  }

  /* ---------- 4. Construcción ---------- */
  function construir() {
    const volver = document.createElement("a");
    volver.className = "volver";
    volver.href = P.enlaceVolver || "index.html";
    volver.textContent = P.textoVolver || "Todas las diapositivas";
    document.body.appendChild(volver);

    const reveal = document.createElement("div");
    reveal.className = "reveal";
    const cont = document.createElement("div");
    cont.className = "slides";
    reveal.appendChild(cont);
    document.body.appendChild(reveal);

    (P.diapositivas || []).forEach(d => {
      if (d.subtemas && d.subtemas.length) {
        const pila = document.createElement("section");
        pila.appendChild(crear(d));
        d.subtemas.forEach(s => pila.appendChild(crear(s)));
        cont.appendChild(pila);
      } else cont.appendChild(crear(d));
    });

    // Si una imagen no existe, se muestra un aviso en su lugar
    cont.querySelectorAll("img[data-ruta]").forEach(img => {
      img.addEventListener("error", () => {
        const v = document.createElement("div");
        v.className = "vacio";
        v.textContent = "Aquí va la imagen: " + img.dataset.ruta + ". Súbela a la carpeta diapositivas/img/ de tu repositorio.";
        img.replaceWith(v);
      });
    });

    if (P.diapositivas && P.diapositivas[0]) document.title = P.diapositivas[0].titulo + " · " + (P.materia || "Diapositivas");
  }

  function script(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = mal;
      document.head.appendChild(s);
    });
  }

  function iniciar() {
    construir();
    script(REVEAL + "dist/reveal.js")
      .then(() => script(REVEAL + "plugin/notes/notes.js").catch(() => {}))
      .then(() => {
        Reveal.initialize({
          hash: true, slideNumber: "c/t", transition: "slide", center: true,
          width: 1280, height: 720, preloadIframes: false,
          plugins: window.RevealNotes ? [RevealNotes] : []
        });
      })
      .catch(() => {
        const v = document.createElement("div");
        v.className = "vacio";
        v.style.cssText = "position:fixed;inset:auto 12px 12px 12px;background:#fff;z-index:40;font-size:15px";
        v.textContent = "No se pudieron cargar las diapositivas. Revisa tu conexión a internet y vuelve a abrir la página.";
        document.body.appendChild(v);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
