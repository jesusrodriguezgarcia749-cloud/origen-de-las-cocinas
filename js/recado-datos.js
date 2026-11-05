// recado-datos.js — Tarea del Tema 3.4: «El recado campechano: el mundo en una pasta».
// Un recado por equipo (asignado por sorteo). Los alumnos investigan sus ingredientes, los guisos
// donde se usa y la ruta de cada ingrediente hasta Campeche. El docente libera dos claves:
// la 1 (ingredientes y guisos) y la 2 (de dónde viene cada ingrediente y cómo llegó a Campeche).
// Fuentes: Gastrolab (2025), «Recados yucatecos»; Yucatán Today, «The best types of recado in
// Yucatán»; Por Esto (2026), «Del chocolomo al puchero»; compendio, subtemas 3.2, 3.3 y 3.4.
// Las proporciones y algunos ingredientes cambian según la familia y el vendedor.

export const RECADOS = {
  id: 'act-recado',
  // [clave, nombre, color, pista (sin decir ingredientes ni guisos), otros nombres]
  lista: [
    ['rojo', 'Recado rojo', '#C0392B', 'Es el más famoso de la península: tiñe de rojo anaranjado lo que toca y se usa mucho para lo que se cocina bajo la tierra.', 'También se llama recado colorado o de achiote.'],
    ['negro', 'Recado negro', '#2B2622', 'Su color sale de algo que se quema a propósito. Es el recado de las fiestas y de los guisos de pavo.', 'También se llama recado de chilmole.'],
    ['blanco', 'Recado blanco', '#B59A6A', 'No pinta la comida: perfuma los caldos y los guisos de fiesta. Es de los que más especias juntan.', 'También se llama recado de puchero o de especia.'],
    ['escabeche', 'Recado de escabeche', '#2E6FA8', 'Es el de los guisos ácidos con cebolla. En Campeche se usa mucho con pescado del Golfo.', 'Muchas familias usan el «recado de especia» o «para todo».'],
    ['bistec', 'Recado para bistec', '#7B5A2E', 'Se unta a la carne antes de cocinarla. Lleva vinagre y muchas especias molidas.', 'También se vende como recado de bistec o de asado.'],
    ['verde', 'Recado verde', '#3F7A4F', 'Es el más distinto de todos: casi no lleva especias. Su base es una semilla tostada y molida.', 'También se llama recado de pepita.'],
  ],
  // [clave, título, ayuda, palabras mínimas]
  campos: [
    ['guisos', '🍲 Guisos donde se usa', 'Al menos dos guisos campechanos o yucatecos que lleven su recado, y qué les da: color, sabor, aroma.', 20],
    ['conclusion', '🌍 Nuestra conclusión', '¿De cuántos continentes son los ingredientes de su recado? ¿Cuál fue el viaje más largo? ¿Qué les sorprendió?', 25],
    ['fuentes', '📚 Fuentes', 'Libros, páginas (autor, año, título, sitio) o la persona que les enseñó el recado.', 1],
  ],
};

// De dónde es originario un ingrediente
export const ORIGENES = [
  ['america', 'América', '#3F9A55'],
  ['asia', 'Asia', '#B5486E'],
  ['medio', 'Medio Oriente', '#C98A2C'],
  ['medit', 'Mediterráneo y Europa', '#2E6FA8'],
  ['africa', 'África', '#E07B39'],
];
// Cómo llegó a Campeche
export const LLEGADAS = [
  ['aqui', 'Ya estaba aquí (es de América)'],
  ['espana', 'Con los españoles, desde España'],
  ['galeon', 'Con el Galeón de Manila'],
  ['ambas', 'Por las dos rutas: España y el Galeón'],
  ['otra', 'Otra ruta'],
];

