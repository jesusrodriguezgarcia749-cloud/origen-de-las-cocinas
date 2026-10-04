/* =====================================================================
   MOTOR DE DIAPOSITIVAS — Origen de las Cocinas · LudoMente Studio
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
  link("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap");

  const css = `
  :root{--marino:#252734;--marino2:#2E3140;--rojo:#AA2F2F;--beige:#F4F2ED;--arena:#DDD6C8;--tinta:#1A1A1A;--gris:#5C5A55;--blanco:#FFFFFF}
  html,body{height:100%;margin:0;background:var(--beige)}
  .reveal{font-family:"Public Sans",Calibri,Arial,sans-serif;color:var(--tinta);font-size:32px}
  .reveal .slides{text-align:left}
  .reveal .slides section{padding:0 56px;box-sizing:border-box}
  .reveal h1,.reveal h2,.reveal h3{font-family:"Fraunces",Cambria,Georgia,serif;color:var(--marino);text-transform:none;letter-spacing:-.01em;line-height:1.12;margin:0 0 .55em}
  .reveal h1{font-size:2.2em;font-weight:700}
  .reveal h2{font-size:1.45em;font-weight:600}
  .reveal h3{font-size:1.05em;font-weight:600}
  .reveal p{line-height:1.45;margin:.35em 0}
  .reveal .backgrounds .slide-background{background:var(--beige)}
  .reveal .backgrounds .slide-background::after{content:"";position:absolute;left:0;right:0;bottom:0;height:8px;background:var(--rojo)}
  /* Listas */
  .reveal ul.puntos{list-style:none;margin:0;padding:0}
  .reveal ul.puntos li{position:relative;padding-left:1.15em;margin:.5em 0;line-height:1.38}
  .reveal ul.puntos li::before{content:"";position:absolute;left:0;top:.5em;width:.42em;height:.42em;background:var(--rojo)}
  .reveal ul.puntos li b{color:var(--marino)}
  /* Dos columnas con imagen */
  .con-imagen{display:grid;grid-template-columns:1.25fr 1fr;gap:44px;align-items:center}
  .con-imagen img,.d-imagen img{width:100%;max-height:520px;object-fit:cover;margin:0;border:0;box-shadow:0 0 0 1px var(--arena)}
  .etiqueta{display:inline-block;width:fit-content;background:var(--rojo);color:#fff;font:600 .5em "Public Sans",sans-serif;padding:.3em .8em;margin-bottom:.8em}
  /* Portada del día */
  .d-portadaDia{color:#fff}
  .d-portadaDia .pd{display:grid;grid-template-columns:1.1fr 1fr;gap:56px;align-items:center}
  .d-portadaDia .pd.sola{grid-template-columns:1fr}
  .d-portadaDia .tema{font-size:.55em;color:var(--arena);margin-bottom:1.6em}
  .d-portadaDia .dia{font-size:.6em;color:#E7A3A3;font-weight:600;margin-bottom:.3em}
  .d-portadaDia h1{color:#fff;font-size:1.9em}
  .d-portadaDia .sub{color:var(--arena);font-size:.85em;margin-top:.2em}
  .d-portadaDia .duracion{display:inline-block;margin-top:1.4em;background:var(--rojo);color:#fff;font-weight:600;font-size:.55em;padding:.45em 1.3em;border-radius:999px}
  .d-portadaDia img{width:100%;height:auto;max-height:560px;object-fit:contain;margin:0;border:0;box-shadow:0 18px 40px rgba(0,0,0,.35)}
  /* Objetivos */
  .d-objetivos .banda{background:var(--rojo);color:#fff;font:600 .62em "Public Sans",sans-serif;padding:.7em 1.2em;margin:0 -56px 1.1em}
  .d-objetivos .intro{font-style:italic;color:var(--gris);margin-bottom:.8em}
  /* Dato */
  .d-dato{text-align:center}
  .d-dato .cifra{font-family:"Fraunces",serif;font-weight:700;color:var(--rojo);font-size:4.2em;line-height:1;margin:0 0 .2em}
  .d-dato .texto{font-size:1.05em;max-width:24em;margin:0 auto;color:var(--marino)}
  .d-dato .fuente{font-size:.45em;color:var(--gris);margin-top:1.2em}
  /* Tabla */
  .reveal table.tabla{width:100%;border-collapse:collapse;font-size:.66em;margin:0}
  .reveal table.tabla th{background:var(--marino);color:#fff;text-align:left;padding:.55em .8em;border:0;font-weight:600}
  .reveal table.tabla td{padding:.6em .8em;border:0;border-bottom:1px solid var(--arena);vertical-align:top;line-height:1.35}
  .reveal table.tabla tr:nth-child(even) td{background:#ECE8DF}
  .reveal table.tabla td:first-child{font-weight:600;color:var(--marino)}
  .pista-abajo{font-size:.42em;color:var(--gris);margin-top:.9em}
  /* Pausa activa */
  .d-pausa{color:#fff}
  .d-pausa h2{color:#fff;font-size:1.7em}
  .d-pausa .dur{font-size:.55em;color:#F3CFCF;margin-bottom:1em}
  .d-pausa .caja{background:rgba(255,255,255,.12);padding:.9em 1.1em;line-height:1.45}
  /* Imagen y video */
  .d-imagen figure{margin:0}
  .d-imagen figcaption,.d-video .pie{font-size:.5em;color:var(--gris);margin-top:.6em}
  .vacio{border:3px dashed var(--gris);color:var(--gris);padding:2em 1em;text-align:center;font-size:.55em;line-height:1.5}
  .marco-video{position:relative;width:100%;max-width:1000px;margin:0 auto;aspect-ratio:16/9;background:#000}
  .marco-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  /* Pregunta */
  .d-pregunta{text-align:center}
  .d-pregunta .preg{font-family:"Fraunces",serif;font-size:1.4em;font-weight:600;color:var(--marino);max-width:18em;margin:0 auto .9em;line-height:1.2}
  .d-pregunta .resp{display:inline-block;background:var(--marino);color:#fff;padding:.5em 1em;font-size:.8em;line-height:1.4;max-width:30em;text-align:left}
  .d-pregunta .pista{font-size:.45em;color:var(--gris);margin-top:1em}
  /* Cita */
  .d-cita blockquote{font-family:"Fraunces",serif;font-size:1.35em;font-weight:500;color:var(--marino);margin:0;padding:0 0 0 .8em;border-left:8px solid var(--rojo);box-shadow:none;width:auto;background:none;font-style:normal;line-height:1.3}
  .d-cita .autor{color:var(--gris);font-size:.55em;margin-top:1em;padding-left:1.5em}
  /* Mi Plato, Mi Historia */
  .d-proyecto{color:#fff}
  .d-proyecto .marca{font-size:.55em;color:var(--arena);margin-bottom:.4em}
  .d-proyecto h2{color:#fff}
  .d-proyecto .pr{display:grid;grid-template-columns:auto 1fr;gap:.2em 1em;margin:.7em 0;align-items:baseline}
  .d-proyecto .num{font:600 .55em "Public Sans",sans-serif;background:var(--rojo);padding:.35em .8em;white-space:nowrap}
  .d-proyecto .txt{font-family:"Fraunces",serif;font-size:1.05em;line-height:1.3}
  /* Cierre */
  .d-cierre .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .d-cierre .col{background:#fff;padding:.8em .9em;border-top:6px solid var(--rojo);font-size:.7em;line-height:1.45}
  .d-cierre .col h3{font-family:"Public Sans",sans-serif;font-size:.85em;color:var(--rojo);font-weight:700;margin:0 0 .5em}
  /* Botón volver y controles */
  .volver{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:12px;z-index:30;font:600 14px "Public Sans",sans-serif;color:var(--marino);background:var(--beige);border:2px solid var(--marino);padding:6px 12px;text-decoration:none}
  .volver:focus-visible{outline:3px solid var(--rojo);outline-offset:2px}
  .reveal .progress{color:var(--rojo);height:5px}
  .reveal .controls{color:var(--marino)}
  .reveal .slide-number{background:transparent;color:var(--gris);font-family:"Public Sans",sans-serif;bottom:16px}
  @media (prefers-reduced-motion:reduce){.reveal .slides section{transition:none!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- 2. Utilidades ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Permite **negritas** dentro del texto
  const txt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  function idYoutube(v) {
    if (!v) return "";
    const m = String(v).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(String(v).trim()) ? String(v).trim() : "";
  }
  const lista = (items, paso) => `<ul class="puntos">${(items || []).map(p => `<li${paso ? ' class="fragment"' : ""}>${txt(p)}</li>`).join("")}</ul>`;
  const img = (ruta, alt) => `<img data-src="${esc(ruta)}" alt="${esc(alt || "")}" data-ruta="${esc(ruta)}">`;

  /* ---------- 3. Plantillas ---------- */
  const P = (typeof PRESENTACION !== "undefined") ? PRESENTACION : { materia: "", diapositivas: [] };
  const COLOR = { portadaDia: "#252734", pausa: "#AA2F2F", proyecto: "#252734" };

  const plantillas = {
    portadaDia: d => `
      <div class="pd${d.imagen ? "" : " sola"}">
        <div>
          ${d.tema ? `<div class="tema">${esc(d.tema)}</div>` : ""}
          ${d.dia ? `<div class="dia">${esc(d.dia)}</div>` : ""}
          <h1>${esc(d.titulo)}</h1>
          ${d.subtitulo ? `<p class="sub">${esc(d.subtitulo)}</p>` : ""}
          ${d.duracion ? `<span class="duracion">${esc(d.duracion)}</span>` : ""}
        </div>
        ${d.imagen ? `<div>${img(d.imagen, d.titulo)}</div>` : ""}
      </div>`,

    objetivos: d => `
      <div class="banda">${esc(d.titulo || "Hoy vas a aprender y hacer esto")}</div>
      ${d.intro ? `<p class="intro">${txt(d.intro)}</p>` : ""}
      ${lista(d.puntos, d.pasoAPaso)}`,

    tema: d => {
      const cuerpo = `${d.etiqueta ? `<span class="etiqueta">${esc(d.etiqueta)}</span>` : ""}
        <h2>${esc(d.titulo)}</h2>${lista(d.puntos, d.pasoAPaso)}`;
      return d.imagen ? `<div class="con-imagen"><div>${cuerpo}</div><div>${img(d.imagen, d.titulo)}</div></div>` : cuerpo;
    },

    tarea: d => plantillas.tema(Object.assign({ etiqueta: "Tarea" }, d)),

    dato: d => `
      ${d.titulo ? `<h3>${esc(d.titulo)}</h3>` : ""}
      <p class="cifra">${esc(d.cifra)}</p>
      <p class="texto">${txt(d.texto)}</p>
      ${d.fuente ? `<p class="fuente">${esc(d.fuente)}</p>` : ""}`,

    tabla: d => `
      <h2>${esc(d.titulo)}</h2>
      <table class="tabla">
        <thead><tr>${(d.columnas || []).map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${(d.filas || []).map(f => `<tr${d.pasoAPaso ? ' class="fragment"' : ""}>${f.map(c => `<td>${txt(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      ${d.subtemas && d.subtemas.length ? `<p class="pista-abajo">Baja con la flecha ↓ para ver cada región a detalle.</p>` : ""}`,

    pausa: d => `
      <h2>${esc(d.titulo || "¡Pausa activa!")}</h2>
      ${d.duracion ? `<div class="dur">${esc(d.duracion)}</div>` : ""}
      <div class="caja">${txt(d.texto)}</div>`,

    imagen: d => `
      <h2>${esc(d.titulo)}</h2>
      <figure>${img(d.imagen, d.pie || d.titulo)}${d.pie ? `<figcaption>${esc(d.pie)}</figcaption>` : ""}</figure>`,

    video: d => {
      const id = idYoutube(d.youtube);
      const sub = d.subtitulos ? `&cc_load_policy=1&cc_lang_pref=${encodeURIComponent(d.subtitulos)}&hl=${encodeURIComponent(d.subtitulos)}` : "";
      return `
      <h2>${esc(d.titulo)}</h2>
      ${id
        ? `<div class="marco-video"><iframe data-src="https://www.youtube-nocookie.com/embed/${id}?rel=0${sub}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${esc(d.titulo)}"></iframe></div>`
        : `<div class="vacio">Aquí va el video. Copia el enlace del video de YouTube y pégalo en el campo youtube.</div>`}
      ${d.pie ? `<p class="pie">${esc(d.pie)}</p>` : ""}`;
    },

    pregunta: d => `
      <p class="preg">${esc(d.pregunta)}</p>
      <p class="fragment"><span class="resp">${txt(d.respuesta)}</span></p>
      <p class="pista">Piénsalo antes de avanzar.</p>`,

    cita: d => `
      <blockquote>“${esc(d.texto)}”</blockquote>
      ${d.autor ? `<p class="autor">— ${esc(d.autor)}</p>` : ""}`,

    proyecto: d => `
      <div class="marca">Proyecto del curso</div>
      <h2>${esc(d.titulo || "Mi Plato, Mi Historia")}</h2>
      ${(d.preguntas || []).map(p => `<div class="pr"><span class="num">Pregunta ${esc(p.numero)}</span><span class="txt">${esc(p.texto)}</span></div>`).join("")}`,

    cierre: d => `
      <h2>${esc(d.titulo || "Cierre de la sesión")}</h2>
      <div class="cols">
        <div class="col"><h3>Evidencia de logro</h3>${txt(d.evidencia || "—")}</div>
        <div class="col"><h3>Materiales</h3>${txt(d.materiales || "—")}</div>
        <div class="col"><h3>Para la próxima clase</h3>${txt(d.proxima || "—")}</div>
      </div>`,

    portada: d => `
      <h1>${esc(d.titulo)}</h1>
      ${d.subtitulo ? `<p>${esc(d.subtitulo)}</p>` : ""}`
  };

  function crear(d) {
    const sec = document.createElement("section");
    const fn = plantillas[d.tipo];
    sec.className = "d-" + (fn ? d.tipo : "tema");
    sec.innerHTML = fn ? fn(d) : `<div class="vacio">Tipo de diapositiva desconocido: “${esc(d.tipo)}”.</div>`;
    if (COLOR[d.tipo]) sec.setAttribute("data-background-color", COLOR[d.tipo]);
    const nota = [d.minutos ? "Minutos " + d.minutos : "", d.evaluacion || "", d.notas || ""].filter(Boolean).join(" · ");
    if (nota) {
      const n = document.createElement("aside");
      n.className = "notes"; n.textContent = nota;
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

    cont.querySelectorAll("img[data-ruta]").forEach(im => {
      im.addEventListener("error", () => {
        const v = document.createElement("div");
        v.className = "vacio";
        v.textContent = "Falta la imagen: " + im.dataset.ruta + ". Súbela a la carpeta diapositivas/img/.";
        im.replaceWith(v);
      });
    });

    const t = (P.diapositivas || [])[0];
    if (t) document.title = t.titulo + " · " + (P.materia || "Diapositivas");
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
          width: 1280, height: 720, margin: 0.04, preloadIframes: false,
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
