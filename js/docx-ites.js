// docx-ites.js — Word (.docx) con el diseño del Aula Virtual, armado en el navegador sin librerías.
// Portada con el escudo de la escuela, encabezado y pie con número de página, títulos con los
// colores de la página, tablas y fichas. Lo usan Mi atlas y las actividades de clase.
const C = { tinta: '1C1B19', suave: '5E584F', azafran: 'C98A2C', azafranOsc: '8F5F17', pergamino: 'F4EFE4', crema: 'FAF7F0', linea: 'D8CFBF' };
const ANCHO = 9360; // ancho útil en twips (carta con márgenes de 2.54 cm)

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(archivos) {
  const enc = new TextEncoder(), partes = [], central = []; let off = 0;
  const d = new Date(), hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const [nombre, contenido] of archivos) {
    const n = enc.encode(nombre), b = typeof contenido === 'string' ? enc.encode(contenido) : contenido, c = crc32(b);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, hora, true); h.setUint16(12, dia, true);
    h.setUint32(14, c, true); h.setUint32(18, b.length, true); h.setUint32(22, b.length, true); h.setUint16(26, n.length, true);
    partes.push(new Uint8Array(h.buffer), n, b);
    const k = new DataView(new ArrayBuffer(46));
    k.setUint32(0, 0x02014b50, true); k.setUint16(4, 20, true); k.setUint16(6, 20, true); k.setUint16(8, 0x0800, true); k.setUint16(12, hora, true); k.setUint16(14, dia, true);
    k.setUint32(16, c, true); k.setUint32(20, b.length, true); k.setUint32(24, b.length, true); k.setUint16(28, n.length, true); k.setUint32(42, off, true);
    central.push(new Uint8Array(k.buffer), n);
    off += 30 + n.length + b.length;
  }
  const tam = central.reduce((s, x) => s + x.length, 0), f = new DataView(new ArrayBuffer(22));
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, archivos.length, true); f.setUint16(10, archivos.length, true); f.setUint32(12, tam, true); f.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(f.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
const xe = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = c => String(c || '').replace('#', '').toUpperCase();

// Un «run» es [texto, {b, i, color, tam, fuente, caps}] o solo texto.
function run(r) {
  const [t, o = {}] = Array.isArray(r) ? r : [r, {}];
  if (t === undefined || t === null || t === '') return '';
  const rPr = `${o.fuente ? `<w:rFonts w:ascii="${o.fuente}" w:hAnsi="${o.fuente}" w:cs="${o.fuente}"/>` : ''}${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.caps ? '<w:caps/>' : ''}${o.color ? `<w:color w:val="${hex(o.color)}"/>` : ''}${o.tam ? `<w:sz w:val="${o.tam * 2}"/><w:szCs w:val="${o.tam * 2}"/>` : ''}${o.espaciado ? `<w:spacing w:val="${o.espaciado}"/>` : ''}`;
  return String(t).split('\n').map((linea, i) => `${i ? '<w:r><w:br/></w:r>' : ''}<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${xe(linea)}</w:t></w:r>`).join('');
}
function par(contenido, o = {}) {
  const runs = typeof contenido === 'string' ? run([contenido, o.r || {}]) : contenido.map(run).join('');
  const bordes = o.bordeAbajo || o.bordeIzq ? `<w:pBdr>${o.bordeIzq ? `<w:left w:val="single" w:sz="${o.bordeIzq[1] || 36}" w:space="8" w:color="${hex(o.bordeIzq[0])}"/>` : ''}${o.bordeAbajo ? `<w:bottom w:val="single" w:sz="${o.bordeAbajo[1] || 12}" w:space="4" w:color="${hex(o.bordeAbajo[0])}"/>` : ''}</w:pBdr>` : '';
  const pPr = `${o.estilo ? `<w:pStyle w:val="${o.estilo}"/>` : ''}${o.keep ? '<w:keepNext/>' : ''}${bordes}${o.fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${hex(o.fondo)}"/>` : ''}<w:spacing w:before="${o.antes ?? 0}" w:after="${o.despues ?? 100}"${o.interlineado ? ` w:line="${o.interlineado}" w:lineRule="auto"` : ''}/>${o.sangria ? `<w:ind w:left="${o.sangria}"/>` : ''}${o.centro ? '<w:jc w:val="center"/>' : o.derecha ? '<w:jc w:val="right"/>' : ''}`;
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs}</w:p>`;
}

