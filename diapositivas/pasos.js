/* =====================================================================
   PASOS — diapositivas que se arman con cada «siguiente» · LudoMente Studio
   Lo carga motor.js. Es el mismo archivo en Origen de las Cocinas y en
   Epistemología y Pedagogía (los colores salen de las variables del motor).

   Tipos de diapositiva:
     diagramaPasos  figura (SVG) que se va encendiendo por partes, con una tarjeta por paso
     mapaRuta       mapa en el que se dibujan rutas y aparecen lugares, paso a paso
     lineaTiempo    línea del tiempo que avanza evento por evento
     lupa           una foto en la que la cámara se acerca a cada detalle
     tablaPasos     tabla que se llena celda por celda (o fila por fila)
   Cualquier paso puede llevar «pregunta» y «respuesta»: primero aparece la
   pregunta y, con el siguiente clic, la respuesta.

   Cómo funciona: cada diapositiva lleva N fragmentos invisibles (.pz-tick).
   El paso actual (0…N) es cuántos ya se mostraron; los elementos con
   data-desde="k" (y data-hasta="m") se encienden cuando k ≤ paso ≤ m.
   ===================================================================== */
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const ticks = n => Array.from({ length: n }, (_, k) => `<span class="fragment pz-tick" data-fragment-index="${k}"></span>`).join("");

  /* ---------- Estilos ---------- */
  const css = `
  .pz-tick{position:absolute!important;width:0;height:0;overflow:hidden;pointer-events:none}
  .reveal .slides section .pz{transition:opacity .5s ease,transform .7s cubic-bezier(.3,1.3,.55,1),stroke-dashoffset 1.6s ease,visibility .5s}
  .reveal .slides section svg .pz{transform-box:fill-box;transform-origin:center}
  .pz-fade,.pz-zoom,.pz-caer,.pz-derecha,.pz-subir,.pz-expandir,.pz-pin{opacity:0}
  .pz-zoom{transform:scale(.2)} .pz-expandir{transform:scale(1.5)} .pz-caer{transform:translate(-50px,-160px)}
  .pz-derecha{transform:translateX(-80px)} .pz-subir{transform:translateY(60px)} .pz-pin{transform:translateY(-40px) scale(.4)}
  .pz-tenue,.pz-resaltar{opacity:.18}
  .pz.pz-on{opacity:1!important;transform:none!important}
  .pz-tenue.pz-act,.pz-resaltar.pz-act{animation:pzLatido 1.3s ease-in-out .35s 2}
  @keyframes pzLatido{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
  .pz-trazo{stroke-dasharray:1;stroke-dashoffset:1}
  .pz-trazo.pz-on{stroke-dashoffset:0}
  /* tarjetas que caen */
  .pz-tarjetas{display:grid;align-items:start}
  .pz-tarjeta{grid-area:1/1;background:#fff;border:2px solid var(--arena);border-top:10px solid var(--c,var(--marino));padding:.6em .8em;box-shadow:0 10px 24px rgba(0,0,0,.12);text-align:left;opacity:0;visibility:hidden;transform:translateY(-40px)}
  .pz-tarjeta.pz-on{visibility:visible}
  .pz-tarjeta .num{font:700 .44em "Public Sans",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--c,var(--marino))}
  .pz-tarjeta h3{font:700 .78em "Fraunces",serif;color:var(--marino);margin:.1em 0 .3em;line-height:1.15}
  .pz-tarjeta p{font-size:.55em;line-height:1.4;margin:.25em 0}
  .pz-tarjeta .ej{background:var(--beige);border-left:5px solid var(--c,var(--marino));padding:.35em .55em;margin-top:.45em;font-size:.5em;line-height:1.38}
  .pz-tarjeta .preg{font:600 .62em "Public Sans",sans-serif;color:var(--marino);background:var(--beige);border:2px dashed var(--c,var(--marino));padding:.45em .6em;margin:.2em 0 .3em}
  .pz-tarjeta .resp{border-left:5px solid var(--c,var(--marino));padding:.1em 0 .1em .55em;margin-top:.35em}
  .pz-tarjeta .resp p{font-size:.55em}
  .pz-tarjeta .piensa{font-size:.44em;color:var(--gris);font-style:italic;margin:.2em 0 0}
  .pz-tarjeta.intro{border-top-color:var(--arena);text-align:center}
  .pz-tarjeta.intro p{font-size:.6em}
  .pz-tarjeta .fecha{display:inline-block;font:700 .5em "Public Sans",sans-serif;background:var(--c,var(--marino));color:#fff;padding:.12em .55em;margin-bottom:.15em}
  /* diagrama */
  .d-diagramaPasos h2,.d-mapaRuta h2,.d-lineaTiempo h2,.d-lupa h2,.d-tablaPasos h2{margin-bottom:.3em;font-size:1.3em}
  .pz-dp{display:grid;grid-template-columns:1.05fr 1fr;gap:.9em;align-items:center}
  .pz-fig svg{display:block;width:100%;height:auto;max-height:560px;overflow:visible}
  /* mapa */
  .pz-mapa{display:grid;grid-template-columns:1.45fr 1fr;gap:.7em;align-items:center}
  .pz-mapa svg{display:block;width:100%;height:auto;overflow:visible;background:#DCE9F2;border:2px solid var(--arena)}
  .pz-mapa .tierra{fill:#EFE7D6;stroke:#B9AE98;stroke-width:.8}
  .pz-mapa .lugar circle{stroke:#fff;stroke-width:1.5}
  .pz-mapa .lugar text,.pz-mapa .rot{font:600 11px "Public Sans",sans-serif;fill:var(--marino);paint-order:stroke;stroke:#DCE9F2;stroke-width:3px;stroke-linejoin:round}
  .pz-mapa .rot{font-size:10px;fill:#6E8597;letter-spacing:.12em;font-weight:700}
  .pz-mapa .ruta{fill:none;stroke-width:3;stroke-linecap:round}
  /* línea del tiempo */
  .pz-lt{position:relative;margin:.2em .6em 0}
  .pz-lt-eje{position:relative;height:120px}
  .pz-lt-base,.pz-lt-lleno{position:absolute;left:0;top:56px;height:8px;border-radius:8px;background:var(--arena)}
  .pz-lt-base{right:0} .pz-lt-lleno{width:0;background:var(--rojo);transition:width .8s ease}
  .pz-lt-ev{position:absolute;top:0;transform:translateX(-50%);width:120px;text-align:center}
  .pz-lt-ev .ico{display:block;font-size:26px;height:34px;line-height:34px;transition:transform .5s}
  .pz-lt-ev .pto{display:block;margin:4px auto;width:22px;height:22px;border-radius:50%;background:#fff;border:4px solid var(--arena);transition:background .4s,border-color .4s,transform .5s}
  .pz-lt-ev .fe{display:block;font:700 15px "Public Sans",sans-serif;color:var(--gris);line-height:1.15;margin-top:4px}
  .pz-lt-ev.pz-on .pto{background:var(--c);border-color:var(--c)} .pz-lt-ev.pz-on .fe{color:var(--marino)}
  .pz-lt-ev.pz-act .pto{transform:scale(1.5)} .pz-lt-ev.pz-act .ico{transform:scale(1.35) translateY(-4px)}
  .pz-lt .pz-tarjetas{max-width:860px;margin:.35em auto 0}
  /* lupa */
  .pz-lupa{display:grid;grid-template-columns:1.35fr 1fr;gap:.8em;align-items:center}
  .pz-marco{position:relative;overflow:hidden;border:3px solid var(--marino);background:#000;aspect-ratio:var(--ar,16/9)}
  .pz-lienzo{position:absolute;inset:0;transition:transform 1.2s cubic-bezier(.45,0,.2,1);transform-origin:50% 50%}
  .pz-lienzo img{width:100%;height:100%;object-fit:cover;display:block;max-width:none;max-height:none;margin:0;border:0}
  .pz-anillo{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:4px solid #fff;box-shadow:0 0 0 3px var(--rojo),0 0 18px rgba(0,0,0,.5);opacity:0;transition:opacity .4s}
  .pz-anillo b{position:absolute;inset:0;display:grid;place-items:center;font:700 22px "Public Sans",sans-serif;color:#fff;text-shadow:0 1px 4px #000}
  .pz-anillo.pz-on{opacity:1}
  .pz-lienzo.zoom .pz-anillo{transform:scale(var(--inv,1))}
  /* tabla */
  .pz-tabla td{position:relative}
  .pz-tabla td .ph{position:absolute;inset:0;display:grid;place-items:center;font:700 1.1em "Fraunces",serif;color:var(--rojo);opacity:0;transition:opacity .3s}
  .pz-tabla td .ph.pz-on{opacity:1}
  .pz-ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:.4em;margin-top:.3em;text-align:left}
  .pz-ph-c{background:#fff;border:2px solid var(--arena);border-left:8px solid var(--rojo);padding:.35em .55em}
  .pz-ph-c b{display:block;font:700 .62em "Fraunces",serif;color:var(--marino)}
  .pz-ph-c small{display:block;font:600 .36em "Public Sans",sans-serif;color:var(--gris);text-transform:uppercase;letter-spacing:.06em}
  .pz-ph-c p{font-size:.42em;line-height:1.35;margin:.2em 0 0}
  @media (prefers-reduced-motion:reduce){.reveal .slides section .pz,.pz-lienzo,.pz-lt-lleno{transition:opacity .2s!important;transform:none!important;animation:none!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- Tarjetas (una por paso; la pregunta usa dos pasos) ---------- */
  // Devuelve { html, inicios, total }: inicios[i] es el paso (1…) en que aparece la tarjeta i.
  function tarjetas(pasos, intro, opc = {}) {
    let s = 1; const inicios = [], fines = [];
    pasos.forEach(p => { inicios.push(s); s += p.pregunta ? 2 : 1; fines.push(s - 1); });
    const total = s - 1;
    const html = (intro ? `<div class="pz-tarjeta intro pz pz-fade" data-desde="0" data-hasta="0"><p>${md(intro)}</p></div>` : "")
      + pasos.map((p, i) => {
        const ultimo = i === pasos.length - 1 && !opc.ocultarUltima;
        const textos = (Array.isArray(p.texto) ? p.texto : [p.texto]).filter(Boolean).map(t => `<p>${md(t)}</p>`).join("");
        const cuerpo = `${textos}${p.ejemplo ? `<div class="ej">${md(p.ejemplo)}</div>` : ""}`;
        return `<div class="pz-tarjeta pz" data-desde="${inicios[i]}"${ultimo ? "" : ` data-hasta="${fines[i]}"`} style="--c:${esc(p.color || "var(--marino)")}">
          ${p.fecha ? `<span class="fecha">${esc(p.fecha)}</span>` : ""}<div class="num">${esc(p.num || `Paso ${i + 1}`)}</div><h3>${md(p.titulo)}</h3>
          ${p.pregunta ? `${textos}<div class="preg">🤔 ${md(p.pregunta)}</div><p class="piensa pz pz-fade" data-desde="${inicios[i]}" data-hasta="${inicios[i]}">Piénsenlo antes de avanzar…</p>
            <div class="resp pz pz-fade" data-desde="${inicios[i] + 1}">${p.respuesta ? `<p>${md(p.respuesta)}</p>` : ""}${p.ejemplo ? `<div class="ej">${md(p.ejemplo)}</div>` : ""}</div>` : cuerpo}</div>`;
      }).join("");
    return { html: `<div class="pz-tarjetas">${html}</div>`, inicios, fines, total };
  }

  // data-paso="i" (el paso i de la lista, desde 0) → data-desde con el número real de paso
  function pasosSvg(svg, inicios, alResponder) {
    return String(svg || "").replace(/data-paso="(\d+)"(?:\s+data-anim="(\w+)")?(?:\s+class="([^"]*)")?/g, (m, n, an, cl) => {
      const i = +n, k = inicios[i] != null ? inicios[i] + (alResponder && alResponder[i] ? 1 : 0) : 1;
      return `class="pz pz-${an || "fade"}${cl ? " " + cl : ""}" data-desde="${k}"`;
    });
  }

  /* ---------- Mapas base (contornos simplificados, en longitud y latitud) ---------- */
  const W = 640;
  const MAPAS = {
    // Del sudeste de Asia a la costa de América: el Pacífico completo
    pacifico: {
      marco: { lon: [95, 295], lat: [37, -52] },
      rotulos: [["OCÉANO PACÍFICO", 205, 6], ["ASIA", 104, 28], ["AUSTRALIA", 133, -26], ["AMÉRICA", 268, 30], ["SUDAMÉRICA", 291, -24]],
      tierra: [
        [[95, 37], [122, 37], [122, 31], [120, 26], [117, 23.5], [113, 22], [110, 21], [108, 19.5], [106, 17], [109, 12], [105, 9], [103, 10], [100, 13], [100, 8], [103, 1.5], [101, 3], [98, 8], [98, 16], [95, 17]],
        [[121, 25.2], [122, 24.5], [121, 22], [120.2, 23]],
        [[130, 31], [132, 33.5], [135, 34], [140, 35.5], [141, 37], [136, 33.4], [131, 31]],
        [[120, 18.5], [122, 18.5], [122.5, 14], [124, 12.5], [126, 7], [125.5, 6], [122, 7], [123, 10], [121, 13], [120, 15]],
        [[109, 1.5], [111, 2.5], [116, 7], [119, 5], [118, 1], [116, -4], [110, -3]],
        [[95.5, 5.5], [98, 4], [104, -2], [106, -6], [104, -5.8], [101, -2], [98, 1]],
        [[105.5, -6], [110, -6.7], [114.5, -7.7], [114, -8.7], [108, -7.8], [105.5, -6.9]],
        [[119, -3], [120.5, 1], [124.5, 1.5], [121.5, -1], [123, -5.5], [120, -5.5]],
        [[131, -1], [135, -3.5], [138, -1.6], [144, -3.5], [148, -6], [150.5, -10.5], [147, -10], [143, -9], [141, -9], [138, -8.3], [137.5, -5], [133, -4], [132, -3]],
        [[114, -22], [114, -26], [115, -34], [118, -35], [123, -34], [129, -31.5], [135, -35], [138, -34], [140, -38], [146, -39], [150, -37.5], [153, -31], [153.5, -25], [149, -20], [146, -18.5], [145.5, -14.5], [142.5, -10.7], [141.5, -13], [141.5, -17], [139, -17.5], [136, -15], [136.5, -12], [132, -11.3], [129.5, -14.8], [126, -14], [122, -17], [119, -20]],
        [[145, -40.7], [148.3, -41], [147.8, -43.2], [146, -43.5]],
        [[172.7, -34.4], [174.5, -36], [175.8, -37], [178.5, -37.7], [177, -39.5], [175, -41.5], [174.6, -41.2], [174.8, -39.5], [173.8, -39.2], [174.5, -37]],
        [[172.7, -40.5], [174.3, -41.5], [173, -43.5], [171, -44.5], [169, -46.6], [166.5, -46], [168, -44], [171, -42]],
        [[178, -16.5], [179.5, -16.8], [178.5, -18.2], [177.3, -17.8]],
        [[-123, 37], [-117, 32.5], [-116, 30], [-114, 27.8], [-112, 24.7], [-110, 23], [-111.5, 25], [-112.8, 27.8], [-114.8, 31.5], [-112.5, 29.5], [-109, 26], [-106, 23], [-105, 20], [-103, 18.3], [-99, 16.7], [-95, 16], [-92, 14.5], [-88, 13.3], [-86, 11.5], [-85.7, 10], [-83, 8.3], [-80, 7.5], [-78, 8.5], [-77.5, 6.5], [-77, 4], [-79.5, 1], [-81, -2], [-81, -5], [-79.5, -7.5], [-76.5, -13], [-75, -15.5], [-70.3, -18.5], [-70.5, -23], [-71.5, -30], [-71.7, -33], [-73.5, -37], [-73.8, -41.5], [-74, -46], [-75, -50], [-74, -52], [-64, -52],
          [-64, 10.5], [-71, 12], [-75, 11], [-77, 8.7], [-79, 9.3], [-82, 9], [-83.5, 10.8], [-83.5, 15], [-86, 16], [-88.5, 15.8], [-88.2, 17.5], [-87.5, 21.5], [-90.4, 21.2], [-90.5, 19.5], [-91.5, 18.5], [-94.5, 18.2], [-96, 19.5], [-97.5, 22], [-97.3, 26], [-97, 28], [-94, 29.7], [-90, 29], [-89, 30.3], [-85, 29.7], [-83, 29], [-81.5, 25.2], [-80, 26.5], [-81, 31], [-79, 33.5], [-76, 37]],
        [[-85, 22], [-82, 23.1], [-77, 21], [-74, 20], [-77.5, 19.9], [-81, 21.7]]
      ],
      lugares: {
        taiwan: { n: "Taiwán", lon: 121, lat: 23.7, lado: "l" },
        filipinas: { n: "Filipinas", lon: 122, lat: 12, lado: "r" },
        bismarck: { n: "Archipiélago Bismarck", lon: 150, lat: -4, lado: "r" },
        vanuatu: { n: "Vanuatu", lon: 167.5, lat: -15.5, lado: "r" },
        caledonia: { n: "Nueva Caledonia", lon: 165.5, lat: -21.5, lado: "l" },
        fiyi: { n: "Fiyi", lon: 178.5, lat: -17.8, lado: "b" },
        tonga: { n: "Tonga", lon: 184.8, lat: -21.2, lado: "r" },
        samoa: { n: "Samoa", lon: 188, lat: -13.8, lado: "r" },
        tahiti: { n: "Tahití", lon: 210.5, lat: -17.6, lado: "r" },
        cook: { n: "Islas Cook", lon: 200.2, lat: -21.2, lado: "b" },
        marquesas: { n: "Marquesas", lon: 220, lat: -9, lado: "r" },
        hawai: { n: "Hawái", lon: 203, lat: 20.5, lado: "r" },
        rapanui: { n: "Rapa Nui", lon: 250.6, lat: -27.1, lado: "b" },
        nz: { n: "Nueva Zelanda", lon: 174.8, lat: -40, lado: "r" },
        sudamerica: { n: "Costa de Sudamérica", lon: 281, lat: 0, lado: "l" },
        andes: { n: "Andes", lon: 284, lat: -12, lado: "r" },
        chiloe: { n: "Chiloé", lon: 286, lat: -42.6, lado: "l" },
        yucatan: { n: "Península de Yucatán", lon: 270.4, lat: 20.3, lado: "t" },
        madagascar: { n: "Madagascar", lon: 96, lat: -18, lado: "r" }
      }
    },
    // El Mediterráneo y Europa occidental: Roma, al-Ándalus, la Edad Media
    mediterraneo: {
      marco: { lon: [-11, 42], lat: [55, 28] },
      rotulos: [["MAR MEDITERRÁNEO", 17, 34.6], ["OCÉANO ATLÁNTICO", -8, 46.5], ["EUROPA", 22, 49], ["ÁFRICA", 10, 30], ["MAR NEGRO", 34.5, 43.3]],
      tierra: [
        [[-8.8, 42], [-9.5, 39], [-8.9, 37], [-7.4, 37.2], [-6.3, 36.6], [-5.6, 36], [-4.4, 36.7], [-2, 36.8], [-0.5, 38.3], [0.2, 39], [-0.3, 39.5], [1, 41], [3.2, 41.9], [3, 43.3], [4.8, 43.4], [7.5, 43.8], [8.9, 44.4], [10.2, 43.9], [11.2, 42.4], [12.4, 41.7], [13.8, 41.2], [15.6, 40], [15.7, 38], [16.6, 38.9], [17.1, 39.4], [17.2, 40.4], [18.5, 40.1], [17.8, 40.8], [16, 41.4], [14.2, 42.2], [13.6, 43.6], [12.3, 44.5], [12.4, 45.4], [13.7, 45.6], [14.5, 45.2], [15.9, 43.6], [18.1, 42.6], [19.4, 41.8], [19.4, 40.4], [20.2, 39.6], [21.1, 38.3], [21.7, 36.8], [22.5, 36.4], [23.2, 36.5], [22.9, 37.6], [23.6, 38], [24, 38.2], [22.9, 39.3], [23.4, 40.3], [22.9, 40.6], [24.4, 40.9], [26, 40.8], [26.7, 40.4], [29, 41.1], [28.2, 41.5], [27.9, 42.5], [28.6, 43.5], [29.7, 45.2], [30.7, 46.5], [33, 46.1], [33.5, 45], [34.5, 44.6], [36.5, 45.2], [38, 47], [42, 47.2], [42, 55], [9, 55], [8.6, 53.9], [7, 53.5], [4.8, 52.9], [3.5, 51.4], [1.6, 50.9], [0.2, 49.6], [-1.6, 49.6], [-1.4, 48.6], [-4.7, 48.4], [-2.3, 47.2], [-1.2, 46.2], [-1.5, 43.4], [-3.8, 43.4], [-8.3, 43.5], [-9.2, 43]],
        [[26.2, 40], [26.7, 39], [27.2, 38.4], [27.3, 37], [28, 36.7], [29.6, 36.2], [30.6, 36.8], [32.5, 36.1], [34.6, 36.8], [36.2, 36.6], [35.9, 35.4], [35.9, 34.4], [35.1, 33.1], [34.9, 32.4], [34.5, 31.5], [32.3, 31.2], [31, 31.6], [30, 31.3], [29, 30.9], [25.2, 31.6], [24, 32], [22.5, 32.8], [21, 32.9], [20.1, 32.1], [19.6, 30.4], [18, 30.8], [15.5, 31.4], [13.2, 32.9], [11.1, 33.3], [10.2, 33.8], [10.8, 35], [10.4, 36.5], [11.1, 37.1], [10.2, 37.2], [9, 37.2], [6.3, 37], [3, 36.8], [0, 35.9], [-1.9, 35.2], [-5.4, 35.9], [-6, 35.8], [-6.3, 35], [-6.9, 34], [-8.5, 33.3], [-9.7, 30.4], [-11, 28], [42, 28], [42, 41.5], [36, 41.7], [35, 42], [31.5, 41.2], [29.1, 41], [27.5, 40.4]],
        [[-5.7, 50.1], [-3.5, 50.4], [-1.2, 50.7], [1.4, 51.2], [1.7, 52.6], [0.3, 53.4], [-0.2, 55], [-3.2, 55], [-3, 53.4], [-4.6, 53.3], [-4.2, 52.4], [-5.2, 51.8], [-3.1, 51.4], [-4.5, 51.2]],
        [[-6, 53.5], [-6.3, 52.2], [-8.5, 51.6], [-10, 51.8], [-9.8, 53.5], [-10, 55], [-6, 55]],
        [[8.6, 42.9], [9.5, 43], [9.5, 41.4], [8.8, 41.5]],
        [[8.4, 40.9], [9.8, 41.2], [9.7, 39.2], [8.4, 38.9]],
        [[12.4, 38.1], [15.6, 38.3], [15.1, 36.7], [12.6, 37.6]],
        [[23.5, 35.6], [26.3, 35.3], [24.5, 34.9]],
        [[32.3, 35], [34.6, 35.6], [33.9, 34.6]],
        [[2.4, 39.9], [3.4, 39.8], [3.1, 39.3], [2.4, 39.5]]
      ],
      lugares: {
        roma: { n: "Roma", lon: 12.5, lat: 41.9, lado: "r" },
        pompeya: { n: "Pompeya", lon: 14.5, lat: 40.75, lado: "r" },
        gades: { n: "Gades (Cádiz)", lon: -6.29, lat: 36.53, lado: "t" },
        baelo: { n: "Baelo Claudia", lon: -5.77, lat: 36.09, lado: "r" },
        lixus: { n: "Lixus", lon: -6.12, lat: 35.2, lado: "b" },
        cartago: { n: "Cartago", lon: 10.3, lat: 36.85, lado: "b" },
        alejandria: { n: "Alejandría", lon: 29.9, lat: 31.2, lado: "b" },
        atenas: { n: "Atenas", lon: 23.7, lat: 38, lado: "r" },
        constantinopla: { n: "Constantinopla", lon: 29, lat: 41, lado: "t" },
        massilia: { n: "Massilia (Marsella)", lon: 5.4, lat: 43.3, lado: "t" },
        lugdunum: { n: "Lugdunum (Lyon)", lon: 4.8, lat: 45.75, lado: "r" },
        londinium: { n: "Londinium (Londres)", lon: -0.1, lat: 51.5, lado: "r" },
        cetara: { n: "Cetara (Amalfi)", lon: 14.7, lat: 40.65, lado: "b" },
        cordoba: { n: "Córdoba", lon: -4.8, lat: 37.9, lado: "r" },
        granada: { n: "Granada", lon: -3.6, lat: 37.2, lado: "r" },
        paris: { n: "París", lon: 2.35, lat: 48.85, lado: "r" },
        venecia: { n: "Venecia", lon: 12.3, lat: 45.4, lado: "r" },
        lisboa: { n: "Lisboa", lon: -9.1, lat: 38.7, lado: "l" },
        sevilla: { n: "Sevilla", lon: -6, lat: 37.4, lado: "l" }
      }
    }
  };

  function proyector(m) {
    const [a, b] = m.marco.lon, [t, u] = m.marco.lat, H = Math.round(W * (t - u) / (b - a));
    const xy = (lon, lat) => { const L = (b > 180 && lon < 0) ? lon + 360 : lon; return [+(((L - a) / (b - a)) * W).toFixed(1), +(((t - lat) / (t - u)) * H).toFixed(1)]; };
    return { xy, H };
  }
  // Curva suave entre puntos (se arquea un poco, como una ruta de navegación)
  function curva(pts, arco = .18) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0;
      d += ` Q${(mx - dy * arco).toFixed(1)},${(my + dx * arco).toFixed(1)} ${x1},${y1}`;
    }
    return d;
  }

  /* ---------- Plantillas ---------- */
  const plantillas = {
    diagramaPasos: d => {
      const T = tarjetas(d.pasos || [], d.intro);
      return `<h2>${esc(d.titulo)}</h2>${ticks(T.total)}
        <div class="pz-dp"><div class="pz-fig">${pasosSvg(d.svg, T.inicios, (d.pasos || []).map(p => p.encenderAlResponder))}</div>${T.html}</div>`;
    },

    mapaRuta: d => {
      const M = MAPAS[d.mapa || "pacifico"], P = proyector(M), pasos = d.pasos || [], T = tarjetas(pasos, d.intro);
      const L = Object.assign({}, M.lugares, d.lugares || {});
      const pt = r => Array.isArray(r) ? P.xy(r[0], r[1]) : (L[r] ? P.xy(L[r].lon, L[r].lat) : [0, 0]);
      const aparece = {};   // lugar → paso en que aparece
      pasos.forEach((p, i) => { const k = T.inicios[i] + (p.pregunta && p.alResponder ? 1 : 0); [...(p.lugares || []), ...(p.rutas || []).flat().filter(r => typeof r === "string"), ...(p.poligono || []).filter(r => typeof r === "string")].forEach(id => { if (!(id in aparece)) aparece[id] = k; }); });
      const tierra = M.tierra.map(poly => `<path class="tierra" d="M${poly.map(([lo, la]) => P.xy(lo, la).join(",")).join(" L")}Z"/>`).join("");
      const rot = (M.rotulos || []).map(([t, lo, la]) => { const [x, y] = P.xy(lo, la); return `<text class="rot" x="${x}" y="${y}" text-anchor="middle">${esc(t)}</text>`; }).join("");
      let n = 0;
      const rutas = pasos.map((p, i) => (p.rutas || []).map(r => {
        const k = T.inicios[i] + (p.pregunta && p.alResponder ? 1 : 0), dpath = curva(r.map(pt), p.arco ?? .16), col = esc(p.color || "#AA2F2F"), id = `pzm${Math.random().toString(36).slice(2, 7)}${n++}`;
        if (p.punteado) return `<mask id="${id}"><path d="${dpath}" fill="none" stroke="#fff" stroke-width="8" pathLength="1" class="pz pz-trazo" data-desde="${k}"/></mask><path class="ruta" d="${dpath}" stroke="${col}" stroke-dasharray="7 6" mask="url(#${id})"/>`;
        return `<path class="ruta pz pz-trazo pz-fade" d="${dpath}" stroke="${col}" pathLength="1" data-desde="${k}" marker-end="url(#pzf-${esc((p.color || "#AA2F2F").replace(/[^\w]/g, ""))})"/>`;
      }).join("") + (p.poligono ? `<path class="pz pz-fade" data-desde="${T.inicios[i] + (p.pregunta && p.alResponder ? 1 : 0)}" d="M${p.poligono.map(r => pt(r).join(",")).join(" L")}Z" fill="${esc(p.color || "#AA2F2F")}" fill-opacity=".08" stroke="${esc(p.color || "#AA2F2F")}" stroke-width="2" stroke-dasharray="4 5"/>` : "")).join("");
      const colores = [...new Set(pasos.map(p => p.color || "#AA2F2F"))];
      const marcas = colores.map(c => `<marker id="pzf-${c.replace(/[^\w]/g, "")}" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto"><path d="M0,0 L11,6 L0,12z" fill="${c}"/></marker>`).join("");
      const usados = Object.keys(aparece).concat(d.siempre || []);
      const lugares = [...new Set(usados)].filter(id => L[id]).map(id => {
        const l = L[id], [x, y] = P.xy(l.lon, l.lat), k = aparece[id], dx = { r: 9, l: -9, t: 0, b: 0 }[l.lado || "r"], dy = { r: 4, l: 4, t: -10, b: 17 }[l.lado || "r"], an = { r: "start", l: "end", t: "middle", b: "middle" }[l.lado || "r"];
        const col = esc(l.color || "#AA2F2F");
        return `<g class="lugar${k ? " pz pz-pin" : ""}"${k ? ` data-desde="${k}"` : ""}><circle cx="${x}" cy="${y}" r="${l.r || 5.5}" fill="${col}"/><text x="${x + dx}" y="${y + dy}" text-anchor="${an}">${l.ico ? esc(l.ico) + " " : ""}${esc(l.n)}</text></g>`;
      }).join("");
      const extra = pasosSvg(d.svgExtra, T.inicios);
      return `<h2>${esc(d.titulo)}</h2>${ticks(T.total)}
        <div class="pz-mapa"><svg viewBox="0 0 ${W} ${P.H}" role="img" aria-label="${esc(d.titulo)}"><defs>${marcas}</defs>${tierra}${rot}${rutas}${extra}${lugares}</svg>${T.html}</div>`;
    },

    lineaTiempo: d => {
      const ev = d.eventos || [], T = tarjetas(ev.map(e => Object.assign({ num: e.fecha }, e, { fecha: null })), d.intro);
      const pos = i => ev.length === 1 ? 50 : 6 + i * 88 / (ev.length - 1);
      const marcas = ev.map((e, i) => `<div class="pz-lt-ev" data-desde="${T.inicios[i]}" style="left:${pos(i)}%;--c:${esc(e.color || "var(--rojo)")}"><span class="ico">${esc(e.ico || "")}</span><span class="pto"></span><span class="fe">${esc(e.fecha)}</span></div>`).join("");
      const llenos = JSON.stringify(T.inicios.map((k, i) => [k, pos(i)]));
      return `<h2>${esc(d.titulo)}</h2>${ticks(T.total)}
        <div class="pz-lt"><div class="pz-lt-eje" data-lt='${llenos}'><div class="pz-lt-base"></div><div class="pz-lt-lleno"></div>${marcas}</div>${T.html}</div>`;
    },

    lupa: d => {
      const pts = d.puntos || [], T = tarjetas(pts.map((p, i) => Object.assign({ num: `Detalle ${i + 1} de ${pts.length}` }, p)).concat(d.final ? [Object.assign({ num: "Vista completa" }, d.final)] : []), d.intro);
      const datos = JSON.stringify(pts.map((p, i) => [T.inicios[i], T.fines[i], p.x, p.y, p.zoom || 2.2]));
      const anillos = pts.map((p, i) => `<span class="pz-anillo" data-desde="${T.inicios[i]}" data-hasta="${T.fines[i]}" style="left:${p.x}%;top:${p.y}%"><b>${i + 1}</b></span>`).join("");
      return `<h2>${esc(d.titulo)}</h2>${ticks(T.total)}
        <div class="pz-lupa"><div class="pz-marco" style="--ar:${esc(d.proporcion || "16/9")}"><div class="pz-lienzo" data-lupa='${datos}'><img data-src="${esc(d.imagen)}" alt="${esc(d.titulo)}" data-ruta="${esc(d.imagen)}">${anillos}</div></div>${T.html}</div>`;
    },

    // Palabras nuevas de la clase: las definiciones salen del glosario del curso (data/glosario.json)
    palabrasHoy: d => {
      const L = d.terminos || [];
      return `<span class="etiqueta">${esc(d.etiqueta || "Glosario")}</span><h2>${esc(d.titulo || "Palabras de hoy")}</h2>
        <div class="pz-ph">${L.map(t => `<div class="pz-ph-c gl-ficha${d.pasoAPaso === false ? "" : " fragment"}" data-glf="${esc(t)}"><b class="gl-t">${esc(t)}</b><small class="gl-c"></small><p class="gl-d">…</p></div>`).join("")}</div>
        <p class="pista">${md(d.pie || "Todas están en el **Glosario** del Aula Virtual.")}</p>`;
    },

    tablaPasos: d => {
      const cols = d.columnas || [], filas = d.filas || [], fija = d.columnaFija !== false ? 1 : 0;
      let k = 0;
      const cuerpo = filas.map(f => {
        const porFila = d.revelar === "fila"; if (porFila) k++;
        return `<tr>${f.map((c, j) => {
          if (j < fija) return `<td>${md(c)}</td>`;
          if (!porFila) k++;
          return `<td><span class="ph pz" data-desde="0" data-hasta="${k - 1}">?</span><span class="pz pz-fade" data-desde="${k}">${md(c)}</span></td>`;
        }).join("")}</tr>`;
      }).join("");
      return `<h2>${esc(d.titulo)}</h2>${ticks(k)}
        <table class="tabla pz-tabla${d.densa ? " densa" : ""}"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${cuerpo}</tbody></table>
        ${d.pie ? `<p class="pista">${md(d.pie)}</p>` : ""}`;
    }
  };

  /* ---------- Control de pasos ---------- */
  function pasoDe(sec) {
    let n = 0;
    sec.querySelectorAll(":scope .pz-tick").forEach(t => { if (t.classList.contains("visible")) n = Math.max(n, +t.dataset.fragmentIndex + 1); });
    return n;
  }
  function fijar(sec, n) {
    if (!sec) return;
    sec.dataset.pzPaso = n;
    sec.querySelectorAll("[data-desde]").forEach(el => {
      const a = +el.dataset.desde, h = el.dataset.hasta != null ? +el.dataset.hasta : Infinity;
      el.classList.toggle("pz-on", n >= a && n <= h);
      el.classList.toggle("pz-act", n === a);
    });
    sec.querySelectorAll("[data-lt]").forEach(eje => {
      const L = JSON.parse(eje.dataset.lt); let w = 0;
      L.forEach(([k, p]) => { if (n >= k) w = p; });
      eje.querySelector(".pz-lt-lleno").style.width = w + "%";
    });
    sec.querySelectorAll("[data-lupa]").forEach(lz => {
      const L = JSON.parse(lz.dataset.lupa), p = L.find(([a, b]) => n >= a && n <= b);
      if (p) {
        const [, , x, y, z] = p, lim = 50 / z, cx = Math.min(100 - lim, Math.max(lim, x)), cy = Math.min(100 - lim, Math.max(lim, y));
        lz.style.transform = `scale(${z}) translate(${(50 - cx).toFixed(2)}%, ${(50 - cy).toFixed(2)}%)`;
        lz.style.setProperty("--inv", (1 / z).toFixed(3)); lz.classList.add("zoom");
      } else { lz.style.transform = "none"; lz.style.setProperty("--inv", 1); lz.classList.remove("zoom"); }
    });
  }
  function activar(R) {
    const upd = () => { const s = R.getCurrentSlide(); if (s && s.querySelector(".pz-tick")) fijar(s, pasoDe(s)); };
    ["ready", "slidechanged", "fragmentshown", "fragmenthidden"].forEach(e => R.on(e, upd));
    // Las diapositivas que no son la actual quedan en su estado inicial (o final, si ya pasaron)
    document.querySelectorAll(".reveal .slides section").forEach(s => { if (!s.querySelector("section") && s.querySelector(".pz-tick")) fijar(s, pasoDe(s)); });
    upd();
  }

  window.PASOS = { plantillas, activar, fijar, MAPAS };
})();
