// tarea-word.js — Word de las tareas digitales para el PANEL DOCENTE (descargar el trabajo de un
// alumno o equipo, o todos en .zip). Arma el mismo documento que descarga el alumno, a partir de los
// datos guardados en Firestore. Lo usa admin.js.
import { DocITES } from "./docx-ites.js?v=2026110501";
import { mapaContinentePNG } from "./docx-ites.js?v=2026110501";
import { CUADRO_MM, INFLUENCIAS, ESPECIAS, subregionDe } from "./clase-datos.js";
import { RECADOS, ORIGENES, LLEGADAS, recadoDe, ingsDe, infoRecado, recadosDe } from "./recado-datos.js";
import { fotosAlWord } from "./fotos.js";

export const slugArchivo = n => String(n || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
const quien = (eq, nombre) => slugArchivo(eq ? 'equipo ' + eq.nombre : nombre);
const portadaDe = (D, o, eq, nombre) => D.portada({ ...o, etiqueta: eq ? `Equipo «${eq.nombre}»` : 'Alumno', personas: eq ? eq.nombres || [] : [nombre] });

// ---------- Cuadro comparativo mexica–maya
async function cuadro(D, d, eq, nombre) {
  const A = CUADRO_MM, cel = d.celdas || {}, por = d.por || {};
  portadaDe(D, { kicker: 'Tema 3.2 · México prehispánico y mestizo', titulo: 'Cocina mexica y cocina maya', subtitulo: 'Cuadro comparativo' }, eq, nombre);
  D.h1('Cuadro comparativo', 'Dos tradiciones del mismo tronco mesoamericano: maíz, frijol y chile.');
  const celda = k => { const t = (cel[k] || '').trim(), au = eq && por[k]; return { runs: [[t || '(sin escribir)', t ? {} : { i: true, color: '9A9389' }], ...(au ? [[`\n✍ ${au}`, { color: '3F7A4F', tam: 8 }]] : [])] }; };
  const cab = (f, t, inv) => { const fu = (cel[`${f}_fuente`] || '').trim(); return inv ? { runs: [[t, { b: true }], [`\n🔎 Investigación${fu ? ' · Fuente: ' + fu : ' · sin fuente'}`, { color: '6B6358', tam: 8, i: !fu }]], fondo: 'F4EFE4' } : { t, b: true, fondo: 'F4EFE4' }; };
  D.tabla([['Apartado', ...A.columnas.map(c => c[1])], ...A.filas.map(([f, t, , inv]) => [cab(f, t, inv), ...A.columnas.map(([c]) => celda(`${f}_${c}`))])], { anchos: [1700, 2560, 2560, 2540] });
  return `Cuadro_mexica_maya_${quien(eq, nombre)}`;
}

// ---------- Las siete influencias de la cocina campechana
async function influencias(D, S, eq, nombre) {
  const I = INFLUENCIAS, inf = S.inf || {}, por = S.por || {};
  portadaDe(D, { kicker: 'Tema 3.2 · Campeche y el resto de América', titulo: S.platillo || 'Nuestro platillo campechano', subtitulo: 'Las siete influencias de la cocina campechana' }, eq, nombre);
  const si = I.lista.filter(([k]) => inf[k] && inf[k].si).length;
  D.h1('Las siete influencias', `En ${S.platillo || 'nuestro platillo'} encontramos ${si} de las 7 influencias que identifica el maestro Rafael Enrique Meneses López.`);
  D.tabla([['Influencia', '¿Está presente?', '¿En qué se nota?'], ...I.lista.map(([k, n, col]) => { const v = inf[k] || {}; return [{ runs: [['■ ', { color: col.slice(1), b: true }], [n, { b: true }], ...(eq && por[k] ? [[`\n✍ ${por[k]}`, { color: '3F7A4F', tam: 8 }]] : [])] }, { t: v.si === true ? 'Sí' : v.si === false ? 'No' : '—', b: v.si === true, fondo: v.si === true ? 'E3F1E6' : null }, (v.ev || '').trim() || '—']; })], { anchos: [2300, 1500, 5560] });
  D.h1('Nuestro argumento'); D.texto(S.argumento);
  D.h2('Fuentes consultadas'); D.texto(S.fuentes);
  return `Siete_influencias_${quien(eq, nombre)}`;
}

// ---------- Las especias de Asia
async function especias(D, S, eq, nombre, alumnoId) {
  const [, sn, , spista] = subregionDe(eq, alumnoId), c = S.campos || {}, por = S.por || {};
  portadaDe(D, { kicker: 'Tema 3.3 · Cocinas asiáticas', titulo: `Las especias de Asia: ${sn}`, subtitulo: 'Ficha de una subregión de Asia' }, eq, nombre);
  D.h1(sn, spista);
  D.ficha(ESPECIAS.campos.map(([k, t]) => [t.replace(/^\S+\s/, ''), c[k], eq ? por[k] : '']));
  return `Especias_de_Asia_${quien(eq, nombre)}`;
}

// ---------- El recado campechano
async function recado(D, S, eq, nombre, alumnoId) {
  const LR = recadosDe(S.recado || recadoDe(eq, alumnoId)[0]), dos = LR.length > 1, c = S.campos || {}, por = S.por || {}, L = ingsDe(S);
  const rn = LR.map(k => infoRecado(k)[1]).join(' y '), rpista = dos ? 'Comparación: el recado que casi no viajó y uno de los que más viajaron.' : infoRecado(LR[0])[3];
  const nR = k => k === 'ambos' ? 'Los dos' : k ? infoRecado(k)[1].replace('Recado ', '') : '—';
  const nO = k => (ORIGENES.find(x => x[0] === k) || [, '—'])[1], nL = k => (LLEGADAS.find(x => x[0] === k) || [, '—'])[1];
  portadaDe(D, { kicker: 'Tema 3.4 · Cocinas europeas · Tema 3.3 · Cocinas asiáticas', titulo: `El recado campechano: ${rn.toLowerCase()}`, subtitulo: 'El mundo en una pasta: de dónde viene cada ingrediente y cómo llegó a Campeche' }, eq, nombre);
  const conts = new Set(L.map(x => x.o).filter(Boolean));
  D.h1(rn, `${rpista} ${L.length} ingredientes de ${conts.size} ${conts.size === 1 ? 'origen' : 'orígenes'} distintos.`);
  const nombreIng = x => ({ runs: [[x.n, { b: true }], ...(dos ? [[`\n${nR(x.r)}`, { color: '6B6358', tam: 8 }]] : []), ...(eq && x.por ? [[`\n✍ ${x.por}`, { color: '3F7A4F', tam: 8 }]] : [])] });
  if (L.length) D.tabla([['Ingrediente', 'Origen', '¿Cómo llegó a Campeche?', 'Su ruta'], ...L.map(x => [nombreIng(x), nO(x.o), nL(x.l), (x.ruta || '').trim() || '—'])], { anchos: [1900, 1600, 2000, 3860] });
  else D.texto('');
  D.ficha(RECADOS.campos.map(([k, t]) => [t.replace(/^\S+\s/, ''), c[k], eq ? por[k] : '']));
  return `Recado_campechano_${quien(eq, nombre)}`;
}

// ---------- Desarma el platillo (la ficha calificada)
const DE_NOM = { america: 'América', europa: 'Europa', asia: 'Asia', africa: 'África', otro: 'Otro o sin saber de dónde', sin: 'Sin clasificar' };
const DE_PREG = [['q1', '¿Qué parte de este platillo es herencia prehispánica?'], ['q2', '¿Qué se adoptó después de la conquista y de dónde llegó?'], ['q3', '¿Por qué decimos que es un platillo mestizo?']];
async function desarma(D, m, eq, nombre) {
  const F = (m && m.ficha) || {};
  portadaDe(D, { kicker: 'Tema 3.2 · Tarea: Desarma el platillo', titulo: (F.nombre || 'Platillo sin nombre').trim(), subtitulo: '¿Qué parte es herencia prehispánica y qué parte fue adoptada tras la conquista?' }, null, nombre);
  D.h1('Ficha del platillo');
  D.ficha([['Platillo', F.nombre], ['Estado o región', F.region], ['Historia', F.historia]]);
  const ings = F.ingredientes || [], nom = { n: 'De América (prehispánico)', l: 'Llegó después de 1521', x: 'Por investigar', '': 'Sin clasificar' }, fondo = { n: 'E3F1E6', l: 'DCE7F3', x: 'F1F1F1', '': 'FFFFFF' };
  D.h1('Ingredientes', `${ings.filter(x => x.o === 'n').length} de América · ${ings.filter(x => x.o === 'l').length} llegaron después de 1521 · ${ings.filter(x => !x.o || x.o === 'x').length} por investigar`);
  if (ings.length) D.tabla([['Ingrediente', 'Origen', '¿De dónde llegó?'], ...ings.map(x => [{ t: x.n, b: true }, { t: nom[x.o || ''], fondo: fondo[x.o || ''] }, x.o === 'l' ? DE_NOM[x.de || 'otro'] : x.o === 'n' ? 'América' : '—'])], { anchos: [3120, 3120, 3120], cebra: false }); else D.texto('');
  const tecs = F.tecnicas || [], nomT = { n: 'Prehispánica', l: 'Llegó con los europeos', x: 'Por investigar', '': 'Sin clasificar' };
  D.h1('Técnicas');
  if (tecs.length) D.tabla([['Técnica', 'Origen'], ...tecs.map(x => [{ t: x.n, b: true }, { t: nomT[x.o || ''], fondo: fondo[x.o || ''] }])], { anchos: [4680, 4680], cebra: false }); else D.texto('');
  D.h1('Conclusión');
  DE_PREG.forEach(([k, t]) => { D.h2(t); D.texto(F[k]); });
  D.h1('Fuentes consultadas'); D.texto(F.fuentes);
  return `Desarma_el_platillo_${slugArchivo(F.nombre || 'platillo')}_${slugArchivo(nombre)}`;
}

// ---------- Mi atlas de un continente
const CAMPOS_REGION = [['clima', 'Clima y paisaje'], ['ingredientes', 'Ingredientes base'], ['platillos', 'Platillos representativos'], ['tecnicas', 'Técnicas y utensilios'], ['historia', 'Historia e influencias'], ['dato', 'Dato curioso'], ['fuentes', 'Fuentes consultadas (APA 7)']];
let ATLAS = null;
async function atlasDatos() {
  if (ATLAS) return ATLAS;
  const A = await fetch('data/atlas.json').then(r => r.json()), PAIS = {};
  Object.values(A.regiones).forEach(r => r.paises.forEach(p => { PAIS[p.id] = { ...p, cont: r.cont }; }));
  ATLAS = { A, PAIS }; return ATLAS;
}
// c = { regiones: [{id, nombre, color, clima…}], asign: {pais: regionId}, paises: {pais: {platillos, notas}}, por: {regionId: {campo: autor}} }
async function atlas(D, c, eq, nombre, cont) {
  const { A, PAIS } = await atlasDatos(), con = A.continentes[cont], corto = n => String(n).replace(/ \(.*\)$/, '');
  const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  portadaDe(D, { kicker: 'Tema 3 · Cocinas en el mundo', titulo: 'Atlas de las cocinas del mundo', subtitulo: `Regiones culinarias propuestas por ${eq ? 'nuestro equipo' : 'mí'}: ${con.nombre}` }, eq, nombre);
  const regs = c.regiones || [], asign = c.asign || {};
  const deCont = Object.values(PAIS).filter(p => p.cont === cont), hechos = Object.keys(asign).filter(i => PAIS[i] && PAIS[i].cont === cont).length;
  D.h1(con.nombre, `Subtema ${con.sub} · ${hechos} de ${deCont.length} países clasificados en ${pl(regs.length, 'región culinaria', 'regiones culinarias')}.`);
  const colorDe = id => { const r = asign[id] && regs.find(z => z.id === asign[id]); return r ? r.color : null; };
  try { const png = await mapaContinentePNG(A, PAIS, cont, colorDe, { nombres: true }); D.imagen(png.bytes, png.W, png.H, Math.min(16.5, 18 * png.W / png.H)); } catch { /* sin mapa */ }
  const filas = [['', 'Región', 'Países']];
  regs.forEach(r => { const ps = Object.entries(asign).filter(([, x]) => x === r.id).map(([i]) => corto(PAIS[i] ? PAIS[i].n : i)).sort((a, b) => a.localeCompare(b, 'es')); filas.push([{ t: '', fondo: r.color }, { t: r.nombre, b: true }, ps.join(', ') || '—']); });
  if (filas.length > 1) D.tabla(filas, { anchos: [500, 2600, 6260] });
  for (const r of regs) {
    const ps = Object.entries(asign).filter(([, x]) => x === r.id).length, por = (c.por || {})[r.id] || {};
    D.h2(r.nombre, r.color, `· ${pl(ps, 'país', 'países')}`);
    D.ficha(CAMPOS_REGION.map(([f, t]) => [t, r[f], eq ? por[f] : null]));
  }
  const notas = Object.entries(c.paises || {}).filter(([i, v]) => PAIS[i] && PAIS[i].cont === cont && ((v.platillos || '').trim() || (v.notas || '').trim()));
  if (notas.length) { D.h2('Notas por país', '8A8072'); D.tabla([['País', 'Platillos', 'Notas e investigación'], ...notas.map(([i, v]) => [{ t: corto(PAIS[i].n), b: true }, (v.platillos || '').trim() || '—', (v.notas || '').trim() || '—'])], { anchos: [2200, 3000, 4160] }); }
  return `Atlas_${con.nombre}_${quien(eq, nombre)}`;
}

// a: tarea (TAREAS_DIG); datos: lo guardado (para atlas, ya normalizado como c); eq: equipo o null.
export async function wordTarea(a, datos, { eq = null, nombre = '', alumnoId = '', fotos = null } = {}) {
  const D = new DocITES(); await D.cargarLogo();
  const fn = { cuadro, influencias, especias, desarma, atlas, recado }[a.tipo];
  if (!fn) throw new Error('Esta tarea no tiene Word.');
  const archivo = await fn(D, datos || {}, eq, nombre, a.tipo === 'atlas' ? a.cont : alumnoId);
  if (fotos && fotos.length) await fotosAlWord(D, fotos);
  return { blob: D.blob ? D.blob() : D._xml(), archivo: archivo + '.docx', D };
}
