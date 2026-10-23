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
