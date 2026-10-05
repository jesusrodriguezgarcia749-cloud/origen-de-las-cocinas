// calculo.js — fuente única de la fórmula de calificación de Origen de las
// Cocinas. Tanto mi-progreso.js (vista del alumno) como admin.js (panel
// docente) importan de aquí, para que nunca muestren números distintos.
//
// Esquema (segun la Concentradora de Calificaciones del docente):
//   Parcial 1: Examen 40% (SOLO examen escrito -- la Practica de cocina 1
//              se califica aparte, fuera de esta formula, por decision
//              explicita del docente) + Tareas 25% + Participacion 25%
//              + Asistencia 5% + Uniformes 5%
//   Parcial 2: Examen/Proyecto 40% = Examen practico 20% + Examen escrito 20%
//              + Tareas 25% + Participacion 25% + Asistencia 5% + Uniformes 5%
//   Examen Final: Examen 40% + Proyecto "Mi Plato, Mi Historia" 40%
//              + Tareas y Participacion 15% + Asistencia 5%
//     El Proyecto se acumula en tres entregas:
//       Entrega 1 (durante Parcial 1)        -> 15 de los 40 puntos
//       Entrega 2 (durante Parcial 2)        -> 15 de los 40 puntos
//       Entrega final (exposicion individual, 4 dic) -> 10 de los 40 puntos
//   Cuatrimestre: Parcial 1 (25%) + Parcial 2 (25%) + Final (50%)
//
// IMPORTANTE -- como se califican las TAREAS:
//   Las tareas NO se promedian sobre lo que el alumno entrego, sino sobre
//   TODAS las tareas del catalogo de ese parcial. Una tarea no entregada
//   cuenta como CERO. Si hay 2 tareas en el catalogo y el alumno entrego
//   una con 10, su promedio es 5/10 => la mitad del tope (12.5 de 25).
//   Por eso una tarea solo debe agregarse al catalogo cuando ya cuenta
//   para la calificacion: en cuanto esta en el catalogo, le baja la
//   calificacion a quien no la entregue.
//
// Estructura de datos esperada en Firestore, por alumno
// (grupos/{grupoId}/alumnos/{alumnoId}/...):
//   - tareas          (coleccion): { parcial, nombre, fecha, calificacion (0-10) }
//   - participaciones (coleccion): { parcial, nombre, fecha, calificacion (0-10) }
//   - asistencias     (coleccion): { parcial, fecha, estado }
//   - uniformes       (documentos 'p1' y 'p2'): { faltas }
//   - examenes        (documentos 'p1', 'p2', 'final'): { calificacion } -- examen ESCRITO
//   - practico        (documento 'p2'): { calificacion } -- examen PRACTICO del Parcial 2
//   - proyecto        (documentos 'entrega1', 'entrega2', 'entregaFinal'): { calificacion }
// Y a nivel de grupo (grupos/{grupoId}/...):
//   - tareas_catalogo (coleccion): { parcial, nombre, fecha } -- define cuantas
//     tareas existen en cada parcial, o sea el denominador del promedio.

export const TOPES = {
  p1:    { examen: 40, tareas: 25, participacion: 25, asistencia: 5, uniformes: 5 },
  p2:    { examenEscrito: 20, practico: 20, tareas: 25, participacion: 25, asistencia: 5, uniformes: 5 },
  final: { examen: 40, proyecto: 40, tareasParticipacion: 15, asistencia: 5 },
};

export const TOPES_PROYECTO = { entrega1: 15, entrega2: 15, entregaFinal: 10 };

export const NOMBRES_ENTREGA_PROYECTO = {
  entrega1: 'Entrega 1 (Parcial 1)',
  entrega2: 'Entrega 2 (Parcial 2)',
  entregaFinal: 'Entrega final (exposición individual)',
};

// Meta de participaciones por parcial para llegar al tope de 25 pts.
export const META_PARTICIPACION = { p1: 6, p2: 6 };

export const PESO_CUATRIMESTRE = { p1: 0.25, p2: 0.25, final: 0.50 };

