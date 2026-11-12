/* siglos.js — Ayuda con los siglos.
   · Busca en la página las menciones de siglos («siglo XVI», «siglos XVIII y XIX», «s. XX», «siglo V a. C.»…)
     y las subraya con punteado, como el glosario.
   · Al tocarlas abre una tarjetita: qué años son, hace cuánto fue, el truco para calcularlo
     y una mini línea del tiempo con ese siglo resaltado.
   · Funciona también con lo que se pinta después (tareas, compendio, diapositivas): vigila los cambios de la página.
   Para que una zona no se marque, ponle la clase «no-sg». */
(function () {
  if (window.SIGLOS) return;
  const EP = /epistemologia/i.test(location.pathname);
  const ACENTO = EP ? "#B8892E" : "#AA2F2F";
  const HOY = new Date().getFullYear();
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mil = n => String(n);   // los años no llevan separador de miles (RAE)

  const css = `
  .sg{cursor:help;border-bottom:2px dotted currentColor;color:inherit;font:inherit}
  .sg:hover,.sg:focus{background:rgba(201,160,74,.22);outline:none}
  .sg-pop{position:fixed;z-index:9999;width:min(360px,92vw);background:#fff;color:#1A1A1A;border:2px solid #252734;border-top:6px solid ${ACENTO};border-radius:10px;
    box-shadow:0 14px 34px rgba(0,0,0,.28);padding:12px 14px 12px;font:400 15px/1.45 "Public Sans",system-ui,sans-serif;text-align:left}
  .sg-pop>b{display:block;font:700 19px/1.2 "Fraunces",Georgia,serif;color:#252734;margin:0 22px 4px 0}
  .sg-pop .sg-anios{font-size:17px;margin:0 0 2px}.sg-pop .sg-anios strong{color:${ACENTO}}
  .sg-pop .sg-hace{font-size:13px;color:#6B675F;margin:0 0 8px}
  .sg-pop .sg-truco{background:#F4F2ED;border-radius:8px;padding:7px 9px;margin:0 0 10px;font-size:14px}
  .sg-pop .sg-truco i{font-style:normal;font-weight:700;color:#252734}
  .sg-pop .sg-truco .sg-paso{display:inline-block;background:#fff;border:1px solid #DDD6C8;border-radius:6px;padding:0 6px;margin:2px 0;font-weight:700}
  .sg-linea{display:flex;gap:1px;height:16px;margin:2px 0 2px}
  .sg-linea span{flex:1;background:#E4DFD4;border-radius:2px;position:relative}
  .sg-linea span.on{background:${ACENTO}}
  .sg-linea span.cero{margin-left:4px}
  .sg-linea span.hoy::after{content:"";position:absolute;right:-1px;top:-5px;bottom:-5px;width:3px;background:#252734;border-radius:2px}
  .sg-ejes{display:flex;justify-content:space-between;font-size:11px;color:#6B675F;position:relative;height:15px}
  .sg-ejes em{position:absolute;font-style:normal;transform:translateX(-50%);white-space:nowrap}
  .sg-pop button{position:absolute;top:6px;right:8px;border:0;background:none;font-size:20px;cursor:pointer;color:#6B675F;line-height:1}
  .sg-pop.grande{width:min(460px,92vw);font-size:18px}.sg-pop.grande>b{font-size:24px}.sg-pop.grande .sg-anios{font-size:21px}.sg-pop.grande .sg-truco{font-size:17px}.sg-pop.grande .sg-hace{font-size:15px}
  @media print{.sg{border-bottom:0}.sg-pop{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- números romanos ---------- */
  const VAL = { I: 1, V: 5, X: 10, L: 50 };
  function romano(r) {
    let n = 0;
    for (let i = 0; i < r.length; i++) { const v = VAL[r[i]], s = VAL[r[i + 1]] || 0; n += v < s ? -v : v; }
    return n >= 1 && n <= 30 && aRomano(n) === r ? n : 0;   // solo romanos bien escritos
  }
  function aRomano(n) {
    let s = ""; [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]].forEach(([v, l]) => { while (n >= v) { s += l; n -= v; } });
    return s;
  }

  /* ---------- buscar menciones ---------- */
  const R1 = "[IVXL]+(?![\\p{L}\\p{N}])";
  const UNION = "\\s*(?:,|-|–|—|\\by\\b|\\be\\b|\\bo\\b|\\bal\\b|\\ba\\b)\\s*(?:el\\s+|los\\s+)?";
  const ANTES = "a\\.\\s?C\\.|a\\.\\s?n\\.\\s?e\\.|a\\.\\s?e\\.\\s?c\\.|antes de (?:Cristo|nuestra era)";
  const DESPUES = "d\\.\\s?C\\.|n\\.\\s?e\\.|después de Cristo";
  const RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:[Ss]iglos?|[Ss]\\.)\\s+(${R1}(?:${UNION}${R1})*)(?:\\s*(?:(${ANTES})|(${DESPUES})))?`, "gu");

  function leer(m) {
    const nums = (m[1].match(/[IVXL]+/g) || []).map(romano);
    if (!nums.length || nums.some(n => !n)) return null;
    return { a: Math.min(...nums), b: Math.max(...nums), ac: !!m[2], txt: m[0] };
  }

  const SALTAR = "svg,a,button,script,style,textarea,input,select,option,code,pre,[contenteditable],.sg,.sg-pop,.gl,.gl-pop,.no-sg,aside.notes,title";
  function marcar(raiz) {
    if (!raiz) return 0;
    let n = 0;
    const nodos = [];
    if (raiz.nodeType === 3) { if (raiz.parentElement && !raiz.parentElement.closest(SALTAR)) nodos.push(raiz); }
    else if (raiz.nodeType === 1 && !raiz.closest(SALTAR)) {
      const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: t => !/iglo|s\./.test(t.nodeValue) || (t.parentElement && t.parentElement.closest(SALTAR)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      while (w.nextNode()) nodos.push(w.currentNode);
    }
    nodos.forEach(t => {
      const s = t.nodeValue; RE.lastIndex = 0; let m, ult = 0, cambio = false; const frag = document.createDocumentFragment();
      while ((m = RE.exec(s))) {
        const d = leer(m); if (!d) continue;
        cambio = true; n++;
        frag.append(s.slice(ult, m.index));
        const b = document.createElement("span");
        b.className = "sg"; b.tabIndex = 0; b.setAttribute("role", "button"); b.title = "¿Qué años son?";
        b.dataset.sg = `${d.a}-${d.b}-${d.ac ? "ac" : "dc"}`; b.textContent = m[0];
        frag.append(b); ult = m.index + m[0].length;
      }
      if (cambio) { frag.append(s.slice(ult)); t.replaceWith(frag); }
    });
    return n;
  }

  /* ---------- cálculos ---------- */
  // Años (negativos = antes de Cristo; no hay año 0)
  const inicio = (n, ac) => ac ? -(n * 100) : (n - 1) * 100 + 1;
  const fin = (n, ac) => ac ? -((n - 1) * 100 + 1) : n * 100;
  const anio = y => y < 0 ? `${mil(-y)} a. C.` : mil(y);
  const haceDe = y => y < 0 ? HOY + (-y) - 1 : HOY - y;
  const CEN = ["", "cien", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
  function enLetra(base) {           // 1500 → «mil quinientos»
    const m = Math.floor(base / 1000), c = Math.floor((base % 1000) / 100);
    return [m === 1 ? "mil" : m === 2 ? "dos mil" : "", CEN[c]].filter(Boolean).join(" ");
  }

  function tarjeta(a, b, ac, txt) {
    const desde = ac ? inicio(b, true) : inicio(a, false);
    const hasta = ac ? fin(a, true) : fin(b, false);
    const varios = a !== b;
    const nom = (varios ? "Siglos " : "Siglo ") + aRomano(a) + (varios ? (b - a === 1 ? " y " : " al ") + aRomano(b) : "") + (ac ? " a. C." : "");
    let anios = `Años <strong>${anio(desde)}</strong> a <strong>${anio(hasta)}</strong>`;
    if (!ac && !varios && a >= 2) anios += `<br><span style="font-size:.82em;color:#5C5A55">es decir, «los ${mil((a - 1) * 100)}» (los años ${enLetra((a - 1) * 100)})</span>`;
    let hace;
    if (!ac && hasta >= HOY) hace = varios ? `Llega hasta hoy: el siglo XXI es el nuestro.` : `¡Es nuestro siglo! Empezó en el año 2001.`;
    else hace = `Hace entre ${mil(haceDe(hasta))} y ${mil(haceDe(desde))} años, aproximadamente.`;
    // el truco
    const n = ac ? b : a;
    const truco = ac
      ? `<i>El truco:</i> ${aRomano(n)} = <span class="sg-paso">${n}</span> → antes de Cristo se cuenta <b>hacia atrás</b>: del <span class="sg-paso">${mil(n * 100)}</span> baja hasta el <span class="sg-paso">${mil((n - 1) * 100 + 1)}</span>.`
      : `<i>El truco:</i> ${aRomano(n)} = <span class="sg-paso">${n}</span> → réstale 1 → <span class="sg-paso">${n - 1}</span> → agrégale dos ceros → <span class="sg-paso">los ${mil((n - 1) * 100)}</span>${n === 1 ? " (los primeros cien años)" : ""}.`;
    // línea del tiempo: centurias como enteros (−n = n a. C.)
    const lo = Math.min(-5, ac ? -b : a), hi = 21;
    const cs = []; for (let c = lo; c <= hi; c++) if (c !== 0) cs.push(c);
    const encendido = c => ac ? (c <= -a && c >= -b) : (c >= a && c <= b);
    const barras = cs.map(c => `<span class="${encendido(c) ? "on" : ""}${c === 1 ? " cero" : ""}${c === 21 ? " hoy" : ""}" title="Siglo ${aRomano(Math.abs(c))}${c < 0 ? " a. C." : ""}"></span>`).join("");
    const pct = c => ((cs.indexOf(c) + 0.5) / cs.length * 100).toFixed(1) + "%";
    const marcas = [[lo, `${aRomano(-lo)} a. C.`], [1, "I d. C."], [10, "X"], [21, "XXI · hoy"]]
      .map(([c, t]) => `<em style="left:${pct(c)}${c === 21 ? ";transform:translateX(-80%)" : c === lo ? ";transform:none" : ""}">${t}</em>`).join("");
    return `<button type="button" aria-label="Cerrar">×</button><b>${esc(nom)}</b>
      <p class="sg-anios">${anios}</p><p class="sg-hace">${hace}</p>
      <p class="sg-truco">${truco}</p>
      <div class="sg-linea" aria-hidden="true">${barras}</div><div class="sg-ejes" aria-hidden="true">${marcas}</div>`;
  }

  /* ---------- la ventanita ---------- */
  let pop = null;
  const cerrar = () => { if (pop) { pop.remove(); pop = null; } };
  function abrir(el) {
    const [a, b, e] = el.dataset.sg.split("-");
    cerrar();
    pop = document.createElement("div"); pop.className = "sg-pop" + (document.querySelector(".reveal") ? " grande" : ""); pop.setAttribute("role", "dialog");
    pop.innerHTML = tarjeta(+a, +b, e === "ac", el.textContent);
    document.body.appendChild(pop);
    const r = el.getBoundingClientRect(), W = pop.offsetWidth, H = pop.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), innerWidth - W - 8), y = r.bottom + 8;
    if (y + H > innerHeight - 8) y = Math.max(8, r.top - H - 8);
    pop.style.left = x + "px"; pop.style.top = y + "px";
    pop.querySelector("button").addEventListener("click", cerrar);
  }
  document.addEventListener("click", ev => {
    const g = ev.target.closest && ev.target.closest(".sg");
    if (g) { ev.preventDefault(); ev.stopPropagation(); abrir(g); }
    else if (pop && !ev.target.closest(".sg-pop")) cerrar();
  }, true);
  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape") cerrar();
    else if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList && ev.target.classList.contains("sg")) { ev.preventDefault(); ev.stopPropagation(); abrir(ev.target); }
  }, true);
  addEventListener("scroll", cerrar, true);
  addEventListener("resize", cerrar);

  /* ---------- marcar ahora y lo que se pinte después ---------- */
  let pend = new Set(), timer = 0;
  function vaciar() { timer = 0; const L = [...pend]; pend = new Set(); L.forEach(nd => { if (nd.isConnected) marcar(nd); }); }
  function arrancar() {
    marcar(document.body);
    new MutationObserver(ms => {
      ms.forEach(m => m.addedNodes.forEach(nd => { if (nd.nodeType === 1 || nd.nodeType === 3) pend.add(nd); }));
      if (pend.size && !timer) timer = setTimeout(vaciar, 150);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) arrancar(); else document.addEventListener("DOMContentLoaded", arrancar);

  window.SIGLOS = { marcar, tarjeta };
})();