// Clave 2: de dónde viene cada ingrediente y cómo llegó a Campeche.
// o origen · l llegadas correctas · ruta (para revelar) · trampa (opcional) · re (cómo reconocerlo en lo que escriben)
export const INGS = {
  achiote: { n: 'Achiote', e: '🔴', o: 'america', l: ['aqui'], re: /achiote|annatto|bixa/,
    ruta: 'Es la semilla de un arbusto de la América tropical. Los mayas ya la usaban para dar color a la comida y a las bebidas de cacao, y en ceremonias. No tuvo que viajar: estaba aquí.' },
  chile: { n: 'Chile seco', e: '🌶️', o: 'america', l: ['aqui'], re: /chile|chawa|ch'?ak|xcatik/,
    ruta: 'El chile es mesoamericano: se domesticó en México hace miles de años. Para el recado negro se tuesta hasta quemarse; el tizne le da el color.',
    trampa: 'Viajó al revés: de América salió hacia Europa, África y Asia (por Lisboa y por el Galeón de Manila).' },
  maiz: { n: 'Tortilla quemada (maíz)', e: '🌽', o: 'america', l: ['aqui'], re: /tortilla|maiz/,
    ruta: 'El maíz es mesoamericano. En el recado negro se queman tortillas junto con los chiles para lograr el color negro.' },
  pepita: { n: 'Pepita de calabaza', e: '🎃', o: 'america', l: ['aqui'], re: /pepita|calabaza|xmejen|sikil/,
    ruta: 'La calabaza es de las primeras plantas que se cultivaron en Mesoamérica, una de las «Tres Hermanas» con el maíz y el frijol. Los mayas ya tostaban y molían su semilla.' },
  epazote: { n: 'Epazote', e: '🌿', o: 'america', l: ['aqui'], re: /epazote/,
    ruta: 'Hierba nativa de México; su nombre viene del náhuatl. Ya estaba en la cocina prehispánica.' },
  pimientaTab: { n: 'Pimienta de Tabasco', e: '🟤', o: 'america', l: ['aqui'], re: /pimienta (de )?tabasco|pimienta gorda|pimienta dulce|pimienta de jamaica|malagueta|allspice|nabal/,
    ruta: 'Es el fruto seco de un árbol del sureste de México, Centroamérica y el Caribe. Los mayas ya la usaban.',
    trampa: 'Se llama «pimienta» porque a los españoles les recordó la pimienta negra, pero no son parientes: esta es americana y viajó de aquí a Europa.' },
  oregano: { n: 'Orégano yucateco', e: '🌱', o: 'america', l: ['aqui'], re: /oregano/,
    ruta: 'El orégano de la península es una planta nativa de América, distinta del orégano del Mediterráneo, aunque se llamen igual por su aroma parecido.',
    trampa: 'Si su recado lleva orégano del Mediterráneo (el de frasco importado), ese sí llegó de Europa.' },
  sal: { n: 'Sal', e: '🧂', o: 'america', l: ['aqui'], re: /\bsal\b/,
    ruta: 'Es local: viene de las salinas de la costa de la península (como Celestún y Las Coloradas). Los mayas la producían y la comerciaban por todo Mesoamérica mucho antes de 1521.',
    trampa: 'No es una planta, así que no tiene un «origen» como las especias, pero la de los recados es de aquí.' },
  pimienta: { n: 'Pimienta negra', e: '⚫', o: 'asia', l: ['espana', 'galeon', 'ambas'], re: /pimienta/,
    ruta: 'Nace en la costa de Malabar, en la India. Viajaba por mar y por caravanas hasta Venecia; los portugueses abrieron la ruta por África en 1498. De España llegó a Campeche en los barcos de la flota, y también llegaba por el Pacífico en el Galeón de Manila (Manila–Acapulco).',
    trampa: 'En la Edad Media valía casi como el oro: por ella se buscaron nuevas rutas por mar… y así se llegó a América.' },
  clavo: { n: 'Clavo', e: '🌰', o: 'asia', l: ['espana', 'galeon', 'ambas'], re: /clavo/,
    ruta: 'Es la flor seca de un árbol de las islas Molucas (Indonesia), las «islas de las especias». Portugueses, españoles y holandeses compitieron por ellas. Llegó a Campeche desde España y también con el Galeón de Manila.' },
  canela: { n: 'Canela', e: '🪵', o: 'asia', l: ['espana', 'galeon', 'ambas'], re: /canela/,
    ruta: 'Es la corteza de un árbol de Ceilán (hoy Sri Lanka), en Asia del Sur. Llegó con los españoles y con el Galeón de Manila. Hoy México es de los países que más canela de Ceilán compran en el mundo.' },
  naranja: { n: 'Naranja agria', e: '🍊', o: 'asia', l: ['espana'], re: /naranja/,
    ruta: 'Nace en el sur de China y el sureste de Asia. Pasó a Persia, los árabes la llevaron a al-Ándalus (España) hacia el siglo X, y Colón llevó semillas de cítricos al Caribe en su segundo viaje (1493). De ahí llegó a la península con los españoles en el siglo XVI.',
    trampa: 'La sentimos 100% yucateca, pero es asiática. Y no llegó por el Galeón de Manila: dio la vuelta por Persia, los árabes y España.' },
  ajo: { n: 'Ajo', e: '🧄', o: 'asia', l: ['espana'], re: /ajo/,
    ruta: 'Nace en Asia Central. Desde la Antigüedad se cultivaba en Egipto y en todo el Mediterráneo; llegó a Campeche con los españoles.' },
  cebolla: { n: 'Cebolla', e: '🧅', o: 'asia', l: ['espana'], re: /cebolla/,
    ruta: 'Nace en Asia Central y el actual Irán. Se cultivaba en todo el Mediterráneo y llegó con los españoles. (En el recado blanco se usa asada).' },
  comino: { n: 'Comino', e: '🟫', o: 'medio', l: ['espana'], re: /comino/,
    ruta: 'Es la semilla de una planta del Medio Oriente y el Mediterráneo oriental; ya se usaba en el antiguo Egipto. Los árabes lo hicieron básico en al-Ándalus y los españoles lo trajeron a América.' },
  cilantro: { n: 'Cilantro en semilla', e: '🟡', o: 'medio', l: ['espana'], re: /cilantro|coriandro|culantro/,
    ruta: 'Planta del Mediterráneo oriental y el Medio Oriente. Llegó con los españoles; en los recados se usa la semilla seca, no la hoja.' },
  laurel: { n: 'Laurel', e: '🍃', o: 'medit', l: ['espana'], re: /laurel/,
    ruta: 'Árbol del Mediterráneo; en Grecia y Roma con sus hojas se coronaba a los vencedores. Llegó con los españoles.' },
  vinagre: { n: 'Vinagre', e: '🫙', o: 'medit', l: ['espana'], re: /vinagre/,
    ruta: 'El vinagre de vino es del Viejo Mundo. La técnica del escabeche viene del persa y árabe «sikbaj»: los árabes la llevaron a al-Ándalus y los españoles a América. Aquí se hace también con naranja agria.',
    trampa: 'En el escabeche lo que viajó no fue solo un ingrediente: viajó una técnica completa.' },
};
// orden en que se busca (de lo más específico a lo más general)
const ORDEN_RE = ['pimientaTab', 'pimienta', 'achiote', 'chile', 'maiz', 'pepita', 'epazote', 'oregano', 'clavo', 'canela', 'naranja', 'ajo', 'cebolla', 'comino', 'cilantro', 'laurel', 'vinagre', 'sal'];
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
export function reconocer(nombre) { const t = norm(nombre); if (!t) return null; return ORDEN_RE.find(k => INGS[k].re.test(t)) || null; }

