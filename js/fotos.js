// fotos.js — Fotos para las exposiciones de las tareas en equipo.
// La foto se achica en el mismo celular del alumno antes de subirse (unos 100-200 KB), así que no
// hace falta que ellos la compriman. Cada foto vive en su propio documento de Firestore:
//   equipo:     grupos/{g}/equipos/{e}/atlas/{act-…}-foto1 y -foto2
//   individual: grupos/{g}/alumnos/{a}/atlas/tarea-{id}-foto1 y -foto2
export const MAX_FOTOS = 2;
export const idFoto = (base, i) => `${base}-foto${i}`;

const cargarImagen = src => new Promise((ok, mal) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => mal(new Error('No se pudo leer la imagen. Prueba con otra foto (JPG o PNG).')); im.src = src; });
const leer = file => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => mal(new Error('No se pudo leer el archivo.')); r.readAsDataURL(file); });

// Achica la foto: lado mayor de 1280 px en JPEG; si todavía pesa mucho, baja la calidad y el tamaño.
export async function comprimir(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('Ese archivo no es una imagen.');
  let src = null, im;
  try { src = URL.createObjectURL(file); im = await cargarImagen(src); } catch { im = await cargarImagen(await leer(file)); }
  finally { if (src) setTimeout(() => URL.revokeObjectURL(src), 1000); }
  for (const [lado, cal] of [[1280, 0.72], [1100, 0.6], [900, 0.5], [700, 0.45]]) {
    const k = Math.min(1, lado / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
    const url = cv.toDataURL('image/jpeg', cal);
    if (url.length < 420000) return { img: url, w, h };
  }
  throw new Error('La foto es demasiado grande. Prueba con otra.');
}

// Para el Word: la foto en PNG (bytes), con su tamaño.
export async function fotoPNG(dataURL, max = 1000) {
  const im = await cargarImagen(dataURL);
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0, w, h);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), W: w, H: h };
}

// Agrega las fotos al Word (después de la ficha), si las hay.
export async function fotosAlWord(D, fotos, titulo = 'Fotos de la exposición') {
  const L = (fotos || []).filter(f => f && f.img);
  if (!L.length) return;
  D.h2(titulo);
  for (const f of L) {
    try { const p = await fotoPNG(f.img); D.imagen(p.bytes, p.W, p.H, p.W >= p.H ? 14 : 9); if ((f.pie || '').trim()) D.texto(f.pie.trim()); } catch { /* foto dañada: se omite */ }
  }
}
