// clase-datos.js — Contenido de las actividades de clase (basado en el compendio, subtema 3.2).

// ---------- 1. Cuadro comparativo mexica vs. maya
export const CUADRO_MM = {
  id: 'act-cuadro-mm', clave: 'cuadroMM',
  titulo: 'Cuadro comparativo: cocina mexica vs. cocina maya',
  columnas: [['mexica', 'Mexica'], ['maya', 'Maya'], ['parecido', '¿En qué se parecen?']],
  filas: [
    ['territorio', 'Territorio y clima', '¿Dónde vivían? ¿Cómo era el suelo, el agua, el clima?'],
    ['cultivo', 'Cómo cultivaban', 'Sistemas agrícolas y cómo se adaptaron a su tierra.'],
    ['coccion', 'Cómo cocinaban', 'Técnicas de cocción y utensilios.'],
    ['ingredientes', 'Ingredientes emblemáticos', 'Plantas, animales, condimentos.'],
    ['bebidas', 'Bebidas', 'Qué bebían, quién y en qué ocasiones.'],
    ['herencia', 'Platillos que heredamos hoy', 'Qué seguimos comiendo de cada tradición.'],
    ['fuentes', 'Fuentes históricas', '¿Quién lo escribió, cuándo y qué problema tiene esa fuente?'],
  ],
  // Clave según el compendio (3.2). La libera el docente desde el Monitor en vivo.
  respuestas: {
    territorio: [
      'Altiplano central. Tenochtitlan, fundada en 1325 en medio del lago de Texcoco, llegó a tener unos 200,000 habitantes.',
      'Península de Yucatán (Yucatán, Campeche, Quintana Roo): suelo calizo y delgado, sin ríos superficiales; el agua se obtenía de los cenotes.',
      'Ambos pertenecen a Mesoamérica y comparten el tronco maíz-frijol-chile.',
    ],
    cultivo: [
      'Chinampas: parcelas artificiales construidas en el lago con lodo y vegetación, muy fértiles y siempre húmedas (todavía se cultivan en Xochimilco).',
      'Milpa adaptada al suelo calizo; además cuidaban abejas meliponas sin aguijón en troncos huecos (jobones) para obtener miel.',
      'La milpa: maíz, frijol y calabaza sembrados juntos (las «tres hermanas»), y la nixtamalización del maíz con cal o ceniza.',
    ],
    coccion: [
      'Hervir, asar y cocer al vapor; comal de barro, metate y mano, molcajete y ollas. No conocían la fritura en abundante grasa.',
      'El pib: horno excavado en la tierra donde se cuecen lentamente carnes y masas envueltas en hojas sobre piedras calientes.',
      'Ninguno freía: la fritura llegó con el cerdo y la manteca después de 1521. Ambos usaban metate y comal.',
    ],
    ingredientes: [
      'Maíz, frijol, chile, quelites, huauhtli (amaranto), chía, nopal y tuna, guajolote, pescado del lago e insectos (chapulines, escamoles, ahuautle).',
      'Achiote (recado rojo), pepita de calabaza, chile, miel de melipona; carne de venado, pavo de monte, jabalí o tepezcuintle.',
      'Ninguno tenía leche, queso, mantequilla ni cerdo: la proteína venía del frijol, los insectos, la caza y la pesca.',
    ],
    bebidas: [
      'Cacao espumoso, amargo y frío, con chile, vainilla o flores, casi siempre para la nobleza, los guerreros y los comerciantes; atoles; pulque del aguamiel del maguey.',
      'Pozol o k\'eyem (masa de maíz disuelta en agua), bebidas de cacao con maíz y chile, y el balché, bebida ritual fermentada con miel.',
      'El cacao era bebida de élite y también moneda; ambos preparaban bebidas de maíz.',
    ],
    herencia: [
      'Tortillas, tamales, atoles y los moles (mōlli significa «salsa» en náhuatl).',
      'Mucbipollo, carne pibil (la cochinita, ya con cerdo, es posterior a la conquista), tikin xic, sikil p\'aak y papadzules.',
      'Tamales, tortillas y salsas de chile siguen en la mesa de todo México.',
    ],
    fuentes: [
      'Bernardino de Sahagún, Códice Florentino (hacia 1577), escrito con informantes nahuas; también Bernal Díaz del Castillo, testigo de la mesa de Moctezuma.',
      'Diego de Landa, Relación de las cosas de Yucatán (hacia 1566). Fuente contradictoria: el mismo Landa quemó códices mayas en Maní (1562). También el Popol Vuh.',
      'Ambas fuentes las escribieron frailes españoles después de la conquista: hay que leerlas con mirada crítica.',
    ],
  },
};

