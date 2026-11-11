// aviso-destacado.js — franja de aviso en todas las páginas.
// El docente marca un aviso como «destacado» (campo avisoDestacado del documento del grupo, con fecha de fin).
// Mientras esté vigente se muestra arriba de cada página. «Enterado» lo oculta en ese navegador y, si el
// alumno inició sesión, queda registrado (alumnos/{id}/atlas/tarea-aviso-{id}) para que el docente lo vea.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const SESSION_KEY = 'oc_sesion_alumno';
const db = getFirestore(initializeApp(firebaseConfig, 'avisos'));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function iniciar() {
  if (/admin\.html$/.test(location.pathname)) return;
  let sesion = null; try { sesion = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { /* */ }
  let grupos = [];
  try { const sn = await getDocs(collection(db, 'grupos')); grupos = sn.docs.map(d => ({ id: d.id, ...d.data() })); } catch { return; }
  if (sesion && sesion.grupoId) grupos = grupos.filter(g => g.id === sesion.grupoId);
  const vistos = new Set(), avisos = [];
  grupos.forEach(g => { const a = g.avisoDestacado; if (a && a.id && !vistos.has(a.id) && (!a.hasta || a.hasta >= hoy()) && lsGet('aviso-visto-' + a.id) !== '1') { vistos.add(a.id); avisos.push({ ...a, grupo: g.id }); } });
  if (!avisos.length) return;
  const a = avisos[0];
  const el = document.createElement('div');
  el.className = 'aviso-dest'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="aviso-dest-in"><span class="aviso-dest-ico" aria-hidden="true">📣</span><div class="aviso-dest-txt"><b>${esc(a.titulo || 'Aviso')}</b><div>${esc(a.texto || '').replace(/\n/g, '<br>')}</div></div><button type="button" class="aviso-dest-ok">Enterado ✓</button></div>`;
  const h = document.querySelector('.site-header');
  if (h && h.parentNode) h.parentNode.insertBefore(el, h.nextSibling); else document.body.prepend(el);
  el.querySelector('.aviso-dest-ok').addEventListener('click', async () => {
    lsSet('aviso-visto-' + a.id, '1'); el.remove();
    if (sesion && sesion.alumnoId && sesion.pin && sesion.grupoId === a.grupo) {
      try { await setDoc(doc(db, 'grupos', a.grupo, 'alumnos', sesion.alumnoId, 'atlas', 'tarea-aviso-' + a.id), { visto: true, nombre: sesion.nombre || '', pinVerificado: sesion.pin, t: serverTimestamp() }); } catch { /* */ }
    }
  });
}
iniciar();
