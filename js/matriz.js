// matriz.js — "Vista rápida" del panel docente de Origen de las Cocinas.
//
// Dibuja, arriba de cada pestaña, una tabla de ALUMNOS (filas) contra
// ACTIVIDADES (columnas): tareas, participación, asistencia, proyecto y
// exámenes. Sirve para ver de un vistazo quién entregó y quién no, y para
// corregir una celda suelta sin tener que abrir actividad por actividad.
//
// No sustituye a la captura de siempre, que sigue abajo en cada pestaña:
// la tabla es para revisar y corregir; la captura de abajo, para calificar
// una actividad completa de corrido.
//
// Las columnas de asistencia son las fechas realmente registradas en el
// parcial elegido (11 clases en el Parcial 1, 13 en el Parcial 2, 5 en el
// Final), así que caben sin necesidad de recortar la lista.

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ESTADOS = ['presente', 'retardo', 'justificado', 'falta'];
const ETIQUETA_ESTADO = { presente: 'Presente', retardo: 'Retardo', justificado: 'Justificado', falta: 'Falta' };
const LETRA_ESTADO = { presente: 'P', retardo: 'R', justificado: 'J', falta: 'F' };
const SIGUIENTE_ESTADO = { presente: 'retardo', retardo: 'justificado', justificado: 'falta', falta: 'presente' };

function esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }

// "2026-10-22" -> "22 oct"
function fechaCorta(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).split('-');
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mes = MES[Number(m) - 1] || '';
  return `${Number(d)} ${mes}`;
}

// Contenedor de la vista rápida, creado una sola vez por pestaña y colocado
// justo después del elemento indicado (así no hay que tocar el HTML).
function contenedor(idPanel, idDespuesDe) {
  const panel = document.getElementById(idPanel);
  if (!panel) return null;
  let cont = document.getElementById(`matriz-${idPanel}`);
  if (!cont) {
    cont = document.createElement('div');
    cont.id = `matriz-${idPanel}`;
    cont.className = 'matriz-wrap';
    const ancla = idDespuesDe ? document.getElementById(idDespuesDe) : null;
    if (ancla && ancla.parentNode) ancla.parentNode.insertBefore(cont, ancla.nextSibling);
    else panel.insertBefore(cont, panel.firstChild);
  }
  return cont;
}

function cargando(cont, titulo) {
  cont.innerHTML = `<h3 class="section-title">${esc(titulo)}</h3><p class="empty-inline">Cargando…</p>`;
}

