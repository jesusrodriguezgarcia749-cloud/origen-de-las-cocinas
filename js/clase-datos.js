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
    ['religion', 'Religión y ofrendas', 'Qué comida ofrecían a sus dioses, en qué ceremonias y qué significado tenía el maíz.', true],
    ['comercio', 'Comercio y tributo', 'Cómo conseguían lo que no cultivaban: mercados, comerciantes, rutas, tributo y moneda.', true],
    ['mesa', 'La mesa del noble y la del pueblo', 'Qué comía la clase alta y qué comía la gente común.', true],
    ['herencia', 'Platillos que heredamos hoy', 'Qué seguimos comiendo de cada tradición.'],
    ['fiestas', 'Fiestas y comida de hoy', 'Cómo sigue viva esa cocina en las celebraciones actuales (en la columna mexica, piensen en el centro de México).', true],
    ['fuentes', 'Fuentes históricas', '¿Quién lo escribió, cuándo y qué problema tiene esa fuente?'],
  ],
  // Clave según el compendio (3.2); las filas con true al final son «🔎 Investiga»: no vienen en
  // el compendio, los alumnos las buscan en línea y anotan su fuente (celda {fila}_fuente).
  // La libera el docente desde el Monitor en vivo.
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
    religion: [
      'La comida era ofrenda: en la fiesta de Huitzilopochtli (Panquetzaliztli) se hacía su figura con masa de amaranto (tzoalli) y miel, y luego se repartía y se comía. A Tláloc, dios de la lluvia, se le ofrecía etzalli (guiso de maíz y frijol) en la fiesta de Etzalcualiztli.',
      'El maíz era sagrado: según el Popol Vuh, los dioses formaron a los primeros humanos con masa de maíz. En los rituales se bebía balché (corteza del árbol balché fermentada con miel) y a Chaac, dios de la lluvia, se le ofrecían bebidas de maíz; la ceremonia del Ch\'a Cháak (petición de lluvia) sigue viva en la península.',
      'Para ambos la comida era sagrada: el maíz tenía origen divino y se ofrecía a los dioses de la lluvia (Tláloc y Chaac) para asegurar la cosecha.',
    ],
    comercio: [
      'El gran mercado (tianguis) de Tlatelolco reunía a decenas de miles de personas cada día; los pochtecas (comerciantes) traían productos de tierras lejanas y los pueblos sometidos pagaban tributo en maíz, frijol, chía, cacao, mantas y otros bienes (Códice Mendoza).',
      'Comercio por mar en grandes canoas alrededor de la península, con puertos como Xicalango (Campeche) y Cozumel; cambiaban sal de las costas de Yucatán, miel, cera y algodón por cacao, obsidiana y plumas.',
      'Ambos usaban granos de cacao como moneda y tenían redes de comercio de larga distancia que unían a toda Mesoamérica.',
    ],
    mesa: [
      'Bernal Díaz del Castillo cuenta que a Moctezuma le servían más de trescientos platillos (guajolote, venado, aves, pescado, frutas) y cacao espumoso en jícaras; el macehual (la gente común) comía sobre todo tortillas, frijol, chile, quelites y atole.',
      'Los nobles y sacerdotes tenían acceso a carne de venado, cacao y bebidas de fiesta; la gente común comía maíz en tortillas, pozol y atole, con frijol, calabaza y chile, y carne solo de la caza o en ocasiones especiales.',
      'En los dos la carne y el cacao eran de la élite, pero la base de todos era la misma: maíz, frijol, calabaza y chile.',
    ],
    herencia: [
      'Tortillas, tamales, atoles y los moles (mōlli significa «salsa» en náhuatl).',
      'Mucbipollo, carne pibil (la cochinita, ya con cerdo, es posterior a la conquista), tikin xic, sikil p\'aak y papadzules.',
      'Tamales, tortillas y salsas de chile siguen en la mesa de todo México.',
    ],
    fiestas: [
      'Día de Muertos con ofrendas de tamales, mole, pan, calabaza en tacha y atole; el 2 de febrero (la Candelaria) se comen tamales, y en el centro del país sigue la alegría de amaranto, heredera del tzoalli.',
      'Hanal Pixán («comida de las ánimas»), a finales de octubre y principios de noviembre: se prepara el mucbipollo o pib, un gran tamal cocido en el horno de tierra, y se ofrecen atole, chocolate y comida a los difuntos.',
      'En los dos la comida une a vivos y muertos: el maíz y el tamal siguen al centro de la fiesta, mezclados con el calendario católico.',
    ],
    fuentes: [
      'Bernardino de Sahagún, Códice Florentino (hacia 1577), escrito con informantes nahuas; también Bernal Díaz del Castillo, testigo de la mesa de Moctezuma.',
      'Diego de Landa, Relación de las cosas de Yucatán (hacia 1566). Fuente contradictoria: el mismo Landa quemó códices mayas en Maní (1562). También el Popol Vuh.',
      'Ambas fuentes las escribieron frailes españoles después de la conquista: hay que leerlas con mirada crítica.',
    ],
  },
};

