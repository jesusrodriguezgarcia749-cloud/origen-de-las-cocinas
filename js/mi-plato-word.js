// mi-plato-word.js — Utilidades y Word de la ficha «Mi Plato, Mi Historia».
// Lo usan el alumno (mi-plato.js) y el docente (admin.js), para que el documento salga idéntico.
import { descargarAPA } from "./apa-word.js?v=2026102901";

export const palabras = t => (String(t || '').trim().match(/\S+/g) || []).length;
// Una cita en el texto: (Autor, año), (Autor, s. f.) o (A. Pérez, comunicación personal, 3 de octubre de 2026).
export const tieneCita = t => /\([^()]*(\d{4}|s\.\s?f\.)[^()]*\)/i.test(t || '');
export const slugArchivo = n => String(n || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
export const ORDEN = ['entrega1', 'entrega2', 'entregaFinal'];
export const numsDe = (D, ent) => D.preguntas.filter(p => p.entrega === ent).map(p => p.n);
export const hastaDe = (D, ent) => D.entregas[ent].hasta;

// Referencias del alumno: el libro del curso (si lo marcó), las que armó y las que escribió a mano.
export function refsDe(T, D) {
  const r = T.refs || {};
  const todas = [...(r.libro !== false ? [D.libro.apa] : []), ...(r.lista || []).map(x => x.apa).filter(Boolean),
    ...String(r.otras || '').split('\n').map(x => x.trim()).filter(Boolean)];
  // Sin repetidas (por ejemplo, el libro del curso marcado y también pegado a mano).
  const clave = x => x.replace(/\*/g, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 45);
  const vistos = new Set(); return todas.filter(x => { const k = clave(x); if (vistos.has(k)) return false; vistos.add(k); return true; });
}
// Lo que entra al Word de cada entrega (todas las preguntas hasta esa entrega).
export function textosDe(T, D, ent) {
  const hasta = hastaDe(D, ent), r = T.respuestas || {};
  return D.preguntas.filter(p => p.n <= hasta).map(p => [p.n, r[p.n] || '']);
}
// Huella del texto entregado: si cambia después de entregar, el docente lo ve.
export function huella(T, D, ent) {
  const s = textosDe(T, D, ent).map(([, t]) => String(t).replace(/\s+/g, ' ').trim()).join('|') + '|' + refsDe(T, D).join('|') + '|' + (T.platillo || '');
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36);
}
export function estadoEntrega(T, D, ent) {
  const e = (T.entregado || {})[ent]; if (!e) return { entregada: false };
  return { entregada: true, t: e.t, modificada: e.huella !== huella(T, D, ent) };
}

// Qué parte del texto del alumno es igual al compendio (secuencias de 6 palabras), sin contar lo que va entre comillas.
const normal = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ0-9]+/g) || [];
const sinComillas = t => String(t || '').replace(/«[^»]*»|“[^”]*”|"[^"]*"/g, ' ');
export function gramas(texto, k = 6) { const w = normal(texto), G = new Set(); for (let i = 0; i + k <= w.length; i++) G.add(w.slice(i, i + k).join(' ')); return G; }
export function porcentajeCopia(texto, G, k = 6) {
  const w = normal(sinComillas(texto)); if (w.length < k || !G || !G.size) return 0;
  const marca = new Array(w.length).fill(false);
  for (let i = 0; i + k <= w.length; i++) if (G.has(w.slice(i, i + k).join(' '))) for (let j = i; j < i + k; j++) marca[j] = true;
  return Math.round(100 * marca.filter(Boolean).length / w.length);
}

// Fecha en que se abre cada pregunta: la sesión del calendario donde se anuncia («Pregunta N…»).
export function fechasApertura(curso) {
  const F = {};
  (curso.sesiones || []).forEach(s => (Array.isArray(s.proyecto) ? s.proyecto : [s.proyecto || '']).forEach(t => {
    const re = /Pregunta\s+(\d{1,2})\b/gi; let m; while ((m = re.exec(String(t)))) { const n = +m[1]; if (!F[n] || s.fecha < F[n]) F[n] = s.fecha; }
  }));
  return F;
}

export async function wordMiPlato(T, D, ent, nombre, { soloBlob = false } = {}) {
  const E = D.entregas[ent], refs = refsDe(T, D), plat = (T.platillo || '').trim();
  return descargarAPA({
    titulo: `Mi Plato, Mi Historia: ${plat || 'mi platillo'}`,
    autor: nombre || '',
    programa: 'Licenciatura en Artes Culinarias y Negocios Gastronómicos', institucion: 'ITES René Descartes',
    curso: 'Origen de las Cocinas', docente: 'Mtro. Jesús Rodríguez García',
    secciones: textosDe(T, D, ent).map(([n, t]) => ({ titulo: `${n}. ${((D.preguntas.find(p => p.n === n) || {}).texto || '').replace(/\s*\p{Extended_Pictographic}\uFE0F?/gu, '')}`, parrafos: String(t).split(/\n+/) })),
    referencias: refs.length ? refs : ['Agrega aquí tus referencias en APA 7, en orden alfabético y con sangría francesa.'],
    archivo: `Mi_Plato_Mi_Historia_${E.archivo}_${slugArchivo(nombre || 'borrador')}`,
    soloBlob,
  });
}
