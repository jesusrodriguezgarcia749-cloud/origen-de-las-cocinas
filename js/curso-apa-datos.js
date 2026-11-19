// curso-apa-datos.js — Contenido del Curso de APA 7 (el mismo archivo en Epistemología y en Origen de las Cocinas).
// Cada lección: secciones para leer (texto, regla con ejemplos, bien/mal) y ejercicios que se califican solos.
// Tipos de ejercicio:
//   opcion   { q, o: [...], c: índice correcto, x: explicación }
//   vf       { q, v: true|false, x }
//   error    { q, partes: [...], mal: índice de la parte equivocada, x }   → el alumno toca la parte con error
//   ordenar  { q, partes: [... en el orden correcto], x }                  → el alumno las toca en orden
// Los autores con apellidos como Pérez, Cauich, Ramírez o Uc son ficticios: sirven de ejemplo y no deben citarse.
// Las obras reales (Freire, Popper, Kuhn, Bunge…) usan los mismos datos que el Laboratorio de la plataforma.

export const APA_APROBAR = 0.8;      // 80 % de aciertos para aprobar una lección
export const APA_RETO = { preguntas: 20, minutos: 20, aprobar: 8 };

export const LECCIONES = [
  // =====================================================================================
  { id: 'l1', ico: '🤝', titulo: '¿Por qué citamos?', sub: 'Honestidad académica, plagio y la inteligencia artificial', min: 10,
    secciones: [
      { t: 'texto', h: 'Citar es dar crédito', p: [
        'Cuando escribes un trabajo académico entras a una conversación que empezó antes que tú. **Citar** es decir con claridad **qué ideas son de otros** y **dónde puede encontrarlas** tu lector.',
        'El estilo **APA** (American Psychological Association) es el más usado en educación, psicología y ciencias sociales. Este curso sigue su **7.ª edición** (2020), adaptada al español.' ] },
      { t: 'regla', h: 'Dos piezas que siempre van juntas', items: [
        '**La cita en el texto**, junto a la idea: (Freire, 1970/2005).',
        '**La referencia en la lista**, al final del trabajo, con todos los datos para encontrar la obra.',
        'Toda cita tiene su referencia y **toda referencia tiene al menos una cita**. Si no la citaste, no va en la lista.' ] },
      { t: 'regla', h: '¿Qué se cita y qué no?', items: [
        '**Se cita** toda idea, dato, frase, teoría, tabla o imagen de otra persona, **aunque la digas con tus palabras**.',
        '**No se cita** el conocimiento común (que México se independizó en 1821) ni tus propias ideas, opiniones u observaciones.',
        'Si dudas, **cita**: nunca se pierde puntos por reconocer a otro.' ] },
      { t: 'bienmal', h: 'El plagio', mal: [
        'Copiar un párrafo sin comillas, aunque pongas la referencia al final.',
        'Cambiar algunas palabras de un texto ajeno y presentarlo como tuyo (paráfrasis sin cita).',
        'Entregar un texto escrito por una inteligencia artificial como si fuera tuyo.',
        'Reciclar un trabajo tuyo de otra materia sin avisar (autoplagio).' ],
        bien: [
        'Copiar textualmente **entre comillas** y con su página.',
        'Explicar la idea **con tus palabras** y citar al autor.',
        'Usar la IA como apoyo, **declararlo** y escribir tú el texto.' ] },
      { t: 'texto', h: 'La inteligencia artificial', p: [
        'Una IA **no es autora** de ideas ni una fuente confiable de datos: genera textos probables y a veces **inventa referencias** que no existen.',
        'Si la usaste, **decláralo**. Y nunca cites una obra que te sugirió una IA **sin haberla localizado y leído tú**.' ] },
    ],
    ejercicios: [
      { tipo: 'vf', q: 'Si explicas con tus propias palabras la idea de un autor, ya no necesitas citarlo.', v: false, x: 'La idea sigue siendo suya: la paráfrasis **también se cita**.' },
      { tipo: 'vf', q: 'Toda obra que aparece en la lista de referencias debe estar citada al menos una vez en el texto.', v: true, x: 'En APA la lista solo incluye lo que citaste. No es una bibliografía de «lo que leí».' },
      { tipo: 'opcion', q: 'Copias un párrafo de un artículo, sin comillas, y pones el artículo en tus referencias. ¿Qué es?', o: ['Plagio', 'Una paráfrasis correcta', 'Una cita textual correcta', 'Conocimiento común'], c: 0, x: 'Si las palabras son del autor, van **entre comillas y con página**. Sin comillas es plagio, aunque esté en la lista.' },
      { tipo: 'opcion', q: '¿Cuál de estas afirmaciones NO necesita cita?', o: ['La Revolución mexicana comenzó en 1910.', 'El 23 % de los alumnos de secundaria no comprende lo que lee.', 'La ciencia avanza por revoluciones que cambian de paradigma.', 'El aprendizaje significativo ocurre cuando lo nuevo se ancla en lo que ya sabes.'], c: 0, x: 'Es **conocimiento común**. Un dato, una teoría o un concepto de un autor sí se citan.' },
      { tipo: 'vf', q: 'Una IA puede inventar referencias que parecen reales pero no existen.', v: true, x: 'Por eso cada fuente se **localiza y se lee** antes de citarla.' },
      { tipo: 'opcion', q: 'Usaste una IA para que te sugiriera preguntas para tu entrevista. ¿Qué haces?', o: ['Lo declaro en mi metodología y escribo yo mi trabajo', 'No digo nada: solo fueron ideas', 'Pongo a la IA como coautora', 'Cito a la IA en cada párrafo'], c: 0, x: 'La IA puede apoyar; lo honesto es **declarar cómo la usaste** y que el texto y las ideas sean tuyos.' },
      { tipo: 'vf', q: 'Entregar en una materia un trabajo que ya presentaste en otra, sin avisar, también es una falta de honestidad académica.', v: true, x: 'Se llama **autoplagio**.' },
      { tipo: 'opcion', q: '¿Qué dos piezas forman siempre una cita en APA?', o: ['La cita en el texto y la referencia en la lista', 'La nota al pie y la bibliografía', 'El nombre del autor y el título', 'La portada y el índice'], c: 0, x: 'APA usa **autor-fecha** en el texto y la **referencia completa** al final. No usa notas al pie para citar.' },
      { tipo: 'vf', q: 'Tus propias observaciones de la práctica (lo que viste en el salón) necesitan una cita de otro autor para poder escribirlas.', v: false, x: 'Lo que tú observaste es tuyo. Lo que se cita es lo que tomas de otros.' },
    ] },

  // =====================================================================================
  { id: 'l2', ico: '✍️', titulo: 'Citas en el texto', sub: 'Autor y año: narrativa y entre paréntesis', min: 15,
    secciones: [
      { t: 'regla', h: 'Dos maneras de citar', items: [
        '**Entre paréntesis** (parentética): la idea primero y la cita al final de la oración. «La escuela puede transformar la realidad (Freire, 1970/2005).»',
        '**Narrativa**: el autor forma parte de tu oración y el año va entre paréntesis. «Freire (1970/2005) sostiene que…»',
        'En la cita va **solo el apellido**, sin nombre ni iniciales: Bunge (1960), no Mario Bunge (1960).' ] },
      { t: 'tabla', h: '¿Cuántos autores?', cols: ['Autores', 'Entre paréntesis', 'Narrativa'], filas: [
        ['Uno', '(Bunge, 1960)', 'Bunge (1960)'],
        ['Dos (siempre los dos)', '(Carr y Kemmis, 1988)', 'Carr y Kemmis (1988)'],
        ['Tres o más (desde la primera vez)', '(Hernández Sampieri et al., 2014)', 'Hernández Sampieri et al. (2014)'],
        ['Institución', '(Secretaría de Educación Pública [SEP], 2022); después (SEP, 2022)', 'La Secretaría de Educación Pública (SEP, 2022)'] ] },
      { t: 'regla', h: 'Casos especiales', items: [
        '**Obra traducida o reeditada**: primero el año original y luego el de la edición que leíste: (Popper, 1934/2008). Solo en el texto.',
        '**Sin fecha**: (UNESCO, s. f.).',
        '**Varias obras en un mismo paréntesis**: en orden alfabético y separadas por punto y coma: (Bunge, 1960; Kuhn, 1962/2013).',
        '**Mismo autor y mismo año**: se agregan letras: (Morin, 1999a, 1999b), y las mismas letras van en la lista.',
        '**Et al.** significa «y otros»: lleva punto, porque es abreviatura, y no lleva cursivas.' ] },
      { t: 'bienmal', h: 'Errores frecuentes', mal: ['(Freire 1970)', '(Freire, P., 1970)', 'Wilhelm Dilthey (1883/1949) distingue…', '(Carr & Kemmis, 1988)', '(Hernández, Fernández y Baptista, 2014)'], bien: ['(Freire, 1970/2005)', '(Freire, 1970/2005)', 'Dilthey (1883/1949) distingue…', '(Carr y Kemmis, 1988)', '(Hernández Sampieri et al., 2014)'] },
    ],
    ejercicios: [
      { tipo: 'opcion', q: '¿Cuál cita entre paréntesis está bien escrita?', o: ['(Bunge, 1960)', '(Bunge 1960)', '(Mario Bunge, 1960)', '(Bunge, M., 1960)'], c: 0, x: 'Apellido, **coma** y año. Sin nombre ni iniciales.' },
      { tipo: 'opcion', q: 'Una obra de Ana Pérez, Luis Cauich y Rosa Uc (2021). ¿Cómo se cita la primera vez?', o: ['(Pérez et al., 2021)', '(Pérez, Cauich y Uc, 2021)', '(Pérez y otros, 2021)', '(Pérez, 2021)'], c: 0, x: 'Con **tres o más autores** se usa el primero y **et al.** desde la primera cita.' },
      { tipo: 'opcion', q: 'Una obra de dos autores, Carr y Kemmis (1988). ¿Cómo va en español?', o: ['(Carr y Kemmis, 1988)', '(Carr & Kemmis, 1988)', '(Carr et al., 1988)', '(Carr, Kemmis, 1988)'], c: 0, x: 'Dos autores van **siempre los dos**, unidos con **«y»** en un texto en español.' },
      { tipo: 'vf', q: 'La forma (Popper, 1934/2008) indica que la obra se publicó en 1934 y que leíste la edición de 2008.', v: true, x: 'Primero el año original y después el de tu edición.' },
      { tipo: 'error', q: 'Toca la parte que está mal en esta oración.', partes: ['Según', 'Thomas S. Kuhn', '(1962/2013),', 'la ciencia normal', 'trabaja dentro de un paradigma.'], mal: 1, x: 'En la cita narrativa va **solo el apellido**: Kuhn (1962/2013).' },
      { tipo: 'opcion', q: 'Citas dos obras en el mismo paréntesis. ¿Cuál es correcta?', o: ['(Bunge, 1960; Kuhn, 1962/2013)', '(Kuhn, 1962/2013; Bunge, 1960)', '(Bunge, 1960, Kuhn, 1962/2013)', '(Bunge y Kuhn, 1960, 2013)'], c: 0, x: 'En **orden alfabético** y separadas por **punto y coma**.' },
      { tipo: 'opcion', q: 'Una página de la UNESCO que no tiene fecha:', o: ['(UNESCO, s. f.)', '(UNESCO, sin fecha)', '(UNESCO)', '(UNESCO, 2024)'], c: 0, x: '**s. f.** = sin fecha. No inventes el año.' },
      { tipo: 'error', q: 'Toca la parte que está mal.', partes: ['La investigación-acción', 'busca transformar la práctica', '(Carr & Kemmis,', '1988).'], mal: 2, x: 'En español se escribe **«y»**: (Carr y Kemmis, 1988).' },
      { tipo: 'opcion', q: 'Citas por primera vez un documento de la Secretaría de Educación Pública de 2022 y lo vas a citar varias veces. ¿Cómo empiezas?', o: ['(Secretaría de Educación Pública [SEP], 2022)', '(SEP, 2022)', '(Secretaría, 2022)', '(SEP [Secretaría de Educación Pública], 2022)'], c: 0, x: 'La primera vez, el nombre completo con la sigla entre **corchetes**; después, solo **(SEP, 2022)**.' },
      { tipo: 'vf', q: '«Et al.» se escribe en cursivas y sin punto.', v: false, x: 'Es abreviatura: **et al.** con punto y sin cursivas.' },
      { tipo: 'opcion', q: 'Citas dos libros de Morin publicados en 1999. ¿Cómo los distingues?', o: ['(Morin, 1999a) y (Morin, 1999b)', '(Morin, 1999) y (Morin, 1999)', '(Morin 1, 1999) y (Morin 2, 1999)', 'No se pueden citar los dos'], c: 0, x: 'Se agregan **letras** al año, y las mismas letras van en la lista de referencias.' },
    ] },

  // =====================================================================================
  { id: 'l3', ico: '❝', titulo: 'Cita textual y paráfrasis', sub: 'Comillas, páginas, citas en bloque y citas de segunda mano', min: 15,
    secciones: [
      { t: 'regla', h: 'Paráfrasis', items: [
        'Es la idea del autor **con tus palabras y tu estructura**, no la misma frase con sinónimos.',
        'Lleva su cita: (Apellido, año). El número de página es **opcional**, pero ayuda.',
        'En un ensayo, **la mayor parte** de tus citas deben ser paráfrasis: el texto es tuyo.' ] },
      { t: 'regla', h: 'Cita textual corta (menos de 40 palabras)', items: [
        'Las palabras exactas, **entre comillas** («» o "").',
        '**Siempre con número de página**: (Pérez, 2021, p. 15). Varias páginas: (Pérez, 2021, pp. 15-16).',
        'Narrativa: Pérez (2021) afirma que «la lectura en voz alta no garantiza la comprensión» (p. 15).',
        'Si la fuente no tiene páginas (una web), usa el párrafo: (UNESCO, 2023, párr. 4).' ] },
      { t: 'regla', h: 'Cita en bloque (40 palabras o más)', items: [
        'Va en **párrafo aparte**, con sangría de 1.27 cm, **sin comillas**.',
        'La cita (Apellido, año, p. X) va **después del punto final**.',
        'Úsala muy poco: si necesitas una cita tan larga, quizá conviene parafrasear.' ] },
      { t: 'regla', h: 'Otros recursos', items: [
        '**Omitir palabras**: puntos suspensivos entre corchetes […].',
        '**Aclarar** algo dentro de la cita: entre corchetes, «ellos [los alumnos de primero] leen con fluidez».',
        '**Cita de segunda mano**: si leíste a Comte solo a través de Bunge: (Comte, 1844, como se citó en Bunge, 1980). En la lista va **solo Bunge**, que es lo que leíste. Úsala lo menos posible.' ] },
      { t: 'bienmal', h: 'Compara', mal: ['«La lectura en voz alta no garantiza la comprensión» (Pérez, 2021).', 'La lectura en voz alta no garantiza la comprensión (Pérez, 2021, p. 15).', 'Pérez (2021) dice: la lectura en voz alta no garantiza la comprensión.'], bien: ['«La lectura en voz alta no garantiza la comprensión» (Pérez, 2021, p. 15).', 'Leer de corrido no significa entender lo que se lee (Pérez, 2021).', 'Pérez (2021) afirma que «la lectura en voz alta no garantiza la comprensión» (p. 15).'] },
    ],
    ejercicios: [
      { tipo: 'opcion', q: '¿Qué le falta a esta cita textual? «La escuela no es para todos» (Ramírez, 2019).', o: ['El número de página', 'El nombre del autor', 'Las cursivas', 'Nada, está completa'], c: 0, x: 'Toda cita textual lleva **página**: (Ramírez, 2019, p. 33).' },
      { tipo: 'vf', q: 'En una paráfrasis el número de página es obligatorio.', v: false, x: 'En la paráfrasis es **opcional** (recomendable). En la cita textual es **obligatorio**.' },
      { tipo: 'opcion', q: 'Una cita textual de 52 palabras va…', o: ['En párrafo aparte, con sangría y sin comillas', 'Entre comillas dentro del párrafo', 'En cursivas', 'En una nota al pie'], c: 0, x: 'Desde **40 palabras** es cita **en bloque**: párrafo aparte, sangría y sin comillas.' },
      { tipo: 'opcion', q: '¿Cómo se indican varias páginas?', o: ['(Pérez, 2021, pp. 15-16)', '(Pérez, 2021, p. 15-16)', '(Pérez, 2021, pág. 15 a 16)', '(Pérez, 2021: 15-16)'], c: 0, x: '**p.** para una página; **pp.** para varias.' },
      { tipo: 'error', q: 'Toca la parte que está mal.', partes: ['Uc (2020)', 'afirma que', '«el juego también es un modo de conocer»', '(pág. 8).'], mal: 3, x: 'La abreviatura es **p.**: (p. 8).' },
      { tipo: 'opcion', q: 'Leíste una idea de Comte en un libro de Bunge (1980), pero no leíste a Comte. ¿Qué va en tu lista de referencias?', o: ['Solo el libro de Bunge', 'Solo el libro de Comte', 'Los dos', 'Ninguno'], c: 0, x: 'En la lista va **lo que leíste**. En el texto: (Comte, 1844, como se citó en Bunge, 1980).' },
      { tipo: 'vf', q: 'Una buena paráfrasis cambia algunas palabras por sinónimos y deja la misma estructura de la oración.', v: false, x: 'Eso es casi copiar. La paráfrasis explica la idea **con tus palabras y tu propia estructura**.' },
      { tipo: 'opcion', q: 'Citas textualmente una página web sin números de página. ¿Cómo localizas la cita?', o: ['Con el número de párrafo: (UNESCO, 2023, párr. 4)', 'No se puede citar textualmente', 'Con la hora de consulta', 'Con la página del navegador'], c: 0, x: 'Sin páginas, se usa **párr.** (párrafo).' },
      { tipo: 'opcion', q: 'Quieres omitir una parte del medio de una cita textual. ¿Qué usas?', o: ['[…]', '(…)', '---', 'etc.'], c: 0, x: 'Puntos suspensivos **entre corchetes**.' },
      { tipo: 'vf', q: 'En una cita en bloque, la cita con la página va después del punto final.', v: true, x: '…última palabra de la cita. (Pérez, 2021, p. 15)' },
    ] },

  // =====================================================================================
  { id: 'l4', ico: '🧱', titulo: 'Las partes de una referencia', sub: 'Libro, capítulo, artículo, web, documento oficial, tesis, video e IA', min: 20,
    secciones: [
      { t: 'regla', h: 'Cuatro preguntas', items: [
        '**¿Quién?** Autor: Apellido, Iniciales. (Kuhn, T. S.)',
        '**¿Cuándo?** El año, entre paréntesis y con punto: (2013).',
        '**¿Qué?** El título.',
        '**¿Dónde?** La editorial, la revista con volumen y número, o la dirección web. En APA 7 **ya no va la ciudad** de la editorial.' ] },
      { t: 'formatos', h: 'Los formatos más usados', items: [
        ['Libro', 'Apellido, A. A. (año). *Título del libro en cursivas* (2.ª ed.). Editorial.', 'Bunge, M. (1960). *La ciencia, su método y su filosofía*. Siglo Veinte.'],
        ['Libro traducido o reeditado', 'Apellido, A. (año de tu edición). *Título* (N. Traductor, Trad.). Editorial. (Obra original publicada en año).', 'Popper, K. R. (2008). *La lógica de la investigación científica* (V. Sánchez de Zavala, Trad.). Tecnos. (Obra original publicada en 1934).'],
        ['Capítulo de un libro con editores', 'Apellido, A. (año). Título del capítulo. En B. Apellido (Ed.), *Título del libro* (pp. 10-25). Editorial.', 'Cauich, L. (2020). La lectura en secundaria. En R. Uc (Ed.), *Leer en la escuela* (pp. 45-60). Editorial Ejemplo.'],
        ['Artículo de revista', 'Apellido, A., y Apellido, B. (año). Título del artículo. *Nombre de la Revista*, *volumen*(número), páginas. https://doi.org/xxxx', 'Pérez, A., y Uc, R. (2021). Lectura en voz alta y comprensión. *Revista Ejemplo de Educación*, *12*(3), 45-60. https://doi.org/10.0000/ree.2021.123'],
        ['Documento de una institución', 'Institución. (año). *Título del documento*. URL', 'Secretaría de Educación Pública. (2022). *Plan de estudio para la educación preescolar, primaria y secundaria 2022*. https://…'],
        ['Página web', 'Autor u organización. (año, día de mes). *Título de la página*. Nombre del sitio. URL', 'UNESCO. (s. f.). *Título de la página*. https://…'],
        ['Tesis', 'Apellido, A. (año). *Título de la tesis* [Tesis de licenciatura, Institución]. Repositorio. URL', 'Ramírez, J. (2019). *La tutoría en tercero de secundaria* [Tesis de licenciatura, Universidad Ejemplo]. Repositorio institucional. https://…'],
        ['Video', 'Canal. (año, día de mes). *Título del video* [Video]. YouTube. URL', 'Canal Ejemplo. (2023, 5 de mayo). *Cómo citar en APA* [Video]. YouTube. https://…'],
        ['Inteligencia artificial', 'Empresa. (año). *Nombre de la herramienta* (versión) [Modelo de lenguaje extenso]. URL', 'OpenAI. (2024). *ChatGPT* (versión GPT-4o) [Modelo de lenguaje extenso]. https://chatgpt.com'] ] },
      { t: 'regla', h: 'Detalles que se pierden', items: [
        'Iniciales con **punto y espacio**: Kuhn, T. S.',
        'En el **artículo**, las cursivas van en el **nombre de la revista** y en el **volumen**, no en el título del artículo. El número va entre paréntesis y sin cursivas: *12*(3).',
        'El **DOI** se escribe como dirección (https://doi.org/…) y **no lleva punto final**.',
        'La edición va así: (2.ª ed.) o (4.ª ed.). La traducción: (V. Sánchez de Zavala, Trad.).',
        '«Recuperado de» ya no se usa: basta la URL.' ] },
    ],
    ejercicios: [
      { tipo: 'ordenar', q: 'Ordena las partes de esta referencia de libro.', partes: ['Bunge, M.', '(1960).', '*La ciencia, su método y su filosofía*.', 'Siglo Veinte.'], x: '**Quién, cuándo, qué, dónde.**' },
      { tipo: 'ordenar', q: 'Ordena esta referencia de un libro traducido.', partes: ['Popper, K. R.', '(2008).', '*La lógica de la investigación científica*', '(V. Sánchez de Zavala, Trad.).', 'Tecnos.', '(Obra original publicada en 1934).'], x: 'El año original va **al final**, no junto al otro año.' },
      { tipo: 'error', q: 'Toca la parte que está mal en esta referencia de artículo.', partes: ['Pérez, A., y Uc, R.', '(2021).', 'Lectura en voz alta y comprensión.', '*Revista Ejemplo de Educación*,', '*12*(3), 45-60.', 'https://doi.org/10.0000/ree.2021.123.'], mal: 5, x: 'El **DOI no lleva punto final**.' },
      { tipo: 'error', q: 'Toca la parte que está mal.', partes: ['Kuhn, T. S.', '(1962/2013).', '*La estructura de las revoluciones científicas*', '(4.ª ed.).', 'Fondo de Cultura Económica.'], mal: 1, x: 'En la lista va **un solo año**, el de tu edición: (2013). Al final: (Obra original publicada en 1962).' },
      { tipo: 'opcion', q: 'En la referencia de un artículo de revista, ¿qué va en cursivas?', o: ['El nombre de la revista y el volumen', 'El título del artículo', 'Solo el número', 'Nada'], c: 0, x: '*Nombre de la Revista*, *volumen*(número).' },
      { tipo: 'vf', q: 'En APA 7 ya no se escribe la ciudad de la editorial.', v: true, x: 'Antes: «México: Siglo XXI». Ahora: «Siglo XXI».' },
      { tipo: 'error', q: 'Toca la parte que está mal.', partes: ['Freire, P.', '(2005).', '*Pedagogía del oprimido*', '(2.ª ed.).', 'México: Siglo XXI.', '(Obra original publicada en 1970).'], mal: 4, x: 'En APA 7 **no va la ciudad**: solo «Siglo XXI.»' },
      { tipo: 'opcion', q: '¿Cómo va el autor?', o: ['Kuhn, T. S.', 'Thomas S. Kuhn', 'Kuhn, Thomas S.', 'KUHN, T.'], c: 0, x: '**Apellido, iniciales** con punto y espacio.' },
      { tipo: 'ordenar', q: 'Ordena esta referencia de un capítulo en un libro con editor.', partes: ['Cauich, L.', '(2020).', 'La lectura en secundaria.', 'En R. Uc (Ed.),', '*Leer en la escuela*', '(pp. 45-60).', 'Editorial Ejemplo.'], x: 'El capítulo sin cursivas; el libro con cursivas y las páginas del capítulo.' },
      { tipo: 'opcion', q: 'Usaste ChatGPT y lo declaras. ¿Cuál referencia sigue el formato de APA?', o: ['OpenAI. (2024). *ChatGPT* (versión GPT-4o) [Modelo de lenguaje extenso]. https://chatgpt.com', 'ChatGPT. (2024). Respuesta a mi pregunta. Internet.', 'Inteligencia artificial (2024). chatgpt.com', 'No se puede poner en referencias'], c: 0, x: 'El autor es la **empresa** que la desarrolló, con la versión y la descripción entre corchetes.' },
      { tipo: 'vf', q: 'En APA 7 se escribe «Recuperado de» antes de la URL.', v: false, x: 'Ya no: basta la **URL**.' },
    ] },

  // =====================================================================================
  { id: 'l5', ico: '📚', titulo: 'La lista de referencias', sub: 'Orden, sangría francesa, cursivas y mayúsculas', min: 15,
    secciones: [
      { t: 'regla', h: 'Cómo se arma', items: [
        'Título **Referencias**, centrado y en negritas, en **página nueva**.',
        '**Orden alfabético** por el primer apellido. Si hay varias obras del mismo autor, de la **más antigua a la más reciente**.',
        '**Sangría francesa** de 1.27 cm: la primera línea al margen y las demás hacia adentro. **Doble espacio**.',
        '**Sin viñetas ni números.**',
        '**Solo lo que citaste**, y **cada obra una sola vez**.' ] },
      { t: 'regla', h: 'Un solo año en la lista', items: [
        'Las fichas «1934/2008» son **solo para el texto**.',
        'En la lista: el año de la edición que leíste y, al final, **(Obra original publicada en 1934)**.' ] },
      { t: 'regla', h: 'Mayúsculas en los títulos', items: [
        'Títulos de libros y artículos **en tipo oración**: solo la primera palabra y los nombres propios. *La estructura de las revoluciones científicas*.',
        'El **nombre de la revista** conserva sus mayúsculas: *Revista Mexicana de Investigación Educativa*.' ] },
      { t: 'ejemplo', h: 'Así se ve', lineas: [
        'Bunge, M. (1960). *La ciencia, su método y su filosofía*. Siglo Veinte.',
        'Freire, P. (2005). *Pedagogía del oprimido* (2.ª ed.). Siglo XXI. (Obra original publicada en 1970).',
        'Kuhn, T. S. (2013). *La estructura de las revoluciones científicas* (4.ª ed.; C. Solís Santos, Trad.). Fondo de Cultura Económica. (Obra original publicada en 1962).',
        'Popper, K. R. (1994). *Conjeturas y refutaciones: el desarrollo del conocimiento científico*. Paidós. (Obra original publicada en 1963).',
        'Popper, K. R. (2008). *La lógica de la investigación científica* (V. Sánchez de Zavala, Trad.). Tecnos. (Obra original publicada en 1934).' ] },
    ],
    ejercicios: [
      { tipo: 'ordenar', q: 'Ordena esta lista de referencias como debe ir.', partes: ['Bunge, M. (1960)…', 'Freire, P. (2005)…', 'Kuhn, T. S. (2013)…', 'Morin, E. (1994)…', 'Popper, K. R. (2008)…'], x: '**Orden alfabético** por el primer apellido.' },
      { tipo: 'ordenar', q: 'Dos obras de Popper. Ordénalas.', partes: ['Popper, K. R. (1994). *Conjeturas y refutaciones*…', 'Popper, K. R. (2008). *La lógica de la investigación científica*…'], x: 'Mismo autor: de la **más antigua** a la más reciente (por el año de tu edición).' },
      { tipo: 'vf', q: 'En la lista de referencias se ponen todos los libros que leíste, aunque no los cites.', v: false, x: 'Solo lo que **citaste** en el texto.' },
      { tipo: 'opcion', q: '¿Qué es la sangría francesa?', o: ['La primera línea al margen y las siguientes hacia adentro', 'Todas las líneas hacia adentro', 'La primera línea hacia adentro y las demás al margen', 'Texto centrado'], c: 0, x: 'Así se distingue dónde empieza cada referencia.' },
      { tipo: 'error', q: 'Toca la referencia que está mal en esta lista.', partes: ['Bunge, M. (1960). *La ciencia, su método y su filosofía*. Siglo Veinte.', 'Dilthey, W. (1883/1949). *Introducción a las ciencias del espíritu*. Fondo de Cultura Económica.', 'Weber, M. (1973). *Ensayos sobre metodología sociológica*. Amorrortu. (Obra original publicada en 1922).'], mal: 1, x: 'En la lista va **un solo año**: Dilthey, W. (1949)… (Obra original publicada en 1883).' },
      { tipo: 'opcion', q: '¿Cómo se escribe el título de un libro en la lista?', o: ['*La estructura de las revoluciones científicas*', '*La Estructura de las Revoluciones Científicas*', 'La estructura de las revoluciones científicas', '«La estructura de las revoluciones científicas»'], c: 0, x: '**Cursivas** y **tipo oración**: solo la primera palabra con mayúscula (y los nombres propios).' },
      { tipo: 'vf', q: 'La lista de referencias va numerada o con viñetas.', v: false, x: 'Sin números ni viñetas: **orden alfabético y sangría francesa**.' },
      { tipo: 'error', q: 'En esta lista hay un problema. Toca la referencia que sobra.', partes: ['Habermas, J. (1982). *Conocimiento e interés*. Taurus. (Obra original publicada en 1968).', 'Habermas, J. (1982). *Conocimiento e interés*. Taurus.', 'Kuhn, T. S. (2013). *La estructura de las revoluciones científicas* (4.ª ed.). Fondo de Cultura Económica. (Obra original publicada en 1962).'], mal: 1, x: 'Es la **misma obra repetida**. Cada referencia va una sola vez.' },
      { tipo: 'opcion', q: '¿Dónde va el título «Referencias»?', o: ['Centrado y en negritas, en página nueva', 'A la izquierda y subrayado', 'En mayúsculas y cursivas', 'No lleva título'], c: 0, x: 'Como un título de nivel 1: **centrado y en negritas**.' },
      { tipo: 'vf', q: 'El nombre de una revista conserva sus mayúsculas: *Revista Mexicana de Investigación Educativa*.', v: true, x: 'Los títulos de libros y artículos van en tipo oración; el **nombre de la revista**, no.' },
    ] },

  // =====================================================================================
  { id: 'l6', ico: '📄', titulo: 'El formato del trabajo', sub: 'Portada, letra, márgenes, títulos, tablas y figuras', min: 15,
    secciones: [
      { t: 'regla', h: 'La página', items: [
        'Letra **Times New Roman 12** (APA también acepta Calibri 11, Arial 11 o Georgia 11).',
        '**Doble espacio** en todo el trabajo, incluidas las referencias.',
        '**Márgenes de 2.54 cm** por los cuatro lados.',
        '**Sangría de 1.27 cm** en la primera línea de cada párrafo.',
        'Texto alineado a la izquierda. Si tu institución pide justificado, sigue lo que pida tu institución.',
        '**Número de página** arriba a la derecha, desde la portada.' ] },
      { t: 'regla', h: 'La portada de estudiante', items: [
        'Título del trabajo en **negritas**, autor, institución y carrera, curso, docente y fecha, centrados.',
        'En el ITES se usa la **portada oficial**: el Taller del investigador ya la pone al descargar tu Word.' ] },
      { t: 'tabla', h: 'Niveles de títulos', cols: ['Nivel', 'Formato'], filas: [
        ['1', '**Centrado y en negritas**'],
        ['2', '**Alineado a la izquierda y en negritas**'],
        ['3', '***Alineado a la izquierda, en negritas y cursivas***'],
        ['4', '**Con sangría, en negritas y con punto final.** El texto sigue en la misma línea.'],
        ['5', '***Con sangría, negritas, cursivas y punto final.*** El texto sigue en la misma línea.'] ] },
      { t: 'regla', h: 'Tablas y figuras', items: [
        'Arriba: **Tabla 1** (en negritas) y, en la línea siguiente, su título *en cursivas*.',
        'Abajo, si hace falta: *Nota.* y la fuente de los datos.',
        'Las figuras (gráficas, fotos, esquemas) siguen el mismo formato: **Figura 1**.',
        'Si la tabla o figura es de otro autor, se cita en la nota.' ] },
    ],
    ejercicios: [
      { tipo: 'opcion', q: '¿Qué interlineado pide APA 7?', o: ['Doble espacio', 'Sencillo', '1.5', 'El que quieras'], c: 0, x: '**Doble espacio** en todo el trabajo.' },
      { tipo: 'opcion', q: '¿Cuánto miden los márgenes?', o: ['2.54 cm por los cuatro lados', '3 cm izquierdo y 2 cm los demás', '1 cm', '5 cm arriba'], c: 0, x: '2.54 cm = una pulgada.' },
      { tipo: 'opcion', q: 'Un título de nivel 1 va…', o: ['Centrado y en negritas', 'A la izquierda y en cursivas', 'Subrayado', 'En mayúsculas'], c: 0, x: 'Nivel 1: **centrado y en negritas**. Nivel 2: izquierda y negritas.' },
      { tipo: 'vf', q: 'Cada párrafo empieza con una sangría de 1.27 cm.', v: true, x: 'Excepto los títulos, la portada y las referencias (que usan sangría francesa).' },
      { tipo: 'opcion', q: '¿Dónde va el número de una tabla?', o: ['Arriba de la tabla, en negritas: Tabla 1', 'Abajo, en cursivas', 'Dentro de la primera celda', 'No lleva número'], c: 0, x: 'Arriba: **Tabla 1** y el título *en cursivas* en la línea siguiente.' },
      { tipo: 'vf', q: 'Las referencias van a espacio sencillo para ahorrar páginas.', v: false, x: 'APA pide **doble espacio** también en la lista.' },
      { tipo: 'opcion', q: 'Un título de nivel 2 va…', o: ['Alineado a la izquierda y en negritas', 'Centrado y en negritas', 'Con sangría y punto final', 'En cursivas, sin negritas'], c: 0, x: 'Nivel 2: **izquierda y negritas**.' },
      { tipo: 'opcion', q: 'Usaste en tu trabajo una gráfica tomada de un informe del INEGI. ¿Qué haces?', o: ['La numero como Figura 1 y cito la fuente en la nota', 'La pego sin nada', 'Solo pongo «Fuente: internet»', 'No se pueden usar gráficas de otros'], c: 0, x: 'Toda figura de otro autor se **cita en la nota** y va en tus referencias.' },
    ] },

  // =====================================================================================
  { id: 'l7', ico: '🔎', titulo: 'Busca, verifica y revisa', sub: 'Fuentes confiables, verificación y la lista de revisión final', min: 15,
    secciones: [
      { t: 'regla', h: 'Dónde buscar', items: [
        '**Google Académico**, **Redalyc**, **SciELO** y **Dialnet**: artículos académicos gratuitos en español.',
        '**Repositorios** de universidades (tesis) y **sitios oficiales**: SEP, INEGI, UNESCO, Diario Oficial de la Federación.',
        '**Wikipedia y los blogs** sirven para orientarte, no para citar: ve a las fuentes que ellos citan.' ] },
      { t: 'regla', h: 'Señales de una fuente confiable', items: [
        'Tiene **autor** o institución responsable identificable.',
        'Tiene **fecha** y **referencias**.',
        'Si es artículo, se publicó en una **revista académica** (con volumen, número y, a menudo, **DOI**).',
        'No vende nada ni busca convencerte de una opinión sin evidencia.' ] },
      { t: 'regla', h: 'Verifica antes de citar', items: [
        'Copia el **DOI** en https://doi.org y comprueba que abre ese artículo.',
        'Busca el **título exacto entre comillas** en Google Académico. Si no aparece en ningún lado, **probablemente no existe**.',
        '**Ábrelo y léelo**: nunca cites algo que no abriste, y menos si te lo sugirió una IA.' ] },
      { t: 'check', h: 'Lista de revisión antes de entregar', items: [
        'Cada cita del texto está en la lista, con **el mismo año**.',
        'Cada referencia de la lista está **citada** en el texto.',
        'Ninguna obra está **repetida**.',
        'En la lista va **un solo año** y la obra original al final.',
        'Las citas textuales tienen **comillas y página**.',
        'Orden **alfabético**, **sangría francesa** y **doble espacio**.',
        'Los títulos de libros y revistas en **cursivas**; el DOI **sin punto final**.',
        'Declaré si usé **inteligencia artificial**.' ] },
    ],
    ejercicios: [
      { tipo: 'opcion', q: '¿Cuál de estas es una fuente académica para citar en tu ensayo?', o: ['Un artículo de una revista en Redalyc, con autor, volumen y DOI', 'Una página de Wikipedia', 'Un blog sin autor', 'Una publicación de Facebook'], c: 0, x: 'Las revistas académicas tienen **autor, revisión y datos completos**.' },
      { tipo: 'vf', q: 'Si una IA te da una referencia con autor, año, revista y DOI, puedes citarla sin buscarla.', v: false, x: 'Las IA **inventan referencias** que parecen reales. Verifica el DOI y el título, y **léela**.' },
      { tipo: 'opcion', q: 'Buscas el título exacto de un artículo entre comillas en Google Académico y no aparece por ningún lado. ¿Qué piensas?', o: ['Probablemente no existe: no lo cito', 'Que es muy nuevo: lo cito igual', 'Que Google Académico falla: lo cito', 'Que da igual'], c: 0, x: 'Una fuente que no puedes localizar **no se cita**.' },
      { tipo: 'opcion', q: 'Para datos oficiales sobre educación en México, ¿qué fuente es más confiable?', o: ['SEP o INEGI', 'Un video de opinión', 'Un foro de internet', 'Un meme'], c: 0, x: 'Las fuentes **oficiales** publican datos con metodología.' },
      { tipo: 'vf', q: 'Wikipedia sirve para orientarte y encontrar fuentes, pero no se cita en un ensayo académico.', v: true, x: 'Ve a las **fuentes que cita** Wikipedia y léelas.' },
      { tipo: 'opcion', q: 'Revisando tu ensayo, encuentras «(Hernández Sampieri y Mendoza, 2018)» en el texto, pero esa obra no está en tu lista. ¿Qué haces?', o: ['La agrego a la lista, si la leí; si no, quito la cita', 'Nada: no importa', 'Borro la lista', 'Cambio el año'], c: 0, x: 'Toda cita **debe tener su referencia**, y solo citas lo que leíste.' },
      { tipo: 'opcion', q: '¿Para qué sirve el DOI?', o: ['Es un identificador permanente que lleva al artículo', 'Es el número de páginas', 'Es el nombre de la revista', 'Es el año de publicación'], c: 0, x: 'Pegado en https://doi.org te lleva **directo al artículo**.' },
      { tipo: 'vf', q: 'Antes de entregar conviene revisar que cada referencia de la lista esté citada en el texto con el mismo año.', v: true, x: 'Es el error más frecuente: la lista y el texto **no coinciden**.' },
    ] },
];