// ---------- 2. ¿Aportó o llegó?
export const APORTO = [
  ['maíz', '🌽', 'a', 'Domesticado hace unos 9,000 años a partir del teocintle, en la cuenca del río Balsas (Guerrero).'],
  ['frijol', '🫘', 'a', 'Parte de la milpa mesoamericana; fue la gran fuente de proteína de la dieta prehispánica.'],
  ['calabaza', '🎃', 'a', 'Hay restos de hace unos 10,000 años en la cueva de Guilá Naquitz, Oaxaca.'],
  ['chile', '🌶️', 'a', 'Mesoamericano; de aquí viajó al kimchi coreano, al curry indio y a la paprika húngara.'],
  ['cacao', '🍫', 'a', 'Cultivo de élite en Mesoamérica y también moneda para pagar tributos.'],
  ['jitomate', '🍅', 'a', 'Se domesticó en Mesoamérica (crece silvestre en los Andes) y cambió la cocina italiana.'],
  ['vainilla', '🌸', 'a', 'Originaria de Papantla, Veracruz; hoy la produce sobre todo Madagascar.'],
  ['aguacate', '🥑', 'a', 'Fruto mesoamericano que hoy se consume en todo el mundo.'],
  ['chía', '🌱', 'a', 'Semilla mesoamericana que hoy se vende como «superalimento».'],
  ['amaranto', '🌾', 'a', 'El huauhtli de los mexicas, que además tenía un uso ritual.'],
  ['nopal', '🌵', 'a', 'Junto con la tuna, alimento mesoamericano y hoy símbolo nacional.'],
  ['camote', '🍠', 'a', 'Tubérculo americano que México aportó al mundo.'],
  ['guajolote', '🦃', 'a', 'Ave domesticada en Mesoamérica: hoy es la cena de Navidad y de Acción de Gracias.'],
  ['trigo', '🌾', 'l', 'Llegó con los españoles: con él, el pan y la tortilla de harina del norte.'],
  ['arroz', '🍚', 'l', 'Llegó después de 1521 (también por el Galeón de Manila desde Asia).'],
  ['caña de azúcar', '🎋', 'l', 'Llegó con los españoles y cambió la repostería y los dulces.'],
  ['cerdo', '🐖', 'l', 'Con él llegaron la manteca, la fritura y los refritos.'],
  ['res', '🐄', 'l', 'Ganado traído por los españoles; el norte ganadero desarrolló la carne asada.'],
  ['leche y queso', '🧀', 'l', 'La dieta prehispánica no conocía la leche, el queso ni la mantequilla.'],
  ['naranja y limón', '🍊', 'l', 'Los cítricos llegaron con los españoles.'],
  ['ajo', '🧄', 'l', 'Llegó desde 1521 con la cocina española.'],
  ['cebolla', '🧅', 'l', 'Llegó desde 1521 con la cocina española.'],
  ['garbanzo', '🫛', 'l', 'Legumbre del Viejo Mundo que llegó con los españoles.'],
  ['canela', '🟫', 'l', 'Especia que España había recibido de los árabes y trajo a la Nueva España.'],
  ['clavo y pimienta', '🫚', 'l', 'Especias del Viejo Mundo que llegaron con los españoles.'],
  ['aceite de oliva', '🫒', 'l', 'Llegó con los españoles, junto con el olivo.'],
  ['uva y vino', '🍇', 'l', 'La vid llegó con los españoles.'],
  ['mango de Manila', '🥭', 'l', 'Llegó de Asia por el Galeón de Manila (desde 1565).'],
  ['coco', '🥥', 'l', 'La palma de coco llegó de Asia por el Galeón de Manila.'],
];

