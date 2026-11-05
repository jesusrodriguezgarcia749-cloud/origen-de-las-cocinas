// europa-datos.js — Juego de práctica del Tema 3.4 (Cocinas europeas): ¿de qué bloque de Europa es?
// Sale del compendio (3.4) y de las diapositivas: los 4 bloques gastronómicos (Mediterráneo,
// Centroeuropa y Este, Nórdico, Islas Británicas) y Francia, «el caso aparte».
export const BLOQUES_EU = [
  ['med', 'Mediterráneo', '#C0392B'],
  ['cen', 'Centroeuropa y Este', '#7B5A2E'],
  ['nor', 'Nórdico', '#2E6FA8'],
  ['bri', 'Islas Británicas', '#3F7A4F'],
  ['fra', 'Francia', '#8E5BA8'],
];
// q · e emoji · c bloque · x explicación · niv 1 básico, 2 con trampa o más difícil
export const QUE_EUROPA = [
  // ---- Mediterráneo
  { q: 'La paella', e: '🥘', c: 'med', niv: 1, x: 'España. Trampa histórica: el arroz y el azafrán llegaron a la península con los árabes.' },
  { q: 'La pasta con salsa de jitomate', e: '🍝', c: 'med', niv: 1, x: 'Italia. El jitomate es mexicano: antes del siglo XVI la pasta no llevaba salsa roja.' },
  { q: 'La ensalada griega con queso feta', e: '🥗', c: 'med', niv: 1, x: 'Grecia: feta, aceitunas, pepino y aceite de oliva.' },
  { q: 'Las tapas y raciones para compartir', e: '🍢', c: 'med', niv: 1, x: 'España, sobre todo en el centro y el sur.' },
  { q: 'La trilogía del trigo, la vid y el olivo', e: '🫒', c: 'med', niv: 1, x: 'Pan, vino y aceite: la base del sur de Europa desde la Antigüedad.' },
  { q: 'La dieta mediterránea, Patrimonio de la UNESCO', e: '🏛️', c: 'med', niv: 1, x: 'Inscrita en 2010 y ampliada en 2013.' },
  { q: 'El pizzaiuolo napolitano', e: '🍕', c: 'med', niv: 1, x: 'Italia (Nápoles): Patrimonio Inmaterial de la UNESCO desde 2017.' },
  { q: 'El bacalao como plato nacional', e: '🐟', c: 'med', niv: 2, x: 'Portugal, que lo pescaba en Terranova. Su repostería de yema viajó a Brasil, Goa y Tailandia.' },
  { q: 'La moussaka', e: '🍆', c: 'med', niv: 2, x: 'Grecia, con herencia otomana.' },
  { q: 'El escabeche, del árabe «sikbaj»', e: '🐠', c: 'med', niv: 2, x: 'Herencia de al-Ándalus en España; de ahí el pámpano en escabeche campechano.' },
  { q: 'Mantequilla, arroz y polenta en el norte; aceite, tomate y pasta seca en el sur', e: '🇮🇹', c: 'med', niv: 2, x: 'Italia: no hubo una sola «cocina italiana» hasta el siglo XX.' },
  { q: 'La cocina vasca de pescados y salsas elaboradas', e: '⭐', c: 'med', niv: 2, x: 'España (norte): altísima concentración de restaurantes reconocidos.' },

  // ---- Centroeuropa y Europa del Este
  { q: 'El goulash', e: '🍲', c: 'cen', niv: 1, x: 'Hungría. Su pimentón (paprika) se hace con chile americano.' },
  { q: 'El chucrut', e: '🥬', c: 'cen', niv: 1, x: 'Col fermentada en sal: se conserva meses y da vitamina C en invierno.' },
  { q: 'El borscht, sopa de remolacha', e: '🥣', c: 'cen', niv: 1, x: 'Europa del Este y Rusia: con eneldo y crema agria.' },
  { q: 'El samovar', e: '🫖', c: 'cen', niv: 1, x: 'Rusia: mantiene el agua caliente durante horas en las veladas de invierno.' },
  { q: 'El caviar de esturión del mar Caspio', e: '🥄', c: 'cen', niv: 1, x: 'Rusia: lujo de la nobleza zarista, como el cacao entre los mexicas.' },
  { q: 'Los blini con crema agria', e: '🥞', c: 'cen', niv: 1, x: 'Rusia: panqueques delgados de fermentación lenta.' },
  { q: 'El burek y los cevapi de los Balcanes', e: '🥟', c: 'cen', niv: 2, x: 'Huella de cinco siglos de dominio otomano.' },
  { q: 'El gefilte fish y el knish', e: '🐟', c: 'cen', niv: 2, x: 'Cocina judía asquenazí de Alemania, Polonia y Rusia.' },
  { q: 'Cocina de carne, manteca y lácteos por el clima frío', e: '🥩', c: 'cen', niv: 1, x: 'Centroeuropa: temporadas de cultivo cortas y mucha conserva.' },
  { q: 'Las salchichas para conservar el cerdo sacrificado en otoño', e: '🌭', c: 'cen', niv: 2, x: 'Centroeuropa: conservar es la lógica de toda esta cocina.' },

  // ---- Nórdico
  { q: 'El gravlax, salmón curado con sal, azúcar y eneldo', e: '🐟', c: 'nor', niv: 1, x: 'Escandinavia: se cura sin cocinarlo con fuego.' },
  { q: 'El arenque encurtido', e: '🫙', c: 'nor', niv: 1, x: 'Países nórdicos: otra forma de conservar pescado durante meses.' },
  { q: 'Las bayas silvestres del corto verano', e: '🫐', c: 'nor', niv: 1, x: 'Arándanos, grosellas y mora ártica.' },
  { q: 'El manifiesto New Nordic de 2004', e: '📜', c: 'nor', niv: 1, x: 'Revalorizó los ingredientes locales, silvestres y de temporada (Tema 1).' },
  { q: 'Dinamarca, Suecia, Noruega, Finlandia e Islandia', e: '🗺️', c: 'nor', niv: 1, x: 'Los países del bloque nórdico.' },
  { q: 'Curar, ahumar y encurtir para sobrevivir al invierno', e: '❄️', c: 'nor', niv: 2, x: 'El clima duro del norte obligó por siglos a conservar.' },

  // ---- Islas Británicas
  { q: 'El fish and chips', e: '🐟', c: 'bri', niv: 1, x: 'Inglaterra. Trampa: la papa es americana, de los Andes.' },
  { q: 'El Sunday roast con salsa gravy', e: '🍖', c: 'bri', niv: 1, x: 'La comida familiar del domingo en Inglaterra.' },
  { q: 'El pudín de Yorkshire', e: '🥧', c: 'bri', niv: 1, x: 'Masa horneada en la grasa del asado; se sirve como guarnición, aunque se llame «pudín».' },
  { q: 'El pub', e: '🍺', c: 'bri', niv: 1, x: 'El equivalente británico de la cantina: ahí se popularizó esta comida.' },
  { q: 'El contraste entre lo salado y lo dulce, y la tradición de pasteles y budines', e: '🎂', c: 'bri', niv: 2, x: 'Islas Británicas: lo exportaron a Australia y Norteamérica.' },
  { q: 'La papa como base de la dieta en Irlanda', e: '🥔', c: 'bri', niv: 2, x: 'Trampa: es un ingrediente americano que transformó Europa en los siglos XVIII y XIX.' },

  // ---- Francia, el caso aparte
  { q: 'La brigada de cocina codificada por Escoffier', e: '👨‍🍳', c: 'fra', niv: 1, x: 'Francia: el referente de la cocina profesional (Tema 2).' },
  { q: 'Catalina de Médici y la influencia italiana del Renacimiento', e: '👑', c: 'fra', niv: 1, x: 'Llegó de Italia en 1533; buena parte es leyenda, pero la influencia italiana sí fue real.' },
  { q: 'La Varenne, que puso por escrito las técnicas en el siglo XVII', e: '📖', c: 'fra', niv: 1, x: 'Francia: el inicio de la codificación técnica.' },
  { q: 'El terroir y las denominaciones de origen', e: '🍇', c: 'fra', niv: 1, x: 'El sabor depende del suelo, el clima y el saber de un lugar.' },
  { q: 'La baguette, Patrimonio de la UNESCO en 2022', e: '🥖', c: 'fra', niv: 1, x: 'Francia.' },
  { q: 'El cassoulet y la mantequilla de Normandía', e: '🧈', c: 'fra', niv: 2, x: 'Cocinas regionales de Francia. Trampa: las alubias del cassoulet son frijoles americanos.' },
  { q: 'Carême, el cocinero de las grandes piezas', e: '🏰', c: 'fra', niv: 2, x: 'Francia (siglo XIX): entre La Varenne y Escoffier.' },
];
