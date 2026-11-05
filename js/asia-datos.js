// asia-datos.js — Juego de práctica del Tema 3.3 (Cocinas asiáticas): ¿de qué parte de Asia es?
// Sale del compendio (3.3) y de las diapositivas de la sesión: Asia Oriental, Asia del Sur, el Sureste
// asiático, Medio Oriente y Asia Central; el Galeón de Manila y el chile mexicano en Asia.
// q platillo, ingrediente, técnica o hecho · e emoji · c subregión (claves de ESPECIAS en clase-datos.js)
// x explicación · niv 1 = básico, 2 = con trampa o más difícil
export const QUE_ASIA = [
  // ---- Asia Oriental: China, Japón y Corea
  { q: 'El sushi', e: '🍣', c: 'oriental', niv: 1, x: 'Japón: arroz sazonado con vinagre y pescado o mariscos. Precisión técnica y respeto por el producto.' },
  { q: 'El kimchi', e: '🥬', c: 'oriental', niv: 1, x: 'Corea: col y verduras fermentadas con ajo, jengibre y chile. Corea es maestra de la fermentación.' },
  { q: 'El pato pekinés', e: '🦆', c: 'oriental', niv: 1, x: 'China (Pekín): pato de piel crujiente que se come en crepas delgadas con cebollín y salsa.' },
  { q: 'El dim sum', e: '🥟', c: 'oriental', niv: 1, x: 'China (Cantón): pequeños bocados al vapor que se comparten con té.' },
  { q: 'La salsa de soya', e: '🫘', c: 'oriental', niv: 1, x: 'Nació en China de fermentar la soya; hoy es la base de Asia Oriental.' },
  { q: 'El umami, el «quinto sabor»', e: '👅', c: 'oriental', niv: 1, x: 'Lo nombró en Japón el químico Kikunae Ikeda en 1908, estudiando el caldo dashi de alga kombu.' },
  { q: 'El bibimbap', e: '🍚', c: 'oriental', niv: 2, x: 'Corea: arroz con verduras, carne y huevo, que se mezcla con pasta de chile gochujang.' },
  { q: 'El ramen', e: '🍜', c: 'oriental', niv: 2, x: 'Japón, aunque los fideos llegaron de China. Trampa: es un plato de Asia Oriental de todos modos.' },
  { q: 'La pimienta que entumece la lengua', e: '🫚', c: 'oriental', niv: 1, x: 'La pimienta de Sichuan, de China. No es pariente de la pimienta negra ni del chile.' },
  { q: 'El mapo tofu y el pollo kung pao', e: '🌶️', c: 'oriental', niv: 2, x: 'Sichuan, China. Picosos gracias al chile… que llegó de América.' },
  { q: 'Saltear muy rápido a fuego altísimo en un wok', e: '🍳', c: 'oriental', niv: 2, x: 'La técnica del wok es china; ahorra combustible y conserva las verduras crujientes.' },
  { q: 'El washoku, la cocina tradicional japonesa', e: '🍱', c: 'oriental', niv: 2, x: 'La UNESCO lo inscribió como Patrimonio Cultural Inmaterial en 2013.' },

  // ---- Asia del Sur: la India y sus vecinos
  { q: 'El curry y las mezclas de especias llamadas masala', e: '🍛', c: 'sur', niv: 1, x: 'La India: «masala» es una mezcla de especias; cada familia y región tiene la suya.' },
  { q: 'El naan', e: '🫓', c: 'sur', niv: 1, x: 'La India: pan plano que se pega a las paredes del horno tandoor.' },
  { q: 'El horno tandoor', e: '🏺', c: 'sur', niv: 1, x: 'Horno de barro de la India y Pakistán; de ahí el pollo tandoori.' },
  { q: 'El dal, guiso de lentejas', e: '🥣', c: 'sur', niv: 1, x: 'La India: plato diario de una cocina con gran tradición vegetariana.' },
  { q: 'El biryani', e: '🍚', c: 'sur', niv: 1, x: 'La India: arroz con especias y carne o verduras, cocido en capas.' },
  { q: 'La cúrcuma, la raíz que pinta de amarillo', e: '🟡', c: 'sur', niv: 1, x: 'Asia del Sur: la cúrcuma da el color amarillo a muchos curris.' },
  { q: 'El cardamomo', e: '🟢', c: 'sur', niv: 2, x: 'Asia del Sur: semilla aromática para el chai, los arroces y los dulces.' },
  { q: 'La pimienta negra de la costa de Malabar', e: '⚫', c: 'sur', niv: 2, x: 'La India: valía casi como el oro en Europa; por ella se buscaron rutas por mar.' },
  { q: 'La canela verdadera de Ceilán', e: '🪵', c: 'sur', niv: 2, x: 'Sri Lanka (Ceilán), en Asia del Sur: corteza de un árbol. Trampa: no es del Sureste.' },
  { q: 'El vindaloo de Goa, muy picoso', e: '🔥', c: 'sur', niv: 2, x: 'La India (Goa): los portugueses llevaron el chile americano que lo hace picar.' },
  { q: 'El ghee, la mantequilla clarificada', e: '🧈', c: 'sur', niv: 2, x: 'La India: grasa de cocina y de ceremonias religiosas.' },
  { q: 'No comer carne de res por respeto a la vaca sagrada', e: '🐄', c: 'sur', niv: 1, x: 'El hinduismo, en la India: la religión moldea la cocina (Tema 2).' },

  // ---- Sureste asiático
  { q: 'El pad thai', e: '🍜', c: 'sureste', niv: 1, x: 'Tailandia: fideos de arroz salteados con huevo, cacahuate, tamarindo y limón.' },
  { q: 'El tom yam', e: '🍲', c: 'sureste', niv: 1, x: 'Tailandia: sopa ácida y picante con hierba limón, galanga y camarón.' },
  { q: 'El nasi goreng', e: '🍳', c: 'sureste', niv: 1, x: 'Indonesia: arroz frito con salsa de soya dulce y huevo.' },
  { q: 'El adobo filipino', e: '🍗', c: 'sureste', niv: 1, x: 'Filipinas: carne guisada en vinagre y soya. Lleva nombre español, por la colonia.' },
  { q: 'El pho', e: '🍜', c: 'sureste', niv: 1, x: 'Vietnam: caldo con fideos de arroz, carne y hierbas frescas.' },
  { q: 'Equilibrar en un plato lo ácido, lo dulce, lo salado y lo picante', e: '⚖️', c: 'sureste', niv: 1, x: 'Es el rasgo de las cocinas del Sureste asiático, como la tailandesa.' },
  { q: 'El clavo y la nuez moscada de las islas de las especias', e: '🌰', c: 'sureste', niv: 1, x: 'Las Molucas, en Indonesia: por ellas compitieron portugueses, españoles y holandeses.' },
  { q: 'Los mercados flotantes en canoas', e: '🛶', c: 'sureste', niv: 1, x: 'Tailandia: se vende y se cocina desde las canoas sobre los canales.' },
  { q: 'El satay con salsa de cacahuate', e: '🍢', c: 'sureste', niv: 2, x: 'Indonesia. Trampa del Galeón: el cacahuate es americano y llegó a Asia por el Pacífico.' },
  { q: 'La ciudad asiática que unía el Galeón de Manila con Acapulco', e: '⛵', c: 'sureste', niv: 1, x: 'Manila, en Filipinas. El Galeón navegó de 1565 a 1815: 250 años de intercambio.' },
  { q: 'El mango de Manila que se vende en México', e: '🥭', c: 'sureste', niv: 2, x: 'Llegó de Filipinas con el Galeón de Manila.' },
  { q: 'La tuba, bebida de palma de coco que se vende en Colima y Guerrero', e: '🥥', c: 'sureste', niv: 2, x: 'La trajeron los filipinos que llegaron con el Galeón de Manila.' },

  // ---- Medio Oriente: el mundo árabe, Persia y Turquía
  { q: 'El hummus', e: '🫛', c: 'medio', niv: 1, x: 'El Levante: puré de garbanzo con tahini (pasta de ajonjolí), limón y aceite de oliva.' },
  { q: 'El falafel', e: '🧆', c: 'medio', niv: 1, x: 'Medio Oriente: croquetas fritas de garbanzo o haba.' },
  { q: 'El tabule', e: '🥗', c: 'medio', niv: 1, x: 'El Líbano: ensalada de perejil, trigo bulgur y jitomate. Llegó a Campeche y Yucatán con los libaneses.' },
  { q: 'El kebab y el shawarma', e: '🥙', c: 'medio', niv: 1, x: 'Medio Oriente: carne asada en brocheta o en trompo vertical.' },
  { q: 'El mezze, muchos platos pequeños para compartir', e: '🍽️', c: 'medio', niv: 1, x: 'Medio Oriente: como nuestras botanas al centro de la mesa.' },
  { q: 'El sumac, un polvo rojo de sabor ácido', e: '🔴', c: 'medio', niv: 2, x: 'Medio Oriente: se espolvorea sobre ensaladas, carnes y el pan.' },
  { q: 'El zaatar, mezcla de tomillo y ajonjolí', e: '🌿', c: 'medio', niv: 2, x: 'El Levante: se come con pan y aceite de oliva.' },
  { q: 'Las dolmas y el baclava', e: '🍯', c: 'medio', niv: 2, x: 'Turquía, herencia de la cocina de palacio otomana.' },
  { q: 'Las normas halal sobre lo que se puede comer', e: '☪️', c: 'medio', niv: 1, x: 'El islam: no se come cerdo y la carne se sacrifica de cierta forma (Tema 2).' },
  { q: 'El taco al pastor tiene su raíz en…', e: '🌮', c: 'medio', niv: 2, x: 'Trampa: los libaneses llevaron a Puebla el shawarma en trompo; de ahí nacieron los tacos árabes y luego el pastor.' },
  { q: 'El arroz con azafrán y la cocina persa', e: '🌼', c: 'medio', niv: 2, x: 'Persia (Irán), en Medio Oriente: el azafrán es de las especias más caras del mundo.' },

  // ---- Asia Central: la Ruta de la Seda
  { q: 'El plov o pilaf', e: '🥘', c: 'central', niv: 1, x: 'Asia Central: arroz con zanahoria, cebolla y carne, distinto en cada región.' },
  { q: 'El kumis, leche de yegua fermentada', e: '🐎', c: 'central', niv: 1, x: 'Bebida de los pueblos nómadas de la estepa.' },
  { q: 'La Ruta de la Seda', e: '🐫', c: 'central', niv: 1, x: 'Red de caminos entre China y el Mediterráneo: por ella viajaban seda, especias e ideas.' },
  { q: 'Los camellos de dos jorobas de las caravanas', e: '🐪', c: 'central', niv: 2, x: 'Bactrianos, adaptados al frío de las estepas. Los del Sahara son dromedarios, de una joroba.' },
  { q: 'La yurta, tienda redonda y desmontable', e: '⛺', c: 'central', niv: 1, x: 'Vivienda de los pueblos nómadas de Asia Central.' },
  { q: 'El kazán, caldero de hierro colgado sobre el fuego', e: '🍲', c: 'central', niv: 2, x: 'Asia Central: en él se cocina el plov.' },
  { q: 'Uzbekistán, Kazajistán y Kirguistán', e: '🗺️', c: 'central', niv: 1, x: 'Países de Asia Central, cruce de caminos de la Ruta de la Seda.' },
  { q: 'Pan plano en horno de barro, en plena estepa', e: '🫓', c: 'central', niv: 2, x: 'Trampa: se parece al tandoor de la India, pero aquí es Asia Central (el horno tandir).' },
];
