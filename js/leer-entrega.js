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
  if (ext === 'txt' || ext === 'md') return parrafosTexto(await file.text());
  if (ext === 'doc') throw new Error('Es un Word antiguo (.doc). Ábrelo en Word y elige «Guardar como» → «Documento de Word (.docx)», o copia y pega tu texto.');
  if (ext === 'pdf') throw new Error('Los PDF no se pueden leer aquí. Sube tu archivo de Word (.docx) o copia y pega tu texto.');
  throw new Error('Sube tu archivo de Word (.docx) o copia y pega tu texto.');
}
export const parrafosTexto = t => String(t || '').split(/\r?\n/).map(x => ({ texto: x.replace(/\s+/g, ' ').trim(), numerado: false })).filter(x => x.texto);

// ---------------------------------------------------------------- acomodo por pregunta
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const VACIAS = new Set('para como cual cuales esta este estos estas tiene tienen sido algun alguna mismo misma porque sobre segun entre desde hasta donde cuando quien quienes otra otro otros otras esos esas sino solo cada todo toda todos todas mucho muchos mas menos tambien hacia hace hacer puede pueden debe deben aqui dentro fuera'.split(' '));
const claves = s => [...new Set((norm(s).match(/[a-zñ]{4,}/g) || []).filter(w => !VACIAS.has(w)))];
// Qué tanto se parece un párrafo a una pregunta (parte de las palabras clave de la pregunta que aparecen).
function parecido(texto, kq) { if (!kq.length) return 0; const t = new Set(claves(texto)); return kq.filter(w => t.has(w)).length / kq.length; }
const RE_NUM = /^\s*(?:pregunta|preg\.?|p\.)?\s*(?:n[uú]m(?:ero)?\.?\s*|no\.?\s*|#\s*)?(\d{1,2})\s*(?:[.)°º:\-–—]+|\s+(?=¿))\s*(.*)$/i;
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
// Separa la pregunta de la respuesta cuando vienen en el mismo párrafo.
function separar(resto, kq, cola) {
  const i = resto.lastIndexOf('?');
  if (i >= 0) return sinCola(resto.slice(i + 1).replace(/^[\s:.\-–—)]+/, '').trim(), cola);
  if (parecido(resto, kq) >= 0.5 && resto.split(/\s+/).length < 40) return '';
  return resto.trim();
}

export function acomodar(parrafos, preguntas, { maxN = 23 } = {}) {
  const KQ = Object.fromEntries(preguntas.map(p => [p.n, claves(p.texto)])), COLA = Object.fromEntries(preguntas.map(p => [p.n, colaDe(p.texto)]));
  const cabeceras = []; let refsDesde = -1, ultimo = 0;
  parrafos.forEach((p, i) => {
    if (refsDesde >= 0) return;
    if (RE_REFS.test(p.texto)) { refsDesde = i; return; }
    const m = p.texto.match(RE_NUM);
    if (m && +m[1] >= 1 && +m[1] <= maxN && KQ[+m[1]]) {
      const n = +m[1]; cabeceras.push({ i, n, resto: separar(m[2] || '', KQ[n], COLA[n]) }); ultimo = n; return;
    }
    const conPregunta = /[¿?]/.test(p.texto), corto = p.texto.split(/\s+/).length <= 70;
    if (conPregunta && corto) {
      let mejor = 0, nm = 0; for (const [n, kq] of Object.entries(KQ)) { const s = parecido(p.texto, kq); if (s > mejor) { mejor = s; nm = +n; } }
      if (mejor >= 0.45) { cabeceras.push({ i, n: nm, resto: separar(p.texto, KQ[nm], COLA[nm]) }); ultimo = nm; return; }
      if (p.numerado && ultimo < maxN) { const n = ultimo + 1; cabeceras.push({ i, n, resto: separar(p.texto, KQ[n] || [], COLA[n] || '') }); ultimo = n; }
    }
  });
  const fin = refsDesde >= 0 ? refsDesde : parrafos.length, resp = {};
  cabeceras.forEach((c, k) => {
    const hasta = k + 1 < cabeceras.length ? cabeceras[k + 1].i : fin;
    const sig = parrafos.slice(c.i + 1, hasta).map(x => x.texto);
    if (!c.resto && sig.length) sig[0] = sinCola(sig[0], COLA[c.n] || '');
    const txt = [c.resto, ...sig].filter(Boolean).join('\n\n').trim();
    if (txt && !resp[c.n]) resp[c.n] = txt;
  });
  const refs = refsDesde >= 0 ? parrafos.slice(refsDesde + 1).map(x => x.texto).filter(x => x.length > 15) : [];
  return { resp, refs };
}
