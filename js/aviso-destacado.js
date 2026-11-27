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

// Aviso fijo publicado desde el repositorio (no depende del panel). Se muestra primero mientras esté vigente.
const AVISO_FIJO = {
  id: 'reapertura-tareas-p2b', hasta: '2026-11-27', vence: '2026-11-27T12:45:00-06:00',
  titulo: 'Dos horas más: tareas abiertas hasta hoy viernes 27 a las 12:45 p. m.',
  texto: 'Abrí otra vez **todas las tareas del Parcial 2** para que termines y entregues las que te faltan. Tienes hasta **hoy viernes 27 de noviembre a las 12:45 de la tarde**; después se cierran y ya no se guardan cambios.\n' +
    '**Te recomiendo terminar todo:** las tareas que no entregues cuentan como cero, y lo mismo las actividades de repaso.\n' +
    '**Cuánto vale cada cosa en el Parcial 2 (100 puntos):**\n' +
    '• **Tareas: 25 puntos.** Son 15 tareas (los cinco atlas: África, América, Asia, Europa y Oceanía; mexica vs. maya, desarma el platillo, las siete influencias, especias de Asia, el recado campechano, platillo de fusión, más que comida, Versalles vs. Topkapi, banquete de Estado y el menú à la carte). Se promedian todas: cada una vale cerca de 1.7 puntos.\n' +
    '• **Participación: 25 puntos.** 10 por participar en clase y 15 por las actividades de repaso: el Tema 3 vale 7.5 y el Tema 4 vale 7.5, y cuentan cuando terminas el tema sin errores.\n' +
    '• **Examen escrito: 20 puntos** (viernes 27) · **Examen práctico: 20 puntos** · **Asistencia: 5** · **Uniforme: 5**.\n' +
    '**Tareas en equipo:** si tu equipo no entregó una tarea, ahora la haces **individual**: al abrirla te aparece tu propia versión (en el atlas, toca «Hacerlo individual»). Si tu equipo sí la entregó, ya no tienes que hacer nada.\n' +
    'Entra a **Tareas** y a **Actividades**, revisa cuáles te faltan y entrégalas.',
};

async function iniciar() {
  if (/admin\.html$/.test(location.pathname)) return;
  let sesion = null; try { sesion = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { /* */ }
  let grupos = [];
  try { const sn = await getDocs(collection(db, 'grupos')); grupos = sn.docs.map(d => ({ id: d.id, ...d.data() })); } catch { grupos = []; }
  if (sesion && sesion.grupoId) grupos = grupos.filter(g => g.id === sesion.grupoId);
  const vistos = new Set(), avisos = [];
  if (AVISO_FIJO.hasta >= hoy() && !(AVISO_FIJO.vence && Date.now() > Date.parse(AVISO_FIJO.vence)) && lsGet('aviso-visto-' + AVISO_FIJO.id) !== '1') { vistos.add(AVISO_FIJO.id); avisos.push({ ...AVISO_FIJO, fijo: true }); }
  grupos.forEach(g => { const a = g.avisoDestacado; if (a && a.id && !vistos.has(a.id) && (!a.hasta || a.hasta >= hoy()) && lsGet('aviso-visto-' + a.id) !== '1') { vistos.add(a.id); avisos.push({ ...a, grupo: g.id }); } });
  if (!avisos.length) return;
  const a = avisos[0];
  const el = document.createElement('div');
  el.className = 'aviso-dest'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="aviso-dest-in"><span class="aviso-dest-ico" aria-hidden="true">📣</span><div class="aviso-dest-txt"><b>${esc(a.titulo || 'Aviso')}</b><div>${esc(a.texto || '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div></div><button type="button" class="aviso-dest-ok">Enterado ✓</button></div>`;
  const h = document.querySelector('.site-header');
  if (h && h.parentNode) h.parentNode.insertBefore(el, h.nextSibling); else document.body.prepend(el);
  el.querySelector('.aviso-dest-ok').addEventListener('click', async () => {
    lsSet('aviso-visto-' + a.id, '1'); el.remove();
    if (!a.fijo && sesion && sesion.alumnoId && sesion.pin && sesion.grupoId === a.grupo) {
      try { await setDoc(doc(db, 'grupos', a.grupo, 'alumnos', sesion.alumnoId, 'atlas', 'tarea-aviso-' + a.id), { visto: true, nombre: sesion.nombre || '', pinVerificado: sesion.pin, t: serverTimestamp() }); } catch { /* */ }
    }
  });
}
iniciar();