export class DocITES {
  constructor({ materia = 'Origen de las Cocinas', escuela = 'ITES René Descartes' } = {}) {
    this.materia = materia; this.escuela = escuela; this.cuerpo = []; this.imgs = []; this.logo = null;
  }
  async cargarLogo(url = 'assets/escudo.png') {
    try { const r = await fetch(url); if (r.ok) this.logo = new Uint8Array(await r.arrayBuffer()); } catch { this.logo = null; }
  }
  _imagen(bytes, wPx, hPx, anchoCm) {
    const n = this.imgs.length + 1; this.imgs.push(bytes);
    const cx = Math.round(anchoCm * 360000), cy = Math.round(cx * hPx / wPx);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Imagen ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="img${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }
  // Portada: escudo, tema, título, subtítulo, autores y fecha.
  portada({ kicker = '', titulo, subtitulo = '', etiqueta = '', personas = [], fecha = new Date() }) {
    const c = this.cuerpo;
    c.push(par('', { despues: 600 }));
    if (this.logo) c.push(`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>${this._imagen(this.logo, 320, 320, 4)}</w:p>`);
    c.push(par([[this.escuela, { caps: true, b: true, color: C.suave, tam: 10, espaciado: 40 }]], { centro: true, despues: 480 }));
    if (kicker) c.push(par([[kicker, { caps: true, b: true, color: C.azafranOsc, tam: 11, espaciado: 30 }]], { centro: true, despues: 120 }));
    c.push(par([[titulo, { fuente: 'Georgia', b: true, color: C.tinta, tam: 30 }]], { centro: true, despues: 160, interlineado: 260 }));
    if (subtitulo) c.push(par([[subtitulo, { color: C.suave, tam: 13 }]], { centro: true, despues: 360 }));
    c.push(par('', { centro: true, bordeAbajo: [C.azafran, 24], despues: 480, sangria: 0 }));
    if (etiqueta) c.push(par([[etiqueta, { b: true, color: C.tinta, tam: 13 }]], { centro: true, despues: 80 }));
    personas.forEach(n => c.push(par([[n, { color: C.tinta, tam: 12 }]], { centro: true, despues: 40 })));
    c.push(par('', { despues: 600 }));
    c.push(par([[`${this.materia} · ${this.escuela}`, { color: C.suave, tam: 10 }]], { centro: true, despues: 40 }));
    c.push(par([[fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), { color: C.suave, tam: 10 }]], { centro: true }));
    this.saltoPagina();
  }
  saltoPagina() { this.cuerpo.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>'); }
  h1(texto, sub) {
    this.cuerpo.push(par([[texto, { fuente: 'Georgia', b: true, color: C.tinta, tam: 20 }]], { estilo: 'Titulo1', keep: true, bordeAbajo: [C.azafran, 18], antes: 120, despues: 160 }));
    if (sub) this.cuerpo.push(par([[sub, { color: C.suave, tam: 11 }]], { despues: 200 }));
  }
  h2(texto, color = C.azafran, extra) {
    this.cuerpo.push(par([[texto, { fuente: 'Georgia', b: true, color: C.tinta, tam: 15 }], ...(extra ? [[`  ${extra}`, { color: C.suave, tam: 10 }]] : [])], { estilo: 'Titulo2', keep: true, bordeIzq: [color, 48], antes: 280, despues: 120 }));
  }
  p(contenido, o) { this.cuerpo.push(par(contenido, o)); }
  nota(texto) { this.cuerpo.push(par([[texto, { i: true, color: C.suave, tam: 10 }]], { despues: 120 })); }
  // Texto libre del alumno: respeta sus párrafos; si está vacío, lo dice en gris.
  texto(t, vacio = '(sin escribir)') {
    const ps = String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
    if (!ps.length) { this.cuerpo.push(par([[vacio, { i: true, color: '9A9389' }]])); return; }
    ps.forEach(x => this.cuerpo.push(par(x, { despues: 80 })));
  }
  imagen(bytes, wPx, hPx, anchoCm = 16.5) { this.cuerpo.push(`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>${this._imagen(bytes, wPx, hPx, anchoCm)}</w:p>`); }
  // filas: arreglo de arreglos de celdas. Celda = texto | {t, runs, fondo, b, color, ancho}
  tabla(filas, { anchos, encabezado = true, fondoEnc = C.tinta, colorEnc = 'FFFFFF', cebra = true } = {}) {
    const ncol = Math.max(...filas.map(f => f.length));
    const w = anchos || Array(ncol).fill(Math.floor(ANCHO / ncol));
    const borde = `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="${C.linea}"/>`).join('')}</w:tblBorders>`;
    let x = `<w:tbl><w:tblPr><w:tblW w:w="${w.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${borde}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${w.map(a => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>`;
    filas.forEach((f, ri) => {
      const enc = encabezado && ri === 0;
      x += `<w:tr>${enc ? '<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}`;
      f.forEach((cel, ci) => {
        const o = typeof cel === 'object' && cel !== null && !Array.isArray(cel) ? cel : { t: cel };
        const fondo = o.fondo || (enc ? fondoEnc : cebra && ri % 2 === 0 ? C.crema : null);
        const contenido = o.runs ? o.runs : [[o.t ?? '', { b: enc || o.b, color: enc ? colorEnc : o.color, tam: enc ? 10 : o.tam || 11, i: o.i }]];
        const lineas = o.runs ? [par(contenido, { despues: 0 })] : String(o.t ?? '').split(/\n+/).map(l => par([[l, contenido[0][1]]], { despues: 40 }));
        x += `<w:tc><w:tcPr><w:tcW w:w="${w[ci]}" w:type="dxa"/>${fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${hex(fondo)}"/>` : ''}</w:tcPr>${lineas.join('') || '<w:p/>'}</w:tc>`;
      });
      x += '</w:tr>';
    });
    this.cuerpo.push(x + '</w:tbl>', par('', { despues: 120 }));
  }
  // Ficha: tabla de dos columnas (apartado | contenido), con quién lo escribió si se indica.
  ficha(filas) {
    this.tabla(filas.map(([et, val, autor]) => [
      { runs: [[et, { b: true, color: C.tinta, tam: 10 }], ...(autor ? [[`\n✍ ${autor}`, { color: '3F7A4F', tam: 9 }]] : [])], fondo: C.pergamino },
      { t: String(val || '').trim() || '(sin escribir)', color: String(val || '').trim() ? null : '9A9389', i: !String(val || '').trim() },
    ]), { anchos: [2600, ANCHO - 2600], encabezado: false, cebra: false });
  }
  _xml() {
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rHdr"/><w:footerReference w:type="default" r:id="rFtr"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1300" w:left="1440" w:header="600" w:footer="600" w:gutter="0"/><w:titlePg/></w:sectPr>`;
    const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${this.cuerpo.join('')}${sect}</w:body></w:document>`;
    const encabezado = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W}>${par([[`${this.materia}  ·  `, { b: true, color: C.azafranOsc, tam: 9 }], [this.escuela, { color: C.suave, tam: 9 }]], { derecha: true, bordeAbajo: [C.azafran, 6], despues: 0 })}</w:hdr>`;
    const pie = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${W}><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="${C.suave}"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Página </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:color w:val="${C.suave}"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple><w:r><w:rPr><w:color w:val="${C.suave}"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve"> de </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:rPr><w:color w:val="${C.suave}"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;
    const estilo = (id, nombre, tam, nivel) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nombre}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="${nivel}"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:sz w:val="${tam}"/><w:szCs w:val="${tam}"/></w:rPr></w:style>`;
    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:color w:val="${C.tinta}"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-MX"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${estilo('Titulo1', 'heading 1', 40, 0)}${estilo('Titulo2', 'heading 2', 30, 1)}</w:styles>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${this.imgs.map((_, i) => `<Relationship Id="rImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img${i + 1}.png"/>`).join('')}</Relationships>`;
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/_rels/document.xml.rels', rels],
      ['word/document.xml', documento],
      ['word/styles.xml', estilos],
      ['word/header1.xml', encabezado],
      ['word/footer1.xml', pie],
      ...this.imgs.map((b, i) => [`word/media/img${i + 1}.png`, b]),
    ]);
  }
  descargar(nombre) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(this._xml());
    a.download = nombre.endsWith('.docx') ? nombre : nombre + '.docx'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
}
export const COLORES_ITES = C;

