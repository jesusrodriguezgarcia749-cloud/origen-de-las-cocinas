// oceania-datos.js — Gran repaso del Tema 3: «Vuelta al mundo» (¿de qué continente es?)
// Junta lo visto en las cinco regiones: África (3.1), América (3.2), Asia (3.3), Europa (3.4) y
// Oceanía (3.5), con las trampas que conectan continentes (los hornos de tierra, los ingredientes viajeros).
import { QUE_ASIA } from "./asia-datos.js";
import { QUE_EUROPA } from "./europa-datos.js";

export const CONTINENTES_T3 = [
  ['africa', 'África', '#E07B39'],
  ['america', 'América', '#3F9A55'],
  ['asia', 'Asia', '#B5486E'],
  ['europa', 'Europa', '#2E6FA8'],
  ['oceania', 'Oceanía', '#1F9E8F'],
];
// c continente · niv 1 básico, 2 con trampa · t tema del compendio
const AFRICA = [
  { q: 'El cuscús cocido al vapor en la cuscusera', e: '🍚', x: 'El Magreb: sémola de trigo duro; en Marruecos, la comida familiar del viernes.', niv: 1 },
  { q: 'El tajín, olla de barro con tapa en cono', e: '🏺', x: 'El Magreb: el vapor sube, se enfría en la punta y escurre de regreso al guiso.', niv: 1 },
  { q: 'La injera, pan agrio con agujeritos', e: '🫓', x: 'Etiopía (Cuerno de África): se fermenta y se cuece de un solo lado; se come con la mano derecha.', niv: 1 },
  { q: 'La ceremonia del café en tres rondas', e: '☕', x: 'Etiopía, tierra de origen del café.', niv: 1 },
  { q: 'El arroz jollof y la «guerra del jollof»', e: '🍛', x: 'África Occidental: Nigeria y Ghana discuten quién lo hace mejor.', niv: 1 },
  { q: 'El fufu de ñame, yuca o plátano', e: '🍠', x: 'África Occidental. Pariente del machuco y del mofongo de América.', niv: 1 },
  { q: 'El braai, la parrillada al aire libre', e: '🔥', x: 'Sudáfrica: el ritual social más extendido de la región.', niv: 1 },
  { q: 'Las caravanas de sal y oro por el desierto y Tombuctú', e: '🐪', x: 'El comercio transahariano.', niv: 1 },
  { q: 'El ras el hanout y la harissa', e: '🌶️', x: 'El Magreb. Trampa: la harissa lleva chile, que es americano.', niv: 2 },
  { q: 'El doro wat con berbere', e: '🍗', x: 'Etiopía: pollo con mezcla de chile y especias, platillo de fiesta.', niv: 2 },
  { q: 'El pilau y las samosas de Zanzíbar', e: '🥟', x: 'África Oriental: más de mil años de comercio con Arabia, Persia y la India.', niv: 2 },
  { q: 'El bobotie y la boerewors', e: '🌭', x: 'Sudáfrica, con herencia del Cabo Malayo.', niv: 2 },
].map(x => ({ ...x, c: 'africa' }));
const AMERICA = [
  { q: 'La nixtamalización del maíz', e: '🌽', x: 'Mesoamérica: cocer el maíz con cal lo hace más nutritivo.', niv: 1 },
  { q: 'Las chinampas del lago de Texcoco', e: '🌱', x: 'Los mexicas: huertos flotantes en el lago.', niv: 1 },
  { q: 'El pib, el horno maya bajo la tierra', e: '♨️', x: 'Campeche y Yucatán (3.2). Trampa: es pariente del hangi de Oceanía, pero es maya.', niv: 1 },
  { q: 'El chuño, la papa que se congela y se seca', e: '🥔', x: 'Los Andes: un seguro alimentario del Imperio inca.', niv: 1 },
  { q: 'El ceviche', e: '🐟', x: 'Perú: Patrimonio Cultural Inmaterial de la UNESCO desde 2023.', niv: 1 },
  { q: 'El queso relleno y el pan de cazón', e: '🧀', x: 'Campeche: un puerto y sus siete influencias.', niv: 1 },
  { q: 'La feijoada', e: '🫘', x: 'Brasil: raíz tupí-guaraní, portuguesa y africana.', niv: 1 },
  { q: 'El asado del Cono Sur', e: '🥩', x: 'Argentina y Uruguay: el ganado llegó con los españoles.', niv: 1 },
  { q: 'La pupusa', e: '🫓', x: 'El Salvador: maíz y frijol mesoamericanos.', niv: 2 },
  { q: 'El soul food y el gumbo', e: '🍲', x: 'Estados Unidos: cocina afroamericana del sur.', niv: 2 },
  { q: 'Las Tres Hermanas: maíz, frijol y calabaza', e: '🎃', x: 'Los pueblos de Norteamérica y Mesoamérica.', niv: 2 },
  { q: 'La cocina chifa y la nikkei', e: '🍜', x: 'Trampa: suenan asiáticas, pero nacieron en Perú con los migrantes chinos y japoneses.', niv: 2 },
].map(x => ({ ...x, c: 'america' }));
const OCEANIA = [
  { q: 'El hangi, el horno de tierra maorí', e: '♨️', x: 'Nueva Zelanda: piedras volcánicas calientes bajo tierra, de 3 a 4 horas.', niv: 1 },
  { q: 'El umu de Samoa y el lovo de Fiyi', e: '🔥', x: 'Otros nombres del horno de tierra del Pacífico.', niv: 1 },
  { q: 'El kumara, el camote de los maoríes', e: '🍠', x: 'Trampa: el camote es americano, pero llegó a la Polinesia antes de Colón (contacto hacia el año 1200).', niv: 2 },
  { q: 'El bushfood: macadamia, quandong y ciruela kakadu', e: '🌰', x: 'Australia: la despensa silvestre de los pueblos aborígenes.', niv: 1 },
  { q: 'La «barbie», la parrillada australiana', e: '🍤', x: 'Australia: igual que el braai y el asado, el fuego comunitario.', niv: 1 },
  { q: 'La pavlova, el postre en disputa', e: '🍰', x: 'Australia y Nueva Zelanda se pelean su autoría desde hace casi un siglo.', niv: 1 },
  { q: 'El poi de taro y el luau', e: '🌺', x: 'Hawái, base polinesia.', niv: 1 },
  { q: 'El plate lunch', e: '🍱', x: 'Hawái: arroz japonés, ensalada de macarrón y carnes al estilo filipino o coreano.', niv: 1 },
  { q: 'La kava en las ceremonias para recibir visitantes', e: '🥥', x: 'Las islas del Pacífico.', niv: 2 },
  { q: 'El ika mata: pescado crudo en limón y leche de coco', e: '🐠', x: 'Polinesia. Trampa: recuerda al ceviche, pero es de las islas del Pacífico.', niv: 2 },
  { q: 'Los navegantes lapita en canoas dobles', e: '🛶', x: 'Hace unos 3,000 años empezaron a poblar el Pacífico guiándose por las estrellas.', niv: 1 },
  { q: 'El meat pie y la carne de canguro', e: '🥧', x: 'Australia: herencia británica y un ingrediente nativo.', niv: 2 },
  { q: 'El curry cotidiano de Fiyi', e: '🍛', x: 'Trampa: suena a Asia, pero es Oceanía; casi un tercio de Fiyi desciende de trabajadores llevados desde la India.', niv: 2 },
].map(x => ({ ...x, c: 'oceania' }));

const deAsia = QUE_ASIA.map(x => ({ q: x.q, e: x.e, x: x.x, niv: x.niv, c: 'asia' }));
const deEuropa = QUE_EUROPA.map(x => ({ q: x.q, e: x.e, x: x.x, niv: x.niv, c: 'europa' }));
export const VUELTA_MUNDO = [...AFRICA, ...AMERICA, ...deAsia, ...deEuropa, ...OCEANIA];
export const SOLO_OCEANIA = OCEANIA;
