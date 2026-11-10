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
