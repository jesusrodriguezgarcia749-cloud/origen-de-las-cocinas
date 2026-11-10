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
  'banquete-estado': {
    ind: 'tarea-banquete-estado',
    kicker: 'Tema 4.3 · La comida en la realeza',
    titulo: 'Un banquete de Estado de hoy',
    intro: 'Investiga <b>un banquete de Estado contemporáneo</b> (una visita oficial, una cena de gala de un gobierno o una casa real, una toma de posesión) y descubre <b>qué protocolo histórico conserva</b> y <b>qué mensaje político manda</b>. Antes era media cuartilla en papel.',
    ejemploCaso: 'la cena de los Premios Nobel en Estocolmo (no es un banquete de Estado: tú elige uno que sí lo sea)',
    campos: [
      ['banquete', '🍽️ ¿Qué banquete es?', 'Cuál, cuándo y dónde fue, quién invitó y a quién se honraba.', 20,
        'La cena de los Premios Nobel, que se celebra cada 10 de diciembre en el Ayuntamiento de Estocolmo. La organiza la Fundación Nobel, asiste la familia real sueca y se honra a los premiados del año, con más de mil invitados.', 1.5],
      ['protocolo', '👑 El protocolo que conserva', 'Busca al menos tres: el orden de los asientos, la entrada de los invitados, quién sirve o brinda primero, la vajilla, el código de vestir. ¿Qué se parece a las cortes del Tema 4.3?', 35,
        'Los invitados de honor entran en procesión por una escalinata, encabezados por la familia real, y se sientan en una mesa de honor según su rango. Hay brindis fijos: uno por el rey y otro en memoria de Alfred Nobel. Se exige traje de etiqueta y los meseros sirven en el mismo momento a todo el salón, como un desfile. Igual que en Versalles, el orden y la cercanía a la mesa principal dicen quién es quién.', 3],
      ['menu', '🥂 El menú y la mesa', 'Qué se sirvió, en qué vajilla, en qué idioma se escribió el menú y qué productos se eligieron.', 20,
        'El menú se mantiene en secreto hasta esa noche y suele usar productos de Suecia. Se sirve en una vajilla propia de la ceremonia, diseñada para el aniversario de 1991, que solo se usa ese día.', 1.5],
      ['mensaje', '📣 ¿Qué mensaje político manda?', 'Qué quiere decir el anfitrión con ese banquete: alianza, prestigio, identidad nacional, respeto al invitado…', 25,
        'Suecia se presenta ante el mundo como el país que premia la ciencia, la literatura y la paz. La presencia del rey le da a la ceremonia el peso de un acto de Estado, y la cocina con productos suecos es una forma de mostrar identidad nacional.', 2],
      ['historia', '📜 ¿Con qué corte del Tema 4.3 lo relacionas?', 'Versalles, el Topkapi, la Ciudad Prohibida, la corte mogol, Moctezuma o Maximiliano y Carlota. Explica el parecido.', 20,
        'Con Versalles: como en el grand couvert, la mesa es un espectáculo que se mira (hoy se transmite por televisión) y el lugar de cada invitado marca su importancia.', 1],
      ['fuentes', '📚 Fuentes', 'Al menos dos: una nota de prensa o la página oficial del gobierno o la casa real, y el compendio. Una por renglón.', 1,
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
