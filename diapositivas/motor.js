/* =====================================================================
   MOTOR DE DIAPOSITIVAS — Origen de las Cocinas · LudoMente Studio
   Este archivo NO se edita. Lo usan todas las presentaciones.
   ===================================================================== */
(function () {
  const REVEAL = "https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/";
  const AQUI = (document.currentScript && document.currentScript.src) || location.href;   // para cargar pasos.js junto a este archivo

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
  .reveal{font-family:"Public Sans",Calibri,Arial,sans-serif;color:var(--tinta);font-size:36px}
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
  .con-imagen{display:grid;grid-template-columns:1.6fr 1fr;gap:36px;align-items:center}
  .con-imagen ul.puntos{font-size:.92em}
  .con-imagen.sin-imagen{grid-template-columns:1fr}
  .obs{display:grid;grid-template-columns:1fr 1.3fr;gap:36px;align-items:center}
  .obs img{width:100%;height:600px;object-fit:cover;object-position:var(--encuadre,50% 50%);margin:0;border:0}
  .obs .completa img{height:auto;max-height:600px;object-fit:contain}
  .obs ul.puntos{font-size:.74em}
  .obs ul.puntos li{margin:.38em 0}
  .obs h2{font-size:1.15em;margin-bottom:.35em}
  .con-imagen img,.d-imagen img{width:100%;max-height:520px;object-fit:cover;margin:0;border:0;box-shadow:0 0 0 1px var(--arena)}
  .etiqueta{display:inline-block;width:fit-content;background:var(--rojo);color:#fff;font:600 .6em "Public Sans",sans-serif;padding:.3em .8em;margin-bottom:.8em}
  /* Portada del día */
  .d-portadaDia{color:#fff}
  .d-portadaDia .pd{display:grid;grid-template-columns:1.1fr 1fr;gap:56px;align-items:center}
  .d-portadaDia .pd.sola{grid-template-columns:1fr}
  .d-portadaDia .tema{font-size:.68em;color:var(--arena);margin-bottom:1.6em}
  .d-portadaDia .dia{font-size:.75em;color:#E7A3A3;font-weight:600;margin-bottom:.3em}
  .d-portadaDia h1{color:#fff;font-size:1.9em}
  .d-portadaDia .sub{color:var(--arena);font-size:.85em;margin-top:.2em}
  .d-portadaDia .duracion{display:inline-block;margin-top:1.4em;background:var(--rojo);color:#fff;font-weight:600;font-size:.68em;padding:.45em 1.3em;border-radius:999px}
  .d-portadaDia img{width:100%;height:auto;max-height:560px;object-fit:contain;margin:0;border:0;box-shadow:0 18px 40px rgba(0,0,0,.35)}
  /* Objetivos */
  .d-objetivos .banda{background:var(--rojo);color:#fff;font:600 .8em "Public Sans",sans-serif;padding:.7em 1.2em;margin:0 -56px 1.1em}
  .d-objetivos .intro{font-style:italic;color:var(--gris);margin-bottom:.8em}
  /* Dato */
  .d-dato{text-align:center}
  .d-dato .cifra{font-family:"Fraunces",serif;font-weight:700;color:var(--rojo);font-size:4.2em;line-height:1;margin:0 0 .2em}
  .d-dato .texto{font-size:1.05em;max-width:24em;margin:0 auto;color:var(--marino)}
  .d-dato .fuente{font-size:.6em;color:var(--gris);margin-top:1.2em}
  /* Tabla */
  .reveal table.tabla{width:100%;border-collapse:collapse;font-size:.78em;margin:0}
  .reveal table.tabla th{background:var(--marino);color:#fff;text-align:left;padding:.55em .8em;border:0;font-weight:600}
  .reveal table.tabla td{padding:.6em .8em;border:0;border-bottom:1px solid var(--arena);vertical-align:top;line-height:1.35}
  .reveal table.tabla tr:nth-child(even) td{background:#ECE8DF}
  .reveal table.tabla td:first-child{font-weight:600;color:var(--marino)}
  .pista-abajo{font-size:.6em;color:var(--gris);margin-top:.9em}
  /* Pausa activa */
  .d-pausa{color:#fff}
  .d-pausa h2{color:#fff;font-size:1.7em}
  .d-pausa .dur{font-size:.7em;color:#F3CFCF;margin-bottom:1em}
  .d-pausa .caja{background:rgba(255,255,255,.12);padding:.9em 1.1em;line-height:1.45}
  .d-pausa .pa-nombre{color:#fff;font-size:1.25em;margin:.1em 0 .45em}
  .d-pausa .pa-pasos{text-align:left;margin:0 auto;padding:.8em 1.1em .8em 2.4em;max-width:30em}
  .d-pausa .pa-pasos li{margin:.35em 0;font-size:.82em}
  .d-pausa .pa-otra{margin-top:1em;font:inherit;font-size:.5em;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.45);border-radius:999px;padding:.4em 1.2em;cursor:pointer}
  .d-pausa .pa-otra:hover{background:rgba(255,255,255,.28)}
  /* Imagen y video */
  .d-imagen figure{margin:0}
  .d-imagen img[data-ruta$=".svg"]{object-fit:contain;height:540px;max-height:540px;box-shadow:none}
  .d-imagen figcaption,.d-video .pie{font-size:.65em;color:var(--gris);margin-top:.6em}
  .vacio{border:3px dashed var(--gris);color:var(--gris);padding:2em 1em;text-align:center;font-size:.7em;line-height:1.5}
  .marco-video{position:relative;width:100%;max-width:920px;margin:0 auto;aspect-ratio:16/9;background:#000}
  .abrir-yt{color:var(--rojo);font-weight:600;text-decoration:none}
  .abrir-yt:hover{text-decoration:underline}
  .marco-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  /* Pregunta */
  .d-pregunta{text-align:center}
  .d-pregunta .preg{font-family:"Fraunces",serif;font-size:1.4em;font-weight:600;color:var(--marino);max-width:18em;margin:0 auto .9em;line-height:1.2}
  .d-pregunta .resp{display:inline-block;background:var(--marino);color:#fff;padding:.55em 1em;font-size:.95em;line-height:1.4;max-width:30em;text-align:left}
  .d-pregunta .pista{font-size:.6em;color:var(--gris);margin-top:1em}
  /* Ejemplo del proyecto */
  .ej-cab{display:grid;grid-template-columns:auto 1fr;gap:.2em .9em;align-items:baseline;margin-bottom:.7em}
  .ej-num{font:700 .6em "Public Sans",sans-serif;background:var(--rojo);color:#fff;padding:.4em .8em;white-space:nowrap;align-self:start}
  .ej-preg{font-family:"Fraunces",serif;font-weight:600;font-size:1.05em;color:var(--marino);line-height:1.25}
  .ej-resp{background:#fff;border-left:8px solid var(--marino);padding:.7em .9em;font-size:.78em;line-height:1.45}
  .ej-fuente{font-size:.58em;color:var(--gris);margin-top:.7em;line-height:1.4}
  /* Repaso relámpago */
  .reveal ol.rep{list-style:none;margin:0;padding:0;counter-reset:r}
  .reveal ol.rep li{counter-increment:r;position:relative;padding-left:1.9em;margin:0 0 .55em;font-size:.82em;line-height:1.3}
  .reveal ol.rep li::before{content:counter(r);position:absolute;left:0;top:0;width:1.35em;height:1.35em;border-radius:50%;background:var(--rojo);color:#fff;font-weight:700;font-size:.85em;display:flex;align-items:center;justify-content:center}
  .reveal ol.rep .q{display:block;font-weight:600;color:var(--marino)}
  .reveal ol.rep .a{display:inline-block;margin-top:.2em;background:var(--marino);color:#fff;padding:.15em .6em;font-size:.9em}
  /* Cita */
  .d-cita blockquote{font-family:"Fraunces",serif;font-size:1.35em;font-weight:500;color:var(--marino);margin:0;padding:0 0 0 .8em;border-left:8px solid var(--rojo);box-shadow:none;width:auto;background:none;font-style:normal;line-height:1.3}
  .d-cita .autor{color:var(--gris);font-size:.68em;margin-top:1em;padding-left:1.5em}
  /* Mi Plato, Mi Historia */
  .d-proyecto{color:#fff}
  .d-proyecto .marca{font-size:.7em;color:var(--arena);margin-bottom:.4em}
  .d-proyecto h2{color:#fff}
  .d-proyecto .pr{display:grid;grid-template-columns:auto 1fr;gap:.2em 1em;margin:.7em 0;align-items:baseline}
  .d-proyecto .num{font:600 .68em "Public Sans",sans-serif;background:var(--rojo);padding:.35em .8em;white-space:nowrap}
  .d-proyecto .txt{font-family:"Fraunces",serif;font-size:1.05em;line-height:1.3}
  /* Cierre */
  .d-cierre .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .d-cierre .col{background:#fff;padding:.8em .9em;border-top:6px solid var(--rojo);font-size:.82em;line-height:1.45}
  .d-cierre .col h3{font-family:"Public Sans",sans-serif;font-size:.85em;color:var(--rojo);font-weight:700;margin:0 0 .5em}
  /* Botón volver y controles */
  .volver{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:10px;z-index:30;font:600 12px "Public Sans",sans-serif;color:var(--marino);background:rgba(255,255,255,.85);border:1px solid rgba(0,0,0,.15);border-radius:999px;padding:5px 11px;text-decoration:none;opacity:.9;transition:opacity .4s}
  .volver:hover{opacity:1}
  .volver.oculto{opacity:0;pointer-events:none}
  .volver:focus-visible{outline:3px solid var(--rojo);outline-offset:2px}
  .reveal .progress{color:var(--rojo);height:5px}
  .reveal .controls{color:var(--marino)}
  .reveal .slide-number{background:transparent;color:var(--gris);font-family:"Public Sans",sans-serif;bottom:16px}
  .panel-docente{position:fixed;left:0;right:0;bottom:0;z-index:35;background:rgba(37,39,52,.94);color:#fff;font:400 15px/1.45 "Public Sans",sans-serif;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));max-height:38vh;overflow-y:auto;border-top:4px solid var(--rojo)}
  .panel-docente b{color:#F3CFCF;font-weight:600}
  .panel-docente.oculto{display:none}
  .btn-notas{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:12px;z-index:36;font:600 14px "Public Sans",sans-serif;color:#fff;background:var(--rojo);border:0;padding:7px 12px;cursor:pointer}
  .btn-notas:focus-visible{outline:3px solid var(--marino);outline-offset:2px}
  /* Actividad en la plataforma: pasos a la izquierda, QR para entrar a la derecha */
  .d-plataforma .plat{display:grid;grid-template-columns:1fr auto;gap:1.2em;align-items:start}
  .d-plataforma .plat ol{margin:.2em 0 0 1.1em;padding:0;font-size:.68em;line-height:1.36}
  .d-plataforma .plat ol li{margin:.25em 0}
  .d-plataforma .qr-dia{background:#fff;padding:.35em;border:3px solid var(--marino);width:7.4em;text-align:center}
  .d-plataforma .qr-dia svg{display:block;width:100%;height:auto}
  .d-plataforma .qr-dia span{display:block;font:600 .36em "Public Sans",sans-serif;color:var(--marino);margin-top:.3em;line-height:1.3}
  .d-plataforma .tipo-act{display:inline-block;font:600 .5em "Public Sans",sans-serif;color:var(--marino);border:2px solid var(--marino);padding:.2em .7em;margin:0 0 .6em .4em}
  @media (max-width:700px){.d-plataforma .plat{grid-template-columns:1fr}.d-plataforma .qr-dia{width:6em}}
  @media (prefers-reduced-motion:reduce){.reveal .slides section{transition:none!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- 2. Utilidades ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Permite **negritas** dentro del texto
  const txt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  function idYoutube(v) {
    if (!v) return "";
    const m = String(v).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(String(v).trim()) ? String(v).trim() : "";
  }
  const lista = (items, paso) => `<ul class="puntos">${(items || []).map(p => `<li${paso ? ' class="fragment"' : ""}>${txt(p)}</li>`).join("")}</ul>`;
  const img = (ruta, alt) => `<img data-src="${esc(ruta)}" alt="${esc(alt || "")}" data-ruta="${esc(ruta)}">`;

  /* ---------- Banco de pausas activas ----------
     Ligeras, en el lugar (de pie junto a la silla o sentados), sin caminar por el salón y sin tocar al compañero.
     No tienen que ver con el tema: solo despiertan. Cada presentación toma una distinta y el botón «Otra pausa»
     cambia a la siguiente. */
  const PAUSAS = [
    { t: "Respiración 4-4-6", k: "Respira", min: 2, pasos: ["De pie, pies separados al ancho de la cadera y hombros sueltos.", "Inhala por la nariz contando **4**.", "Sostén el aire contando **4**.", "Suelta por la boca, despacio, contando **6**. Repite **5 veces**."] },
    { t: "El globo", k: "Respira", min: 2, pasos: ["Pon las dos manos sobre el abdomen.", "Inhala lento por la nariz: siente cómo **se infla el globo** bajo tus manos.", "Exhala lento por la boca: el globo **se desinfla**.", "Cinco respiraciones, cada una más lenta que la anterior."] },
    { t: "Respiración cuadrada", k: "Respira", min: 2, pasos: ["Dibuja un cuadrado en el aire con el dedo mientras respiras.", "Lado 1: inhala en **4** tiempos. Lado 2: sostén en **4**.", "Lado 3: exhala en **4**. Lado 4: sostén vacío en **4**.", "Dibuja **cuatro cuadrados** completos."] },
    { t: "Estírate al cielo", k: "Estira", min: 2, pasos: ["De pie, entrelaza los dedos y sube los brazos con las palmas hacia el techo.", "Crece como si alguien te jalara de la cabeza: **10 segundos**.", "Sin bajar los brazos, inclínate a la derecha **10 segundos** y luego a la izquierda.", "Baja los brazos despacio, soltando el aire."] },
    { t: "Cuello sin prisa", k: "Estira", min: 2, pasos: ["Lleva la oreja derecha hacia el hombro derecho, sin subir el hombro: **15 segundos**.", "Ahora la oreja izquierda hacia el hombro izquierdo.", "Barbilla al pecho y deja que la cabeza pese: **15 segundos**.", "Mira por encima del hombro derecho y luego del izquierdo, lento."] },
    { t: "Hombros fuera", k: "Estira", min: 2, pasos: ["**10 círculos** de hombros hacia atrás, grandes y lentos.", "**10 círculos** hacia adelante.", "Sube los hombros hasta las orejas, apriétalos **5 segundos**… y suéltalos de golpe.", "Repite el apretón **tres veces**: nota la diferencia entre tensión y relajación."] },
    { t: "Manos de escritor", k: "Estira", min: 1, pasos: ["Abre y cierra las manos con fuerza **10 veces**.", "Círculos de muñecas: **10** hacia un lado y **10** hacia el otro.", "Toca cada dedo con el pulgar, ida y vuelta, cada vez más rápido.", "Sacude las manos como si las tuvieras mojadas."] },
    { t: "Torsión en la silla", k: "Estira", min: 2, pasos: ["Sentado, espalda recta y pies en el piso.", "Gira el tronco a la derecha y apóyate en el respaldo: **15 segundos**, respirando.", "Regresa al centro y gira a la izquierda.", "Termina con los brazos colgando hacia el piso, la cabeza relajada, **10 segundos**."] },
    { t: "Piernas despiertas", k: "Estira", min: 2, pasos: ["De pie, apóyate en el respaldo de tu silla.", "Lleva el talón derecho hacia el glúteo y sostén el pie: **15 segundos**. Cambia de pierna.", "Ponte de puntitas y baja despacio: **10 veces**.", "Sacude cada pierna como si te quitaras una hormiga."] },
    { t: "Ojos 20-20", k: "Estira", min: 1, pasos: ["Busca por la ventana o al fondo del salón **el punto más lejano** que veas.", "Míralo fijamente **20 segundos**, sin ver el celular ni la pantalla.", "Frota las palmas hasta calentarlas y cubre los ojos cerrados: **20 segundos** de oscuridad.", "Abre los ojos despacio y parpadea varias veces."] },
    { t: "La sacudida 5-4-3-2-1", k: "Despierta", min: 2, pasos: ["Todos de pie. Sacude la **mano derecha** contando en voz alta del 5 al 1.", "Luego la **izquierda**, la **pierna derecha** y la **pierna izquierda**, del 5 al 1.", "Otra ronda contando del 4 al 1, luego del 3, del 2 y del 1… cada vez más rápido.", "Termina con un grito de grupo: «¡Despiertos!»."] },
    { t: "Marcha en el lugar", k: "Despierta", min: 2, pasos: ["Sin moverte de tu lugar, marcha subiendo las rodillas **30 segundos**.", "Agrega los brazos como si corrieras.", "**10 segundos** a toda velocidad.", "Baja el ritmo poco a poco y termina con tres respiraciones profundas."] },
    { t: "Sentadilla de silla", k: "Despierta", min: 1, pasos: ["De pie frente a tu silla.", "Baja como si te fueras a sentar, roza la silla sin sentarte y vuelve a subir.", "**10 veces**, al ritmo que marque el profesor.", "La última: quédate abajo **5 segundos** antes de subir."] },
    { t: "Cruzados", k: "Coordina", min: 2, pasos: ["De pie: el **codo derecho** toca la **rodilla izquierda**.", "Ahora el **codo izquierdo** a la **rodilla derecha**.", "Alterna **20 veces**, al ritmo de palmadas del profesor.", "Ronda difícil: **mano derecha al talón izquierdo** por detrás. Al cruzar la línea del cuerpo trabajan los dos lados del cerebro."] },
    { t: "Ocho acostado", k: "Coordina", min: 1, pasos: ["Estira el brazo derecho con el pulgar hacia arriba.", "Dibuja en el aire un **8 acostado** (∞) grande y lento; síguelo solo con los ojos, sin mover la cabeza.", "**Cinco veces** con la mano derecha, cinco con la izquierda.", "Y cinco con las dos manos juntas."] },
    { t: "Nariz y oreja", k: "Coordina", min: 1, pasos: ["Mano derecha a la **nariz**; mano izquierda a la **oreja derecha**.", "Aplaude una vez y **cambia**: mano izquierda a la nariz, derecha a la oreja izquierda.", "Repite cada vez más rápido.", "Se vale reírse: es parte del ejercicio."] },
    { t: "Pulgar y meñique", k: "Coordina", min: 1, pasos: ["Cierra los puños frente a ti.", "En una mano saca el **pulgar** y en la otra el **meñique**.", "A la señal, **cambia**: pulgar donde estaba el meñique y meñique donde estaba el pulgar.", "Diez cambios, cada vez más rápido."] },
    { t: "Haz lo que digo, no lo que hago", k: "Juego", min: 2, pasos: ["El profesor da órdenes rápidas: «manos arriba», «tócate la cabeza», «aplaude», «siéntate».", "Pero **hace otra cosa** con su cuerpo para confundir.", "Ustedes obedecen **lo que dice**, no lo que hace.", "Quien se equivoca, se sienta… y la última persona de pie gana."] },
    { t: "Simón dice", k: "Juego", min: 2, pasos: ["Solo se obedece si la orden empieza con **«Simón dice…»**.", "«Simón dice: estírense». «Simón dice: brinquen en su lugar». «¡Siéntense!» (esa no se vale).", "Órdenes cada vez más rápidas.", "Quien se equivoca, se sienta."] },
    { t: "Ritmo en eco", k: "Juego", min: 2, pasos: ["El profesor marca un ritmo corto con palmadas, chasquidos o golpes en la mesa.", "El grupo lo **repite igualito**.", "Cada ronda, el ritmo es un poco más largo o más rápido.", "Al final, que un voluntario invente el ritmo."] },
    { t: "Uno, dos, tres", k: "Juego", min: 3, pasos: ["En parejas, de pie, frente a frente. Cuentan del 1 al 3 por turnos: «uno», «dos», «tres», «uno»…", "Ronda 2: el **uno** se cambia por una **palmada**.", "Ronda 3: el **dos** se cambia por un **chasquido**.", "Ronda 4: el **tres** se cambia por un **brinco**. Casi nadie llega sin reírse."] },
    { t: "Cuenta grupal", k: "Juego", min: 2, pasos: ["Todos de pie y con los ojos cerrados.", "El grupo cuenta del **1 al 20**, una persona a la vez, **sin orden** y sin ponerse de acuerdo.", "Si dos dicen el mismo número al mismo tiempo, **se empieza de nuevo** desde el 1.", "Exige escucharse: es una pausa para la atención."] },
    { t: "Espejo", k: "Juego", min: 2, pasos: ["En parejas, frente a frente y sin tocarse.", "Uno mueve los brazos y la cara **muy despacio**; el otro es su espejo.", "A los **40 segundos**, cambien de papel.", "Reto: que el profesor no adivine quién guía y quién imita."] },
    { t: "Piedra, papel o tijera de cuerpo entero", k: "Juego", min: 2, pasos: ["**Piedra**: agáchate hecho bolita. **Papel**: brazos y piernas abiertos como estrella. **Tijera**: brazos cruzados al frente.", "En parejas, a la cuenta de tres, cada quien hace su figura.", "Tres rondas: quien gana dos se queda de pie, quien pierde da cinco sentadillas suaves.", "Sin moverse de su lugar."] },
    { t: "El árbol", k: "Equilibrio", min: 2, pasos: ["Párate en el pie derecho y apoya la planta del izquierdo en el tobillo o la pantorrilla.", "Junta las palmas frente al pecho: **20 segundos**.", "Cambia de pie.", "Reto: hazlo con los **ojos cerrados**. Se vale apoyarse en la silla."] },
    { t: "Bostezo permitido", k: "Respira", min: 1, pasos: ["Hoy está permitido bostezar: **bosteza a propósito**, grande, con los brazos estirados.", "Otra vez, como gato que despierta: estírate de las puntas de los pies a las puntas de los dedos.", "Tres bostezos más (se contagian solos).", "Termina con una sonrisa forzada de **5 segundos**: la cara también se estira."] },
    { t: "Cinco, cuatro, tres, dos, uno", k: "Respira", min: 2, pasos: ["Sentados, en silencio, nombra para ti **5 cosas que ves**.", "**4 cosas que puedes tocar** desde tu lugar.", "**3 sonidos** que escuchas ahora mismo.", "**2 olores** y **1 respiración** profunda. Sirve para regresar al salón cuando la cabeza anda en otro lado."] },
    { t: "Tamborileo", k: "Despierta", min: 1, pasos: ["Con las yemas de los dedos, tamborilea sobre la mesa **lento**, como lluvia que empieza.", "Cada vez **más rápido**, hasta un aguacero.", "Agrega palmadas sobre los muslos: ¡tormenta!", "Y baja poco a poco hasta el silencio."] },
    { t: "Masaje a uno mismo", k: "Estira", min: 2, pasos: ["Con las yemas, da golpecitos suaves en la cabeza, como lluvia.", "Masajea en círculos las sienes y la mandíbula: ahí se guarda mucha tensión.", "Aprieta suave tus propios hombros y la nuca.", "Termina frotándote las manos y pasándolas por la cara, como si te lavaras."] },
    { t: "Contrarios", k: "Juego", min: 2, pasos: ["El profesor dice una orden y el grupo hace **lo contrario**.", "«Arriba»: se agachan. «Rápido»: se mueven lento. «Silencio»: hacen ruido.", "«Derecha»: miran a la izquierda. «Siéntense»: se ponen de pie.", "Órdenes cada vez más rápidas."] },
  ];
  const hashTxt = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const pausaHTML = i => { const p = PAUSAS[((i % PAUSAS.length) + PAUSAS.length) % PAUSAS.length];
    return `<div class="dur">${esc(p.k)} · unos ${p.min} minuto${p.min === 1 ? "" : "s"} · en tu lugar</div>
      <h3 class="pa-nombre">${esc(p.t)}</h3>
      <ol class="caja pa-pasos">${p.pasos.map(x => `<li>${txt(x)}</li>`).join("")}</ol>
      <button type="button" class="pa-otra" title="Cambiar por otra pausa">🔀 Otra pausa</button>`; };
  let nPausa = 0;
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".pa-otra"); if (!b) return; e.stopPropagation(); const c = b.closest(".pa-cuerpo"), i = +c.dataset.i + 1; c.dataset.i = i; c.innerHTML = pausaHTML(i); });

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

    // Imagen grande a la izquierda y lo que hay que observar en ella a la derecha
    observa: d => `
      <div class="obs">
        <div${d.completa ? ' class="completa"' : ""}${d.encuadre ? ` style="--encuadre:${esc(d.encuadre)}"` : ""}>${img(d.imagen, d.titulo)}</div>
        <div><span class="etiqueta">${esc(d.etiqueta || "Observa la imagen")}</span>
          <h2>${esc(d.titulo)}</h2>${lista(d.puntos, d.pasoAPaso !== false)}</div>
      </div>`,

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

    // Pausa activa: sale del banco (distinta en cada presentación); «fija: true» conserva el texto escrito en la diapositiva.
    pausa: d => d.fija ? `
      <h2>${esc(d.titulo || "¡Pausa activa!")}</h2>
      ${d.duracion ? `<div class="dur">${esc(d.duracion)}</div>` : ""}
      <div class="caja">${txt(d.texto)}</div>` : (i => `
      <h2>¡Pausa activa!</h2>
      <div class="pa-cuerpo" data-i="${i}">${pausaHTML(i)}</div>`)(hashTxt((P.materia || "") + document.title) + 7 * nPausa++),

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
      ${d.pie ? `<p class="pie">${esc(d.pie)}</p>` : ""}
      ${id ? `<p class="pie"><a class="abrir-yt" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">¿No carga? Ábrelo en YouTube ↗</a></p>` : ""}`;
    },

    // Repaso relámpago: cada pregunta aparece con un clic y su respuesta con el siguiente
    repaso: d => `
      <span class="etiqueta">Repaso relámpago</span>
      <h2>${esc(d.titulo || "¿Qué tanto recuerdas?")}</h2>
      <ol class="rep">${(d.preguntas || []).map(p => `
        <li class="fragment"><span class="q">${txt(p.pregunta)}</span>
          <span class="a fragment">${txt(p.respuesta)}</span></li>`).join("")}</ol>`,

    // Pregunta del proyecto con la respuesta modelo del docente
    ejemplo: d => `
      <div class="ej-cab"><span class="ej-num">Pregunta ${esc(d.numero)}</span>
        <span class="ej-preg">${txt(d.pregunta)}</span></div>
      <div class="ej-resp fragment">${txt(d.respuesta)}</div>
      ${d.fuente ? `<p class="ej-fuente fragment">${txt(d.fuente)}</p>` : ""}`,

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
      ${(d.preguntas || []).map(p => `<div class="pr"><span class="num">${p.numero === "·" ? "Avance" : "Pregunta " + esc(p.numero)}</span><span class="txt">${esc(p.texto)}</span></div>`).join("")}`,

    cierre: d => `
      <h2>${esc(d.titulo || "Cierre de la sesión")}</h2>
      <div class="cols">
        <div class="col"><h3>Evidencia de logro</h3>${txt(d.evidencia || "—")}</div>
        <div class="col"><h3>Materiales</h3>${txt(d.materiales || "—")}</div>
        <div class="col"><h3>Para la próxima clase</h3>${txt(d.proxima || "—")}</div>
      </div>`,

    // Actividad que se hace en la plataforma (Tareas): pasos y QR para que los alumnos entren desde el celular
    plataforma: d => `
      <span class="etiqueta">${esc(d.etiqueta || "En la plataforma")}</span>${d.tipoAct ? `<span class="tipo-act">${esc(d.tipoAct)}</span>` : ""}
      <h2>${esc(d.titulo)}</h2>
      <div class="plat"><ol>${(d.pasos || []).map(p => `<li${d.pasoAPaso ? ' class="fragment"' : ""}>${txt(p)}</li>`).join("")}</ol>
        ${d.enlace ? `<div class="qr-dia" data-qr="${esc(d.enlace)}"><span>Escanea con tu celular<br>${esc(d.textoEnlace || "Aula Virtual → Tareas")}</span></div>` : ""}</div>`,

    portada: d => `
      <h1>${esc(d.titulo)}</h1>
      ${d.subtitulo ? `<p>${esc(d.subtitulo)}</p>` : ""}`
  };

  function crear(d) {
    const sec = document.createElement("section");
    const fn = plantillas[d.tipo] || (window.PASOS && window.PASOS.plantillas[d.tipo]);
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
    volver.textContent = "← " + (P.textoVolver || "Todas las diapositivas");
    document.body.appendChild(volver);
    // Se esconde sola para no tapar la diapositiva; reaparece al mover el mouse o tocar la pantalla.
    let espera;
    const mostrar = () => {
      volver.classList.remove("oculto");
      clearTimeout(espera);
      espera = setTimeout(() => volver.classList.add("oculto"), 3000);
    };
    ["mousemove", "touchstart", "keydown"].forEach(ev => document.addEventListener(ev, mostrar, { passive: true }));
    mostrar();

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
        const doble = im.closest(".con-imagen, .pd, .obs");
        if (doble) {                       // en diapositivas de texto + imagen, la imagen faltante simplemente no se muestra
          im.parentElement.remove();
          if (doble.classList.contains("obs")) doble.style.gridTemplateColumns = "1fr";
          else doble.classList.add(doble.classList.contains("pd") ? "sola" : "sin-imagen");
          console.warn("Falta la imagen: " + im.dataset.ruta);
          return;
        }
        const v = document.createElement("div");
        v.className = "vacio";
        v.textContent = "Falta la imagen: " + im.dataset.ruta + ". Súbela a la carpeta diapositivas/img/.";
        im.replaceWith(v);
      });
    });

    const qrs = cont.querySelectorAll("[data-qr]");
    if (qrs.length) {
      const pintarQR = () => qrs.forEach(el => {
        try {
          const q = qrcode(0, "H"); q.addData(new URL(el.dataset.qr, location.href).href); q.make();
          const n = q.getModuleCount(), m = 4, t = n + 2 * m; let dd = "";
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) dd += `M${c + m} ${r + m}h1v1h-1z`;
          el.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="Código QR"><rect width="${t}" height="${t}" fill="#fff"/><path d="${dd}" fill="#000"/></svg>`);
        } catch (e) { console.warn("No se pudo dibujar el QR", e); }
      });
      if (typeof qrcode === "function") pintarQR();
      else { const sc = document.createElement("script"); sc.src = "../js/vendor/qrcode.js"; sc.onload = pintarQR; document.head.appendChild(sc); }
    }

    const t = (P.diapositivas || [])[0];
    if (t) document.title = t.titulo + " · " + (P.materia || "Diapositivas");
  }

  /* ---------- 5. Modo docente: notas visibles en celular con ?docente ---------- */
  const DOCENTE = new URLSearchParams(location.search).has("docente");

  function modoDocente() {
    const panel = document.createElement("div");
    panel.className = "panel-docente";
    panel.setAttribute("aria-live", "polite");
    const btn = document.createElement("button");
    btn.className = "btn-notas";
    btn.type = "button";
    btn.textContent = "Ocultar notas";
    btn.addEventListener("click", () => {
      const oculto = panel.classList.toggle("oculto");
      btn.textContent = oculto ? "Ver notas" : "Ocultar notas";
    });
    document.body.appendChild(panel);
    document.body.appendChild(btn);

    const actualizar = () => {
      const actual = Reveal.getCurrentSlide();
      const n = actual && actual.querySelector(":scope > aside.notes");
      const num = "Diapositiva " + (Reveal.getSlidePastCount() + 1) + " de " + Reveal.getTotalSlides();
      panel.innerHTML = "<b>" + num + "</b> · " + (n ? esc(n.textContent) : "Sin notas en esta diapositiva.");
    };
    Reveal.on("ready", actualizar);
    Reveal.on("slidechanged", actualizar);
    if (Reveal.isReady()) actualizar();
  }

  function script(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = mal;
      document.head.appendChild(s);
    });
  }

  function iniciar() {
    script(new URL("pasos.js?v=2026111003", AQUI).href).catch(() => console.warn("No se pudo cargar pasos.js"))
      .then(() => { construir(); script(new URL("../js/siglos.js?v=2026111201", AQUI).href).catch(() => {}); return script(REVEAL + "dist/reveal.js"); })
      .then(() => script(REVEAL + "plugin/notes/notes.js").catch(() => {}))
      .then(() => {
        Reveal.initialize({
          hash: true, slideNumber: "c/t", transition: "slide", center: true,
          width: 1280, height: 720, margin: 0.04, preloadIframes: false,
          plugins: window.RevealNotes ? [RevealNotes] : []
        });
        if (window.PASOS) window.PASOS.activar(Reveal);
        // Glosario: subraya las palabras del glosario en cada diapositiva y llena las «Palabras de hoy»
        if (P.glosario !== false) script(new URL("../js/glosario.js?v=2026111201", AQUI).href).then(() => window.GLOSARIO.listo).then(() => {
          document.querySelectorAll(".reveal .slides section").forEach(sec => { if (!sec.querySelector("section")) window.GLOSARIO.marcar(sec); });
          window.GLOSARIO.fichas(document);
        }).catch(() => {});
        if (DOCENTE) modoDocente();
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