// ---------- 3. Desarma el platillo (n = nativo de América, l = llegó después de 1521)
export const PLATILLOS = [
  {
    id: 'mole', nombre: 'Mole poblano', emoji: '🍗',
    intro: 'La tradición lo atribuye al convento de Santa Rosa, en Puebla: une chiles mexicanos con especias del Viejo Mundo y cacao.',
    ing: [['Chiles secos (mulato, ancho, pasilla)', 'n'], ['Chocolate (cacao)', 'n'], ['Jitomate', 'n'], ['Tortilla (maíz)', 'n'], ['Guajolote', 'n'], ['Cacahuate', 'n'], ['Ajonjolí', 'l'], ['Almendras', 'l'], ['Pasas', 'l'], ['Canela', 'l'], ['Clavo', 'l'], ['Pimienta', 'l'], ['Anís', 'l'], ['Cebolla', 'l'], ['Ajo', 'l'], ['Manteca de cerdo', 'l'], ['Plátano macho', 'l'], ['Pan (trigo)', 'l']],
  },
  {
    id: 'nogada', nombre: 'Chiles en nogada', emoji: '🌶️',
    intro: 'Según la leyenda, las monjas agustinas de Santa Mónica, en Puebla, los sirvieron en 1821 a Agustín de Iturbide con los colores de la bandera.',
    ing: [['Chile poblano', 'n'], ['Jitomate', 'n'], ['Acitrón (de la biznaga)', 'n'], ['Nuez de Castilla', 'l'], ['Granada', 'l'], ['Carne de cerdo', 'l'], ['Durazno', 'l'], ['Manzana', 'l'], ['Pera', 'l'], ['Plátano macho', 'l'], ['Almendras', 'l'], ['Pasas', 'l'], ['Queso de cabra', 'l'], ['Azúcar', 'l'], ['Canela', 'l'], ['Perejil', 'l']],
  },
  {
    id: 'cochinita', nombre: 'Cochinita pibil', emoji: '🐖',
    intro: 'Viene del pib maya, pero los mayas prehispánicos no conocían al cerdo: usaban venado, pavo de monte, jabalí o tepezcuintle.',
    ing: [['Achiote', 'n'], ['Chile habanero', 'n'], ['Tortillas (maíz)', 'n'], ['Frijol', 'n'], ['Carne de cerdo', 'l'], ['Naranja agria', 'l'], ['Cebolla morada', 'l'], ['Ajo', 'l'], ['Comino', 'l'], ['Pimienta', 'l'], ['Hoja de plátano', 'l']],
  },
  {
    id: 'queso', nombre: 'Queso relleno', emoji: '🧀',
    intro: 'Según la tradición nace en el puerto de Campeche, con los quesos holandeses de bola que traían los barcos.',
    ing: [['Chile dulce', 'n'], ['Jitomate', 'n'], ['Queso de bola tipo Edam', 'l'], ['Carne molida de cerdo', 'l'], ['Huevo', 'l'], ['Alcaparras', 'l'], ['Aceitunas', 'l'], ['Pasas', 'l'], ['Almendras', 'l'], ['Cebolla', 'l'], ['Clavo', 'l'], ['Canela', 'l']],
  },
  {
    id: 'cazon', nombre: 'Pan de cazón', emoji: '🐟',
    intro: 'Emblema de la cocina campechana: tortillas apiladas con frijol y cazón guisado, bañadas en salsa de jitomate.',
    ing: [['Tortillas (maíz)', 'n'], ['Frijol negro', 'n'], ['Cazón (del Golfo de México)', 'n'], ['Jitomate', 'n'], ['Chile habanero', 'n'], ['Epazote', 'n'], ['Cebolla', 'l'], ['Manteca o aceite para freír', 'l']],
  },
];