export const NOMBRES_PARCIAL = { p1: 'Parcial 1', p2: 'Parcial 2', final: 'Examen Final' };

// Peso de cada estado sobre el rubro de asistencia.
// La regla del curso es TRES retardos equivalen a UNA falta: por eso cada
// retardo descuenta un tercio de clase (1 - 1/3 = 2/3). Con 0.5 serian dos
// retardos por falta, que era el valor anterior.
const PESO_ASISTENCIA = { presente: 1, justificado: 1, retardo: 2 / 3, falta: 0 };

function promedioCalificaciones(lista) {
  if (!lista || lista.length === 0) return null;
  const suma = lista.reduce((s, x) => s + (Number(x.calificacion) || 0), 0);
  return suma / lista.length;
}

function calcularAsistencia(registros, tope) {
  if (!registros || registros.length === 0) return { pts: 0, tope, presentes: 0, total: 0 };
  const total = registros.length;
  const suma = registros.reduce((s, r) => s + (PESO_ASISTENCIA[r.estado] ?? 0), 0);
  return { pts: (suma / total) * tope, tope, presentes: suma, total };
}

function calcularUniformes(datoUniforme, tope) {
  const faltas = datoUniforme ? Number(datoUniforme.faltas) || 0 : 0;
  if (faltas >= 2) return { pts: 0, tope, faltas };
  if (faltas === 1) return { pts: tope / 2, tope, faltas };
  return { pts: tope, tope, faltas };
}

function calcularRubroPromedio(lista, tope) {
  const prom = promedioCalificaciones(lista);
  const pts = prom === null ? 0 : (prom / 10) * tope;
  return { pts, tope, lista: lista || [], promedio: prom };
}

// Tareas: se promedia sobre TODAS las tareas del catalogo del parcial.
// Lo no entregado cuenta como cero. Si todavia no hay catalogo cargado
// (por ejemplo, en una vista que no lo consulto), se cae de regreso al
// promedio simple de lo entregado para no romper nada.
function calcularTareasSobreCatalogo(entregadas, catalogoDelParcial, tope) {
  const lista = entregadas || [];
  const esperadas = catalogoDelParcial || [];

  if (esperadas.length === 0) {
    const base = calcularRubroPromedio(lista, tope);
    return { ...base, esperadas: lista.length, entregadas: lista.length, faltantes: [] };
  }

  // Lo entregado se indexa por el id del documento, que es el mismo id del
  // catalogo (admin.js guarda cada calificacion en .../tareas/{idDeLaTarea}).
  const porId = new Map();
  lista.forEach(t => { if (t && t.id) porId.set(t.id, t); });

  let suma = 0;
  const faltantes = [];
  esperadas.forEach(tarea => {
    const entregada = porId.get(tarea.id);
    if (entregada && entregada.calificacion !== undefined && entregada.calificacion !== null) {
      suma += Number(entregada.calificacion) || 0;
    } else {
      faltantes.push(tarea);
    }
  });

  const promedio = suma / esperadas.length;
  return {
    pts: (promedio / 10) * tope,
    tope,
    lista,
    promedio,
    esperadas: esperadas.length,
    entregadas: esperadas.length - faltantes.length,
    faltantes,
  };
}

function calcularParticipacionConteo(lista, meta, tope) {
  const cantidad = (lista || []).length;
  const efectiva = Math.min(cantidad, meta);
  const pts = meta > 0 ? (efectiva / meta) * tope : 0;
  return { pts, tope, cantidad, meta, lista: lista || [] };
}

function calcularExamen(dato, tope) {
  const calificacion = dato && dato.calificacion !== undefined && dato.calificacion !== null
    ? Number(dato.calificacion) : null;
  const pts = calificacion === null ? 0 : (calificacion / 10) * tope;
  return { pts, tope, calificacion };
}

