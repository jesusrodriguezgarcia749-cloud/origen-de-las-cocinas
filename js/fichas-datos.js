// fichas-datos.js — Tareas individuales tipo «ficha»: espacios para escribir, cada uno con su ayuda y un
// EJEMPLO GUÍA resuelto con otro caso (para que vean qué se pide sin poder copiarlo).
// Se guardan en grupos/{g}/alumnos/{a}/atlas/{F.ind}: { campos: { clave: texto }, entregado }.
// Campo: [clave, título, ayuda, palabras mínimas, ejemplo, puntos]. El campo «fuentes» cuenta fuentes, no palabras.
export const palabrasF = t => (String(t || '').trim().match(/\S+/g) || []).length;
const r1 = n => Math.round(n * 10) / 10;

export const FICHAS = {
  // ---------- 4.1 · Una comida que es más que comida
  'mas-que-comida': {
    ind: 'tarea-mas-que-comida',
    kicker: 'Tema 4.1 · La necesidad de alimentarse',
    titulo: 'Una comida que es más que comida',
    intro: 'Elige <b>una comida concreta de tu familia, tu comunidad o tu región</b> y explica qué función cumple además de alimentar y de dónde viene esa costumbre. Es la reflexión escrita de la clase (antes media cuartilla en papel).',
    ejemploCaso: 'el panettone de la Navidad italiana',
    campos: [
      ['comida', '🍽️ La comida y quién la come', 'Qué es, quién la prepara y cuándo se come.', 15,
        'El panettone: un pan dulce y alto con fruta confitada y pasas. Las familias italianas lo compran o lo hornean en diciembre y lo comparten en Navidad.', 1.5],
      ['funcion', '🎯 ¿Qué función cumple además de alimentar?', 'Elige una o dos: identidad, religión, economía, poder o vínculo social. Explica cómo se nota.', 25,
        'Vínculo social e identidad: se regala a parientes y vecinos, y para los italianos que viven lejos es un pedazo de casa. Nadie lo come por hambre: se come para celebrar juntos.', 3],
      ['origen', '📜 ¿De dónde viene esa costumbre?', 'Desde cuándo se hace, quién la trajo o cómo cambió. Si no lo sabes, pregunta en casa.', 20,
        'Nació en Milán y se asocia a la Navidad desde hace siglos. En el siglo XX, las fábricas de Milán empezaron a producirlo en grande y así llegó a todas las mesas de Italia.', 2.5],
      ['necesidad', '⚖️ Necesidad y cultura', 'Con lo visto en 4.1: ¿qué tiene de necesidad biológica y qué de cultura? Usa a Brillat-Savarin o a Lévi-Strauss.', 25,
        'Como alimento da energía (harina, azúcar, mantequilla): esa es la necesidad. Pero que sea en Navidad, que se comparta y que se regale es cultura: es lo que Brillat-Savarin llama el placer de la mesa, no solo el placer de comer.', 2],
      ['fuentes', '📚 Fuentes', 'A quién le preguntaste (su parentesco y la fecha) o qué página consultaste, y el compendio. Una por renglón.', 1,
        'Entrevista a mi abuela, 14 de noviembre de 2026. / Compendio Origen de las Cocinas, Tema 4.1.', 1],
    ],
  },
  // ---------- 4.3 · Un banquete de Estado de hoy
  // Lista cerrada de banquetes reales y bien documentados, con fuentes ya revisadas: el alumno elige uno
  // y trabaja con información confiable en lugar de buscar al azar.
  'banquete-estado': {
    ind: 'tarea-banquete-estado',
    kicker: 'Tema 4.3 · La comida en la realeza',
    titulo: 'Un banquete de Estado de hoy',
    intro: '<b>Elige uno de los siete banquetes de la lista</b>: todos ocurrieron de verdad, se publicó qué se sirvió y ya tienen sus fuentes confiables. Lee la fuente de tu banquete y descubre <b>qué protocolo de las cortes conserva</b>, <b>qué dice su menú</b> y <b>qué mensaje político manda</b>. No busques otro banquete en páginas al azar: con la lista basta.',
    ejemploCaso: 'la cena de los Premios Nobel en Estocolmo (no está en la lista y no es un banquete de Estado: así no la puedes copiar)',
    elegir: {
      clave: 'eleccion', titulo: '1. Elige tu banquete',
      ayuda: 'Toca uno. Abre su fuente (las que están en inglés las puedes leer con el traductor de tu navegador) y úsala para llenar los espacios de abajo.',
      opciones: [
        { id: 'versalles-2023', nombre: 'Versalles, 2023: Francia recibe al rey Carlos III', cuando: '20 de septiembre de 2023 · Galería de los Espejos, Palacio de Versalles',
          pista: 'El presidente Macron recibe al rey británico donde Luis XIV comía en público. Unos 160 invitados, menú de dos chefs con tres estrellas Michelin.', corte: 'Versalles',
          fuentes: [['Vanguardia (agencia EFE), en español', 'https://www.vanguardia.com/mundo/una-suntuosa-cena-en-versalles-simboliza-la-nueva-relacion-entre-macron-y-el-rey-carlos-iii-CN7582136'], ['El Universal, en español', 'https://www.eluniversal.com.mx/mundo/francia-recibe-al-rey-carlos-iii-en-el-palacio-de-versalles-que-cumple-400-anos/']] },
        { id: 'versalles-2026', nombre: 'Versalles, 2026: Francia recibe a Donald Trump', cuando: '17 de junio de 2026 · Palacio de Versalles',
          pista: 'Una cena de unos treinta invitados por los 250 años de la independencia de Estados Unidos, con visita a la Galería de los Espejos, concierto en la capilla real y fuegos artificiales.', corte: 'Versalles',
          fuentes: [['La Nación (Argentina), en español', 'https://www.lanacion.com.ar/el-mundo/macron-desplego-el-oro-los-espejos-y-la-historia-de-versalles-para-cortejar-a-trump-nid18062026/']] },
        { id: 'casa-blanca-2010', nombre: 'Casa Blanca, 2010: cena de Estado para el presidente de México', cuando: '19 de mayo de 2010 · Salón Este de la Casa Blanca, Washington',
          pista: 'Barack Obama honra a Felipe Calderón. El chef Rick Bayless cocina un menú mexicano para unos 200 invitados: mole negro oaxaqueño, ceviche, cajeta.', corte: 'Moctezuma o Maximiliano (la cocina mexicana en la mesa del poder)',
          fuentes: [['HuffPost, menú completo, en inglés', 'https://www.huffpost.com/entry/details-emerge-on-rick-ba_n_580694']] },
        { id: 'pekin-2017', nombre: 'Pekín, 2017: China recibe a Donald Trump', cuando: '8 y 9 de noviembre de 2017 · Ciudad Prohibida y Gran Salón del Pueblo',
          pista: 'Xi Jinping invita té y cena dentro de la Ciudad Prohibida, y al día siguiente da el banquete de Estado: pollo kung pao, mero en aceite picante, vinos chinos.', corte: 'la Ciudad Prohibida',
          fuentes: [['TVN Panamá (agencia EFE), en español', 'https://www.tvn-2.com/mundo/banquete-colofon-presidente-trump-china_1_1439132.html'], ['Hong Kong Free Press, el menú, en inglés', 'https://www.hongkongfp.com/2017/11/10/xi-trump-banquet-menu-revealed-kung-pao-chicken-beef-tomato-sauce/'], ['South China Morning Post, el té en la Ciudad Prohibida, en inglés', 'https://scmp.com/news/china/diplomacy-defence/article/2119196/meaning-behind-donald-trumps-cup-tea-forbidden-city']] },
        { id: 'delhi-2020', nombre: 'Nueva Delhi, 2020: la India recibe a Donald Trump', cuando: '25 de febrero de 2020 · Rashtrapati Bhavan, el palacio presidencial',
          pista: 'Más de noventa invitados, himnos, banda militar y un menú con biryani, raan (pierna de cordero) y panes como el sheermal, junto a platos al gusto estadounidense.', corte: 'la corte mogol',
          fuentes: [['The Week (India), crónica y menú de la cena, en inglés', 'https://www.theweek.in/theweek/more/2020/02/28/a-taste-of-india.html']] },
        { id: 'tokio-2019', nombre: 'Tokio, 2019: el banquete de entronización del emperador Naruhito', cuando: '22 de octubre de 2019 · Palacio Imperial de Tokio',
          pista: 'Reyes y jefes de Estado de todo el mundo, mesas en forma de T, nueve tiempos de cocina japonesa, palillos junto a los cubiertos y menús vegetariano y halal.', corte: 'la Ciudad Prohibida o Versalles (el rango en la mesa)',
          fuentes: [['¡Hola!, en español', 'https://www.hola.com/realeza/20191022752408/entronizacion-naruhito-japon-cena-gala/']] },
        { id: 'madrid-2015', nombre: 'Madrid, 2015: los reyes de España reciben al presidente de Colombia', cuando: '2 de marzo de 2015 · Palacio Real de Madrid',
          pista: 'Cena de gala para Juan Manuel Santos con 110 invitados, tiaras y etiqueta, y un menú español con un guiño a Colombia en el postre: chocolate con café colombiano.', corte: 'Versalles o Maximiliano y Carlota (el protocolo de las cortes europeas)',
          fuentes: [['¡Hola!, en español', 'https://www.hola.com/realeza/casa_espanola/2015030277202/reyes-espana-cena-gala-colombia/']] },
      ],
    },
    campos: [
      ['banquete', '🍽️ ¿Qué banquete elegiste?', 'Cuál, cuándo y dónde fue, quién invitó y a quién se honraba. Usa tus palabras, no copies la nota.', 20,
        'La cena de los Premios Nobel, que se celebra cada 10 de diciembre en el Ayuntamiento de Estocolmo. La organiza la Fundación Nobel, asiste la familia real sueca y se honra a los premiados del año, con más de mil invitados.', 1],
      ['menu', '🥂 El menú y lo que dice', 'Qué se sirvió (al menos tres platos) y qué productos se eligieron. ¿El menú presume la cocina del anfitrión, le hace un guiño al invitado o las dos cosas?', 25,
        'El menú se mantiene en secreto hasta esa noche y suele usar productos de Suecia. Se sirve en una vajilla propia de la ceremonia, diseñada para el aniversario de 1991, que solo se usa ese día. Con eso Suecia presume sus productos ante invitados de todo el mundo.', 2],
      ['protocolo', '👑 El protocolo que conserva', 'Busca en tu fuente al menos tres: el lugar, la entrada de los invitados, el orden de los asientos, los brindis o discursos, la música, el código de vestir.', 30,
        'Los invitados de honor entran en procesión por una escalinata, encabezados por la familia real, y se sientan en una mesa de honor según su rango. Hay brindis fijos: uno por el rey y otro en memoria de Alfred Nobel. Se exige traje de etiqueta y los meseros sirven en el mismo momento a todo el salón, como un desfile.', 2.5],
      ['historia', '📜 ¿Con qué corte del Tema 4.3 lo relacionas?', 'La lista te sugiere una, pero tú decides: Versalles, el Topkapi, la Ciudad Prohibida, la corte mogol, Moctezuma o Maximiliano y Carlota. Explica el parecido con un dato de la clase.', 20,
        'Con Versalles: como en el grand couvert, la mesa es un espectáculo que se mira (hoy se transmite por televisión) y el lugar de cada invitado marca su importancia.', 1.5],
      ['mensaje', '📣 ¿Qué mensaje político manda?', 'Qué quiere decir el anfitrión con ese banquete: alianza, reconciliación, prestigio, identidad nacional, respeto al invitado…', 20,
        'Suecia se presenta ante el mundo como el país que premia la ciencia, la literatura y la paz. La presencia del rey le da a la ceremonia el peso de un acto de Estado, y la cocina con productos suecos es una forma de mostrar identidad nacional.', 1.5],
      ['cocina', '👨‍🍳 Visto desde la cocina', 'Si a ti te tocara servir ese banquete, ¿cuál sería el reto más grande: la cantidad de invitados, servir a todos al mismo tiempo, las dietas especiales, el traslado, los tiempos? Explica uno.', 15,
        'Servir el mismo plato caliente a más de mil personas al mismo tiempo: hay que adelantar todo lo posible, emplatar en cadena y que los meseros salgan coordinados, porque si una mesa recibe su plato tarde se nota en todo el salón.', 0.5],
      ['fuentes', '📚 Fuentes', 'La fuente de la lista que leíste y el compendio. Una por renglón.', 1,
        'Fundación Nobel, «The Nobel Banquet», nobelprize.org. / Compendio Origen de las Cocinas, Tema 4.3.', 1],
    ],
  },
};

// Calificación sugerida: cada campo da sus puntos en proporción a las palabras mínimas (las fuentes: 2 o más = completo).
export function sugerirFicha(F, d) {
  if (!d) return { nota: 0, detalle: 'Sin trabajo' };
  const c = d.campos || {}; let nota = 0, completos = 0; const n = F.campos.length;
  F.campos.forEach(([k, , , min, , pts]) => {
    if (k === 'fuentes') { const nf = String(c[k] || '').split(/\n|\s\/\s|;/).map(x => x.trim()).filter(x => x.length > 4).length; nota += pts * (nf >= 2 ? 1 : nf ? .5 : 0); if (nf >= 2) completos++; return; }
    const w = palabrasF(c[k]); nota += pts * Math.min(1, w / min); if (w >= min) completos++;
  });
  return { nota: r1(nota), detalle: `${completos} de ${n} espacios completos` };
}