// Generador de referencias: los campos de cada tipo de fuente.
export const TIPOS_REF = [
  { id: 'libro', n: 'Libro', campos: ['autores', 'anio', 'titulo', 'edicion', 'traductor', 'editorial', 'original', 'url'] },
  { id: 'capitulo', n: 'Capítulo de un libro con editor', campos: ['autores', 'anio', 'capitulo', 'editores', 'titulo', 'paginas', 'editorial', 'url'] },
  { id: 'articulo', n: 'Artículo de revista', campos: ['autores', 'anio', 'capitulo', 'revista', 'volumen', 'numero', 'paginas', 'doi'] },
  { id: 'institucion', n: 'Documento de una institución', campos: ['institucion', 'anio', 'titulo', 'url'] },
  { id: 'web', n: 'Página web', campos: ['autores', 'fecha', 'titulo', 'sitio', 'url'] },
  { id: 'tesis', n: 'Tesis', campos: ['autores', 'anio', 'titulo', 'grado', 'universidad', 'repositorio', 'url'] },
  { id: 'video', n: 'Video de YouTube', campos: ['canal', 'fecha', 'titulo', 'url'] },
  { id: 'ia', n: 'Inteligencia artificial', campos: ['empresa', 'anio', 'herramienta', 'version', 'url'] },
];
export const CAMPOS_REF = {
  autores: ['Autores', 'Uno por renglón: Apellido(s), Nombre. Ej.: Kuhn, Thomas S.', 'textarea'],
  anio: ['Año', 'De la edición que leíste. Si no tiene, déjalo vacío (s. f.).'],
  fecha: ['Fecha', 'Año, o año y día de mes. Ej.: 2023, 5 de mayo'],
  titulo: ['Título', 'Solo la primera palabra con mayúscula (y los nombres propios).'],
  capitulo: ['Título del capítulo o del artículo', 'Sin cursivas; tipo oración.'],
  editores: ['Editores del libro', 'Uno por renglón: Apellido, Nombre.', 'textarea'],
  edicion: ['Edición', 'Solo si no es la primera. Ej.: 2'],
  traductor: ['Traductor', 'Si es traducción. Ej.: Víctor Sánchez de Zavala'],
  editorial: ['Editorial', 'Sin ciudad. Ej.: Fondo de Cultura Económica'],
  original: ['Año de la obra original', 'Si es reedición o traducción. Ej.: 1934'],
  revista: ['Nombre de la revista', 'Con sus mayúsculas.'],
  volumen: ['Volumen', 'Ej.: 12'],
  numero: ['Número', 'Ej.: 3'],
  paginas: ['Páginas', 'Ej.: 45-60'],
  doi: ['DOI o URL', 'Ej.: 10.21615/cesp.7760 o https://doi.org/…'],
  institucion: ['Institución', 'Ej.: Secretaría de Educación Pública'],
  sitio: ['Nombre del sitio', 'Si es distinto del autor.'],
  url: ['Dirección web (URL)', 'Si la consultaste en línea.'],
  grado: ['Tipo de tesis', 'Ej.: Tesis de licenciatura, Tesis de maestría'],
  universidad: ['Institución de la tesis', 'Ej.: Universidad Autónoma de Campeche'],
  repositorio: ['Repositorio', 'Ej.: Repositorio institucional'],
  canal: ['Canal', 'Nombre del canal de YouTube'],
  empresa: ['Empresa', 'Ej.: OpenAI, Google, Anthropic'],
  herramienta: ['Herramienta', 'Ej.: ChatGPT, Gemini, Claude'],
  version: ['Versión', 'Ej.: versión GPT-4o'],
};