// ---------------------------------------------------------------------------
// Dibujo genérico de la tabla.
//   columnas: [{ id, titulo, sub }]
//   valores:  { [alumnoId]: { [colId]: valor } }
//   tipo:     'num' | 'check' | 'estado'
//   resumen:  (valoresDelAlumno) => texto de la última columna
// ---------------------------------------------------------------------------
function dibujar(cont, { titulo, ayuda, alumnos, columnas, valores, tipo, resumen, onGuardar, textoBoton }) {
  if (!alumnos.length) {
    cont.innerHTML = `<h3 class="section-title">${esc(titulo)}</h3><p class="empty-inline">Este grupo aún no tiene alumnos.</p>`;
    return;
  }
  if (!columnas.length) {
    cont.innerHTML = `<h3 class="section-title">${esc(titulo)}</h3><p class="empty-inline">Todavía no hay nada registrado en este parcial.</p>`;
    return;
  }

  const celda = (a, c) => {
    const v = (valores[a.id] || {})[c.id];
    if (tipo === 'check') {
      const puesto = v !== undefined && v !== null && v !== '';
      return `<td class="mz-celda"><button type="button" class="mz-check ${puesto ? 'mz-si' : 'mz-no'}" data-alumno="${esc(a.id)}" data-col="${esc(c.id)}" aria-label="${puesto ? 'Participó' : 'No participó'}">${puesto ? '✓' : '·'}</button></td>`;
    }
    if (tipo === 'estado') {
      const est = v || 'presente';
      return `<td class="mz-celda"><button type="button" class="mz-estado mz-${est}" data-alumno="${esc(a.id)}" data-col="${esc(c.id)}" title="${ETIQUETA_ESTADO[est]}">${LETRA_ESTADO[est]}</button></td>`;
    }
    const txt = (v === undefined || v === null || v === '') ? '' : v;
    const falta = txt === '';
    return `<td class="mz-celda"><input type="number" min="0" max="10" step="0.1" class="mz-num ${falta ? 'mz-falta' : ''}" value="${esc(txt)}" data-alumno="${esc(a.id)}" data-col="${esc(c.id)}" placeholder="—"></td>`;
  };

  cont.innerHTML = `
    <h3 class="section-title">${esc(titulo)}</h3>
    ${ayuda ? `<p class="field-hint">${ayuda}</p>` : ''}
    <div class="mz-scroll">
      <table class="mz-tabla">
        <thead>
          <tr>
            <th class="mz-col-nombre">Alumno</th>
            ${columnas.map(c => `<th class="mz-col-act"><span class="mz-col-tit">${esc(c.titulo)}</span>${c.sub ? `<span class="mz-col-sub">${esc(c.sub)}</span>` : ''}</th>`).join('')}
            <th class="mz-col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${alumnos.map(a => `
            <tr data-fila="${esc(a.id)}">
              <th class="mz-col-nombre" scope="row">${esc(a.nombre)}</th>
              ${columnas.map(c => celda(a, c)).join('')}
              <td class="mz-col-total" data-total="${esc(a.id)}">${esc(resumen(valores[a.id] || {}))}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <button type="button" class="btn btn-primary btn-block mz-guardar">${esc(textoBoton || 'Guardar cambios')}</button>
    <p class="save-msg mz-msg" hidden></p>`;

  const refrescarTotal = (alumnoId) => {
    const td = cont.querySelector(`[data-total="${CSS.escape(alumnoId)}"]`);
    if (td) td.textContent = resumen(valores[alumnoId] || {});
  };

  // Palomita: alterna sí/no.
  cont.querySelectorAll('.mz-check').forEach(b => b.addEventListener('click', () => {
    const { alumno, col } = b.dataset;
    valores[alumno] = valores[alumno] || {};
    const puesto = valores[alumno][col] !== undefined && valores[alumno][col] !== null && valores[alumno][col] !== '';
    if (puesto) { delete valores[alumno][col]; b.className = 'mz-check mz-no'; b.textContent = '·'; }
    else { valores[alumno][col] = 10; b.className = 'mz-check mz-si'; b.textContent = '✓'; }
    refrescarTotal(alumno);
  }));

  // Asistencia: cicla Presente → Retardo → Justificado → Falta.
  cont.querySelectorAll('.mz-estado').forEach(b => b.addEventListener('click', () => {
    const { alumno, col } = b.dataset;
    valores[alumno] = valores[alumno] || {};
    const actual = valores[alumno][col] || 'presente';
    const nuevo = SIGUIENTE_ESTADO[actual];
    valores[alumno][col] = nuevo;
    b.className = `mz-estado mz-${nuevo}`;
    b.textContent = LETRA_ESTADO[nuevo];
    b.title = ETIQUETA_ESTADO[nuevo];
    refrescarTotal(alumno);
  }));

  // Calificación: 0 a 10, vacío = no entregado.
  cont.querySelectorAll('.mz-num').forEach(inp => inp.addEventListener('input', () => {
    const { alumno, col } = inp.dataset;
    valores[alumno] = valores[alumno] || {};
    if (inp.value === '') { delete valores[alumno][col]; inp.classList.add('mz-falta'); }
    else { valores[alumno][col] = inp.value; inp.classList.remove('mz-falta'); }
    refrescarTotal(alumno);
  }));

  const btn = cont.querySelector('.mz-guardar');
  const msg = cont.querySelector('.mz-msg');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const textoPrevio = btn.textContent;
    btn.textContent = 'Guardando…';
    try {
      await onGuardar(valores);
      msg.textContent = '✓ Guardado.'; msg.hidden = false;
      setTimeout(() => { msg.hidden = true; }, 3000);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.hidden = false;
    }
    btn.disabled = false; btn.textContent = textoPrevio;
  });
}

// ---------------------------------------------------------------------------
// TAREAS y PARTICIPACIÓN
// ---------------------------------------------------------------------------
async function vistaCatalogo(ctx, tipo) {
  const esTarea = tipo === 'tareas';
  const idPanel = esTarea ? 'tab-tareas' : 'tab-participacion';
  const idSelect = esTarea ? 'tareas-parcial' : 'part-parcial';
  const sub = esTarea ? 'tareas' : 'participaciones';
  const catalogo = esTarea ? 'tareas_catalogo' : 'participaciones_catalogo';

  const cont = contenedor(idPanel, idSelect);
  if (!cont) return;
  const titulo = esTarea ? 'Vista rápida — quién entregó' : 'Vista rápida — quién participó';
  cargando(cont, titulo);

  const { db, grupoActivo, alumnos } = ctx;
  if (!grupoActivo) { cont.innerHTML = `<h3 class="section-title">${titulo}</h3><p class="empty-inline">Elige un grupo primero.</p>`; return; }
  const parcial = document.getElementById(idSelect).value;

  let columnas = [];
  try {
    const snap = await getDocs(collection(db, 'grupos', grupoActivo, catalogo));
    columnas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(x => x.parcial === parcial)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .map(x => ({ id: x.id, titulo: x.nombre || 'Sin nombre', sub: fechaCorta(x.fecha), parcial: x.parcial, nombre: x.nombre, fecha: x.fecha }));
  } catch { columnas = []; }

  const valores = {};
  await Promise.all(alumnos.map(async a => {
    valores[a.id] = {};
    try {
      const snap = await getDocs(collection(db, 'grupos', grupoActivo, 'alumnos', a.id, sub));
      snap.docs.forEach(d => { const v = d.data().calificacion; if (v !== undefined && v !== null) valores[a.id][d.id] = v; });
    } catch { /* sin datos */ }
  }));

  dibujar(cont, {
    titulo,
    ayuda: esTarea
      ? 'Un casillero vacío significa <strong>no entregada</strong>, y cuenta como cero. Si recibes una tarea atrasada, escribe aquí su calificación y guarda.'
      : 'Toca para poner o quitar la palomita. Cuenta cuántas veces participó cada alumno, no con qué calificación.',
    alumnos,
    columnas,
    valores,
    tipo: esTarea ? 'num' : 'check',
    resumen: (v) => {
      const hechas = columnas.filter(c => v[c.id] !== undefined && v[c.id] !== null && v[c.id] !== '').length;
      return `${hechas} de ${columnas.length}`;
    },
    textoBoton: esTarea ? 'Guardar calificaciones' : 'Guardar participación',
    onGuardar: async (vals) => {
      const escrituras = [];
      alumnos.forEach(a => {
        columnas.forEach(c => {
          const ref = doc(db, 'grupos', grupoActivo, 'alumnos', a.id, sub, c.id);
          const v = (vals[a.id] || {})[c.id];
          if (v === undefined || v === null || v === '') { escrituras.push(deleteDoc(ref).catch(() => {})); }
          else {
            escrituras.push(setDoc(ref, {
              parcial: c.parcial, nombre: c.nombre, fecha: c.fecha,
              calificacion: Number(v), actualizado: serverTimestamp(),
            }));
          }
        });
      });
      await Promise.all(escrituras);
    },
  });
}

// ---------------------------------------------------------------------------
// ASISTENCIA — columnas = fechas registradas en el parcial elegido
// ---------------------------------------------------------------------------
async function vistaAsistencia(ctx) {
  const cont = contenedor('tab-asistencia', 'asis-fecha');
  if (!cont) return;
  const titulo = 'Vista rápida — asistencia del parcial';
  cargando(cont, titulo);

  const { db, grupoActivo, alumnos } = ctx;
  if (!grupoActivo) { cont.innerHTML = `<h3 class="section-title">${titulo}</h3><p class="empty-inline">Elige un grupo primero.</p>`; return; }
  const parcial = document.getElementById('asis-parcial').value;

  const valores = {};
  const fechas = new Set();
  await Promise.all(alumnos.map(async a => {
    valores[a.id] = {};
    try {
      const snap = await getDocs(collection(db, 'grupos', grupoActivo, 'alumnos', a.id, 'asistencias'));
      snap.docs.forEach(d => {
        const r = d.data();
        if (r.parcial !== parcial) return;
        fechas.add(d.id);
        valores[a.id][d.id] = r.estado || 'presente';
      });
    } catch { /* sin datos */ }
  }));

  const columnas = [...fechas].sort().map(f => ({ id: f, titulo: fechaCorta(f), sub: '' }));

  dibujar(cont, {
    titulo,
    ayuda: 'Toca una casilla para cambiarla: <strong>P</strong> presente, <strong>R</strong> retardo, <strong>J</strong> justificado, <strong>F</strong> falta. Tres retardos equivalen a una falta.',
    alumnos,
    columnas,
    valores,
    tipo: 'estado',
    resumen: (v) => {
      const total = columnas.length;
      const faltas = columnas.filter(c => (v[c.id] || 'presente') === 'falta').length;
      const ret = columnas.filter(c => (v[c.id] || 'presente') === 'retardo').length;
      return `${total - faltas} de ${total}${ret ? ` · ${ret}R` : ''}`;
    },
    textoBoton: 'Guardar asistencia',
    onGuardar: async (vals) => {
      const escrituras = [];
      alumnos.forEach(a => {
        columnas.forEach(c => {
          const estado = (vals[a.id] || {})[c.id] || 'presente';
          escrituras.push(setDoc(
            doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'asistencias', c.id),
            { estado, fecha: c.id, parcial, actualizado: serverTimestamp() }
          ));
        });
      });
      await Promise.all(escrituras);
    },
  });
}

// ---------------------------------------------------------------------------
// PROYECTO — columnas = las tres entregas
// ---------------------------------------------------------------------------
const ENTREGAS = [
  { id: 'entrega1', titulo: 'Entrega 1', sub: '15 pts' },
  { id: 'entrega2', titulo: 'Entrega 2', sub: '15 pts' },
  { id: 'entregaFinal', titulo: 'Exposición', sub: '10 pts' },
];

async function vistaProyecto(ctx) {
  const cont = contenedor('tab-proyecto', null);
  if (!cont) return;
  const titulo = 'Vista rápida — las tres entregas';
  cargando(cont, titulo);

  const { db, grupoActivo, alumnos } = ctx;
  if (!grupoActivo) { cont.innerHTML = `<h3 class="section-title">${titulo}</h3><p class="empty-inline">Elige un grupo primero.</p>`; return; }

  const valores = {};
  await Promise.all(alumnos.map(async a => {
    valores[a.id] = {};
    await Promise.all(ENTREGAS.map(async e => {
      try {
        const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'proyecto', e.id));
        if (snap.exists() && snap.data().calificacion !== undefined && snap.data().calificacion !== null) {
          valores[a.id][e.id] = snap.data().calificacion;
        }
      } catch { /* sin datos */ }
    }));
  }));

  dibujar(cont, {
    titulo,
    ayuda: 'Calificación de 0 a 10 de cada entrega de <em>Mi Plato, Mi Historia</em>. Un casillero vacío significa que todavía no entrega.',
    alumnos,
    columnas: ENTREGAS,
    valores,
    tipo: 'num',
    resumen: (v) => `${ENTREGAS.filter(e => v[e.id] !== undefined && v[e.id] !== '').length} de 3`,
    textoBoton: 'Guardar proyecto',
    onGuardar: async (vals) => {
      const escrituras = [];
      alumnos.forEach(a => {
        ENTREGAS.forEach(e => {
          const v = (vals[a.id] || {})[e.id];
          escrituras.push(setDoc(
            doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'proyecto', e.id),
            { calificacion: (v === undefined || v === '') ? null : Number(v), actualizado: serverTimestamp() }
          ));
        });
      });
      await Promise.all(escrituras);
    },
  });
}

// ---------------------------------------------------------------------------
// EXÁMENES — columnas = P1, P2 escrito, P2 práctico, Final
// ---------------------------------------------------------------------------
const COLS_EXAMEN = [
  { id: 'p1', titulo: 'Parcial 1', sub: '40 pts', coleccion: 'examenes', docId: 'p1' },
  { id: 'p2', titulo: 'P2 escrito', sub: '20 pts', coleccion: 'examenes', docId: 'p2' },
  { id: 'practico', titulo: 'P2 práctico', sub: '20 pts', coleccion: 'practico', docId: 'p2' },
  { id: 'final', titulo: 'Final', sub: '40 pts', coleccion: 'examenes', docId: 'final' },
];

async function vistaExamenes(ctx) {
  const cont = contenedor('tab-practico', null);
  if (!cont) return;
  const titulo = 'Vista rápida — todos los exámenes';
  cargando(cont, titulo);

  const { db, grupoActivo, alumnos } = ctx;
  if (!grupoActivo) { cont.innerHTML = `<h3 class="section-title">${titulo}</h3><p class="empty-inline">Elige un grupo primero.</p>`; return; }

  const valores = {};
  await Promise.all(alumnos.map(async a => {
    valores[a.id] = {};
    await Promise.all(COLS_EXAMEN.map(async c => {
      try {
        const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, c.coleccion, c.docId));
        if (snap.exists() && snap.data().calificacion !== undefined && snap.data().calificacion !== null) {
          valores[a.id][c.id] = snap.data().calificacion;
        }
      } catch { /* sin datos */ }
    }));
  }));

  dibujar(cont, {
    titulo,
    ayuda: 'Calificación de 0 a 10. <strong>Ojo:</strong> lo que escribas aquí reemplaza lo que haya guardado el examen en línea; úsalo solo para corregir o para capturar el examen práctico.',
    alumnos,
    columnas: COLS_EXAMEN,
    valores,
    tipo: 'num',
    resumen: (v) => `${COLS_EXAMEN.filter(c => v[c.id] !== undefined && v[c.id] !== '').length} de 4`,
    textoBoton: 'Guardar exámenes',
    onGuardar: async (vals) => {
      const escrituras = [];
      alumnos.forEach(a => {
        COLS_EXAMEN.forEach(c => {
          const ref = doc(db, 'grupos', grupoActivo, 'alumnos', a.id, c.coleccion, c.docId);
          const v = (vals[a.id] || {})[c.id];
          if (v === undefined || v === '') {
            escrituras.push(setDoc(ref, { calificacion: null, actualizado: serverTimestamp() }));
          } else {
            escrituras.push(setDoc(ref, {
              calificacion: Number(v),
              origen: 'ajuste manual del docente',
              actualizado: serverTimestamp(),
            }));
          }
        });
      });
      await Promise.all(escrituras);
    },
  });
}

// ---------------------------------------------------------------------------
// Punto de entrada: admin.js llama a esto al abrir cada pestaña.
// ---------------------------------------------------------------------------
export async function vistaRapida(tab, ctx) {
  try {
    if (tab === 'tareas') return await vistaCatalogo(ctx, 'tareas');
    if (tab === 'participacion') return await vistaCatalogo(ctx, 'participaciones');
    if (tab === 'asistencia') return await vistaAsistencia(ctx);
    if (tab === 'proyecto') return await vistaProyecto(ctx);
    if (tab === 'practico') return await vistaExamenes(ctx);
  } catch (err) {
    console.warn('[vista rápida]', err);
  }
}