// Clave 1: ingredientes y guisos de cada recado
export const CLAVE_RECADO = {
  rojo: { ings: ['achiote', 'pimienta', 'clavo', 'canela', 'comino', 'oregano', 'ajo', 'naranja', 'sal'],
    guisos: ['Cochinita pibil', 'Pollo pibil', 'Tikin xic (pescado en achiote)', 'Mukbil pollo, el pib de Finados', 'Mondongo kabic'],
    nota: 'Algunas familias le agregan cilantro en semilla, laurel o pimienta de Tabasco.' },
  negro: { ings: ['chile', 'maiz', 'pimienta', 'pimientaTab', 'clavo', 'oregano', 'laurel', 'ajo', 'cebolla', 'sal'],
    guisos: ['Relleno negro (pavo)', 'Chilmole', 'Buut, la albóndiga de carne y huevo del relleno'],
    nota: 'Los chiles y las tortillas se queman a propósito y se remojan: el tizne le da el color negro.' },
  blanco: { ings: ['pimienta', 'pimientaTab', 'clavo', 'comino', 'canela', 'oregano', 'ajo', 'cebolla', 'naranja', 'sal'],
    guisos: ['Relleno blanco (pavo)', 'Puchero de tres carnes', 'Caldos', 'Lechón al horno'],
    nota: 'El ajo y la cebolla se usan asados.' },
  escabeche: { ings: ['pimienta', 'clavo', 'comino', 'canela', 'oregano', 'laurel', 'ajo', 'vinagre', 'naranja', 'sal'],
    guisos: ['Pámpano en escabeche (muy campechano)', 'Escabeche oriental de pavo (Valladolid)', 'Pollo en escabeche', 'Pescado en escabeche'],
    nota: 'Es el recado que junta los tres mundos: técnica árabe y española, especias de Asia y pescado del Golfo.' },
  bistec: { ings: ['pimienta', 'pimientaTab', 'clavo', 'canela', 'cilantro', 'comino', 'oregano', 'ajo', 'vinagre', 'sal'],
    guisos: ['Bistec de cazuela', 'Chocolomo (carne de res y vísceras con clavo, pimienta y orégano)', 'Bistec encebollado'],
    nota: 'Se unta a la carne antes de cocinarla en poco aceite.' },
  verde: { ings: ['pepita', 'epazote', 'sal'],
    guisos: ['Papadzules', 'Pipián verde', 'Sikil p\'aak (con pepita menuda)'],
    nota: 'Es el único recado casi 100% americano: el que no tuvo que viajar.' },
};