function calcularProyecto(datosProyecto) {
  const detalle = {};
  let pts = 0;
  Object.entries(TOPES_PROYECTO).forEach(([entrega, tope]) => {
    const dato = (datosProyecto || {})[entrega];
    const r = calcularExamen(dato, tope);
    detalle[entrega] = r;
    pts += r.pts;
  });
  return { pts, tope: 40, detalle };
}

// datos = { tareas, participaciones, asistencias, uniformes, examenes,
//           practico, proyecto, catalogoTareas }
export function calcularParcial(parcial, datos) {
  const tareasDelParcial = (datos.tareas || []).filter(t => t.parcial === parcial);
  const participacionDelParcial = (datos.participaciones || []).filter(p => p.parcial === parcial);
  const asistenciaDelParcial = (datos.asistencias || []).filter(a => a.parcial === parcial);
  const catalogoDelParcial = (datos.catalogoTareas || []).filter(t => t.parcial === parcial);

  if (parcial === 'final') {
    const tope = TOPES.final;
    // En el Final, Tareas y Participacion comparten un solo rubro de 15 pts:
    // se promedia el resultado de tareas (sobre catalogo) con el de
    // participacion (sobre la meta), para que una tarea no entregada tambien
    // cuente como cero aqui.
    const todasLasTareas = datos.tareas || [];
    const todoElCatalogo = datos.catalogoTareas || [];
    const rTareas = calcularTareasSobreCatalogo(todasLasTareas, todoElCatalogo, 10);
    const participacionTotal = (datos.participaciones || []).length;
    const metaTotal = (META_PARTICIPACION.p1 || 0) + (META_PARTICIPACION.p2 || 0);
    const fraccionPart = metaTotal > 0 ? Math.min(participacionTotal, metaTotal) / metaTotal : 0;
    const fraccionTareas = (rTareas.promedio === null ? 0 : rTareas.promedio) / 10;
    const fraccion = (fraccionTareas + fraccionPart) / 2;
    const tareasParticipacion = {
      pts: fraccion * tope.tareasParticipacion,
      tope: tope.tareasParticipacion,
      lista: [...todasLasTareas, ...(datos.participaciones || [])],
      tareas: rTareas,
      participacion: { cantidad: participacionTotal, meta: metaTotal },
    };
    const examen = calcularExamen((datos.examenes || {}).final, tope.examen);
    const asistencia = calcularAsistencia(asistenciaDelParcial, tope.asistencia);
    const proyecto = calcularProyecto(datos.proyecto);
    const total = tareasParticipacion.pts + examen.pts + asistencia.pts + proyecto.pts;
    return { parcial, total, examen, tareasParticipacion, asistencia, proyecto };
  }

  const tope = TOPES[parcial];
  const tareas = calcularTareasSobreCatalogo(tareasDelParcial, catalogoDelParcial, tope.tareas);
  const participacion = calcularParticipacionConteo(participacionDelParcial, META_PARTICIPACION[parcial], tope.participacion);
  const asistencia = calcularAsistencia(asistenciaDelParcial, tope.asistencia);
  const uniformes = calcularUniformes((datos.uniformes || {})[parcial], tope.uniformes);

  if (parcial === 'p2') {
    const examenEscrito = calcularExamen((datos.examenes || {}).p2, tope.examenEscrito);
    const practico = calcularExamen((datos.practico || {}).p2, tope.practico);
    const total = tareas.pts + participacion.pts + asistencia.pts + uniformes.pts + examenEscrito.pts + practico.pts;
    return { parcial, total, examenEscrito, practico, tareas, participacion, asistencia, uniformes };
  }

  // p1
  const examen = calcularExamen((datos.examenes || {}).p1, tope.examen);
  const total = tareas.pts + participacion.pts + asistencia.pts + uniformes.pts + examen.pts;
  return { parcial, total, examen, tareas, participacion, asistencia, uniformes };
}

export function calcularCuatrimestre(resultadosPorParcial) {
  return ['p1', 'p2', 'final'].reduce(
    (s, p) => s + (resultadosPorParcial[p]?.total || 0) * PESO_CUATRIMESTRE[p],
    0
  );
}
