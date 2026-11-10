/* glosario.js — Glosario del curso: datos en data/glosario.json.
   · Marca las palabras del glosario en un texto (la primera vez que aparece cada una) y, al tocarlas,
     muestra una ventanita con su definición. Lo usan el compendio (tema.html) y las diapositivas.
   · Llena las tarjetas «Palabras de hoy» de las diapositivas ([data-glf="id"]).
   Mientras el glosario no esté publicado (publicado: false), solo funciona con ?revisar o ?docente. */
(function () {
  const yo = document.currentScript && document.currentScript.src;
  const RAIZ = new URL("../", yo || location.href).href;          // la raíz del sitio (este archivo vive en js/)
  const q = new URLSearchParams(location.search), FORZAR = q.has("revisar") || q.has("docente");
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let D = null, RE = null; const POR = new Map(), ID = new Map();

  const css = `
  .gl{cursor:help;border-bottom:2px dotted currentColor;text-decoration:none;color:inherit;font:inherit;background:none;padding:0;margin:0}
  .gl:hover,.gl:focus{background:rgba(201,160,74,.22);outline:none}
  .gl-pop{position:fixed;z-index:9999;max-width:min(340px,92vw);background:#fff;color:#1A1A1A;border:2px solid #252734;border-top:6px solid #AA2F2F;border-radius:10px;
    box-shadow:0 14px 34px rgba(0,0,0,.28);padding:12px 14px 10px;font:400 15px/1.45 "Public Sans",system-ui,sans-serif;text-align:left}
  .gl-pop b{display:block;font:700 18px/1.2 "Fraunces",Georgia,serif;color:#252734;margin-bottom:2px}
  .gl-pop small{display:block;font-size:12px;color:#6B675F;margin-bottom:6px}
  .gl-pop p{margin:0 0 8px}
  .gl-pop a{font-size:13px;font-weight:700;color:#AA2F2F}
  .gl-pop button{position:absolute;top:6px;right:8px;border:0;background:none;font-size:18px;cursor:pointer;color:#6B675F}
  .gl-ficha .gl-t{font-weight:700}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const listo = fetch(RAIZ + "data/glosario.json").then(r => r.json()).then(d => {
    D = d;
    if (!d.publicado && !FORZAR) return null;
    const alts = [];
    d.terminos.forEach(e => {
      ID.set(e.id, e);
      if (e.noMarcar) return;
      (e.marcar || [e.t, ...(e.v || [])]).forEach(f => { const k = norm(f.replace(/\s*\(.*\)$/, "")); if (k.length > 2 && !POR.has(k)) { POR.set(k, e); alts.push(f.replace(/\s*\(.*\)$/, "")); } });
    });
    alts.sort((a, b) => b.length - a.length);
    // sin distinguir acentos: cada vocal acepta su versión con o sin tilde
    const flex = s => escRe(s).replace(/[aá]/gi, "[aáà]").replace(/[eé]/gi, "[eé]").replace(/[ií]/gi, "[ií]").replace(/[oó]/gi, "[oó]").replace(/[uúü]/gi, "[uúü]").replace(/\s+/g, "\\s+");
    RE = new RegExp(`(?<![\\p{L}\\p{N}])(${alts.map(flex).join("|")})(?![\\p{L}\\p{N}])`, "giu");
    return d;
  }).catch(() => null);

  const SALTAR = "svg,a,button,script,style,textarea,input,select,code,h1,.gl,.gl-pop,.no-gl,aside.notes,.pz-tick,mark";
  function marcar(raiz, { una = true } = {}) {
    if (!RE || !raiz) return 0;
    const vistos = new Set(); let n = 0;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: t => !t.nodeValue.trim() || (t.parentElement && t.parentElement.closest(SALTAR)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodos = []; while (w.nextNode()) nodos.push(w.currentNode);
    nodos.forEach(t => {
      const s = t.nodeValue; RE.lastIndex = 0; let m, ult = 0; const frag = document.createDocumentFragment(); let cambio = false;
      while ((m = RE.exec(s))) {
        const e = POR.get(norm(m[0])); if (!e || (una && vistos.has(e.id))) continue;
        vistos.add(e.id); cambio = true; n++;
        frag.append(s.slice(ult, m.index));
        const b = document.createElement("span"); b.className = "gl"; b.tabIndex = 0; b.setAttribute("role", "button"); b.dataset.gl = e.id; b.textContent = m[0]; b.title = "Ver en el glosario";
        frag.append(b); ult = m.index + m[0].length;
      }
      if (cambio) { frag.append(s.slice(ult)); t.replaceWith(frag); }
    });
    return n;
  }

  // ---- la ventanita
  let pop = null;
  const cerrar = () => { if (pop) { pop.remove(); pop = null; } };
  function abrir(el) {
    const e = ID.get(el.dataset.gl); if (!e) return;
    cerrar();
    pop = document.createElement("div"); pop.className = "gl-pop"; pop.setAttribute("role", "dialog");
    pop.innerHTML = `<button type="button" aria-label="Cerrar">×</button><b>${esc(e.t)}</b><small>${esc((D.categorias || {})[e.c] || e.c)}${e.o ? " · " + esc(e.o) : ""} · subtema ${esc(e.tema)}</small><p>${esc(e.d)}</p><a href="${RAIZ}glosario.html${FORZAR ? "?revisar" : ""}#${e.id}" target="_blank" rel="noopener">Ver todo el glosario ↗</a>`;
    document.body.appendChild(pop);
    const r = el.getBoundingClientRect(), W = pop.offsetWidth, H = pop.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), innerWidth - W - 8), y = r.bottom + 8;
    if (y + H > innerHeight - 8) y = Math.max(8, r.top - H - 8);
    pop.style.left = x + "px"; pop.style.top = y + "px";
    pop.querySelector("button").addEventListener("click", cerrar);
  }
  document.addEventListener("click", ev => { const g = ev.target.closest && ev.target.closest(".gl"); if (g) { ev.preventDefault(); ev.stopPropagation(); abrir(g); } else if (pop && !ev.target.closest(".gl-pop")) cerrar(); }, true);
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") cerrar(); else if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList && ev.target.classList.contains("gl")) { ev.preventDefault(); abrir(ev.target); } });
  addEventListener("scroll", cerrar, true);

  // ---- «Palabras de hoy» en las diapositivas
  function fichas(raiz) {
    (raiz || document).querySelectorAll("[data-glf]").forEach(c => {
      const e = D && D.terminos.find(x => x.id === c.dataset.glf || norm(x.t) === norm(c.dataset.glf));
      if (!e) { c.querySelector(".gl-d") && (c.querySelector(".gl-d").textContent = ""); return; }
      c.querySelector(".gl-t").textContent = e.t;
      c.querySelector(".gl-c").textContent = ((D.categorias || {})[e.c] || e.c) + (e.o ? " · " + e.o : "");
      c.querySelector(".gl-d").textContent = e.d;
    });
  }

  // El compendio avisa cuando pinta un subtema
  const enTema = () => { const c = document.querySelector(".tema-card"); if (c) marcar(c); };
  document.addEventListener("tema:renderizado", () => listo.then(enTema));
  listo.then(enTema);

  window.GLOSARIO = { listo, marcar, fichas, datos: () => D, activo: () => !!RE };
})();
