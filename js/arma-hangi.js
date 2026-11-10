// arma-hangi.js — «Arma el horno de tierra»: práctica de clase (5 min). Parte 1: acomodar las capas del
// horno en el dibujo; parte 2: ordenar los pasos. La mejor marca se guarda en el celular.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const barajar = a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };

const SVG = `<svg viewBox="0 0 620 470" role="img" aria-label="Corte de un horno de tierra: hoyo, fuego, piedras volcánicas, comida envuelta, hojas, telas húmedas y tierra"><defs><radialGradient id="hgBrasa" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#FFB347" stop-opacity=".95"/><stop offset=".6" stop-color="#E4572E" stop-opacity=".55"/><stop offset="1" stop-color="#E4572E" stop-opacity="0"/></radialGradient><linearGradient id="hgSuelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A6A45"/><stop offset="1" stop-color="#5E4429"/></linearGradient></defs><rect x="0" y="0" width="620" height="170" fill="#E8F1F5"/><rect x="0" y="170" width="620" height="300" fill="url(#hgSuelo)"/><path d="M0,170 H620" stroke="#5B8C3A" stroke-width="8"/><g ><path d="M140,170 L185,400 L415,400 L460,170 Z" fill="#3E2A17" stroke="#2A1B0D" stroke-width="3"/><text x="300" y="440" text-anchor="middle" font-family="Public Sans,sans-serif" font-weight="700" font-size="18" fill="#F4E9D8">el hoyo</text></g><g ><ellipse cx="300" cy="384" rx="118" ry="34" fill="url(#hgBrasa)"/><g fill="#3B3B3B" stroke="#1E1E1E" stroke-width="2"><circle cx="205" cy="384" r="15"/><circle cx="236" cy="389" r="16"/><circle cx="268" cy="386" r="15"/><circle cx="300" cy="390" r="16"/><circle cx="332" cy="386" r="15"/><circle cx="364" cy="389" r="16"/><circle cx="395" cy="384" r="15"/><circle cx="222" cy="361" r="13"/><circle cx="252" cy="364" r="14"/><circle cx="284" cy="362" r="13"/><circle cx="316" cy="364" r="14"/><circle cx="348" cy="362" r="13"/><circle cx="378" cy="361" r="13"/></g><g fill="#FF7A2F" opacity=".75"><circle cx="236" cy="389" r="6"/><circle cx="300" cy="390" r="6"/><circle cx="364" cy="389" r="6"/><circle cx="284" cy="362" r="5"/><circle cx="348" cy="362" r="5"/></g></g><g style="display:none"><path d="M262,352 C255,330 275,322 270,300 C290,318 296,332 290,352 Z M296,352 C292,322 316,312 308,284 C334,306 336,330 326,352 Z M330,352 C326,334 344,326 340,308 C358,324 360,340 352,352 Z" fill="#F3A33A" stroke="#D9542B" stroke-width="3"/></g><g ><g stroke="#2F5A22" stroke-width="2.5"><rect x="200" y="314" width="62" height="34" rx="12" fill="#5C8F3A"/><rect x="268" y="316" width="62" height="34" rx="12" fill="#6A9B45"/><rect x="336" y="314" width="62" height="34" rx="12" fill="#5C8F3A"/><rect x="232" y="280" width="62" height="34" rx="12" fill="#6A9B45"/><rect x="300" y="280" width="62" height="34" rx="12" fill="#5C8F3A"/></g><g font-family="Public Sans,sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle"><text x="231" y="336">carne</text><text x="299" y="338">kumara</text><text x="367" y="336">pescado</text><text x="263" y="302">taro</text><text x="331" y="302">verdura</text></g></g><g ><path d="M168,272 Q192,258 214,272 T260,272 T306,272 T352,272 T398,272 T436,270 L434,262 Q412,248 390,262 T344,262 T298,262 T252,262 T206,262 T170,262 Z" fill="#3F7A2E" stroke="#27501B" stroke-width="2"/><path d="M164,250 L438,250 L436,236 L166,236 Z" fill="#D8CDB4" stroke="#A89A7C" stroke-width="2"/><path d="M140,170 L164,234 L438,234 L460,170 Z" fill="#7A5A38"/><path d="M128,172 Q300,96 472,172 Z" fill="#8A6A45" stroke="#5E4429" stroke-width="3"/></g><g  class="vapor"><path d="M230,278 q-8,-8 0,-14 q8,-6 0,-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/><path d="M300,278 q-8,-8 0,-14 q8,-6 0,-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/><path d="M370,278 q-8,-8 0,-14 q8,-6 0,-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/></g><g ><circle cx="545" cy="78" r="40" fill="#fff" stroke="#252734" stroke-width="5"/><path d="M545,78 V50 M545,78 L566,90" stroke="#AA2F2F" stroke-width="5" stroke-linecap="round"/><text x="545" y="148" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-weight="700" font-size="22" fill="#252734">3 a 4 horas</text></g><g ><path d="M262,112 q-10,-14 0,-26 q10,-12 0,-26 M300,104 q-10,-14 0,-26 q10,-12 0,-26 M338,112 q-10,-14 0,-26 q10,-12 0,-26" fill="none" stroke="#9AA3AD" stroke-width="4" stroke-linecap="round"/></g></svg>`;
// Zonas del dibujo (en % del ancho y alto del dibujo 620×470)
export const ZONAS = [
  { id: 'tierra', n: 'Tierra', x: 300, y: 142, por: 'La última capa: sella el horno para que no escape el calor.' },
  { id: 'telas', n: 'Telas o sacos húmedos', x: 300, y: 243, por: 'Van mojados: dan humedad y no dejan que la tierra caiga sobre la comida.' },
  { id: 'hojas', n: 'Hojas', x: 410, y: 266, por: 'Cubren y envuelven la comida: humedad y aroma.' },
  { id: 'vapor', n: 'Vapor atrapado', x: 232, y: 262, por: 'La humedad de la comida y las hojas no puede salir: todo se cuece al vapor.' },
  { id: 'comida', n: 'Comida envuelta', x: 299, y: 333, por: 'Carne, pescado, kumara y taro envueltos en hojas.' },
  { id: 'piedras', n: 'Piedras volcánicas calientes', x: 205, y: 386, por: 'Calentadas con leña hasta el rojo vivo: son la fuente de calor.' },
];
export const SOBRA = 'Olla de barro';
export const PASOS_HANGI = ['Cavar el hoyo', 'Calentar piedras volcánicas con leña', 'Retirar las brasas y acomodar la comida envuelta', 'Tapar con hojas, telas húmedas y tierra', 'Esperar de 3 a 4 horas', 'Destapar entre todos y compartir'];