// ---------- Tareas digitales del Parcial 2 (una por actividad). Los juegos rápidos son práctica.
// tipo: atlas (Mi atlas de un continente) · cuadro · desarma · practica · pronto
export const TEMAS_TAREAS = [
  { tema: '3.1', titulo: 'Cocinas africanas', fecha: '2026-10-22', fechaTexto: 'Jue 22 de octubre', acts: [
    { id: 'atlas-africa', tipo: 'atlas', cont: 'africa', icono: '🗺️', nombre: 'Mi atlas: África', modo: 'En equipo o individual', desc: 'Arma tus propias regiones culinarias de África en un mapa en blanco y llena la ficha de cada una.' },
  ] },
  { tema: '3.2', titulo: 'México prehispánico y mestizo', fecha: '2026-10-23', fechaTexto: 'Vie 23 de octubre', acts: [
    { id: 'cuadro-mm', tipo: 'cuadro', icono: '🤝', nombre: 'Cuadro comparativo mexica vs. maya', modo: 'En equipo · en vivo', desc: 'Llenen juntos, cada quien desde su celular, el cuadro que compara la cocina mexica con la maya.' },
    { id: 'desarma', tipo: 'desarma', icono: '🔍', nombre: 'Desarma el platillo (pregunta 14)', modo: 'Individual', desc: 'Separa los ingredientes en «de América» y «llegó después de 1521»; luego hazlo con el platillo de tu proyecto.' },
    { id: 'aporto', tipo: 'practica', icono: '🎯', nombre: '¿Aportó o llegó?', modo: 'Juego de práctica', desc: '¿Lo aportó México al mundo o llegó a México desde 1521? Diez rondas rápidas para repasar.' },
  ] },
  { tema: '3.2', titulo: 'Campeche y el resto de América', fecha: '2026-10-30', fechaTexto: 'Vie 30 de octubre', acts: [
    { id: 'atlas-america', tipo: 'atlas', cont: 'america', icono: '🗺️', nombre: 'Mi atlas: América', modo: 'En equipo o individual', desc: 'Tus regiones culinarias de América, de Alaska a la Patagonia.' },
    { id: 'influencias', tipo: 'pronto', icono: '⚖️', nombre: 'Las siete influencias de la cocina campechana', modo: 'En equipo', desc: 'Se abre en la sesión del 30 de octubre.' },
  ] },
  { tema: '3.3', titulo: 'Cocinas asiáticas', fecha: '2026-11-05', fechaTexto: 'Jue 5 de noviembre', acts: [
    { id: 'atlas-asia', tipo: 'atlas', cont: 'asia', icono: '🗺️', nombre: 'Mi atlas: Asia', modo: 'En equipo o individual', desc: 'Tus regiones culinarias de Asia.' },
  ] },
  { tema: '3.4', titulo: 'Cocinas europeas', fecha: '2026-11-06', fechaTexto: 'Vie 6 de noviembre', acts: [
    { id: 'atlas-europa', tipo: 'atlas', cont: 'europa', icono: '🗺️', nombre: 'Mi atlas: Europa', modo: 'En equipo o individual', desc: 'Tus regiones culinarias de Europa.' },
  ] },
  { tema: '3.5', titulo: 'Cocinas de Oceanía', fecha: '2026-11-12', fechaTexto: 'Jue 12 de noviembre', acts: [
    { id: 'atlas-oceania', tipo: 'atlas', cont: 'oceania', icono: '🗺️', nombre: 'Mi atlas: Oceanía', modo: 'En equipo o individual', desc: 'Tus regiones culinarias de Oceanía y sus islas.' },
  ] },
];
export const TAREAS_DIG = Object.fromEntries(TEMAS_TAREAS.flatMap(t => t.acts.map(a => [a.id, { ...a, tema: t.tema, titulo: t.titulo, fecha: t.fecha, fechaTexto: t.fechaTexto }])));
export const califica = a => a && ['atlas', 'cuadro', 'desarma'].includes(a.tipo);
export const catalogoId = id => 'dig-' + id;
export const nombreCatalogo = a => `${a.tema} · ${a.nombre}`;

// ---------- Calificación sugerida (0-10). El docente siempre la revisa y confirma.
const palabras = t => (String(t || '').trim().match(/\S+/g) || []).length;
const r1 = x => Math.round(Math.max(0, Math.min(10, x)) * 10) / 10;
const CAMPOS_FICHA = ['clima', 'ingredientes', 'platillos', 'tecnicas', 'historia', 'dato', 'fuentes'];
// Atlas: mitad por países clasificados, mitad por fichas completas (4 de 7 apartados o más).
export function sugerirAtlas(c, totalPaises) {
  if (!c) return { nota: 0, detalle: 'Sin trabajo' };
  const regs = c.regiones || [], cl = Object.keys(c.asign || {}).length;
  const fichas = regs.filter(r => CAMPOS_FICHA.filter(f => (r[f] || '').trim()).length >= 4).length;
  const nota = regs.length ? 10 * (0.5 * Math.min(1, cl / totalPaises) + 0.5 * fichas / regs.length) : 0;
  return { nota: r1(nota), detalle: `${cl}/${totalPaises} países · ${regs.length} regiones · ${fichas} fichas completas` };
}
export function sugerirCuadro(celdas) {
  const total = CUADRO_MM.filas.length * CUADRO_MM.columnas.length;
  const llenas = CUADRO_MM.filas.flatMap(([f]) => CUADRO_MM.columnas.map(([c]) => (celdas || {})[`${f}_${c}`])).filter(v => (v || '').trim()).length;
  return { nota: r1(10 * llenas / total), detalle: `${llenas}/${total} celdas llenas` };
}
// Desarma: 3 por clasificar ingredientes (al menos 3), 3 por clasificarlos todos, 4 por la conclusión (40 palabras o más).
export function sugerirDesarma(m) {
  if (!m || !(m.nombre || '').trim()) return { nota: 0, detalle: 'Sin trabajo' };
  const ings = m.ingredientes || [], clas = ings.filter(x => x.o === 'n' || x.o === 'l').length, pal = palabras(m.reflexion);
  const nota = 3 * Math.min(1, ings.length / 3) + 3 * (ings.length ? clas / ings.length : 0) + 4 * Math.min(1, pal / 40);
  return { nota: r1(nota), detalle: `${m.nombre}: ${ings.length} ingredientes, ${clas} clasificados · conclusión de ${pal} palabras` };
}