const semilla = t => { let h = 2166136261; for (const ch of String(t)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
// Sorteo estable: la misma formación de equipos siempre reparte los recados igual (equipo 1, 2, 3…).
// Con 6 equipos sale uno distinto para cada uno. Quien trabaja solo recibe uno por su nombre.
export function recadoDe(eq, alumnoId) {
  const L = RECADOS.lista, n = L.length, idx = [...Array(n).keys()];
  let r = semilla((eq ? eq.formacion || 'actual' : 'individual') + '|recado');
  for (let i = n - 1; i > 0; i--) { r = (Math.imul(r, 1103515245) + 12345) >>> 0; const j = r % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const num = eq ? (Number(eq.numero) || (semilla(eq.id) % n) + 1) : (semilla(alumnoId || '') % n) + 1;
  return L[idx[(num - 1) % n]];
}

const palabras = t => (String(t || '').trim().match(/\S+/g) || []).length;
export const ingsDe = d => Object.entries((d && d.ings) || {}).filter(([, v]) => v && (v.n || '').trim()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.orden || 0) - (b.orden || 0));
// Sugerida (0-10): 0.5 por ingrediente con origen y llegada (hasta 6 → 3 pts), 0.5 por ruta explicada
// con 10 palabras o más (hasta 4 → 2 pts), 2 por los guisos, 2 por la conclusión y 1 por las fuentes.
export function sugerirRecado(d) {
  if (!d) return { nota: 0, detalle: 'Sin trabajo' };
  const L = ingsDe(d), c = d.campos || {};
  const marcados = L.filter(x => x.o && x.l).length, rutas = L.filter(x => palabras(x.ruta) >= 10).length;
  const nota = 0.5 * Math.min(6, marcados) + 0.5 * Math.min(4, rutas) + 2 * Math.min(1, palabras(c.guisos) / 20) + 2 * Math.min(1, palabras(c.conclusion) / 25) + (String(c.fuentes || '').trim() ? 1 : 0);
  return { nota: Math.round(Math.min(10, nota) * 10) / 10, detalle: `${L.length} ingredientes (${marcados} con origen y llegada, ${rutas} con su ruta) · guisos ${palabras(c.guisos)} palabras · ${String(c.fuentes || '').trim() ? 'con' : 'sin'} fuentes` };
}