export function actArmaHangi(cont, nombre) {
  let fase = 1, intento = 1, puestas = {}, sel = null, revisada = false, p1 = 0, orden = [], pool = [];
  const clave = 'clase_arma-hangi_mejor';
  const inicio = () => {
    cont.innerHTML = `<p class="atlas-ayuda">Un horno de tierra (hangi, umu, lovo… o nuestro <b>pib</b>) tiene capas. <b>Parte 1:</b> toca una etiqueta y luego el número del dibujo donde va. <b>Parte 2:</b> ordena los pasos. ¡Ojo, sobra una etiqueta!</p>
      <p class="ah-mejor">Tu mejor marca: <b>${esc(ls.get(clave) || '—')}</b></p><div id="ah-zona"></div>`;
    parte1();
  };
  const parte1 = () => {
    fase = 1; puestas = {}; sel = null; revisada = false;
    const chips = barajar([...ZONAS.map(z => z.n), SOBRA]);
    const z = cont.querySelector('#ah-zona');
    z.innerHTML = `<h3 class="ah-h3">Parte 1 · Las capas del horno</h3>
      <div class="ah-fig">${SVG}${ZONAS.map((q, i) => `<button type="button" class="ah-zona" data-z="${q.id}" style="left:${(q.x / 6.2).toFixed(1)}%;top:${(q.y / 4.7).toFixed(1)}%"><b>${i + 1}</b><span></span></button>`).join('')}</div>
      <ol class="ah-leyenda">${ZONAS.map(q => `<li data-l="${q.id}"></li>`).join('')}</ol>
      <div class="ah-chips">${chips.map(c => `<button type="button" class="ah-chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="ah-acc"><button type="button" class="btn-at" id="ah-rev" disabled>Revisar</button><span id="ah-msg"></span></div><div id="ah-fb"></div>`;
    const pintar = () => {
      z.querySelectorAll('.ah-zona').forEach(b => { const v = puestas[b.dataset.z]; b.querySelector('span').textContent = v || ''; b.classList.toggle('llena', !!v); });
      z.querySelectorAll('[data-l]').forEach(li => { const v = puestas[li.dataset.l]; li.innerHTML = v ? esc(v) : '<i>— toca una etiqueta y luego este número —</i>'; li.classList.toggle('llena', !!v); });
      const usadas = new Set(Object.values(puestas));
      z.querySelectorAll('.ah-chip').forEach(b => { b.classList.toggle('usada', usadas.has(b.dataset.c)); b.classList.toggle('sel', sel === b.dataset.c); });
      const n = Object.keys(puestas).length;
      z.querySelector('#ah-rev').disabled = n < ZONAS.length;
      z.querySelector('#ah-msg').textContent = sel ? `Ahora toca el número donde va «${sel}».` : n < ZONAS.length ? `${n} de ${ZONAS.length} colocadas` : '¡Listo! Revisa.';
    };
    z.querySelectorAll('.ah-chip').forEach(b => b.addEventListener('click', () => { if (revisada) return; const c = b.dataset.c;
      if (b.classList.contains('usada')) { for (const k in puestas) if (puestas[k] === c) delete puestas[k]; }
      sel = sel === c ? null : c; pintar(); }));
    z.querySelectorAll('.ah-zona').forEach(b => b.addEventListener('click', () => { if (revisada) return; const k = b.dataset.z;
      if (sel) { for (const q in puestas) if (puestas[q] === sel) delete puestas[q]; puestas[k] = sel; sel = null; }
      else if (puestas[k]) { sel = puestas[k]; delete puestas[k]; }
      pintar(); }));
    z.querySelector('#ah-rev').addEventListener('click', () => {
      revisada = true; p1 = 0;
      z.querySelectorAll('.ah-zona').forEach(b => { const q = ZONAS.find(x => x.id === b.dataset.z), ok = puestas[q.id] === q.n; if (ok) p1++; b.classList.add(ok ? 'bien' : 'mal'); if (!ok) b.querySelector('span').innerHTML = `<s>${esc(puestas[q.id] || '')}</s> ${esc(q.n)}`;
        const li = z.querySelector(`[data-l="${q.id}"]`); li.className = ok ? 'bien' : 'mal'; li.innerHTML = ok ? `✓ ${esc(q.n)}` : `<s>${esc(puestas[q.id] || '')}</s> → <b>${esc(q.n)}</b>`; });
      z.querySelector('#ah-fb').innerHTML = `<div class="aviso ${p1 === ZONAS.length ? 'ok' : 'mal'}"><b>${p1} de ${ZONAS.length} capas bien.</b> ${p1 === ZONAS.length ? '¡Perfecto!' : 'Mira las correcciones en el dibujo.'} La que sobraba: <b>${SOBRA}</b> (el horno de tierra no usa ollas).</div>
        <ol class="ah-por">${ZONAS.map((q, i) => `<li><b>${i + 1}. ${esc(q.n)}:</b> ${esc(q.por)}</li>`).join('')}</ol>
        <button type="button" class="btn-at" id="ah-sig">Parte 2: ordena los pasos →</button>`;
      z.querySelector('#ah-rev').hidden = true; z.querySelector('#ah-msg').textContent = '';
      z.querySelector('#ah-sig').addEventListener('click', parte2);
    });
    pintar();
  };
  const parte2 = () => {
    fase = 2; orden = []; pool = barajar(PASOS_HANGI.map((t, i) => i)); revisada = false;
    const z = cont.querySelector('#ah-zona');
    const pintar = () => {
      z.innerHTML = `<h3 class="ah-h3">Parte 2 · ¿En qué orden?</h3><p class="atlas-ayuda">Toca los pasos del <b>primero al último</b>. Si te equivocas, toca uno de tu lista para regresarlo.</p>
        <div class="ah-orden"><div><h4>Pasos</h4>${pool.filter(i => !orden.includes(i)).map(i => `<button type="button" class="ah-paso" data-p="${i}">${esc(PASOS_HANGI[i])}</button>`).join('') || '<p class="ah-vacio">¡Ya los acomodaste todos!</p>'}</div>
          <div><h4>Tu orden</h4><ol>${orden.map((i, k) => `<li><button type="button" class="ah-paso puesto ${revisada ? (i === k ? 'bien' : 'mal') : ''}" data-q="${k}">${esc(PASOS_HANGI[i])}${revisada && i !== k ? ` <small>→ va en el ${PASOS_HANGI.indexOf(PASOS_HANGI[i]) + 1}</small>` : ''}</button></li>`).join('')}</ol></div></div>
        <div class="ah-acc">${revisada ? '' : `<button type="button" class="btn-at" id="ah-rev2" ${orden.length < PASOS_HANGI.length ? 'disabled' : ''}>Revisar</button>`}</div><div id="ah-fb"></div>`;
      if (!revisada) {
        z.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { orden.push(+b.dataset.p); pintar(); }));
        z.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { orden.splice(+b.dataset.q, 1); pintar(); }));
        const r = z.querySelector('#ah-rev2'); if (r) r.addEventListener('click', () => { revisada = true; pintar(); final(); });
      }
    };
    const final = () => {
      const p2 = orden.filter((i, k) => i === k).length, tot = p1 + p2, max = ZONAS.length + PASOS_HANGI.length;
      const previa = Number((ls.get(clave) || '0').split('/')[0]) || 0;
      if (tot > previa) ls.set(clave, `${tot}/${max}`);
      z.querySelector('#ah-fb').innerHTML = `<div class="ah-tarjeta"><span class="ah-estrella">${tot === max ? '🏆' : tot >= max * .75 ? '⭐' : '🔥'}</span>
        <div><small>Arma el horno de tierra · intento ${intento}</small><b>${esc(nombre || 'Tu resultado')}</b><em>${tot} de ${max}</em><small>Capas: ${p1}/${ZONAS.length} · Pasos: ${p2}/${PASOS_HANGI.length}${tot > previa && intento > 1 ? ' · 🏅 ¡Nueva mejor marca!' : ''}</small></div></div>
        <p class="atlas-ayuda">Muéstrale esta tarjeta a tu maestro.</p><button type="button" class="btn-ruta" id="ah-otra">↻ Intentarlo otra vez</button>`;
      z.querySelector('#ah-otra').addEventListener('click', () => { intento++; inicio(); });
    };
    pintar();
  };
  inicio();
}