// ---------- 2. ¿Aportó o llegó?

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
    { id: 'desarma', tipo: 'desarma', icono: '🔍', nombre: 'Desarma el platillo (pregunta 14)', modo: 'Individual', desc: 'Practica separando ingredientes de América y de fuera; luego investiga un platillo nuevo (la tarea) y arma la ficha del platillo de tu proyecto.' },
    { id: 'aporto', tipo: 'practica', icono: '🎯', nombre: '¿Aportó o llegó?', modo: 'Juego de práctica', desc: '¿Ya estaba en México antes de 1521 o llegó después? 89 ingredientes, tres niveles, modo reto con reloj y una tabla para estudiar de dónde viene cada uno.' },
  ] },
  { tema: '3.2', titulo: 'Campeche y el resto de América', fecha: '2026-10-30', fechaTexto: 'Vie 30 de octubre', acts: [
    { id: 'atlas-america', tipo: 'atlas', cont: 'america', icono: '🗺️', nombre: 'Mi atlas: América', modo: 'En equipo o individual', desc: 'Tus regiones culinarias de América, de Alaska a la Patagonia.' },
    { id: 'influencias', tipo: 'influencias', icono: '⚖️', nombre: 'Las siete influencias de la cocina campechana', modo: 'En equipo · en vivo · con votación', desc: 'Elijan un platillo campechano, encuentren en él las siete influencias y defiéndanlo en la votación del grupo.' },
    { id: 'campeche', tipo: 'practica', icono: '🏰', nombre: 'Defiende Campeche', modo: 'Juego de práctica', desc: 'Piratas, murallas y recetario campechano: cada acierto levanta un baluarte; si llegan cuatro barcos piratas, saquean la villa.' },
    { id: 'que-influencia', tipo: 'practica', icono: '⚖️', nombre: '¿Qué influencia es?', modo: 'Juego de práctica', desc: 'Maya, española, árabe, francesa, holandesa, africana o caribeña: el calentamiento para la tarea de las siete influencias.' },
    { id: 'platillos-america', tipo: 'practica', icono: '🌎', nombre: 'Platillos de América', modo: 'Juego de práctica', desc: '¿De qué país es? Ceviche, pupusa, feijoada, mofongo, gumbo… se ilumina en el mapa y descubres sus raíces.' },
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
export const califica = a => a && ['atlas', 'cuadro', 'desarma', 'influencias'].includes(a.tipo);
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
// Cuadro: 8 puntos por las celdas llenas (cuenta como llena con 5 palabras o más) y 2 por las
// fuentes de las filas de investigación (medio punto por cada una).
export const MIN_PALABRAS_CELDA = 5;
const palabrasDe = t => (String(t || '').trim().match(/\S+/g) || []).length;
export function sugerirCuadro(celdas) {
  celdas = celdas || {};
  const total = CUADRO_MM.filas.length * CUADRO_MM.columnas.length;
  const textos = CUADRO_MM.filas.flatMap(([f]) => CUADRO_MM.columnas.map(([c]) => celdas[`${f}_${c}`]));
  const llenas = textos.filter(v => palabrasDe(v) >= MIN_PALABRAS_CELDA).length, cortas = textos.filter(v => palabrasDe(v) > 0 && palabrasDe(v) < MIN_PALABRAS_CELDA).length;
  const inv = CUADRO_MM.filas.filter(x => x[3]), fu = inv.filter(([f]) => (celdas[`${f}_fuente`] || '').trim()).length;
  const nota = r1(8 * llenas / total + 2 * fu / (inv.length || 1));
  return { nota, detalle: `${llenas}/${total} celdas llenas${cortas ? ` (+${cortas} con menos de ${MIN_PALABRAS_CELDA} palabras, no cuentan)` : ''} · ${fu}/${inv.length} fuentes de investigación` };
}
// Desarma: se califica solo la ficha del platillo investigado (no la del proyecto).
// Ficha 1.5 (nombre, región, historia de 20 palabras) · ingredientes 4 (al menos 5, clasificados y,
// los que llegaron, de dónde) · técnicas 1 (al menos 2 clasificadas) · conclusión 3 (25 palabras por
// pregunta) · fuentes 0.5.
export function sugerirDesarma(m) {
  const F = m && m.ficha;
  if (!F || !(F.nombre || '').trim()) return { nota: 0, detalle: m && (m.nombre || (m.proyecto || {}).nombre) ? 'Solo llenó la ficha de su proyecto (no se califica)' : 'Sin trabajo' };
  const ings = F.ingredientes || [], tecs = F.tecnicas || [];
  const clas = ings.filter(x => x.o === 'n' || x.o === 'l').length, lleg = ings.filter(x => x.o === 'l'), conDe = lleg.filter(x => x.de && x.de !== 'otro').length;
  const tc = tecs.filter(x => x.o === 'n' || x.o === 'l').length, ps = ['q1', 'q2', 'q3'].map(k => palabras(F[k]));
  const nota = 0.5 * !!(F.nombre || '').trim() + 0.5 * !!(F.region || '').trim() + 0.5 * Math.min(1, palabras(F.historia) / 20)
    + Math.min(1, ings.length / 5) + 2 * (ings.length ? clas / ings.length : 0) + (lleg.length ? conDe / lleg.length : ings.length ? 1 : 0)
    + Math.min(1, tc / 2) + ps.reduce((s, n) => s + Math.min(1, n / 25), 0) + 0.5 * !!(F.fuentes || '').trim();
  return { nota: r1(nota), detalle: `${F.nombre}: ${ings.length} ingredientes (${clas} clasificados${lleg.length ? `, ${conDe}/${lleg.length} con su origen` : ''}) · ${tc} técnicas · conclusión de ${ps.join('/')} palabras · ${(F.fuentes || '').trim() ? 'con' : 'sin'} fuentes` };
}

// ---------- Las siete influencias de la cocina campechana (compendio 3.2, según el maestro Rafael E. Meneses López)
export const INFLUENCIAS = {
  id: 'act-influencias', votacion: 'influencias',
  lista: [
    ['maya', 'Maya', '#3F7A4F', 'La base de todo: maíz, frijol, chile, calabaza y pepita, el achiote del recado rojo, el pib (horno de tierra) y la miel de melipona.'],
    ['espanola', 'Española', '#A63D2F', 'Desde 1521: cerdo y manteca, res, trigo, cebolla, ajo, cítricos, aceite de oliva, la fritura y la repostería de los conventos.'],
    ['arabe', 'Árabe', '#C98A2C', 'Por dos vías: la herencia andalusí de la cocina española (el escabeche, las especias, los dulces de almíbar) y la migración libanesa desde finales del siglo XIX (kibis, tabule, pan árabe).'],
    ['francesa', 'Francesa', '#2E6FA8', 'El compendio la menciona pero no la detalla: investiguen qué técnica, platillo o costumbre francesa llegó a la mesa campechana y cítenlo.'],
    ['holandesa', 'Holandesa', '#E07B39', 'Los barcos del comercio del palo de tinte traían quesos holandeses de bola, tipo Edam: de ahí, según la tradición, el queso relleno.'],
    ['africana', 'Africana', '#6B5B4B', 'Llegó con las personas esclavizadas del comercio colonial (tema 3.1). Investiguen qué ingredientes o técnicas de su cocina se reconocen hoy.'],
    ['caribena', 'Caribeña', '#2BA3A0', 'Campeche es un puerto del Golfo y del Caribe: investiguen qué ingredientes o preparaciones comparte con las cocinas caribeñas (piensen en el coco, el plátano, los mariscos).'],
  ],
  platillos: ['Pan de cazón', 'Queso relleno', 'Pámpano en escabeche', 'Camarones al coco', 'Manitas de cangrejo', 'Coctel campechano', 'Chocolomo', 'Poc chuc', 'Puchero', 'Torta de jamón claveteado', 'Dulce de papaya', 'Mazapán de pepita', 'Kibis'],
};
// Sugerida: 1 punto por elegir platillo, hasta 6 por evidencias (1.5 por cada influencia con evidencia de 8 palabras o más, máximo 4),
// y hasta 3 por el argumento final (60 palabras o más).
export function sugerirInfluencias(d) {
  if (!d || !((d.platillo || '').trim())) return { nota: 0, detalle: 'Sin platillo elegido' };
  const inf = d.inf || {}, conEv = INFLUENCIAS.lista.filter(([k]) => inf[k] && inf[k].si && palabras(inf[k].ev) >= 8).length;
  const marcadas = INFLUENCIAS.lista.filter(([k]) => inf[k] && inf[k].si).length, pal = palabras(d.argumento);
  const nota = 1 + 1.5 * Math.min(4, conEv) + 3 * Math.min(1, pal / 60);
  return { nota: r1(nota), detalle: `${d.platillo}: ${marcadas} de 7 influencias (${conEv} con evidencia) · argumento de ${pal} palabras` };
}
