// leer-entrega.js — Lee el Word (.docx) o el texto de la Entrega 1 de un alumno y acomoda
// cada respuesta en su pregunta. Todo ocurre en el navegador: el archivo no se sube a ningún lado.

// ---------------------------------------------------------------- lectura del archivo
async function inflar(datos) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Tu navegador no puede abrir archivos de Word. Actualízalo o copia y pega tu texto.');
  const s = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
// Busca un archivo dentro del .docx (que es un .zip) usando su directorio central.
async function archivoDelZip(buf, nombre) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error('El archivo no parece un Word (.docx) válido.');
  const total = v.getUint16(fin + 10, true); let p = v.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  for (let k = 0; k < total; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metodo = v.getUint16(p + 10, true), comp = v.getUint32(p + 20, true), ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const n = dec.decode(buf.subarray(p + 46, p + 46 + ln));
    if (n === nombre) {
      const ini = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true), datos = buf.subarray(ini, ini + comp);
      return metodo === 0 ? datos : await inflar(datos);
    }
    p += 46 + ln + le + lc;
  }
  throw new Error('No encontramos el texto dentro del Word.');
}
// Párrafos del documento: texto y si es una lista numerada automática de Word.
function parrafosDocx(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const out = [];
  for (const p of doc.getElementsByTagNameNS(W, 'p')) {
    let t = '';
    const recorrer = nodo => { for (const h of nodo.childNodes) {
      if (h.namespaceURI === W && h.localName === 't') t += h.textContent;
      else if (h.namespaceURI === W && (h.localName === 'tab')) t += ' ';
      else if (h.namespaceURI === W && (h.localName === 'br' || h.localName === 'cr')) t += '\n';
      else if (h.namespaceURI === W && h.localName === 'p') continue; // párrafos anidados (cuadros de texto) se leen aparte
      else if (h.nodeType === 1) recorrer(h);
    } };
    recorrer(p);
    const numerado = p.getElementsByTagNameNS(W, 'numPr').length > 0;
    t.split('\n').forEach((x, i) => out.push({ texto: x.replace(/\s+/g, ' ').trim(), numerado: numerado && i === 0 }));
  }
  return out.filter(x => x.texto);
}
export async function leerArchivo(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'docx') {
    const buf = new Uint8Array(await file.arrayBuffer());
    const xml = new TextDecoder().decode(await archivoDelZip(buf, 'word/document.xml'));
    return parrafosDocx(xml);
  }
  if (ext === 'pdf') return parrafosPdf(file);
  if (ext === 'txt' || ext === 'md') return parrafosTexto(await file.text());
  if (ext === 'doc') throw new Error('Es un Word antiguo (.doc). Ábrelo en Word y elige «Guardar como» → «Documento de Word (.docx)», o copia y pega tu texto.');
  throw new Error('Sube tu archivo de Word (.docx) o PDF, o copia y pega tu texto.');
}
// Texto pegado. Si viene copiado de un PDF (cada renglón cortado), se vuelven a unir los renglones en párrafos.
export const parrafosTexto = t => {
  const L = String(t || '').split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim());
  return (pareceCortado(L) ? unirRenglones(L.map(x => ({ texto: x }))) : L).filter(Boolean).map(x => ({ texto: x, numerado: false }));
};
function pareceCortado(L) {
  const llenas = L.filter(Boolean); if (llenas.length < 8) return false;
  const max = Math.max(...llenas.map(x => x.length));
  return max < 160 && llenas.filter(x => x.length >= 0.7 * max).length / llenas.length >= 0.35;
}
// Une renglones cortados en párrafos. Un renglón nuevo empieza párrafo si trae número de pregunta, si va
// después de un renglón vacío o de un salto grande, o si el renglón anterior era corto y cerraba con punto.
function unirRenglones(R) {
  const largo = Math.max(1, ...R.map(r => (r.texto || '').length));
  const out = []; let cur = '', prev = '';
  for (const r of R) {
    const t = (r.texto || '').trim();
    if (!t || r.salto) { if (cur) out.push(cur); cur = ''; prev = ''; if (!t) continue; }
    const nuevo = !cur || RE_NUM.test(t) || RE_PREG_SOLA.test(t) || RE_REFS.test(t) || /^[•▪●◦\-–]\s/.test(t)
      || (/[.!?:»)]$/.test(prev) && prev.length < 0.75 * largo && !/^[a-záéíóúñü,;(]/.test(t));
    if (RE_REFS.test(prev)) { if (cur) out.push(cur); cur = t; prev = t; continue; }   // «Referencias» va sola
    if (nuevo) { if (cur) out.push(cur); cur = t; } else cur += (/-$/.test(cur) && /^[a-záéíóúñ]/.test(t) ? '' : ' ') + t;
    prev = t;
  }
  if (cur) out.push(cur);
  return out;
}
// PDF: se lee con PDF.js (se descarga solo cuando hace falta) y se rearman renglones y párrafos.
let pdfjs = null;
async function cargarPdfjs() {
  if (pdfjs) return pdfjs;
  const rutas = [['https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs'],
    ['https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs', 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs']];
  for (const [lib, worker] of rutas) {
    try { const m = await import(lib); m.GlobalWorkerOptions.workerSrc = worker; return (pdfjs = m); } catch { /* se intenta la siguiente */ }
  }
  throw new Error('No pudimos abrir el lector de PDF (revisa tu conexión). Sube tu Word (.docx) o abre tu PDF, selecciona todo el texto, cópialo y pégalo con «Mejor pego el texto».');
}
async function parrafosPdf(file) {
  const lib = await cargarPdfjs();
  let pdf;
  try { pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; }
  catch { throw new Error('No pudimos abrir ese PDF. Sube tu Word (.docx) o copia y pega tu texto.'); }
  const R = [];
  for (let pg = 1; pg <= pdf.numPages; pg++) {
    const items = (await (await pdf.getPage(pg)).getTextContent()).items.filter(it => typeof it.str === 'string');
    const lineas = [];
    for (const it of items) {
      const y = it.transform[5], x = it.transform[4], h = Math.abs(it.transform[3]) || it.height || 10;
      let l = lineas.find(q => Math.abs(q.y - y) < h * 0.5);
      if (!l) lineas.push(l = { y, h, partes: [] });
      l.partes.push({ x, s: it.str });
    }
    lineas.sort((a, b) => b.y - a.y);
    const textos = lineas.map(l => ({ y: l.y, h: l.h, texto: l.partes.sort((a, b) => a.x - b.x).map(q => q.s).join('').replace(/\s+/g, ' ').trim() }));
    const gaps = textos.slice(1).map((l, i) => textos[i].y - l.y).filter(g => g > 0).sort((a, b) => a - b);
    const normal = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 14;
    textos.forEach((l, i) => {
      if (/^\d{1,3}$/.test(l.texto)) return;                       // número de página
      R.push({ texto: l.texto, salto: i === 0 || (textos[i - 1].y - l.y) > normal * 1.45 });
    });
  }
  const P = unirRenglones(R).map(x => ({ texto: x.replace(/\s+/g, ' ').trim(), numerado: false })).filter(x => x.texto);
  if (P.length < 3) throw new Error('Ese PDF no tiene texto que se pueda leer (quizá es una foto o un escaneo). Sube tu Word (.docx) o copia y pega tu texto.');
  return P;
}

// ---------------------------------------------------------------- acomodo por pregunta
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const VACIAS = new Set('para como cual cuales esta este estos estas tiene tienen sido algun alguna mismo misma porque sobre segun entre desde hasta donde cuando quien quienes otra otro otros otras esos esas sino solo cada todo toda todos todas mucho muchos mas menos tambien hacia hace hacer puede pueden debe deben aqui dentro fuera'.split(' '));
const claves = s => [...new Set((norm(s).match(/[a-zñ]{4,}/g) || []).filter(w => !VACIAS.has(w)))];
// Qué tanto se parece un párrafo a una pregunta (parte de las palabras clave de la pregunta que aparecen).
// Parecido «por raíz» (las primeras 5 letras): «periodo» y «periodos», «técnica» y «técnicas».
const raiz = w => w.slice(0, 5);
function parecidoRaiz(texto, kq) { if (!kq.length) return 0; const t = new Set(claves(texto).map(raiz)); return kq.filter(w => t.has(raiz(w))).length / kq.length; }
// Un título corto que resume la pregunta («3. Relación con Roma», «Periodo histórico»).
const esTitulo = (t, n, Q) => { const s = String(t || '').trim(); if (!s || s.split(/\s+/).length > 10 || /[.!]$/.test(s)) return false;
  return Math.max(parecidoRaiz(s, claves(Q.split('?')[0])), parecidoRaiz(s, claves(Q))) >= 0.1; };
function parecido(texto, kq) { if (!kq.length) return 0; const t = new Set(claves(texto)); return kq.filter(w => t.has(w)).length / kq.length; }
// Número de pregunta al inicio: «3.», «3)», «3.-», «Pregunta 3:», «3 ¿…». No cuenta decimales («3.5 kilos»).
const RE_NUM = /^\s*(?:pregunta|preg\.?|p\.)?\s*(?:n[uú]m(?:ero)?\.?\s*|no\.?\s*|#\s*)?(\d{1,2})(?!\d)(?:\s*[.)°º:\-–—]+(?![\d.,])|\s+(?=¿))\s*(.*)$/i;
// «Pregunta 3» sola en su renglón (la pregunta va en el renglón de abajo).
const RE_PREG_SOLA = /^\s*(?:pregunta|preg\.?)\s*(?:n[uú]m(?:ero)?\.?\s*|no\.?\s*|#\s*)?(\d{1,2})\s*[.:)\-–—]*\s*$/i;
const RE_REFS = /^\s*(referencias|referencias bibliogr[aá]ficas|bibliograf[ií]a|fuentes( consultadas)?)\s*:?\s*$/i;

// La indicación que algunas preguntas traen después del signo «?» («Justifica con un dato del libro.»).
const colaDe = texto => { const i = texto.lastIndexOf('?'); return i >= 0 ? texto.slice(i + 1).trim() : ''; };
// Quita del inicio de la respuesta la indicación de la pregunta, si el alumno la copió.
function sinCola(t, cola) {
  const kc = claves(cola); if (!kc.length || !t) return t;
  const m = t.match(/^(.+?[.)])(\s+|$)([\s\S]*)$/);
  const primera = m ? m[1] : t;
  return primera.split(/\s+/).length <= 20 && parecido(primera, kc) >= 0.6 ? (m ? m[3] : '').trim() : t;
}
// Quita «R:», «Respuesta:» y signos sueltos al inicio de una respuesta.
const limpiarInicio = t => String(t || '').replace(/^[\s?:.;,\-–—)\]»"”]+/, '').replace(/^(?:r|resp|respuesta)\s*[:/.\-–]\s*/i, '').trim();
// Separa la pregunta de la respuesta cuando vienen en el mismo párrafo (si no se pudo alinear la pregunta).
function separar(resto, kq, cola, qtexto = '') {
  if (qtexto && esTitulo(resto, 0, qtexto)) return '';
  const i = resto.lastIndexOf('?');
  // Solo se corta en el «?» si lo de antes es la pregunta (no una pregunta que el alumno escribió en su respuesta).
  if (i >= 0 && parecido(resto.slice(0, i), kq) >= 0.3) return limpiarInicio(sinCola(resto.slice(i + 1).replace(/^[\s:.\-–—)]+/, '').trim(), cola));
  if (parecido(resto, kq) >= 0.5 && resto.split(/\s+/).length < 40) return '';
  return limpiarInicio(resto);
}
// Palabras (sin acentos ni mayúsculas) con su posición en el texto original.
function fichas(s) {
  const t = String(s || ''); let n = '';
  for (let i = 0; i < t.length; i++) { const c = t[i]; n += /[\uD800-\uDFFF]/.test(c) ? ' ' : (c.normalize('NFD')[0] || ' ').toLowerCase(); }
  const out = [], re = /[a-z0-9ñ]+/g; let m; while ((m = re.exec(n))) out.push({ w: m[0], fin: m.index + m[0].length });
  return out;
}
// Hasta dónde llega la pregunta copiada en los textos «partes» (renglón del número y los siguientes).
// Recorre las palabras en orden y las va empatando con las de la pregunta (se vale saltar alguna).
// Devuelve [parte, posición] donde termina la pregunta, o null si no se reconoce.
function finPregunta(partes, qtexto) {
  const Q = fichas(qtexto).map(x => x.w), nucleo = fichas(qtexto.split('?')[0]).length;
  if (!Q.length) return null;
  let j = 0, hits = 0, prevOk = false, fallas = 0, mejor = null;
  const porParte = partes.map(() => 0);
  for (let k = 0; k < partes.length && j < Q.length; k++) {
    const F = fichas(partes[k]);
    for (let i = 0; i < F.length && j < Q.length; i++) {
      const win = prevOk ? 4 : hits ? 1 : 6;
      let f = -1; for (let q = j; q < Math.min(Q.length, j + win); q++) if (Q[q] === F[i].w) { f = q; break; }
      if (f >= 0) { j = f + 1; hits++; porParte[k]++; prevOk = true; fallas = 0; mejor = [k, F[i].fin]; }
      else { prevOk = false; if (hits ? ++fallas > 2 : i > 4) { k = partes.length; break; } }
    }
    if (!hits && k >= 1) break;
  }
  if (!mejor || !(hits >= Math.max(2, Math.ceil(nucleo * 0.6)) || hits >= Q.length * 0.4)) return null;
  // Un renglón siguiente solo cuenta como parte de la pregunta si trae varias palabras de ella seguidas
  // (así no se «come» el inicio de la respuesta: «Sí, mi platillo…»).
  while (mejor[0] > 0 && porParte[mejor[0]] < 3 && porParte[mejor[0]] < fichas(partes[mejor[0]]).length * 0.6) {
    const k = mejor[0] - 1, F = fichas(partes[k]);
    mejor = porParte[k] ? [k, k === 0 ? fichasFinEmpate(partes[0], Q) : F.length ? F[F.length - 1].fin : 0] : [k, 0];
    if (porParte[k]) break;
  }
  return mejor;
}
// Fin del empate dentro del primer renglón (cuando se descarta lo que siguió).
function fichasFinEmpate(texto, Q) {
  const F = fichas(texto); let j = 0, prevOk = false, hits = 0, fin = 0, fallas = 0;
  for (const x of F) {
    const win = prevOk ? 4 : hits ? 1 : 6; let f = -1;
    for (let q = j; q < Math.min(Q.length, j + win); q++) if (Q[q] === x.w) { f = q; break; }
    if (f >= 0) { j = f + 1; hits++; prevOk = true; fallas = 0; fin = x.fin; } else { prevOk = false; if (hits && ++fallas > 2) break; }
    if (j >= Q.length) break;
  }
  return fin;
}

export function acomodar(parrafos, preguntas, opciones = {}) {
  const estricto = acomodarCon(parrafos, preguntas, { ...opciones, estricto: true });
  // Si casi no se reconoció nada, quizá el alumno numeró sus respuestas sin copiar las preguntas.
  const flojo = acomodarCon(parrafos, preguntas, { ...opciones, estricto: false });
  return Object.keys(flojo.resp).length > Object.keys(estricto.resp).length + 1 ? flojo : estricto;
}
function acomodarCon(parrafos, preguntas, { maxN = 23, estricto = true } = {}) {
  const PQ = Object.fromEntries(preguntas.map(p => [p.n, p])), KQ = Object.fromEntries(preguntas.map(p => [p.n, claves(p.texto)])), COLA = Object.fromEntries(preguntas.map(p => [p.n, colaDe(p.texto)]));
  const KN = Object.fromEntries(preguntas.map(p => [p.n, claves(p.texto.split('?')[0])]));   // claves de la pregunta sin la indicación
  const cabeceras = []; let refsDesde = -1, ultimo = 0;
  const textoDe = i => (parrafos[i] || {}).texto || '';
  // Crea la cabecera de la pregunta n en el párrafo i y se salta los renglones que solo continúan la pregunta.
  const crear = (i, n, resto) => {
    const partes = [resto]; for (let k = i + 1; k <= i + 3 && k < parrafos.length && !RE_REFS.test(textoDe(k)); k++) partes.push(textoDe(k));
    const fin = finPregunta(partes, PQ[n].texto);
    if (fin) {
      const [k, pos] = fin;
      cabeceras.push({ i, n, desde: i + k + 1, resto: limpiarInicio(sinCola(limpiarInicio(partes[k].slice(pos)), COLA[n])) });
      return i + k;
    }
    cabeceras.push({ i, n, desde: i + 1, resto: separar(resto, KQ[n], COLA[n], PQ[n].texto) });
    return i;
  };
  for (let i = 0; i < parrafos.length; i++) {
    const p = parrafos[i];
    if (RE_REFS.test(p.texto)) { refsDesde = i; break; }
    const sola = p.texto.match(RE_PREG_SOLA);
    if (sola && KQ[+sola[1]] && +sola[1] <= maxN) { const n = +sola[1]; ultimo = Math.max(ultimo, n); i = crear(i, n, ''); continue; }
    const m = p.texto.match(RE_NUM);
    if (m && +m[1] >= 1 && +m[1] <= maxN && KQ[+m[1]]) {
      const n = +m[1], resto = m[2] || '', sim = parecido(resto, KQ[n]), conQ = /[¿?]/.test(resto);
      // Un número al inicio solo es pregunta si parece serlo: así una lista dentro de la respuesta
      // («1. Primero se marina…») no se confunde con la pregunta 1.
      const ok = !estricto ? n > ultimo || sim >= 0.5
        : n > ultimo ? (!resto.trim() || sim >= 0.25 || conQ || esTitulo(resto, n, PQ[n].texto)) : sim >= 0.5;
      if (ok) { ultimo = Math.max(ultimo, n); i = crear(i, n, resto); continue; }
    }
    const conPregunta = /[¿?]/.test(p.texto), corto = p.texto.split(/\s+/).length <= 70;
    if (conPregunta && corto) {
      let mejor = 0, nm = 0; for (const [n, kq] of Object.entries(KQ)) { const s = Math.max(parecido(p.texto, kq), parecido(p.texto, KN[n]) >= 0.75 ? 0.6 : 0); if (s > mejor) { mejor = s; nm = +n; } }
      const empieza = /^\s*¿/.test(p.texto) || p.numerado;
      if ((mejor >= 0.45 && (nm > ultimo || mejor >= 0.7)) || (mejor >= 0.3 && nm === ultimo + 1 && empieza)) { ultimo = Math.max(ultimo, nm); i = crear(i, nm, p.texto); continue; }
      if (p.numerado && ultimo < maxN && KQ[ultimo + 1] && empieza) { const n = ultimo + 1; ultimo = n; i = crear(i, n, p.texto); continue; }
    }
  }
  const fin = refsDesde >= 0 ? refsDesde : parrafos.length, resp = {};
  cabeceras.forEach((c, k) => {
    const hasta = k + 1 < cabeceras.length ? cabeceras[k + 1].i : fin;
    const sig = parrafos.slice(c.desde, hasta).map(x => x.texto);
    if (!c.resto && sig.length) sig[0] = limpiarInicio(sinCola(sig[0], COLA[c.n] || ''));
    const txt = [c.resto, ...sig].filter(Boolean).join('\n\n').trim();
    // Si la misma pregunta aparece dos veces, se juntan los textos en vez de perder el segundo.
    if (txt) resp[c.n] = resp[c.n] ? resp[c.n] + '\n\n' + txt : txt;
  });
  const refs = refsDesde >= 0 ? parrafos.slice(refsDesde + 1).map(x => x.texto).filter(x => x.length > 15) : [];
  return { resp, refs };
}
