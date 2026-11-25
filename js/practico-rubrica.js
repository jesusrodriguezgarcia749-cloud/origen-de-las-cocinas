// practico-rubrica.js — Captura del examen práctico del Parcial 2 (Práctica de cocina 3)
// con la Rúbrica de Práctica de cocina: seis criterios, tres niveles cada uno.
// Logrado = 10, En proceso = 7, Insuficiente = 4; la calificación es el promedio.
// «No presentó» deja 0. Se guarda en grupos/{g}/alumnos/{a}/practico/p2 y se comprueba
// leyendo de nuevo del servidor. El alumno ve el desglose en Mi progreso.
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const NIVELES_PRACTICO = [
  { id: 'logrado', nombre: 'Logrado', pts: 10 },
  { id: 'proceso', nombre: 'En proceso', pts: 7 },
  { id: 'insuficiente', nombre: 'Insuficiente', pts: 4 },
];

export const PLATILLOS_RECADO = [
  ['Recado rojo (achiote)', ['Cochinita pibil', 'Pollo pibil', 'Tikin xic', 'Mondongo kabic', 'Lomitos de Valladolid']],
  ['Recado negro', ['Relleno negro', 'Pollo en chilmole']],
  ['Recado blanco', ['Puchero de tres carnes', 'Relleno blanco', 'Queso relleno']],
  ['Recado de escabeche', ['Pámpano en escabeche', 'Sierra en escabeche', 'Escabeche oriental', 'Pollo en escabeche']],
  ['Recado para bistec', ['Bistec de cazuela', 'Chocolomo', 'Bistec a la yucateca']],
  ['Recado verde (pepita)', ['Papadzules', "Sikil p'aak", 'Pipián de pollo']],
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const recadoDe = pl => (PLATILLOS_RECADO.find(([, l]) => l.includes(pl)) || [''])[0];

export function califRubrica(niveles, n) {
  const v = Object.values(niveles || {}).map(id => (NIVELES_PRACTICO.find(x => x.id === id) || {}).pts).filter(x => typeof x === 'number');
  if (v.length < n) return null;
  return Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10;
}

let criterios = null;
async function cargarCriterios() {
  if (criterios) return criterios;
  const curso = await (await fetch('data/curso.json', { cache: 'no-cache' })).json();
  const r = (curso.rubricas || []).find(x => x.id === 'practica');
  criterios = r ? r.criterios.map(c => ({ nombre: c[0], desc: { logrado: c[1], proceso: c[2], insuficiente: c[3] } })) : [];
  return criterios;
}

export async function vistaRubricaPractico(ctx) {
  const panel = document.getElementById('tab-practico'); if (!panel) return;
  let cont = document.getElementById('rubrica-practico');
  if (!cont) { cont = document.createElement('div'); cont.id = 'rubrica-practico'; cont.className = 'rp-wrap'; panel.insertBefore(cont, panel.firstChild); }
  const { db, grupoActivo, alumnos } = ctx;
  if (!grupoActivo) { cont.innerHTML = '<h3 class="section-title">Examen práctico con rúbrica</h3><p class="empty-inline">Elige un grupo primero.</p>'; return; }
  cont.innerHTML = '<h3 class="section-title">Examen práctico con rúbrica</h3><p class="empty-inline">Cargando…</p>';
  const C = await cargarCriterios();
  const datos = {};
  await Promise.all(alumnos.map(async a => { try { const s = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'practico', 'p2')); datos[a.id] = s.exists() ? s.data() : {}; } catch { datos[a.id] = {}; } }));
  const ref = id => doc(db, 'grupos', grupoActivo, 'alumnos', id, 'practico', 'p2');
  const chip = d => d.noPresento ? '<span class="rp-chip rp-mal">No presentó · 0</span>'
    : (d.calificacion !== undefined && d.calificacion !== null) ? `<span class="rp-chip ${d.calificacion >= 6 ? 'rp-ok' : 'rp-mal'}">${d.calificacion} / 10</span>` : '<span class="rp-chip">Sin calificar</span>';
  const listos = () => alumnos.filter(a => datos[a.id].noPresento || (datos[a.id].calificacion ?? null) !== null).length;
  const pintar = () => {
    cont.innerHTML = `<h3 class="section-title">Examen práctico con rúbrica · Parcial 2</h3>
      <p class="field-hint">Vale 20 de los 40 puntos de Examen/Proyecto del Parcial 2. Toca a un alumno, marca el nivel de cada criterio y guarda: la calificación sale sola (Logrado 10, En proceso 7, Insuficiente 4; se promedian los ${C.length} criterios). Llevas <b id="rp-cuenta">${listos()} de ${alumnos.length}</b> calificados.</p>
      ${alumnos.map(a => `<details class="rp-al" data-id="${a.id}"><summary><span>${esc(a.nombre)}</span> <span class="rp-res">${chip(datos[a.id])}${datos[a.id].platillo ? ` <small>· ${esc(datos[a.id].platillo)}</small>` : ''}</span></summary><div class="rp-cuerpo"></div></details>`).join('')}`;
    cont.querySelectorAll('.rp-al').forEach(det => det.addEventListener('toggle', () => { if (det.open && !det.dataset.listo) { det.dataset.listo = '1'; formulario(det); } }));
  };
  const formulario = det => {
    const id = det.dataset.id, d = datos[id], niv = { ...(d.rubrica || {}) };
    let no = !!d.noPresento;
    const cuerpo = det.querySelector('.rp-cuerpo');
    const enLista = PLATILLOS_RECADO.some(([, l]) => l.includes(d.platillo));
    cuerpo.innerHTML = `
      <div class="rp-fila"><label>Platillo que cocinó</label>
        <select class="rp-plat"><option value="">Elige…</option>${PLATILLOS_RECADO.map(([r, l]) => `<optgroup label="${esc(r)}">${l.map(p => `<option ${p === d.platillo ? 'selected' : ''}>${esc(p)}</option>`).join('')}</optgroup>`).join('')}<option value="__otro" ${d.platillo && !enLista ? 'selected' : ''}>Otro…</option></select>
        <input class="rp-otro" placeholder="Escribe el platillo" value="${d.platillo && !enLista ? esc(d.platillo) : ''}" ${d.platillo && !enLista ? '' : 'hidden'}></div>
      <label class="rp-no"><input type="checkbox" class="rp-nop" ${no ? 'checked' : ''}> No se presentó a la práctica (calificación 0)</label>
      <div class="rp-crit">${C.map((c, k) => `<div class="rp-c" data-k="${k}"><p class="rp-cn">${k + 1}. ${esc(c.nombre)}</p>
        <div class="rp-bots">${NIVELES_PRACTICO.map(n => `<button type="button" class="rp-b rp-${n.id}${niv[c.nombre] === n.id ? ' sel' : ''}" data-n="${n.id}">${n.nombre}</button>`).join('')}</div>
        <p class="rp-desc">${niv[c.nombre] ? esc(c.desc[niv[c.nombre]]) : ''}</p></div>`).join('')}</div>
      <div class="rp-fila"><label>Comentario para el alumno (lo verá en Mi progreso)</label><textarea class="rp-com" rows="2" placeholder="Ej.: Buen sazón y punto del recado; cuida separar crudos de cocidos.">${esc(d.comentario || '')}</textarea></div>
      <p class="rp-total"></p>
      <button type="button" class="btn btn-primary btn-block rp-guardar">Guardar y comprobar</button><p class="rp-msg save-msg" hidden></p>`;
    const total = () => {
      const c = no ? 0 : califRubrica(niv, C.length), falta = C.filter(x => !niv[x.nombre]).length;
      cuerpo.querySelector('.rp-total').innerHTML = no ? 'Calificación: <b>0 / 10</b> (no se presentó)' : c === null ? `Falta${falta > 1 ? 'n' : ''} ${falta} criterio${falta > 1 ? 's' : ''} por marcar.` : `Calificación: <b>${c} / 10</b> → ${Math.round(c * 2 * 10) / 10} de 20 puntos.`;
      cuerpo.querySelector('.rp-crit').style.opacity = no ? '.4' : '';
    };
    cuerpo.querySelectorAll('.rp-c').forEach(div => div.querySelectorAll('.rp-b').forEach(b => b.addEventListener('click', () => {
      const c = C[+div.dataset.k]; niv[c.nombre] = b.dataset.n;
      div.querySelectorAll('.rp-b').forEach(x => x.classList.toggle('sel', x === b));
      div.querySelector('.rp-desc').textContent = c.desc[b.dataset.n]; total();
    })));
    const sel = cuerpo.querySelector('.rp-plat'), otro = cuerpo.querySelector('.rp-otro');
    sel.addEventListener('change', () => { otro.hidden = sel.value !== '__otro'; if (!otro.hidden) otro.focus(); });
    cuerpo.querySelector('.rp-nop').addEventListener('change', e => { no = e.target.checked; total(); });
    total();
    cuerpo.querySelector('.rp-guardar').addEventListener('click', async e => {
      const msg = cuerpo.querySelector('.rp-msg'), b = e.target;
      const ok = (t, bien) => { msg.hidden = false; msg.textContent = t; msg.className = 'rp-msg save-msg ' + (bien ? 'save-ok' : 'save-err'); };
      const calificacion = no ? 0 : califRubrica(niv, C.length);
      if (calificacion === null) { ok('Falta marcar algún criterio. Marca los ' + C.length + ' o la casilla de «No se presentó».', false); return; }
      const platillo = sel.value === '__otro' ? otro.value.trim() : sel.value;
      const reg = { calificacion, rubrica: no ? {} : niv, noPresento: no, platillo, recado: recadoDe(platillo), comentario: cuerpo.querySelector('.rp-com').value.trim(), origen: 'rúbrica de práctica de cocina', actualizado: serverTimestamp() };
      b.disabled = true; b.textContent = 'Guardando…';
      try {
        await setDoc(ref(id), reg);
        const s = await getDocFromServer(ref(id));
        if (!s.exists() || s.data().calificacion !== calificacion) throw new Error('El servidor no confirmó la calificación.');
        datos[id] = s.data();
        ok(`✓ Guardado y comprobado: ${calificacion} / 10.`, true);
        det.querySelector('.rp-res').innerHTML = chip(datos[id]) + (platillo ? ` <small>· ${esc(platillo)}</small>` : '');
        const cu = document.getElementById('rp-cuenta'); if (cu) cu.textContent = `${listos()} de ${alumnos.length}`;
      } catch (err) { ok('No se pudo guardar: ' + (err.message || err) + ' Revisa tu internet y vuelve a tocar Guardar.', false); }
      finally { b.disabled = false; b.textContent = 'Guardar y comprobar'; }
    });
  };
  pintar();
}