// Mapa de un continente como PNG (para Word): países coloreados y sus nombres.
export async function mapaContinentePNG(A, PAIS, k, colorDe, { nombres = true, ancho = 1800 } = {}) {
  const [cx0, cy0, cw, ch] = A.mundo.cajas[k], m = .05;
  const x = cx0 - cw * m, y = cy0 - ch * m, w = cw * (1 + 2 * m), h = ch * (1 + 2 * m);
  const W = ancho, H = Math.round(W * h / w);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}"><rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" fill="#EAF1F3"/>`;
  const mios = A.mundo.paises.filter(p => p.i && PAIS[p.i] && PAIS[p.i].cont === k);
  A.mundo.paises.forEach(p => { const mio = p.i && PAIS[p.i] && PAIS[p.i].cont === k; s += `<path d="${p.d}" fill="${mio ? colorDe(p.i) || '#EFE8DA' : '#F7F4EE'}" stroke="${mio ? '#8A8072' : '#E2DCD0'}" stroke-width="${w / 1300}"/>`; });
  const islas = A.mundo.islas.filter(i => PAIS[i.i] && PAIS[i.i].cont === k);
  islas.forEach(i => { s += `<circle cx="${i.x}" cy="${i.y}" r="${w / 150}" fill="${colorDe(i.i) || '#EFE8DA'}" stroke="#555" stroke-width="${w / 1600}"/>`; });
  if (nombres) {
    const fs = w / 80, min = (w * h) / 2600;
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    mios.filter(p => p.c && p.a >= min).forEach(p => { const t = ABREV[p.i] || PAIS[p.i].n.replace(/ \(.*\)$/, ''); const f = Math.min(fs * 1.25, Math.max(fs * .62, fs * Math.sqrt(p.a / (min * 6)))); s += `<text x="${p.c[0]}" y="${p.c[1]}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${f.toFixed(2)}" text-anchor="middle" dominant-baseline="central" fill="#1C1B19" stroke="#FFFFFF" stroke-width="${(f / 4).toFixed(2)}" paint-order="stroke" stroke-linejoin="round">${esc(t)}</text>`; });
    islas.forEach(i => { s += `<text x="${i.x + w / 110}" y="${i.y}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${(fs * .75).toFixed(2)}" dominant-baseline="central" fill="#1C1B19" stroke="#FFFFFF" stroke-width="${(fs / 5).toFixed(2)}" paint-order="stroke">${esc(i.n)}</text>`; });
  }
  s += '</svg>';
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(img, 0, 0, W, H);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), W, H };
}
// Nombres cortos para que quepan en el mapa
export const ABREV = {
  COD: 'R. D. del Congo', COG: 'Congo', CAF: 'R. Centroafricana', GNQ: 'G. Ecuatorial', SAH: 'Sahara Occ.', SOL: 'Somalilandia',
  ZAF: 'Sudáfrica', SDS: 'Sudán del Sur', BFA: 'Burkina Faso', CIV: 'C. de Marfil', GNB: 'G.-Bisáu', DOM: 'R. Dominicana',
  USA: 'Estados Unidos', ARE: 'E. A. U.', SAU: 'Arabia Saudita', BIH: 'Bosnia', MKD: 'Macedonia N.', CZE: 'Chequia', PNG: 'Papúa N. G.', SLB: 'Islas Salomón',
  TTO: 'Trinidad y T.', CYN: 'Chipre N.', PSX: 'Palestina',
};
