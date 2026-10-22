// admin.js — Panel docente de Origen de las Cocinas.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, addDoc, getDoc, getDocs,
  query, orderBy, serverTimestamp, onSnapshot, updateDoc, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";
import { calcularParcial, calcularCuatrimestre, calcularCuatrimestreRedondeado, zonaDeDecision, textoCalificacion, NOMBRES_PARCIAL, NOMBRES_REDONDEO, TOPES } from "./calculo.js";
import { reporteGrupo, reporteAlumno, reporteExamenAlumno, reporteExamenGrupo } from "./reporte.js";
import { vistaRapida } from "./matriz.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// PARCIALES: usado únicamente para todo lo que depende de calculo.js
// (Historial, exportar CSV, resumen del alumno) — el Diagnóstico NO
// participa en ningún cálculo de calificación, así que NO va aquí.
const PARCIALES = ['p1', 'p2', 'final'];

// PARCIALES_EXAMEN: usado solo en la sección "Examen en línea" del panel,
// donde SÍ debe aparecer el Diagnóstico como una opción más para
// abrir/cerrar y revisar intentos — pero sin calificación oficial.
const PARCIALES_EXAMEN = ['diag', 'p1', 'p2', 'final'];
const ETIQUETAS_EXAMEN = { diag: 'Examen Diagnóstico', ...NOMBRES_PARCIAL };

const ETIQUETA_ESTADO = { presente: 'Presente', retardo: 'Retardo', justificado: 'Justificado', falta: 'Falta' };
const CICLO_ESTADO = { presente: 'retardo', retardo: 'justificado', justificado: 'falta', falta: 'presente' };

let grupoActivo = null;
let alumnosCache = [];

function on(id, evento, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, fn);
  else console.warn(`[admin] No existe #${id} en este HTML.`);
  return el;
}
function escaparHTML(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function marcarResultado(botonId, msgId, exito, textoExito, textoError) {
  const boton = document.getElementById(botonId);
  if (boton) {
    boton.style.transition = 'background-color .15s ease, color .15s ease';
    boton.style.backgroundColor = exito ? '#4A5D3C' : '#A63D2F';
    boton.style.color = '#fff';
    setTimeout(() => { boton.style.backgroundColor = ''; boton.style.color = ''; }, 1100);
  }
  const msg = document.getElementById(msgId);
  if (msg) { msg.textContent = exito ? textoExito : textoError; msg.hidden = false; setTimeout(() => { msg.hidden = true; }, exito ? 3000 : 6000); }
}

// ---------- LOGIN ----------
onAuthStateChanged(auth, async user => {
  if (user) {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('app-screen').hidden = false;
    await cargarGrupos();
    const select = document.getElementById('grupo-select');
    const guardado = localStorage.getItem('oc_grupo_activo');
    if (guardado && [...select.options].some(o => o.value === guardado)) select.value = guardado;
    if (select.value) {
      grupoActivo = select.value;
      localStorage.setItem('oc_grupo_activo', grupoActivo);
      await cargarAlumnos();
      cargarTabActiva();
    }
  } else {
    document.getElementById('login-screen').hidden = false;
    document.getElementById('app-screen').hidden = true;
  }
});

on('login-form', 'submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    const MENSAJES = {
      'auth/user-not-found': 'Ese correo no está dado de alta en Firebase Authentication.',
      'auth/wrong-password': 'La contraseña no coincide con la de ese usuario.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos, o el usuario no existe.',
      'auth/invalid-email': 'Ese correo no tiene un formato válido.',
      'auth/too-many-requests': 'Demasiados intentos fallidos — espera unos minutos.',
      'auth/network-request-failed': 'Falla de conexión a internet.',
    };
    errorEl.textContent = MENSAJES[err.code] || `No se pudo entrar (${err.code || err.message}).`;
    errorEl.hidden = false;
  }
});

on('btn-logout', 'click', () => signOut(auth));

document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  cargarTabActiva();
}

function cargarTabActiva() {
  const btnActivo = document.querySelector('.tab-btn.active');
  if (!btnActivo) return;
  const tab = btnActivo.dataset.tab;
  // La tabla en vivo del examen solo escucha mientras esa pestaña está abierta.
  if (tab !== 'enlinea') detenerIntentosEnVivo();
  // Tabla de alumnos contra actividades, arriba de la captura de siempre.
  vistaRapida(tab, { db, grupoActivo, alumnos: alumnosCache, datosDeAlumno });
  if (tab === 'tareas') cargarCatalogo('tareas');
  if (tab === 'participacion') cargarCatalogo('participaciones');
  if (tab === 'proyecto') cargarProyecto();
  if (tab === 'miatlas') cargarMiAtlas();
  if (tab === 'asistencia') cargarAsistencia();
  if (tab === 'uniformes') cargarUniformes();
  if (tab === 'enlinea') { cargarExamenesAbiertos(); cargarIntentos(); }
  if (tab === 'historial') cargarHistorial();
  if (tab === 'avisos') cargarAvisos();
}

// ---------- GRUPOS ----------
async function cargarGrupos() {
  const select = document.getElementById('grupo-select');
  const snap = await getDocs(query(collection(db, 'grupos'), orderBy('nombre')));
  select.innerHTML = '<option value="">— Elige un grupo —</option>';
  snap.forEach(d => { const opt = document.createElement('option'); opt.value = d.id; opt.textContent = d.data().nombre; select.appendChild(opt); });
}

on('btn-nuevo-grupo', 'click', crearGrupo);
on('grupo-select', 'change', async (e) => {
  grupoActivo = e.target.value || null;
  detenerIntentosEnVivo();
  if (grupoActivo) {
    localStorage.setItem('oc_grupo_activo', grupoActivo);
    await cargarAlumnos();
    cargarTabActiva();
  } else {
    localStorage.removeItem('oc_grupo_activo');
    renderAlumnos([]);
  }
});

async function crearGrupo() {
  const nombre = prompt('Nombre del nuevo grupo (ej. "Origen de las Cocinas — Vespertino A"):');
  if (!nombre || !nombre.trim()) return;
  const ref = await addDoc(collection(db, 'grupos'), { nombre: nombre.trim(), creado: serverTimestamp() });
  await cargarGrupos();
  document.getElementById('grupo-select').value = ref.id;
  grupoActivo = ref.id;
  localStorage.setItem('oc_grupo_activo', grupoActivo);
  cargarAlumnos();
}

on('btn-eliminar-grupo', 'click', eliminarGrupo);

async function eliminarGrupo() {
  if (!grupoActivo) { alert('Elige el grupo que quieres eliminar.'); return; }
  const select = document.getElementById('grupo-select');
  const nombreGrupo = select.options[select.selectedIndex].textContent;
  const ok = confirm(`¿ELIMINAR el grupo "${nombreGrupo}"?\n\nSe borrarán TODOS sus alumnos y calificaciones. Esto NO se puede deshacer.`);
  if (!ok) return;
  const pass = prompt('Para confirmar, escribe tu contraseña del panel docente:');
  if (!pass) return;
  try {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, pass);
    await reauthenticateWithCredential(auth.currentUser, cred);
  } catch { alert('Contraseña incorrecta. No se eliminó nada.'); return; }

  const alumnosSnap = await getDocs(collection(db, 'grupos', grupoActivo, 'alumnos'));
  for (const alumnoDoc of alumnosSnap.docs) {
    const base = ['grupos', grupoActivo, 'alumnos', alumnoDoc.id];
    for (const sub of ['tareas', 'participaciones', 'asistencias', 'uniformes', 'examenes', 'practico', 'proyecto', 'intentos', 'actividades']) {
      const subSnap = await getDocs(collection(db, ...base, sub)).catch(() => null);
      if (subSnap) await Promise.all(subSnap.docs.map(d => deleteDoc(doc(db, ...base, sub, d.id))));
    }
    await deleteDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumnoDoc.id));
  }
  for (const sub of ['avisos', 'config', 'tareas_catalogo', 'participaciones_catalogo']) {
    const subSnap = await getDocs(collection(db, 'grupos', grupoActivo, sub)).catch(() => null);
    if (subSnap) await Promise.all(subSnap.docs.map(d => deleteDoc(doc(db, 'grupos', grupoActivo, sub, d.id))));
  }
  await deleteDoc(doc(db, 'grupos', grupoActivo));
  alert(`Grupo "${nombreGrupo}" eliminado.`);
  grupoActivo = null; alumnosCache = [];
  localStorage.removeItem('oc_grupo_activo');
  await cargarGrupos();
  renderAlumnos([]);
}

function nombreDelGrupo() {
  const select = document.getElementById('grupo-select');
  return select.options[select.selectedIndex]?.textContent || 'Sin grupo';
}

// ---------- ALUMNOS ----------
function slugNombre(nombre) {
  return nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}
function generarPIN() { return String(Math.floor(1000 + Math.random() * 9000)); }

on('form-alumno', 'submit', agregarAlumno);

async function cargarAlumnos() {
  if (!grupoActivo) return;
  const snap = await getDocs(query(collection(db, 'grupos', grupoActivo, 'alumnos'), orderBy('nombre')));
  // OJO: el id del documento va AL FINAL para que siempre gane. Antes iba
  // primero y, si el documento traía guardado un campo "id" (lo dejaba la
  // corrección de nombre), ese id VIEJO lo pisaba: el panel leía el
  // expediente del nombre anterior, ya vacío, y el alumno salía en ceros.
  alumnosCache = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  renderAlumnos(alumnosCache);
  // Limpieza: se borra ese campo "id" sobrante de los alumnos que lo traigan.
  snap.docs.filter(d => 'id' in d.data()).forEach(d => {
    updateDoc(d.ref, { id: deleteField() }).catch(err => console.warn('No se pudo limpiar el campo id de', d.id, err));
  });
}

function renderAlumnos(lista) {
  const ul = document.getElementById('lista-alumnos');
  const empty = document.getElementById('alumnos-empty');
  ul.innerHTML = '';
  empty.hidden = lista.length > 0;
  lista.forEach(a => {
    const li = document.createElement('li');
    li.className = 'student-row';
    li.innerHTML = `<span class="student-name">${escaparHTML(a.nombre)}</span><span class="student-pin" title="PIN de acceso del alumno">PIN: ${escaparHTML(a.pin || '—')}</span><button type="button" class="btn-editar-student" data-id="${a.id}" title="Corregir el nombre">Editar</button><button type="button" class="btn-delete-student" data-id="${a.id}" title="Eliminar alumno">Eliminar</button>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('.btn-editar-student').forEach(btn => btn.addEventListener('click', () => editarNombreAlumno(btn.dataset.id)));
  ul.querySelectorAll('.btn-delete-student').forEach(btn => btn.addEventListener('click', () => eliminarAlumno(btn.dataset.id)));
}

async function agregarAlumno(e) {
  e.preventDefault();
  if (!grupoActivo) { alert('Primero elige o crea un grupo.'); return; }
  const input = document.getElementById('input-alumno-nombre');
  const nombre = input.value.trim();
  if (!nombre) return;
  let id = slugNombre(nombre);
  if (!id) { alert('Ese nombre no es válido.'); return; }
  let idFinal = id, sufijo = 2;
  while ((await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', idFinal))).exists()) { idFinal = `${id}-${sufijo}`; sufijo++; }
  const pin = generarPIN();
  await setDoc(doc(db, 'grupos', grupoActivo, 'alumnos', idFinal), { nombre, pin, creado: serverTimestamp() });
  input.value = '';
  await cargarAlumnos();
  alert(`Alumno agregado.\n\nDale este PIN de acceso:\n\n${nombre} → PIN ${pin}`);
}

// Subcolecciones y documentos que forman el expediente de un alumno. Si al
// corregir el nombre cambia su identificador, todo esto se muda al nuevo.
const SUBCOLECCIONES_ALUMNO = ['tareas', 'participaciones', 'asistencias', 'uniformes', 'examenes', 'practico', 'proyecto', 'intentos', 'actividades'];

// Datos del alumno para guardar, sin el campo "id" (ese es el nombre del
// documento, no un dato; si se guarda, se queda con el valor viejo).
function sinId(alumno) { const { id, ...resto } = alumno; return resto; }

async function editarNombreAlumno(alumnoId) {
  const alumno = alumnosCache.find(a => a.id === alumnoId);
  if (!alumno) return;
  const nuevo = prompt('Corrige el nombre completo del alumno:', alumno.nombre);
  if (nuevo === null) return;
  const nombre = nuevo.trim();
  if (!nombre) { alert('El nombre no puede quedar vacío.'); return; }
  if (nombre === alumno.nombre) return;

  const idNuevo = slugNombre(nombre);
  if (!idNuevo) { alert('Ese nombre no es válido.'); return; }

  // Caso sencillo: cambian acentos o mayúsculas, pero el identificador es el
  // mismo. Se corrige el texto y ya; no hay nada que mudar.
  if (idNuevo === alumnoId) {
    try { await setDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId), { ...sinId(alumno), nombre, actualizado: serverTimestamp() }); }
    catch (err) { alert('No se pudo guardar: ' + (err.message || err)); return; }
    await cargarAlumnos();
    alert(`Nombre corregido a "${nombre}".`);
    return;
  }

  if ((await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', idNuevo))).exists()) {
    alert('Ya hay otro alumno con ese nombre en este grupo. Usa un nombre distinto.');
    return;
  }

  // Si el alumno está contestando un examen en este momento, su celular
  // seguiría guardando en el registro viejo y esas respuestas se perderían.
  // Se pide esperar a que entregue.
  try {
    const intentosSnap = await getDocs(collection(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'intentos'));
    const enCurso = intentosSnap.docs.filter(d => d.data().estado === 'en_curso');
    if (enCurso.length > 0) {
      alert(`${alumno.nombre} tiene un examen EN CURSO (${enCurso.map(d => ETIQUETAS_EXAMEN[d.id] || d.id).join(', ')}).\n\nEspera a que lo entregue y luego corrige el nombre. Si lo cambias ahora, sus respuestas se guardarían en el registro viejo.`);
      return;
    }
  } catch { /* si no se pudo revisar, se sigue con el aviso normal */ }

  const ok = confirm(`¿Cambiar "${alumno.nombre}" por "${nombre}"?\n\nSe moverá todo su expediente: tareas, participaciones, asistencias, exámenes, proyecto e intentos. No se pierde nada.\n\nIMPORTANTE: a partir de ahora el alumno entrará con su nombre corregido. Su PIN sigue siendo el mismo (${alumno.pin || '—'}). Avísale.`);
  if (!ok) return;

  const li = document.querySelector(`.btn-editar-student[data-id="${CSS.escape(alumnoId)}"]`)?.closest('li');
  let barra = null;
  if (li) {
    barra = document.createElement('div');
    barra.className = 'mudanza-barra';
    barra.innerHTML = '<div class="mudanza-track"><div class="mudanza-fill" style="width:0%"></div></div><span class="mudanza-texto">Preparando…</span>';
    li.appendChild(barra);
  }
  const avanzar = (pct, texto) => {
    if (!barra) return;
    barra.querySelector('.mudanza-fill').style.width = `${pct}%`;
    barra.querySelector('.mudanza-texto').textContent = texto;
  };

  const viejo = ['grupos', grupoActivo, 'alumnos', alumnoId];
  const nuevoBase = ['grupos', grupoActivo, 'alumnos', idNuevo];

  try {
    // 1) Se crea primero el alumno nuevo, conservando su PIN.
    avanzar(5, 'Creando el registro nuevo…');
    await setDoc(doc(db, ...nuevoBase), { ...sinId(alumno), nombre, creado: alumno.creado || serverTimestamp(), actualizado: serverTimestamp() });

    // 2) Se copia el expediente completo.
    const copiados = [];
    for (let i = 0; i < SUBCOLECCIONES_ALUMNO.length; i++) {
      const sub = SUBCOLECCIONES_ALUMNO[i];
      avanzar(10 + Math.round(i / SUBCOLECCIONES_ALUMNO.length * 70), `Copiando ${sub}…`);
      const snap = await getDocs(collection(db, ...viejo, sub)).catch(() => null);
      if (!snap) continue;
      for (const d of snap.docs) {
        await setDoc(doc(db, ...nuevoBase, sub, d.id), d.data());
        copiados.push([sub, d.id]);
      }
    }

    // 3) Se verifica que todo haya llegado ANTES de borrar nada.
    avanzar(85, 'Verificando…');
    for (const [sub, id] of copiados) {
      const chk = await getDoc(doc(db, ...nuevoBase, sub, id));
      if (!chk.exists()) throw new Error(`No se copió ${sub}/${id}. No se borró nada: el alumno original sigue completo.`);
    }

    // 4) Hasta aquí, el registro viejo se borra.
    avanzar(92, 'Quitando el registro anterior…');
    for (const sub of SUBCOLECCIONES_ALUMNO) {
      const snap = await getDocs(collection(db, ...viejo, sub)).catch(() => null);
      if (snap) await Promise.all(snap.docs.map(d => deleteDoc(doc(db, ...viejo, sub, d.id))));
    }
    await deleteDoc(doc(db, ...viejo));

    avanzar(100, 'Listo');
    await cargarAlumnos();
    alert(`Nombre corregido a "${nombre}".\n\nSe movieron ${copiados.length} registro(s) de su expediente. Recuérdale que ahora entra con su nombre corregido y el mismo PIN.`);
  } catch (err) {
    if (barra) barra.querySelector('.mudanza-texto').textContent = 'Error';
    alert('No se completó el cambio de nombre: ' + (err.message || err) + '\n\nEl alumno original NO se borró. Vuelve a intentarlo.');
    await cargarAlumnos();
  }
}

async function eliminarAlumno(alumnoId) {
  const alumno = alumnosCache.find(a => a.id === alumnoId);
  if (!alumno) return;
  if (!confirm(`¿Eliminar a "${alumno.nombre}"? No se puede deshacer.`)) return;
  await deleteDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId));
  await cargarAlumnos();
}

// ---------- TAREAS Y PARTICIPACIÓN ----------
const CONFIG_TIPO = {
  tareas: { catalogo: 'tareas_catalogo', sub: 'tareas', parcialSelect: 'tareas-parcial', nombreInput: 'tarea-nombre', fechaInput: 'tarea-fecha', btnAgregar: 'btn-agregar-tarea', msgNueva: 'tarea-nueva-msg', listaCatalogo: 'tareas-catalogo-lista', emptyCatalogo: 'tareas-catalogo-empty', calificarWrap: 'tarea-calificar', calificarTitulo: 'tarea-calificar-titulo', calificarLista: 'tarea-calificar-lista', btnGuardarCalif: 'btn-guardar-tarea-calif', msgCalif: 'tarea-calif-msg' },
  participaciones: { catalogo: 'participaciones_catalogo', sub: 'participaciones', parcialSelect: 'part-parcial', nombreInput: 'part-nombre', fechaInput: 'part-fecha', btnAgregar: 'btn-agregar-part', msgNueva: 'part-nueva-msg', listaCatalogo: 'part-catalogo-lista', emptyCatalogo: 'part-catalogo-empty', calificarWrap: 'part-calificar', calificarTitulo: 'part-calificar-titulo', calificarLista: 'part-calificar-lista', btnGuardarCalif: 'btn-guardar-part-calif', msgCalif: 'part-calif-msg' },
};
let itemCalificandoId = { tareas: null, participaciones: null };

on('tareas-parcial', 'change', () => { cargarCatalogo('tareas'); vistaRapida('tareas', { db, grupoActivo, alumnos: alumnosCache, datosDeAlumno }); });
on('part-parcial', 'change', () => { cargarCatalogo('participaciones'); vistaRapida('participacion', { db, grupoActivo, alumnos: alumnosCache, datosDeAlumno }); });
on('btn-agregar-tarea', 'click', () => agregarItemCatalogo('tareas'));
on('btn-agregar-part', 'click', () => agregarItemCatalogo('participaciones'));
on('btn-guardar-tarea-calif', 'click', () => guardarCalificaciones('tareas'));
on('btn-guardar-part-calif', 'click', () => guardarCalificaciones('participaciones'));

async function agregarItemCatalogo(tipo) {
  const cfg = CONFIG_TIPO[tipo];
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  const nombre = document.getElementById(cfg.nombreInput).value.trim();
  const fecha = document.getElementById(cfg.fechaInput).value;
  const parcial = document.getElementById(cfg.parcialSelect).value;
  if (!nombre) { alert('Escribe un nombre.'); return; }
  // Aviso importante: en cuanto una tarea entra al catálogo, empieza a contar
  // para la calificación. Quien no la entregue tendrá cero en ella.
  if (tipo === 'tareas') {
    const ok = confirm(`¿Agregar la tarea "${nombre}" al ${parcial === 'p1' ? 'Parcial 1' : parcial === 'p2' ? 'Parcial 2' : 'Examen Final'}?\n\nDesde este momento cuenta para la calificación: a quien no la entregue le contará como cero en el promedio de tareas.`);
    if (!ok) return;
  }
  try {
    await addDoc(collection(db, 'grupos', grupoActivo, cfg.catalogo), { nombre, fecha, parcial, creado: serverTimestamp() });
  } catch (err) { marcarResultado(cfg.btnAgregar, cfg.msgNueva, false, '', 'No se pudo agregar: ' + (err.message || err)); return; }
  document.getElementById(cfg.nombreInput).value = '';
  marcarResultado(cfg.btnAgregar, cfg.msgNueva, true, '✓ Agregada.', '');
  cargarCatalogo(tipo);
}

async function cargarCatalogo(tipo) {
  const cfg = CONFIG_TIPO[tipo];
  const cont = document.getElementById(cfg.listaCatalogo);
  const empty = document.getElementById(cfg.emptyCatalogo);
  const calificarWrap = document.getElementById(cfg.calificarWrap);
  if (!cont) return;
  cont.innerHTML = '';
  calificarWrap.hidden = true;
  itemCalificandoId[tipo] = null;
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }
  const parcial = document.getElementById(cfg.parcialSelect).value;
  let items = [];
  try {
    const snap = await getDocs(collection(db, 'grupos', grupoActivo, cfg.catalogo));
    items = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.parcial === parcial).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  } catch { items = []; }
  empty.hidden = items.length > 0;
  if (items.length === 0) { empty.textContent = 'Sin registros en este parcial todavía.'; return; }
  // Nota de ayuda arriba de la lista, distinta para cada tipo.
  if (tipo === 'participaciones') {
    const nota = document.createElement('p');
    nota.className = 'field-hint';
    nota.style.margin = '0 0 10px';
    nota.textContent = 'La participación se marca con palomita: cuenta cuántas veces participó cada alumno, no con qué calificación. Desde el Parcial 2, 4 participaciones en clase dan 10 puntos; los otros 15 los dan las actividades de repaso que el alumno termina sin errores en el Aula Virtual.';
    cont.appendChild(nota);
  }
  // Para tareas, se recuerda cuántas hay: es el denominador del promedio.
  if (tipo === 'tareas') {
    const nota = document.createElement('p');
    nota.className = 'field-hint';
    nota.style.margin = '0 0 10px';
    nota.textContent = `Hay ${items.length} tarea(s) en este parcial. El promedio se saca sobre ese total: lo no entregado cuenta como cero.`;
    cont.appendChild(nota);
  }
  items.forEach(item => {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'asis-row';
    row.innerHTML = `<span class="student-name">${escaparHTML(item.nombre)}${item.fecha ? ` <small class="res-extra">(${escaparHTML(item.fecha)})</small>` : ''}</span><span class="asis-estado-label">Calificar →</span>`;
    row.addEventListener('click', () => calificarItem(tipo, item));
    cont.appendChild(row);
  });
}

async function calificarItem(tipo, item) {
  const cfg = CONFIG_TIPO[tipo];
  itemCalificandoId[tipo] = item.id;
  document.getElementById(cfg.calificarWrap).hidden = false;
  document.getElementById(cfg.calificarTitulo).textContent = `Calificar: ${item.nombre}`;
  const cont = document.getElementById(cfg.calificarLista);
  cont.innerHTML = '<p class="empty-inline">Cargando…</p>';
  const valores = {};
  await Promise.all(alumnosCache.map(async (a) => {
    try { const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, cfg.sub, item.id)); valores[a.id] = snap.exists() ? snap.data().calificacion : ''; }
    catch { valores[a.id] = ''; }
  }));

  // La PARTICIPACIÓN se registra con palomita, no con número: lo que cuenta
  // es cuántas veces participó cada quien contra la meta del parcial, no qué
  // tan bien lo hizo. Las TAREAS sí se califican de 0 a 10.
  const esParticipacion = tipo === 'participaciones';

  cont.innerHTML = `<div class="quiz-actions" style="margin-bottom:12px; display:flex; gap:8px;"><button type="button" class="btn btn-ghost-dark btn-small" data-accion="marcar-diez">${esParticipacion ? 'Marcar a todos' : 'Marcar todos con 10'}</button><button type="button" class="btn btn-ghost-dark btn-small" data-accion="limpiar-todos">${esParticipacion ? 'Quitar a todos (nadie participó)' : 'Limpiar todos'}</button></div>`;
  const filasCont = document.createElement('div');
  filasCont.id = `${cfg.calificarLista}-filas`;
  cont.appendChild(filasCont);
  alumnosCache.forEach(a => {
    const row = document.createElement('div');
    row.className = 'ens-row'; row.dataset.alumnoId = a.id;
    if (esParticipacion) {
      const marcado = valores[a.id] !== '' && valores[a.id] !== undefined && valores[a.id] !== null;
      row.innerHTML = `<label class="part-check" style="display:flex; align-items:center; gap:10px; width:100%; cursor:pointer;"><input type="checkbox" class="part-input" ${marcado ? 'checked' : ''} style="width:22px; height:22px; flex:none;"><span class="student-name">${escaparHTML(a.nombre)}</span></label>`;
    } else {
      row.innerHTML = `<span class="student-name">${escaparHTML(a.nombre)}</span><input type="number" min="0" max="10" step="0.1" class="calif-input" value="${valores[a.id] ?? ''}" placeholder="0-10"><textarea class="proy-comentario" rows="2" placeholder="Comentarios para el alumno: qué salió bien y qué debe corregir (lo verá en Mi progreso)">${escaparHTML(comentarios[a.id] || '')}</textarea>`;
    }
    filasCont.appendChild(row);
  });
  cont.querySelector('[data-accion="marcar-diez"]').addEventListener('click', () => {
    if (esParticipacion) filasCont.querySelectorAll('.part-input').forEach(inp => { inp.checked = true; });
    else filasCont.querySelectorAll('.calif-input').forEach(inp => { inp.value = '10'; });
  });
  cont.querySelector('[data-accion="limpiar-todos"]').addEventListener('click', () => {
    if (!confirm('¿Vaciar la captura de todos los alumnos para esta actividad?')) return;
    if (esParticipacion) filasCont.querySelectorAll('.part-input').forEach(inp => { inp.checked = false; });
    else filasCont.querySelectorAll('.calif-input').forEach(inp => { inp.value = ''; });
  });
  document.getElementById(cfg.calificarWrap).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function guardarCalificaciones(tipo) {
  const cfg = CONFIG_TIPO[tipo];
  const itemId = itemCalificandoId[tipo];
  if (!grupoActivo || !itemId) { alert('Elige una tarea o actividad primero.'); return; }
  let item;
  try { const snap = await getDoc(doc(db, 'grupos', grupoActivo, cfg.catalogo, itemId)); item = snap.data(); } catch { alert('No se pudo leer la tarea.'); return; }
  const filas = document.querySelectorAll(`#${cfg.calificarLista} .ens-row`);
  const escrituras = [];
  const esParticipacion = tipo === 'participaciones';
  filas.forEach(row => {
    const alumnoId = row.dataset.alumnoId;
    const ref = doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, cfg.sub, itemId);
    if (esParticipacion) {
      // Palomita puesta = participó. Se guarda con calificación 10 para que
      // los listados y el rubro combinado del Final la cuenten completa.
      const check = row.querySelector('.part-input');
      if (check && check.checked) {
        escrituras.push(setDoc(ref, { parcial: item.parcial, nombre: item.nombre, fecha: item.fecha, calificacion: 10, actualizado: serverTimestamp() }));
      } else {
        escrituras.push(deleteDoc(ref).catch(() => {}));
      }
      return;
    }
    const input = row.querySelector('.calif-input');
    if (input.value === '') { escrituras.push(deleteDoc(ref).catch(() => {})); }
    else {
      const calificacion = parseFloat(input.value);
      escrituras.push(setDoc(ref, { parcial: item.parcial, nombre: item.nombre, fecha: item.fecha, calificacion, actualizado: serverTimestamp() }));
    }
  });
  try { await Promise.all(escrituras); } catch (err) { marcarResultado(cfg.btnGuardarCalif, cfg.msgCalif, false, '', 'No se pudo guardar: ' + (err.message || err)); return; }
  marcarResultado(cfg.btnGuardarCalif, cfg.msgCalif, true, '✓ Calificaciones guardadas.', '');
}

// ---------- ASISTENCIA ----------
let asistenciaEstados = {};
on('asis-fecha', 'change', cargarAsistencia);
on('asis-parcial', 'change', () => { cargarAsistencia(); vistaRapida('asistencia', { db, grupoActivo, alumnos: alumnosCache, datosDeAlumno }); });
on('btn-guardar-asistencia', 'click', guardarAsistencia);
const _hoy = new Date();
const elFecha = document.getElementById('asis-fecha');
if (elFecha) elFecha.valueAsDate = _hoy;

async function cargarAsistencia() {
  const cont = document.getElementById('asistencia-lista');
  const empty = document.getElementById('asistencia-empty');
  cont.innerHTML = '';
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }
  if (alumnosCache.length === 0) { empty.hidden = false; empty.textContent = 'Este grupo aún no tiene alumnos.'; return; }
  empty.hidden = true;
  const fecha = document.getElementById('asis-fecha').value;
  asistenciaEstados = {};
  await Promise.all(alumnosCache.map(async (a) => {
    try { const ref = doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'asistencias', fecha); const snap = await getDoc(ref); asistenciaEstados[a.id] = snap.exists() ? snap.data().estado : 'presente'; }
    catch { asistenciaEstados[a.id] = 'presente'; }
  }));
  renderAsistenciaLista();
}

function renderAsistenciaLista() {
  const cont = document.getElementById('asistencia-lista');
  cont.innerHTML = '';
  alumnosCache.forEach(a => {
    const estado = asistenciaEstados[a.id] || 'presente';
    const row = document.createElement('button');
    row.type = 'button'; row.className = `asis-row asis-${estado}`;
    row.innerHTML = `<span class="asis-dot"></span><span class="student-name">${escaparHTML(a.nombre)}</span><span class="asis-estado-label">${ETIQUETA_ESTADO[estado]}</span>`;
    row.addEventListener('click', () => { asistenciaEstados[a.id] = CICLO_ESTADO[estado]; renderAsistenciaLista(); });
    cont.appendChild(row);
  });
}

async function guardarAsistencia() {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  const fecha = document.getElementById('asis-fecha').value;
  const parcial = document.getElementById('asis-parcial').value;
  if (!fecha) { alert('Elige una fecha.'); return; }
  try {
    await Promise.all(alumnosCache.map(a => {
      const ref = doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'asistencias', fecha);
      return setDoc(ref, { estado: asistenciaEstados[a.id] || 'presente', fecha, parcial, actualizado: serverTimestamp() });
    }));
  } catch (err) { marcarResultado('btn-guardar-asistencia', 'asis-msg', false, '', 'No se pudo guardar: ' + (err.message || err)); return; }
  marcarResultado('btn-guardar-asistencia', 'asis-msg', true, '✓ Asistencia guardada.', '');
}

// ---------- UNIFORMES ----------
on('unif-parcial', 'change', cargarUniformes);
on('btn-guardar-uniformes', 'click', guardarUniformes);

async function cargarUniformes() {
  const cont = document.getElementById('uniformes-lista');
  const empty = document.getElementById('uniformes-empty');
  cont.innerHTML = '';
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }
  if (alumnosCache.length === 0) { empty.hidden = false; empty.textContent = 'Este grupo aún no tiene alumnos.'; return; }
  empty.hidden = true;
  const parcial = document.getElementById('unif-parcial').value;
  const valores = {};
  await Promise.all(alumnosCache.map(async (a) => {
    try { const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'uniformes', parcial)); valores[a.id] = snap.exists() ? (snap.data().faltas ?? 0) : 0; }
    catch { valores[a.id] = 0; }
  }));
  alumnosCache.forEach(a => {
    const row = document.createElement('div');
    row.className = 'ens-row'; row.dataset.alumnoId = a.id;
    row.innerHTML = `<span class="student-name">${escaparHTML(a.nombre)}</span><input type="number" min="0" step="1" class="calif-input" value="${valores[a.id]}" placeholder="Faltas">`;
    cont.appendChild(row);
  });
}

async function guardarUniformes() {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  const parcial = document.getElementById('unif-parcial').value;
  const filas = document.querySelectorAll('#uniformes-lista .ens-row');
  const escrituras = [];
  filas.forEach(row => {
    const alumnoId = row.dataset.alumnoId;
    const input = row.querySelector('.calif-input');
    const faltas = input.value === '' ? 0 : parseInt(input.value, 10);
    escrituras.push(setDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'uniformes', parcial), { faltas, actualizado: serverTimestamp() }));
  });
  try { await Promise.all(escrituras); } catch (err) { marcarResultado('btn-guardar-uniformes', 'unif-msg', false, '', 'No se pudo guardar: ' + (err.message || err)); return; }
  marcarResultado('btn-guardar-uniformes', 'unif-msg', true, '✓ Uniformes guardados.', '');
}

// ---------- EXAMEN PRÁCTICO (solo Parcial 2) ----------
// La pestaña del examen práctico se captura únicamente desde la vista rápida
// de arriba. El bloque de abajo (una fila por alumno) quedó duplicado, así que
// se oculta en lugar de borrarlo del HTML, para no romper nada que lo busque.
function ocultarCapturaPracticoAntigua() {
  ['practico-lista', 'practico-empty', 'btn-guardar-practico', 'practico-msg']
    .forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
  // El texto de ayuda de esa sección también sobra: la vista rápida trae el suyo.
  const panel = document.getElementById('tab-practico');
  const ayuda = panel && panel.querySelector(':scope > .field-hint');
  if (ayuda) ayuda.hidden = true;
}
document.addEventListener('DOMContentLoaded', ocultarCapturaPracticoAntigua);

async function cargarPractico() {
  const cont = document.getElementById('practico-lista');
  const empty = document.getElementById('practico-empty');
  cont.innerHTML = '';
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }
  if (alumnosCache.length === 0) { empty.hidden = false; empty.textContent = 'Este grupo aún no tiene alumnos.'; return; }
  empty.hidden = true;
  const valores = {};
  await Promise.all(alumnosCache.map(async (a) => {
    try { const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'practico', 'p2')); valores[a.id] = snap.exists() ? snap.data().calificacion : ''; }
    catch { valores[a.id] = ''; }
  }));
  alumnosCache.forEach(a => {
    const row = document.createElement('div');
    row.className = 'ens-row'; row.dataset.alumnoId = a.id;
    row.innerHTML = `<span class="student-name">${escaparHTML(a.nombre)}</span><input type="number" min="0" max="10" step="0.1" class="calif-input" value="${valores[a.id] ?? ''}" placeholder="0-10"><textarea class="proy-comentario" rows="2" placeholder="Comentarios para el alumno: qué salió bien y qué debe corregir (lo verá en Mi progreso)">${escaparHTML(comentarios[a.id] || '')}</textarea>`;
    cont.appendChild(row);
  });
}

async function guardarPractico() {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  const filas = document.querySelectorAll('#practico-lista .ens-row');
  const escrituras = [];
  filas.forEach(row => {
    const alumnoId = row.dataset.alumnoId;
    const input = row.querySelector('.calif-input');
    const calificacion = input.value === '' ? null : parseFloat(input.value);
    escrituras.push(setDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'practico', 'p2'), { calificacion, actualizado: serverTimestamp() }));
  });
  try { await Promise.all(escrituras); } catch (err) { marcarResultado('btn-guardar-practico', 'practico-msg', false, '', 'No se pudo guardar: ' + (err.message || err)); return; }
  marcarResultado('btn-guardar-practico', 'practico-msg', true, '✓ Examen práctico guardado.', '');
}

// ---------- PROYECTO: MI PLATO, MI HISTORIA ----------
const ENTREGAS_PROYECTO = ['entrega1', 'entrega2', 'entregaFinal'];
ENTREGAS_PROYECTO.forEach(entrega => { on(`btn-guardar-${entrega}`, 'click', () => guardarEntregaProyecto(entrega)); });

// ---- Mi atlas (grupos/{g}/alumnos/{a}/atlas/mi-atlas)
let ATLAS_DATA = null;
async function cargarMiAtlas() {
  const cont = document.getElementById('miatlas-avance');
  if (!cont) return;
  if (!grupoActivo) { cont.innerHTML = '<p class="empty-inline">Elige un grupo primero.</p>'; return; }
  if (!alumnosCache.length) { cont.innerHTML = '<p class="empty-inline">Este grupo aún no tiene alumnos.</p>'; return; }
  cont.innerHTML = '<p class="empty-inline">Cargando…</p>';
  try { ATLAS_DATA = ATLAS_DATA || await fetch('data/atlas.json').then(r => r.json()); } catch { cont.innerHTML = '<p class="empty-inline">No se pudo cargar el Atlas.</p>'; return; }
  const NOM = {}; Object.values(ATLAS_DATA.regiones).forEach(r => r.paises.forEach(p => { NOM[p.id] = p.n.replace(/ \(.*\)$/, ''); }));
  const CONTS = ATLAS_DATA.continentes, ks = Object.keys(CONTS);
  const filas = await Promise.all(alumnosCache.map(async a => {
    try { const s = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'atlas', 'mi-atlas')); return [a, s.exists() ? s.data() : null]; }
    catch { return [a, null]; }
  }));
  const fecha = t => t && t.toDate ? t.toDate().toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const celda = av => av ? `<td class="${av.clasificados === av.total && av.total ? 'ok' : ''}">${av.clasificados}/${av.total}<br><small>${av.regiones} reg. · ${av.fichas} ficha${av.fichas === 1 ? '' : 's'}</small></td>` : '<td>—</td>';
  const empezaron = filas.filter(([, d]) => d).length;
  cont.innerHTML = `<p class="field-hint"><b>${empezaron} de ${filas.length}</b> alumnos ya entraron a Mi atlas.</p>
    <div class="taller-tabla-wrap"><table class="taller-tabla"><thead><tr><th>Alumno</th>${ks.map(k => `<th>${escaparHTML(CONTS[k].nombre)}</th>`).join('')}<th>Última vez</th><th></th></tr></thead><tbody>
    ${filas.map(([a, d]) => !d ? `<tr class="sin"><td>${escaparHTML(a.nombre)}</td><td colspan="${ks.length + 2}"><i>Aún no entra a Mi atlas</i></td></tr>`
      : `<tr><td>${escaparHTML(a.nombre)}${d.equipo ? `<br><small>👥 ${escaparHTML(d.equipo)}</small>` : ''}</td>${ks.map(k => celda((d.avance || {})[k])).join('')}<td>${fecha(d.actualizado)}</td><td><button type="button" class="btn btn-small taller-ver" data-id="${a.id}">Ver</button></td></tr>
         <tr class="taller-det" id="madet-${a.id}" hidden><td colspan="${ks.length + 3}"></td></tr>`).join('')}</tbody></table></div>`;
  const datos = Object.fromEntries(filas.map(([a, d]) => [a.id, d]));
  cargarEquipos(NOM, CONTS, ks);
  const e = x => escaparHTML(x || '').replace(/\n/g, '<br>') || '<i>—</i>';
  const CAMPOS = [['clima', 'Clima y paisaje'], ['ingredientes', 'Ingredientes base'], ['platillos', 'Platillos'], ['tecnicas', 'Técnicas y utensilios'], ['historia', 'Historia e influencias'], ['dato', 'Dato curioso'], ['fuentes', 'Fuentes']];
  cont.querySelectorAll('.taller-ver').forEach(b => b.addEventListener('click', () => {
    const tr = document.getElementById('madet-' + b.dataset.id), T = (datos[b.dataset.id].datos || {}).conts || {};
    if (!tr.hidden) { tr.hidden = true; b.textContent = 'Ver'; return; }
    tr.firstElementChild.innerHTML = `<div class="taller-detalle">${ks.filter(k => T[k] && T[k].regiones && T[k].regiones.length).map(k => {
      const c = T[k];
      return `<h4 style="margin:.4rem 0">${escaparHTML(CONTS[k].nombre)}</h4>${c.regiones.map(r => {
        const ps = Object.entries(c.asign || {}).filter(([, x]) => x === r.id).map(([i]) => NOM[i] || i).sort((x, y) => x.localeCompare(y, 'es'));
        return `<details><summary><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${escaparHTML(r.color)}"></span> <b>${escaparHTML(r.nombre)}</b> · ${ps.length} países</summary>
          <p><b>Países:</b> ${escaparHTML(ps.join(', ') || '—')}</p>${CAMPOS.map(([f, t]) => `<p><b>${t}:</b> ${e(r[f])}</p>`).join('')}</details>`;
      }).join('')}`;
    }).join('') || '<p><i>Todavía no crea regiones.</i></p>'}</div>`;
    tr.hidden = false; b.textContent = 'Ocultar';
  }));
}

// ---- Equipos de Mi atlas (grupos/{g}/equipos/{id}; su atlas en .../equipos/{id}/atlas/{continente})
const CAMPOS_EQ = [['clima', 'Clima y paisaje'], ['ingredientes', 'Ingredientes base'], ['platillos', 'Platillos'], ['tecnicas', 'Técnicas y utensilios'], ['historia', 'Historia e influencias'], ['dato', 'Dato curioso'], ['fuentes', 'Fuentes']];
let EQUIPOS = [];
async function cargarEquipos(NOM, CONTS, ks) {
  const lista = document.getElementById('equipos-lista'), prog = document.getElementById('miatlas-equipos');
  try { const sn = await getDocs(collection(db, 'grupos', grupoActivo, 'equipos')); EQUIPOS = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es')); }
  catch { EQUIPOS = []; }
  const nombreDe = id => (alumnosCache.find(a => a.id === id) || {}).nombre || id;
  lista.innerHTML = EQUIPOS.length ? `<div class="equipos-grid">${EQUIPOS.map(eq => `<div class="equipo-card"><b>${escaparHTML(eq.nombre)}</b><p>${(eq.integrantes || []).map(i => escaparHTML(nombreDe(i))).join(', ') || '<i>sin integrantes</i>'}</p><div><button type="button" class="btn btn-small" data-eq-edit="${eq.id}">Editar</button> <button type="button" class="btn btn-small" data-eq-del="${eq.id}">Eliminar</button></div></div>`).join('')}</div>` : '<p class="empty-inline">Aún no hay equipos en este grupo.</p>';
  pintarFormEquipo(null);
  lista.querySelectorAll('[data-eq-edit]').forEach(b => b.addEventListener('click', () => { pintarFormEquipo(EQUIPOS.find(x => x.id === b.dataset.eqEdit)); document.getElementById('equipo-nombre').focus(); }));
  lista.querySelectorAll('[data-eq-del]').forEach(b => b.addEventListener('click', async () => {
    const eq = EQUIPOS.find(x => x.id === b.dataset.eqDel);
    if (!confirm(`¿Eliminar el equipo «${eq.nombre}»? Sus integrantes ya no verán el atlas del equipo (lo que escribieron no se borra).`)) return;
    await deleteDoc(doc(db, 'grupos', grupoActivo, 'equipos', eq.id)); cargarMiAtlas();
  }));
  // avance por equipo
  if (!EQUIPOS.length) { prog.innerHTML = '<p class="empty-inline">Cuando armes equipos, aquí verás su avance.</p>'; return; }
  const filas = await Promise.all(EQUIPOS.map(async eq => {
    const d = {};
    await Promise.all(ks.map(async k => { try { const s = await getDoc(doc(db, 'grupos', grupoActivo, 'equipos', eq.id, 'atlas', k)); if (s.exists()) d[k] = s.data(); } catch { /* */ } }));
    return [eq, d];
  }));
  const total = k => Object.values(ATLAS_DATA.regiones).filter(r => r.cont === k).reduce((s, r) => s + r.paises.length, 0);
  const fecha = t => t && t.toDate ? t.toDate().toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const celda = (x, k) => { if (!x) return '<td>—</td>'; const regs = Object.values(x.regiones || {}), cl = Object.keys(x.asign || {}).length, fi = regs.filter(r => CAMPOS_EQ.filter(([f]) => (r[f] || '').trim()).length >= 4).length, t = total(k); return `<td class="${cl === t ? 'ok' : ''}">${cl}/${t}<br><small>${regs.length} reg. · ${fi} ficha${fi === 1 ? '' : 's'}</small></td>`; };
  prog.innerHTML = `<div class="taller-tabla-wrap"><table class="taller-tabla"><thead><tr><th>Equipo</th>${ks.map(k => `<th>${escaparHTML(CONTS[k].nombre)}</th>`).join('')}<th>Última vez</th><th></th></tr></thead><tbody>
    ${filas.map(([eq, d]) => { const ult = Object.values(d).map(x => x.actualizado).filter(Boolean).sort((a, b) => b.toMillis() - a.toMillis())[0];
      return `<tr><td><b>${escaparHTML(eq.nombre)}</b><br><small>${escaparHTML((eq.nombres || []).join(', '))}</small></td>${ks.map(k => celda(d[k], k)).join('')}<td>${fecha(ult)}</td><td><button type="button" class="btn btn-small taller-ver" data-eqv="${eq.id}">Ver</button></td></tr>
      <tr class="taller-det" id="eqdet-${eq.id}" hidden><td colspan="${ks.length + 3}"></td></tr>`; }).join('')}</tbody></table></div>`;
  const porId = Object.fromEntries(filas.map(([eq, d]) => [eq.id, d]));
  const e = x => escaparHTML(x || '').replace(/\n/g, '<br>') || '<i>—</i>';
  prog.querySelectorAll('[data-eqv]').forEach(b => b.addEventListener('click', () => {
    const tr = document.getElementById('eqdet-' + b.dataset.eqv), D = porId[b.dataset.eqv];
    if (!tr.hidden) { tr.hidden = true; b.textContent = 'Ver'; return; }
    tr.firstElementChild.innerHTML = `<div class="taller-detalle">${ks.filter(k => D[k] && Object.keys(D[k].regiones || {}).length).map(k => {
      const c = D[k], regs = Object.entries(c.regiones).map(([id, r]) => ({ ...r, id })).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      return `<h4 style="margin:.4rem 0">${escaparHTML(CONTS[k].nombre)}</h4>${regs.map(r => {
        const ps = Object.entries(c.asign || {}).filter(([, x]) => x === r.id).map(([i]) => NOM[i] || i).sort((x, y) => x.localeCompare(y, 'es'));
        const por = (c.por || {})[r.id] || {};
        return `<details><summary><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${escaparHTML(r.color)}"></span> <b>${escaparHTML(r.nombre)}</b> · ${ps.length} países</summary>
          <p><b>Países:</b> ${escaparHTML(ps.join(', ') || '—')}</p>${CAMPOS_EQ.map(([f, t]) => `<p><b>${t}:</b>${por[f] ? ` <small style="color:#3F7A4F">(✍️ ${escaparHTML(por[f])})</small>` : ''} ${e(r[f])}</p>`).join('')}</details>`;
      }).join('')}`;
    }).join('') || '<p><i>Todavía no crean regiones.</i></p>'}</div>`;
    tr.hidden = false; b.textContent = 'Ocultar';
  }));
}
function pintarFormEquipo(eq) {
  document.getElementById('equipo-id').value = eq ? eq.id : '';
  document.getElementById('equipo-nombre').value = eq ? eq.nombre : '';
  document.getElementById('equipo-guardar').textContent = eq ? 'Guardar cambios' : 'Crear equipo';
  document.getElementById('equipo-cancelar').hidden = !eq;
  const enOtro = {}; EQUIPOS.forEach(x => { if (!eq || x.id !== eq.id) (x.integrantes || []).forEach(i => { enOtro[i] = x.nombre; }); });
  const mios = new Set(eq ? eq.integrantes || [] : []);
  document.getElementById('equipo-alumnos').innerHTML = alumnosCache.map(a => `<label class="${enOtro[a.id] ? 'en-otro' : ''}"><input type="checkbox" value="${a.id}" ${mios.has(a.id) ? 'checked' : ''}> ${escaparHTML(a.nombre)}${enOtro[a.id] ? ` <small>(en «${escaparHTML(enOtro[a.id])}»)</small>` : ''}</label>`).join('');
}
on('equipo-cancelar', 'click', () => pintarFormEquipo(null));
on('equipo-form', 'submit', async ev => {
  ev.preventDefault();
  const msg = document.getElementById('equipo-msg');
  const nombre = document.getElementById('equipo-nombre').value.trim();
  const ids = [...document.querySelectorAll('#equipo-alumnos input:checked')].map(i => i.value);
  if (!nombre || !ids.length) { msg.textContent = 'Escribe el nombre del equipo y elige al menos un integrante.'; msg.hidden = false; return; }
  const id = document.getElementById('equipo-id').value || ('e' + Date.now().toString(36));
  try {
    // un alumno solo puede estar en un equipo: se quita de los demás
    await Promise.all(EQUIPOS.filter(x => x.id !== id && (x.integrantes || []).some(i => ids.includes(i))).map(x => {
      const integ = x.integrantes.filter(i => !ids.includes(i));
      return setDoc(doc(db, 'grupos', grupoActivo, 'equipos', x.id), { nombre: x.nombre, integrantes: integ, nombres: integ.map(i => (alumnosCache.find(a => a.id === i) || {}).nombre || i) });
    }));
    await setDoc(doc(db, 'grupos', grupoActivo, 'equipos', id), { nombre, integrantes: ids, nombres: ids.map(i => (alumnosCache.find(a => a.id === i) || {}).nombre || i), actualizado: serverTimestamp() });
    msg.textContent = 'Equipo guardado ✓'; msg.hidden = false; setTimeout(() => { msg.hidden = true; }, 2500);
    cargarMiAtlas();
  } catch (e) { msg.textContent = 'No se pudo guardar: ' + (e.message || e); msg.hidden = false; }
});

async function cargarProyecto() {
  const empty = document.getElementById('proyecto-empty');
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }
  if (alumnosCache.length === 0) { empty.hidden = false; empty.textContent = 'Este grupo aún no tiene alumnos.'; return; }
  empty.hidden = true;
  for (const entrega of ENTREGAS_PROYECTO) { await cargarEntregaProyecto(entrega); }
}

async function cargarEntregaProyecto(entrega) {
  const cont = document.getElementById(`proyecto-${entrega}-lista`);
  if (!cont) return;
  cont.innerHTML = '<p class="empty-inline">Cargando…</p>';
  const valores = {};
  const comentarios = {};
  await Promise.all(alumnosCache.map(async (a) => {
    try { const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'proyecto', entrega)); valores[a.id] = snap.exists() ? snap.data().calificacion : ''; comentarios[a.id] = snap.exists() ? (snap.data().comentario || '') : ''; }
    catch { valores[a.id] = ''; comentarios[a.id] = ''; }
  }));
  cont.innerHTML = '';
  alumnosCache.forEach(a => {
    const row = document.createElement('div');
    row.className = 'ens-row'; row.dataset.alumnoId = a.id;
    row.innerHTML = `<span class="student-name">${escaparHTML(a.nombre)}</span><input type="number" min="0" max="10" step="0.1" class="calif-input" value="${valores[a.id] ?? ''}" placeholder="0-10"><textarea class="proy-comentario" rows="2" placeholder="Comentarios para el alumno: qué salió bien y qué debe corregir (lo verá en Mi progreso)">${escaparHTML(comentarios[a.id] || '')}</textarea>`;
    cont.appendChild(row);
  });
}

async function guardarEntregaProyecto(entrega) {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  const filas = document.querySelectorAll(`#proyecto-${entrega}-lista .ens-row`);
  const escrituras = [];
  filas.forEach(row => {
    const alumnoId = row.dataset.alumnoId;
    const input = row.querySelector('.calif-input');
    const calificacion = input.value === '' ? null : parseFloat(input.value);
    const comentario = (row.querySelector('.proy-comentario')?.value || '').trim();
    escrituras.push(setDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'proyecto', entrega), { calificacion, comentario, actualizado: serverTimestamp() }));
  });
  try { await Promise.all(escrituras); } catch (err) { marcarResultado(`btn-guardar-${entrega}`, `${entrega}-msg`, false, '', 'No se pudo guardar: ' + (err.message || err)); return; }
  marcarResultado(`btn-guardar-${entrega}`, `${entrega}-msg`, true, '✓ Guardado.', '');
}

// ---------- EXAMEN EN LÍNEA ----------
let examenesAbiertos = [];
on('btn-guardar-examenes-abiertos', 'click', guardarExamenesAbiertos);
on('enlinea-parcial', 'change', cargarIntentos);

async function cargarExamenesAbiertos() {
  const cont = document.getElementById('examenes-abiertos-lista');
  if (!cont) return;
  if (!grupoActivo) { cont.innerHTML = '<p class="empty-inline">Elige un grupo primero.</p>'; return; }
  try { const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'config', 'examenes')); examenesAbiertos = snap.exists() && Array.isArray(snap.data().abiertos) ? snap.data().abiertos : []; }
  catch { examenesAbiertos = []; }
  renderExamenesAbiertos();
}

function renderExamenesAbiertos() {
  const cont = document.getElementById('examenes-abiertos-lista');
  cont.innerHTML = '';
  PARCIALES_EXAMEN.forEach(p => {
    const abierto = examenesAbiertos.includes(p);
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'asis-row ' + (abierto ? 'asis-presente' : 'asis-falta');
    row.innerHTML = `<span class="asis-dot"></span><span class="student-name">${ETIQUETAS_EXAMEN[p]}</span><span class="asis-estado-label">${abierto ? 'Abierto' : 'Cerrado'}</span>`;
    row.addEventListener('click', () => { examenesAbiertos = abierto ? examenesAbiertos.filter(x => x !== p) : [...examenesAbiertos, p]; renderExamenesAbiertos(); });
    cont.appendChild(row);
  });
}

async function guardarExamenesAbiertos() {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  try { await setDoc(doc(db, 'grupos', grupoActivo, 'config', 'examenes'), { abiertos: examenesAbiertos, actualizado: serverTimestamp() }, { merge: true }); }
  catch (err) { marcarResultado('btn-guardar-examenes-abiertos', 'abiertos-msg', false, '', 'No se pudo guardar: ' + (err.message || err)); return; }
  marcarResultado('btn-guardar-examenes-abiertos', 'abiertos-msg', true, '✓ Guardado.', '');
}

// La tabla se mantiene EN VIVO: cada alumno tiene dos "escuchas" (su intento
// y su calificación de examen) y, en cuanto algo cambia en la base de datos,
// su fila se vuelve a pintar sola. No hace falta recargar la página.
let intentosSubs = [];
let intentosReloj = null;
let intentosPintado = null;
let intentosSesion = 0;

function detenerIntentosEnVivo() {
  intentosSubs.forEach(u => { try { u(); } catch { /* nada */ } });
  intentosSubs = [];
  clearInterval(intentosReloj); intentosReloj = null;
  clearTimeout(intentosPintado); intentosPintado = null;
  intentosSesion++;
}

const ESTADO_EXAMEN = {
  sin:       { texto: 'Sin iniciar', clase: 'mz-ex-sin' },
  en_curso:  { texto: 'En curso',    clase: 'mz-ex-curso' },
  bloqueado: { texto: 'Bloqueado',   clase: 'mz-ex-bloq' },
  entregado: { texto: 'Entregado',   clase: 'mz-ex-ok' },
};

// Tiempo restante de un intento en curso, con la misma cuenta que usa el
// examen del alumno (incluye pausas por reapertura y minutos extra).
function minutosRestantes(est) {
  const base = est.segundosAlPausar ?? ((est.minutos || 60) * 60);
  const desde = est.reanudadoEn || est.iniciado;
  if (!desde) return null;
  const seg = base + (est.minutosExtra || 0) * 60 - Math.floor((Date.now() - desde) / 1000);
  return Math.max(0, Math.ceil(seg / 60));
}

function filaIntentoHTML(parcial, { alumno, est, examenDoc }) {
  const clave = !est ? 'sin' : (est.estado || 'en_curso');
  const info = ESTADO_EXAMEN[clave] || ESTADO_EXAMEN.en_curso;
  let calif = '—', aciertos = '—', salidas = '—', acciones = '';

  if (clave === 'entregado') {
    calif = `${Number(est.calificacion ?? 0).toFixed(1)} / 10`;
    aciertos = `${est.aciertos}/${est.total}${est.automatico ? ' ⏱' : ''}`;
    salidas = est.salidas ? String(est.salidas) : '0';
    acciones = `<button type="button" class="mz-btn" data-descargar-examen="${alumno.id}">PDF</button><button type="button" class="mz-btn" data-reabrir-entregado="${alumno.id}" title="Vuelve a abrir el examen con sus respuestas guardadas y el tiempo que tú indiques">Reabrir</button>`;
  } else if (clave === 'bloqueado') {
    aciertos = `${Object.keys(est.respuestas || {}).length}/${(est.ids || []).length}`;
    salidas = String(est.salidas || 1);
    acciones = `<button type="button" class="mz-btn mz-btn-fuerte" data-reabrir="${alumno.id}">Reabrir</button><button type="button" class="mz-btn" data-extra="${alumno.id}">+ min</button>`;
  } else if (clave === 'en_curso') {
    const restante = minutosRestantes(est);
    calif = restante === null ? 'en curso' : `~${restante} min`;
    aciertos = `${Object.keys(est.respuestas || {}).length}/${(est.ids || []).length}`;
    salidas = String(est.salidas || 0);
    acciones = `<button type="button" class="mz-btn" data-extra="${alumno.id}">+ min</button>`;
  }

  // Permiso individual: sirve cuando el examen está cerrado para el grupo
  // (alumno que faltó o que se le reabrió). Si el examen está abierto para
  // todos, no hace falta.
  if (!examenesAbiertos.includes(parcial)) {
    const tiene = permisoIndividual(parcial).includes(alumno.id);
    acciones += tiene
      ? `<button type="button" class="mz-btn mz-btn-fuerte" data-permiso-quitar="${alumno.id}" title="Solo este alumno puede entrar a este examen, aunque esté cerrado para el grupo">Habilitado ✓</button>`
      : `<button type="button" class="mz-btn" data-permiso-dar="${alumno.id}" title="Abre este examen solo para este alumno">Habilitar</button>`;
  }

  // El Diagnóstico no tiene calificación oficial que ajustar.
  const esAjusteManual = examenDoc && examenDoc.origen && examenDoc.origen !== 'examen en línea';
  if (parcial !== 'diag') {
    if (esAjusteManual) calif = `${Number(examenDoc.calificacion).toFixed(1)} / 10 ✎`;
    acciones += `<button type="button" class="mz-btn" data-ajustar-examen="${alumno.id}">Ajustar</button>`;
  }

  return `
    <tr>
      <th class="mz-col-nombre" scope="row" title="${escaparHTML(alumno.nombre)}"><span class="mz-nombre-txt">${escaparHTML(alumno.nombre)}</span></th>
      <td class="mz-celda"><span class="mz-ex-chip ${info.clase}">${info.texto}</span></td>
      <td class="mz-celda mz-ex-dato"${esAjusteManual ? ' title="Calificación ajustada a mano por el docente"' : ''}>${calif}</td>
      <td class="mz-celda mz-ex-dato">${aciertos}</td>
      <td class="mz-celda mz-ex-dato">${salidas}</td>
      <td class="mz-celda mz-ex-acciones">${acciones || '—'}</td>
    </tr>`;
}

// Concentrado grupal por sección — solo para el Examen Diagnóstico.
// Usa las categorías codificadas en el id de cada reactivo
// (diag-a.. = Cultura gastronómica, diag-b.. = Historia/geografía,
// diag-c.. = Comprensión lectora, diag-d.. = Experiencia práctica,
// diag-e.. = Vocabulario y técnicas).
function pintarConcentradoDiag(contConcentrado, filas, bancoDiag) {
  const NOMBRE_CATEGORIA = {
    a: 'Cultura gastronómica general',
    b: 'Historia y geografía general',
    c: 'Comprensión lectora',
    d: 'Experiencia práctica en cocina',
    e: 'Vocabulario y técnicas culinarias',
  };
  const categoriaDe = {};
  bancoDiag.reactivos.forEach(r => { categoriaDe[r.id] = (r.id.split('-')[1] || '')[0]; });
  const correctasPorCat = { a: 0, b: 0, c: 0, d: 0, e: 0 };
  const totalPorCat = { a: 0, b: 0, c: 0, d: 0, e: 0 };
  let entregados = 0, sumaCalif = 0;
  filas.forEach(({ est }) => {
    if (est && est.estado === 'entregado' && Array.isArray(est.detalle)) {
      entregados++;
      sumaCalif += Number(est.calificacion) || 0;
      est.detalle.forEach(d => {
        const cat = categoriaDe[d.id];
        if (!cat || !(cat in totalPorCat)) return;
        totalPorCat[cat]++;
        if (d.correcto) correctasPorCat[cat]++;
      });
    }
  });
  if (entregados === 0) {
    contConcentrado.innerHTML = '<h4>Concentrado grupal — Examen Diagnóstico</h4><p class="empty-inline">Todavía nadie ha entregado este examen.</p>';
    return;
  }
  const filasCategoria = Object.keys(NOMBRE_CATEGORIA).map(cat => {
    const pct = totalPorCat[cat] ? (correctasPorCat[cat] / totalPorCat[cat] * 100) : 0;
    return `<div class="res-row"><span>${NOMBRE_CATEGORIA[cat]}</span><strong>${pct.toFixed(0)}% de aciertos</strong></div>`;
  }).join('');
  contConcentrado.innerHTML = `
    <h4>Concentrado grupal — Examen Diagnóstico</h4>
    <div class="res-row"><span>Alumnos que entregaron</span><strong>${entregados} de ${filas.length}</strong></div>
    <div class="res-row"><span>Promedio general del grupo</span><strong>${(sumaCalif / entregados).toFixed(1)} / 10</strong></div>
    ${filasCategoria}
    <p class="field-hint" style="margin-top:10px;">Porcentaje de aciertos promedio por sección, considerando solo a quienes ya entregaron.</p>`;
}

async function cargarIntentos() {
  detenerIntentosEnVivo();
  const sesion = intentosSesion;
  const cont = document.getElementById('intentos-lista');
  const empty = document.getElementById('intentos-empty');
  if (!cont) return;
  cont.innerHTML = '';
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }

  // Lista de alumnos recién leída, por si un nombre se corrigió en otro lado.
  try { await cargarAlumnos(); } catch { /* se usa la que ya está */ }
  if (sesion !== intentosSesion) return; // se cambió de pestaña o de examen mientras cargaba
  if (alumnosCache.length === 0) { empty.hidden = false; empty.textContent = 'Este grupo aún no tiene alumnos.'; return; }
  empty.hidden = true;
  const parcial = document.getElementById('enlinea-parcial').value;
  const grupo = grupoActivo;

  let btnTodos = document.getElementById('btn-descargar-examenes-grupo');
  if (!btnTodos) {
    btnTodos = document.createElement('button');
    btnTodos.id = 'btn-descargar-examenes-grupo'; btnTodos.type = 'button'; btnTodos.className = 'btn btn-ghost-dark btn-small'; btnTodos.style.marginBottom = '14px';
    cont.parentNode.insertBefore(btnTodos, cont);
  }
  btnTodos.textContent = `Descargar todos los exámenes de ${ETIQUETAS_EXAMEN[parcial]} (PDF)`;
  btnTodos.onclick = () => descargarExamenesGrupo(parcial);

  let contConcentrado = document.getElementById('concentrado-diag-grupal');
  let bancoDiag = null;
  if (parcial === 'diag') {
    if (!contConcentrado) {
      contConcentrado = document.createElement('div');
      contConcentrado.id = 'concentrado-diag-grupal';
      contConcentrado.className = 'res-card';
      contConcentrado.style.marginBottom = '14px';
      cont.parentNode.insertBefore(contConcentrado, cont);
    }
    contConcentrado.innerHTML = '<p class="empty-inline">Calculando concentrado grupal…</p>';
    try { bancoDiag = await cargarBancoExamen('diag'); }
    catch (err) { contConcentrado.innerHTML = `<p class="empty-inline">No se pudo calcular el concentrado: ${err.message || err}</p>`; }
    if (sesion !== intentosSesion) return;
  } else if (contConcentrado) {
    contConcentrado.remove(); contConcentrado = null;
  }

  // Estructura fija de la tabla; solo el cuerpo se repinta.
  cont.innerHTML = `
    <span class="en-vivo" id="intentos-en-vivo">En vivo — se actualiza solo</span>
    <div style="margin:10px 0;"><button type="button" class="btn btn-secondary" id="btn-tiempo-grupo">Dar más tiempo a todos los que no terminaron</button>
    <p class="field-hint" style="margin-top:6px;">Reabre, con los minutos que indiques, a todos los que no terminaron: todos los que lo abrieron y no contestaron todas las preguntas: los que se quedaron sin tiempo (⏱), los bloqueados, los que siguen en curso y los que lo entregaron incompleto o en blanco. Conservan sus respuestas. Quien contestó todo no se toca.</p></div>
    <div class="mz-scroll">
      <table class="mz-tabla">
        <thead>
          <tr>
            <th class="mz-col-nombre">Alumno</th>
            <th class="mz-col-act"><span class="mz-col-tit">Estado</span></th>
            <th class="mz-col-act"><span class="mz-col-tit">Calificación</span><span class="mz-col-sub">o tiempo</span></th>
            <th class="mz-col-act"><span class="mz-col-tit">Aciertos</span></th>
            <th class="mz-col-act"><span class="mz-col-tit">Salidas</span></th>
            <th class="mz-col-act mz-col-ancha"><span class="mz-col-tit">Acciones</span></th>
          </tr>
        </thead>
        <tbody id="intentos-tbody"><tr><td colspan="6" class="mz-celda">Cargando…</td></tr></tbody>
      </table>
    </div>
    <p class="field-hint" style="margin-top:10px;">Desliza la tabla de lado para ver todas las columnas. El reloj ⏱ marca que se entregó por tiempo agotado, y el lápiz ✎ que la calificación se ajustó a mano.</p>`;

  await cargarPermisos();
  const filas = alumnosCache.map(alumno => ({ alumno, est: null, examenDoc: null }));
  const btnGrupo = document.getElementById('btn-tiempo-grupo');
  if (btnGrupo) btnGrupo.addEventListener('click', () => darTiempoAlGrupo(parcial, filas));
  const porId = new Map(filas.map(f => [f.alumno.id, f]));
  let pendientesIniciales = filas.length * 2;

  const pintar = () => {
    if (sesion !== intentosSesion) return;
    const tbody = document.getElementById('intentos-tbody');
    if (!tbody) return;
    tbody.innerHTML = filas.map(f => filaIntentoHTML(parcial, f)).join('');
    tbody.querySelectorAll('[data-reabrir]').forEach(b => b.addEventListener('click', () => reabrirExamen(b.dataset.reabrir, parcial)));
    tbody.querySelectorAll('[data-extra]').forEach(b => b.addEventListener('click', () => darTiempoExtra(b.dataset.extra, parcial)));
    tbody.querySelectorAll('[data-permiso-dar]').forEach(b => b.addEventListener('click', async () => { await cambiarPermiso(parcial, b.dataset.permisoDar, true); pintar(); }));
    tbody.querySelectorAll('[data-permiso-quitar]').forEach(b => b.addEventListener('click', async () => { await cambiarPermiso(parcial, b.dataset.permisoQuitar, false); pintar(); }));
    tbody.querySelectorAll('[data-reabrir-entregado]').forEach(b => b.addEventListener('click', () => reabrirEntregado(b.dataset.reabrirEntregado, parcial)));
    tbody.querySelectorAll('[data-descargar-examen]').forEach(b => b.addEventListener('click', () => descargarExamenAlumno(b.dataset.descargarExamen, parcial)));
    tbody.querySelectorAll('[data-ajustar-examen]').forEach(b => b.addEventListener('click', () => ajustarCalificacionExamen(b.dataset.ajustarExamen, parcial)));
    if (contConcentrado && bancoDiag) pintarConcentradoDiag(contConcentrado, filas, bancoDiag);
  };
  // Varias actualizaciones seguidas (por ejemplo, 27 alumnos entrando a la
  // vez) se juntan en un solo repintado.
  const programarPintado = () => {
    if (pendientesIniciales > 0) return; // se pinta todo junto cuando llegó lo primero
    clearTimeout(intentosPintado);
    intentosPintado = setTimeout(pintar, 250);
  };
  const marcarConexion = (ok) => {
    const el = document.getElementById('intentos-en-vivo');
    if (!el) return;
    el.classList.toggle('sin-conexion', !ok);
    el.textContent = ok ? 'En vivo — se actualiza solo' : 'Sin conexión en vivo — recarga la página';
  };

  filas.forEach(f => {
    const base = ['grupos', grupo, 'alumnos', f.alumno.id];
    let primeraIntento = true, primeraExamen = true;
    const llegoPrimera = () => {
      pendientesIniciales--;
      if (pendientesIniciales === 0) pintar();
    };
    intentosSubs.push(onSnapshot(doc(db, ...base, 'intentos', parcial), snap => {
      const fila = porId.get(f.alumno.id); if (!fila) return;
      fila.est = snap.exists() ? snap.data() : null;
      marcarConexion(true);
      if (primeraIntento) { primeraIntento = false; llegoPrimera(); } else programarPintado();
    }, err => {
      console.warn('[en vivo] intento', f.alumno.id, err);
      marcarConexion(false);
      if (primeraIntento) { primeraIntento = false; llegoPrimera(); }
    }));
    intentosSubs.push(onSnapshot(doc(db, ...base, 'examenes', parcial), snap => {
      const fila = porId.get(f.alumno.id); if (!fila) return;
      fila.examenDoc = snap.exists() ? snap.data() : null;
      if (primeraExamen) { primeraExamen = false; llegoPrimera(); } else programarPintado();
    }, err => {
      console.warn('[en vivo] examen', f.alumno.id, err);
      if (primeraExamen) { primeraExamen = false; llegoPrimera(); }
    }));
  });

  // El tiempo restante de quienes están contestando se recalcula cada 30 s.
  intentosReloj = setInterval(() => {
    if (filas.some(f => f.est && f.est.estado === 'en_curso')) programarPintado();
  }, 30000);
}

let bancosExamenCache = {};
async function cargarBancoExamen(parcial) {
  if (bancosExamenCache[parcial]) return bancosExamenCache[parcial];
  // El Diagnóstico vive en un archivo con nombre distinto al patrón
  // examen_{parcial}.json de los demás parciales.
  const archivo = parcial === 'diag' ? 'data/examen_diagnostico.json' : `data/examen_${parcial}.json`;
  const res = await fetch(archivo, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se encontró el banco de reactivos de ${ETIQUETAS_EXAMEN[parcial]} (HTTP ${res.status})`);
  const banco = await res.json();
  bancosExamenCache[parcial] = banco;
  return banco;
}

async function descargarExamenAlumno(alumnoId, parcial) {
  const alumno = alumnosCache.find(a => a.id === alumnoId);
  if (!alumno) return;
  try {
    const [snap, banco] = await Promise.all([getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'intentos', parcial)), cargarBancoExamen(parcial)]);
    if (!snap.exists()) { alert('Este alumno no tiene un examen registrado en este parcial.'); return; }
    await reporteExamenAlumno({ nombreGrupo: nombreDelGrupo(), alumno, parcial, intento: snap.data(), banco });
  } catch (err) { console.error(err); alert('No se pudo generar el examen: ' + (err.message || err)); }
}

async function descargarExamenesGrupo(parcial) {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  if (alumnosCache.length === 0) { alert('Este grupo no tiene alumnos.'); return; }
  const btnTodos = document.getElementById('btn-descargar-examenes-grupo');
  const textoOriginal = btnTodos ? btnTodos.textContent : '';
  if (btnTodos) { btnTodos.disabled = true; btnTodos.textContent = 'Generando…'; }
  try {
    await cargarAlumnos();
    const banco = await cargarBancoExamen(parcial);
    const entregas = [];
    for (const alumno of alumnosCache) {
      let intento = null;
      try { const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'alumnos', alumno.id, 'intentos', parcial)); intento = snap.exists() ? snap.data() : null; } catch { /* nada */ }
      entregas.push({ alumno, intento });
    }
    await reporteExamenGrupo({ nombreGrupo: nombreDelGrupo(), parcial, entregas, banco });
  } catch (err) { console.error(err); alert('No se pudo generar el PDF: ' + (err.message || err)); }
  finally { if (btnTodos) { btnTodos.disabled = false; btnTodos.textContent = textoOriginal; } }
}

async function reabrirExamen(alumnoId, parcial) {
  const alumno = alumnosCache.find(a => a.id === alumnoId);
  if (!confirm(`¿Reabrir el examen de ${alumno?.nombre || 'este alumno'}?`)) return;
  const ref = doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'intentos', parcial);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const est = snap.data();
  const seg = est.segundosAlPausar ?? ((est.minutos || 60) * 60);
  await setDoc(ref, { ...est, estado: 'en_curso', segundosAlPausar: seg, minutosExtra: 0, reanudadoEn: Date.now(), reabiertoEn: new Date().toISOString(), actualizado: serverTimestamp() });
  await asegurarAcceso(parcial, [alumnoId]);
  const m = Math.floor(seg / 60), s = seg % 60;
  alert(`Examen reabierto. Continuará con ${m}:${String(s).padStart(2, '0')}.`);
}

// ---------- Permiso individual de examen ----------
let permisosIndividuales = {};
function permisoIndividual(parcial) { return permisosIndividuales[parcial] || []; }

async function cargarPermisos() {
  try {
    const snap = await getDoc(doc(db, 'grupos', grupoActivo, 'config', 'examenes'));
    const d = snap.exists() ? snap.data() : {};
    permisosIndividuales = d.individual || {};
    examenesAbiertos = Array.isArray(d.abiertos) ? d.abiertos : [];
  } catch { /* se queda lo que había */ }
}

async function cambiarPermiso(parcial, alumnoId, dar) {
  await cargarPermisos();
  const lista = new Set(permisoIndividual(parcial));
  if (dar) lista.add(alumnoId); else lista.delete(alumnoId);
  permisosIndividuales[parcial] = [...lista];
  await setDoc(doc(db, 'grupos', grupoActivo, 'config', 'examenes'), { individual: { [parcial]: [...lista] }, actualizado: serverTimestamp() }, { merge: true });
}

// Si el examen está cerrado para el grupo, reabrirle a alguien también le
// da permiso individual; si no, no podría verlo.
async function asegurarAcceso(parcial, alumnoIds) {
  await cargarPermisos();
  if (examenesAbiertos.includes(parcial)) return;
  const lista = new Set(permisoIndividual(parcial));
  alumnoIds.forEach(id => lista.add(id));
  permisosIndividuales[parcial] = [...lista];
  await setDoc(doc(db, 'grupos', grupoActivo, 'config', 'examenes'), { individual: { [parcial]: [...lista] }, actualizado: serverTimestamp() }, { merge: true });
}

// Intento que vuelve a quedar abierto con sus respuestas y N minutos por
// delante. Se quitan los datos de la entrega anterior; al volver a entregar,
// el examen se califica de nuevo con todas sus respuestas.
function intentoReabierto(est, minutos) {
  const { aciertos, total, calificacion, detalle, entregadoEn, automatico, ...resto } = est;
  return { ...resto, estado: 'en_curso', segundosAlPausar: minutos * 60, minutosExtra: 0,
    reanudadoEn: Date.now(), reabiertoEn: new Date().toISOString(), actualizado: serverTimestamp() };
}

function pedirMinutos(texto) {
  const n = parseInt(prompt(texto, '20'), 10);
  return isNaN(n) || n <= 0 ? null : n;
}

async function reabrirEntregado(alumnoId, parcial) {
  const alumno = alumnosCache.find(a => a.id === alumnoId);
  const ref = doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'intentos', parcial);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const est = snap.data();
  const aviso = parcial === 'diag' ? '' : '\n\nOjo: es un examen con valor. Al volver a entregar, su calificación se reemplaza por la nueva.';
  const n = pedirMinutos(`${alumno?.nombre || 'Este alumno'} ya entregó (${est.aciertos}/${est.total}${est.automatico ? ', por tiempo agotado' : ''}).\n\nSe reabre con sus respuestas guardadas. ¿Cuántos minutos le das?${aviso}`);
  if (!n) return;
  await setDoc(ref, intentoReabierto(est, n));
  await asegurarAcceso(parcial, [alumnoId]);
  alert(`Examen reabierto con ${n} minutos. Que el alumno recargue la página y entre de nuevo a Examen.`);
}

async function darTiempoAlGrupo(parcial, filas) {
  // Cuenta como pendiente todo el que lo abrió y no contestó TODO: en curso,
  // bloqueado, entregado por tiempo, o entregado a medias (incluso en blanco).
  const contestadas = est => Object.keys(est.respuestas || {}).length;
  const pendientes = filas.filter(f => f.est && (f.est.estado !== 'entregado' || f.est.automatico || contestadas(f.est) < (f.est.ids || []).length));
  const sinAbrir = filas.filter(f => !f.est).length;
  if (pendientes.length === 0) { alert('Nadie tiene el examen pendiente: todos los que lo abrieron contestaron todas las preguntas.' + (sinAbrir ? `\n\n${sinAbrir} alumno(s) no lo han abierto: al iniciarlo tendrán el tiempo completo.` : '')); return; }
  const n = pedirMinutos(`Se reabrirá el ${ETIQUETAS_EXAMEN[parcial]} a ${pendientes.length} alumno(s) que no terminaron:\n\n${pendientes.map(f => '• ' + f.alumno.nombre).join('\n')}\n\nConservan sus respuestas.${sinAbrir ? `\n(${sinAbrir} que no lo han abierto tendrán el tiempo completo al iniciarlo.)` : ''}\n\n¿Cuántos minutos les das a partir de ahora?`);
  if (!n) return;
  const ahora = Date.now();
  await asegurarAcceso(parcial, pendientes.map(f => f.alumno.id));
  await Promise.all(pendientes.map(f => setDoc(doc(db, 'grupos', grupoActivo, 'alumnos', f.alumno.id, 'intentos', parcial), { ...intentoReabierto(f.est, n), reanudadoEn: ahora })));
  alert(`Listo: ${pendientes.length} alumno(s) con ${n} minutos. Que recarguen la página y entren de nuevo a Examen.\n\nEl tiempo empieza a correr desde ahora; si lo harán mañana en clase, usa este botón mañana al iniciar.`);
}

async function darTiempoExtra(alumnoId, parcial) {
  const alumno = alumnosCache.find(a => a.id === alumnoId);
  const ref = doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'intentos', parcial);
  const snap = await getDoc(ref);
  if (!snap.exists()) { alert('Ese alumno todavía no ha iniciado el examen.'); return; }
  const est = snap.data();
  const base = est.segundosAlPausar ?? ((est.minutos || 60) * 60);
  const desde = est.reanudadoEn || est.iniciado;
  const restante = est.estado === 'bloqueado' ? base : Math.max(0, base + (est.minutosExtra || 0) * 60 - Math.floor((Date.now() - desde) / 1000));
  const rm = Math.floor(restante / 60), rs = restante % 60;
  const min = prompt(`${alumno?.nombre || 'Este alumno'} tiene ${rm}:${String(rs).padStart(2, '0')} restantes.\n\n¿Cuántos minutos EXTRA le agrego?`, '10');
  const n = parseInt(min, 10);
  if (isNaN(n) || n <= 0) return;
  await setDoc(ref, { ...est, minutosExtra: (est.minutosExtra || 0) + n, actualizado: serverTimestamp() });
  await asegurarAcceso(parcial, [alumnoId]);
  alert(`Se agregaron ${n} minutos.`);
}

async function ajustarCalificacionExamen(alumnoId, parcial) {
  const alumno = alumnosCache.find(a => a.id === alumnoId);
  const actualRef = doc(db, 'grupos', grupoActivo, 'alumnos', alumnoId, 'examenes', parcial);
  let actual = null;
  try { const snap = await getDoc(actualRef); actual = snap.exists() ? snap.data() : null; } catch { /* nada */ }
  const sugerido = actual && actual.calificacion !== undefined ? actual.calificacion : '';
  const etiquetaParcial = parcial === 'p2' ? `${ETIQUETAS_EXAMEN[parcial]} (solo la parte escrita)` : ETIQUETAS_EXAMEN[parcial];
  const val = prompt(`Calificación de examen para ${alumno?.nombre || 'este alumno'} — ${etiquetaParcial} (0-10).`, sugerido !== '' ? String(sugerido) : '');
  if (val === null) return;
  const calificacion = parseFloat(val);
  if (isNaN(calificacion) || calificacion < 0 || calificacion > 10) { alert('Escribe un número entre 0 y 10.'); return; }
  try { await setDoc(actualRef, { calificacion, origen: 'ajuste manual del docente', actualizado: serverTimestamp() }); }
  catch (err) { alert('No se pudo guardar el ajuste: ' + (err.message || err)); return; }
  alert(`Calificación actualizada a ${calificacion.toFixed(1)} / 10.`);
}

// ---------- HISTORIAL ----------
async function datosDeAlumno(alumnoId) {
  const base = ['grupos', grupoActivo, 'alumnos', alumnoId];
  const [alumnoSnap, catalogoSnap, tarSnap, partSnap, asisSnap, unifP1, unifP2, exaP1, exaP2, exaFinal, practicoP2, proyE1, proyE2, proyEF, actSnap] = await Promise.all([
    // Documento del alumno: ahí se guardan las decisiones de redondeo.
    getDoc(doc(db, ...base)).catch(() => null),
    // Catálogo de tareas del grupo: define cuántas tareas existen en cada
    // parcial. Es el denominador del promedio, para que una tarea del
    // catálogo que el alumno no entregó cuente como cero.
    getDocs(collection(db, 'grupos', grupoActivo, 'tareas_catalogo')).catch(() => null),
    getDocs(collection(db, ...base, 'tareas')).catch(() => null),
    getDocs(collection(db, ...base, 'participaciones')).catch(() => null),
    getDocs(collection(db, ...base, 'asistencias')).catch(() => null),
    getDoc(doc(db, ...base, 'uniformes', 'p1')).catch(() => null),
    getDoc(doc(db, ...base, 'uniformes', 'p2')).catch(() => null),
    getDoc(doc(db, ...base, 'examenes', 'p1')).catch(() => null),
    getDoc(doc(db, ...base, 'examenes', 'p2')).catch(() => null),
    getDoc(doc(db, ...base, 'examenes', 'final')).catch(() => null),
    getDoc(doc(db, ...base, 'practico', 'p2')).catch(() => null),
    getDoc(doc(db, ...base, 'proyecto', 'entrega1')).catch(() => null),
    getDoc(doc(db, ...base, 'proyecto', 'entrega2')).catch(() => null),
    getDoc(doc(db, ...base, 'proyecto', 'entregaFinal')).catch(() => null),
    getDocs(collection(db, ...base, 'actividades')).catch(() => null),
  ]);
  return {
    actividades: actSnap ? actSnap.docs.map(d => d.data()) : [],
    redondeos: alumnoSnap && alumnoSnap.exists() ? (alumnoSnap.data().redondeos || {}) : {},
    catalogoTareas: catalogoSnap ? catalogoSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [],
    // Se conserva el id del documento: es el mismo id que la tarea tiene en
    // el catálogo, y es con lo que se emparejan entregadas contra esperadas.
    tareas: tarSnap ? tarSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [],
    participaciones: partSnap ? partSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [],
    asistencias: asisSnap ? asisSnap.docs.map(d => d.data()) : [],
    uniformes: { p1: unifP1 && unifP1.exists() ? unifP1.data() : null, p2: unifP2 && unifP2.exists() ? unifP2.data() : null },
    examenes: { p1: exaP1 && exaP1.exists() ? exaP1.data() : null, p2: exaP2 && exaP2.exists() ? exaP2.data() : null, final: exaFinal && exaFinal.exists() ? exaFinal.data() : null },
    practico: { p2: practicoP2 && practicoP2.exists() ? practicoP2.data() : null },
    proyecto: { entrega1: proyE1 && proyE1.exists() ? proyE1.data() : null, entrega2: proyE2 && proyE2.exists() ? proyE2.data() : null, entregaFinal: proyEF && proyEF.exists() ? proyEF.data() : null },
  };
}

let parcialesReporte = ['p1', 'p2', 'final'];
function renderParcialesReporte() {
  const cont = document.getElementById('hist-parciales');
  if (!cont) return;
  cont.innerHTML = '';
  PARCIALES.forEach(p => {
    const incluido = parcialesReporte.includes(p);
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'asis-row ' + (incluido ? 'asis-presente' : 'asis-falta');
    row.innerHTML = `<span class="asis-dot"></span><span class="student-name">${NOMBRES_PARCIAL[p]}</span><span class="asis-estado-label">${incluido ? 'Incluido' : 'Omitido'}</span>`;
    row.addEventListener('click', () => {
      if (incluido) { if (parcialesReporte.length === 1) { alert('Deja al menos un parcial incluido.'); return; } parcialesReporte = parcialesReporte.filter(x => x !== p); }
      else { parcialesReporte = [...parcialesReporte, p]; }
      renderParcialesReporte();
    });
    cont.appendChild(row);
  });
}

on('hist-modo', 'change', () => { document.getElementById('hist-alumno-wrap').hidden = document.getElementById('hist-modo').value !== 'alumno'; });

function renderSelectHistAlumno() {
  const selectHist = document.getElementById('hist-alumno-select');
  if (!selectHist) return;
  const actual = selectHist.value;
  selectHist.innerHTML = '<option value="">— Elige un alumno —</option>';
  alumnosCache.forEach(a => { const opt = document.createElement('option'); opt.value = a.id; opt.textContent = a.nombre; selectHist.appendChild(opt); });
  if (actual && alumnosCache.some(a => a.id === actual)) selectHist.value = actual;
}

on('btn-pdf', 'click', generarPDF);

// Antes de cualquier reporte se vuelve a leer la lista de alumnos desde la
// base de datos. Así, si un nombre se corrigió (en esta pestaña, en otra
// ventana o en el celular), el reporte usa el registro nuevo y no uno viejo
// que ya quedó vacío — eso era lo que sacaba a un alumno en ceros.
async function refrescarAlumnos() {
  await cargarAlumnos();
  renderSelectHistAlumno();
}

// Revisa si hay calificaciones en la zona .51-.59 sin decidir. Si las hay,
// pregunta antes de generar. Devuelve false si el docente prefiere decidir
// primero.
function confirmarPendientes(lista) {
  const pendientes = [];
  lista.forEach(({ alumno, datos }) => {
    const res = {};
    PARCIALES.forEach(p => { res[p] = calcularParcial(p, datos); });
    zonaDeDecision(res, datos.redondeos).filter(x => x.calif.pendiente)
      .forEach(x => pendientes.push(`• ${alumno.nombre} — ${NOMBRES_REDONDEO[x.clave]}: ${x.calif.cruda.toFixed(2)}`));
  });
  if (pendientes.length === 0) return true;
  return confirm(`Hay ${pendientes.length} calificación(es) por decidir (¿subir o dejar?):\n\n${pendientes.slice(0, 12).join('\n')}${pendientes.length > 12 ? '\n…' : ''}\n\nPuedes decidirlas en "Redondeos por decidir", aquí mismo en Historial.\n\n¿Generar de todos modos? Saldrán marcadas como "por decidir".`);
}

async function generarPDF() {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  const modo = document.getElementById('hist-modo').value;
  const elegido = document.getElementById('hist-alumno-select').value;
  const msg = document.getElementById('export-msg');
  msg.textContent = 'Generando reporte…'; msg.hidden = false;
  try {
    await refrescarAlumnos();
    if (alumnosCache.length === 0) { alert('Este grupo no tiene alumnos.'); msg.hidden = true; return; }
    if (modo === 'alumno') {
      if (!elegido) { alert('Elige un alumno de la lista.'); msg.hidden = true; return; }
      const alumno = alumnosCache.find(a => a.id === elegido);
      if (!alumno) { alert('Ese alumno ya no está con ese nombre (probablemente se corrigió). La lista ya se actualizó: vuelve a elegirlo.'); msg.hidden = true; return; }
      const datos = await datosDeAlumno(alumno.id);
      if (!confirmarPendientes([{ alumno, datos }])) { msg.hidden = true; return; }
      await reporteAlumno({ nombreGrupo: nombreDelGrupo(), alumno, datos });
    } else {
      const alumnos = [];
      for (const alumno of alumnosCache) { alumnos.push({ alumno, datos: await datosDeAlumno(alumno.id) }); }
      if (!confirmarPendientes(alumnos)) { msg.hidden = true; return; }
      await reporteGrupo({ nombreGrupo: nombreDelGrupo(), grupoId: grupoActivo, alumnos, parciales: parcialesReporte });
    }
    msg.textContent = '✓ Reporte abierto en una ventana nueva.';
    setTimeout(() => { msg.hidden = true; }, 4000);
  } catch (err) { console.error(err); msg.textContent = 'No se pudo generar el reporte: ' + (err.message || err); }
}

// ---------- REDONDEOS POR DECIDIR ----------
// Lista de calificaciones en la zona .51-.59 (como 9.52). El docente decide
// si sube o se queda; la decisión se guarda en el documento del alumno.
async function cargarRedondeos() {
  const cont = document.getElementById('hist-redondeos');
  if (!cont) return;
  if (!grupoActivo || alumnosCache.length === 0) { cont.innerHTML = '<p class="empty-inline">Sin alumnos.</p>'; return; }
  cont.innerHTML = '<p class="empty-inline">Revisando calificaciones…</p>';
  const items = [];
  for (const alumno of alumnosCache) {
    let datos;
    try { datos = await datosDeAlumno(alumno.id); } catch { continue; }
    const res = {};
    PARCIALES.forEach(p => { res[p] = calcularParcial(p, datos); });
    zonaDeDecision(res, datos.redondeos).forEach(x => items.push({ alumno, ...x }));
  }
  if (items.length === 0) {
    cont.innerHTML = '<p class="empty-inline">✓ No hay calificaciones entre .51 y .59. Todo se redondea solo.</p>';
    return;
  }
  const pend = items.filter(x => x.calif.pendiente).length;
  cont.innerHTML = `
    <p class="field-hint" style="margin-top:0;">${pend > 0 ? `<strong>${pend} por decidir.</strong> ` : '✓ Todas decididas. '}Puedes cambiar una decisión cuando quieras.</p>
    ${items.map((x, i) => `
      <div class="redondeo-row${x.calif.pendiente ? ' redondeo-pend' : ''}">
        <div class="redondeo-info">
          <span class="student-name">${escaparHTML(x.alumno.nombre)}</span>
          <span class="redondeo-detalle">${NOMBRES_REDONDEO[x.clave]}: <strong>${x.calif.cruda.toFixed(2)}</strong>${x.calif.pendiente ? ' · por decidir' : ` · quedó en ${x.calif.oficial}`}</span>
        </div>
        <div class="redondeo-botones">
          <button type="button" class="mz-btn${x.calif.decidido && x.calif.oficial === x.calif.arriba ? ' mz-btn-fuerte' : ''}" data-r="${i}" data-valor="${x.calif.arriba}">Subir a ${x.calif.arriba}</button>
          <button type="button" class="mz-btn${x.calif.decidido && x.calif.oficial === x.calif.abajo ? ' mz-btn-fuerte' : ''}" data-r="${i}" data-valor="${x.calif.abajo}">Dejar en ${x.calif.abajo}</button>
        </div>
      </div>`).join('')}`;
  cont.querySelectorAll('[data-r]').forEach(btn => btn.addEventListener('click', async () => {
    const x = items[Number(btn.dataset.r)];
    const valor = Number(btn.dataset.valor);
    cont.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      await setDoc(doc(db, 'grupos', grupoActivo, 'alumnos', x.alumno.id),
        { redondeos: { [x.clave]: { centesimas: x.calif.centesimas, valor, decidido: serverTimestamp() } } }, { merge: true });
    } catch (err) {
      alert('No se pudo guardar la decisión: ' + (err.message || err));
    }
    await cargarRedondeos();
    vistaRapida('historial', { db, grupoActivo, alumnos: alumnosCache, datosDeAlumno });
  }));
}

function cargarHistorial() {
  const cont = document.getElementById('hist-lista-alumnos');
  const empty = document.getElementById('historial-empty');
  const resumen = document.getElementById('hist-resumen');
  if (!cont) return;
  cont.innerHTML = ''; resumen.hidden = true;
  renderParcialesReporte(); renderSelectHistAlumno(); cargarRedondeos();
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }
  if (alumnosCache.length === 0) { empty.hidden = false; empty.textContent = 'Este grupo aún no tiene alumnos.'; return; }
  empty.hidden = true;
  alumnosCache.forEach(a => {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'asis-row';
    row.innerHTML = `<span class="student-name">${escaparHTML(a.nombre)}</span><span class="asis-estado-label">Ver resumen →</span>`;
    row.addEventListener('click', () => mostrarResumenAlumno(a));
    cont.appendChild(row);
  });
}

async function mostrarResumenAlumno(alumno) {
  const resumen = document.getElementById('hist-resumen');
  resumen.hidden = false;
  resumen.innerHTML = `<p class="eval-alumno-activo">Resumen de: ${escaparHTML(alumno.nombre)}</p><p class="empty-inline">Cargando…</p>`;
  resumen.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const datos = await datosDeAlumno(alumno.id);
  const resultados = {};
  PARCIALES.forEach(p => { resultados[p] = calcularParcial(p, datos); });
  const cuatri = calcularCuatrimestreRedondeado(resultados, datos.redondeos);

  const filaRubro = (nombre, pts, tope) => `<div class="res-row"><span>${nombre}</span><strong>${pts.toFixed(1)} / ${tope}</strong></div>`;
  const listaDetalleHTML = (lista, vacio, conCalificacion) => {
    if (!lista || lista.length === 0) return `<p class="empty-inline">${vacio}</p>`;
    const filas = lista.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .map(x => `<li>${escaparHTML(x.fecha || 'sin fecha')} — ${escaparHTML(x.nombre || '')}${conCalificacion ? `: <strong>${(Number(x.calificacion) || 0).toFixed(1)}/10</strong>` : ''}</li>`).join('');
    return `<ul style="margin:6px 0 0; padding-left:18px; font-size:.85em;">${filas}</ul>`;
  };
  // Lista de tareas que marca explícitamente las no entregadas.
  const listaTareasHTML = (entregadas, faltantes) => {
    const items = [
      ...(entregadas || []).map(x => ({ ...x, entregada: true })),
      ...(faltantes || []).map(x => ({ ...x, entregada: false })),
    ];
    if (items.length === 0) return `<p class="empty-inline">Sin tareas registradas.</p>`;
    const filas = items.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .map(x => x.entregada
        ? `<li>${escaparHTML(x.fecha || 'sin fecha')} — ${escaparHTML(x.nombre || '')}: <strong>${(Number(x.calificacion) || 0).toFixed(1)}/10</strong></li>`
        : `<li>${escaparHTML(x.fecha || 'sin fecha')} — ${escaparHTML(x.nombre || '')}: <strong>no entregada (0/10)</strong></li>`)
      .join('');
    return `<ul style="margin:6px 0 0; padding-left:18px; font-size:.85em;">${filas}</ul>`;
  };
  const etiquetaTareas = (r) => `Tareas (${r.esperadas ? `${r.entregadas} de ${r.esperadas} entregadas` : 'sin tareas registradas'})`;

  resumen.innerHTML = `
    <p class="eval-alumno-activo">Resumen de: ${escaparHTML(alumno.nombre)}</p>
    ${PARCIALES.map(p => {
      const r = resultados[p];
      const esFinal = p === 'final';
      const esP2 = p === 'p2';
      let cuerpo;
      if (esFinal) {
        cuerpo = filaRubro('Examen', r.examen.pts, r.examen.tope) +
          filaRubro('Proyecto — Entrega 1', r.proyecto.detalle.entrega1.pts, r.proyecto.detalle.entrega1.tope) +
          filaRubro('Proyecto — Entrega 2', r.proyecto.detalle.entrega2.pts, r.proyecto.detalle.entrega2.tope) +
          filaRubro('Proyecto — Entrega final', r.proyecto.detalle.entregaFinal.pts, r.proyecto.detalle.entregaFinal.tope) +
          filaRubro('Tareas y Participación', r.tareasParticipacion.pts, r.tareasParticipacion.tope) +
          filaRubro('Asistencia', r.asistencia.pts, r.asistencia.tope) +
          `<details class="prog-detalle-bloque" style="margin-top:8px;"><summary>Ver fechas — Tareas y Participación</summary>${listaDetalleHTML([...r.tareasParticipacion.lista], 'Sin capturas.', true)}</details>`;
      } else if (esP2) {
        cuerpo = filaRubro('Examen escrito', r.examenEscrito.pts, r.examenEscrito.tope) +
          filaRubro('Examen práctico', r.practico.pts, r.practico.tope) +
          filaRubro(etiquetaTareas(r.tareas), r.tareas.pts, r.tareas.tope) +
          filaRubro(`Participación (${r.participacion.texto})`, r.participacion.pts, r.participacion.tope) +
          filaRubro('Asistencia', r.asistencia.pts, r.asistencia.tope) +
          filaRubro('Uniformes', r.uniformes.pts, r.uniformes.tope) +
          `<details class="prog-detalle-bloque" style="margin-top:8px;"><summary>Ver fechas — Tareas y Participación</summary><p class="field-hint" style="margin:8px 0 2px;">Tareas:</p>${listaTareasHTML(r.tareas.lista, r.tareas.faltantes)}<p class="field-hint" style="margin:10px 0 2px;">Participación:</p>${listaDetalleHTML(r.participacion.lista, 'Sin participación capturada.', false)}</details>`;
      } else {
        cuerpo = filaRubro('Examen', r.examen.pts, r.examen.tope) +
          filaRubro(etiquetaTareas(r.tareas), r.tareas.pts, r.tareas.tope) +
          filaRubro(`Participación (${r.participacion.texto})`, r.participacion.pts, r.participacion.tope) +
          filaRubro('Asistencia', r.asistencia.pts, r.asistencia.tope) +
          filaRubro('Uniformes', r.uniformes.pts, r.uniformes.tope) +
          `<details class="prog-detalle-bloque" style="margin-top:8px;"><summary>Ver fechas — Tareas y Participación</summary><p class="field-hint" style="margin:8px 0 2px;">Tareas:</p>${listaTareasHTML(r.tareas.lista, r.tareas.faltantes)}<p class="field-hint" style="margin:10px 0 2px;">Participación:</p>${listaDetalleHTML(r.participacion.lista, 'Sin participación capturada.', false)}</details>`;
      }
      return `<div class="res-card"><h4>${NOMBRES_PARCIAL[p]}</h4>${cuerpo}<div class="res-row res-total"><span>Total</span><strong>${r.total.toFixed(1)} / 100 pts</strong></div><div class="res-row res-total"><span>Calificación (redondeada)</span><strong>${textoCalificacion(r.calif)}</strong></div></div>`;
    }).join('')}
    <div class="score-display">Calificación del cuatrimestre: ${textoCalificacion(cuatri.calif)} / 10</div>
    <p class="field-hint">Promedio de Parcial 1 y Parcial 2 (ya redondeados), promediado con el Examen Final (redondeado): ${cuatri.promedio.toFixed(2)}.${cuatri.bloquesPendientes.length ? ' Hay bloques por decidir en "Redondeos por decidir".' : ''}</p>
  `;
}

on('btn-exportar', 'click', exportarCalificaciones);

async function exportarCalificaciones() {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  if (alumnosCache.length === 0) { alert('Este grupo no tiene alumnos.'); return; }
  const msg = document.getElementById('export-msg');
  msg.textContent = 'Preparando archivo…'; msg.hidden = false;

  try { await refrescarAlumnos(); } catch { /* se usa la lista que ya está */ }
  const filas = [['Alumno', 'Parcial', 'Examen escrito', 'Examen práctico', 'Proyecto', 'Tareas', 'Tareas entregadas', 'Participación', 'Asistencia', 'Uniformes', 'TOTAL (100)', 'Calificación sin redondear', 'Calificación redondeada']];
  for (const alumno of alumnosCache) {
    const datos = await datosDeAlumno(alumno.id);
    const resultados = {};
    PARCIALES.forEach(p => {
      const r = calcularParcial(p, datos);
      resultados[p] = r;
      const califs = [r.calif.cruda.toFixed(2), r.calif.pendiente ? 'POR DECIDIR' : String(r.calif.oficial)];
      if (p === 'final') {
        filas.push([alumno.nombre, NOMBRES_PARCIAL[p], r.examen.pts.toFixed(1), '—', r.proyecto.pts.toFixed(1), r.tareasParticipacion.pts.toFixed(1), '—', '—', r.asistencia.pts.toFixed(1), '—', r.total.toFixed(1), ...califs]);
      } else if (p === 'p2') {
        filas.push([alumno.nombre, NOMBRES_PARCIAL[p], r.examenEscrito.pts.toFixed(1), r.practico.pts.toFixed(1), '—', r.tareas.pts.toFixed(1), `${r.tareas.entregadas ?? 0} de ${r.tareas.esperadas ?? 0}`, r.participacion.pts.toFixed(1), r.asistencia.pts.toFixed(1), r.uniformes.pts.toFixed(1), r.total.toFixed(1), ...califs]);
      } else {
        filas.push([alumno.nombre, NOMBRES_PARCIAL[p], r.examen.pts.toFixed(1), '—', '—', r.tareas.pts.toFixed(1), `${r.tareas.entregadas ?? 0} de ${r.tareas.esperadas ?? 0}`, r.participacion.pts.toFixed(1), r.asistencia.pts.toFixed(1), r.uniformes.pts.toFixed(1), r.total.toFixed(1), ...califs]);
      }
    });
    const cuatri = calcularCuatrimestreRedondeado(resultados, datos.redondeos);
    filas.push([alumno.nombre, 'CUATRIMESTRE', '', '', '', '', '', '', '', '', '', cuatri.promedio.toFixed(2), cuatri.calif.pendiente ? 'POR DECIDIR' : String(cuatri.calif.oficial)]);
  }

  const csv = (arr) => arr.map(f => f.map(v => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
  const contenido = '\uFEFF' + `CALIFICACIONES — ${nombreDelGrupo()}\nGenerado: ${new Date().toLocaleString('es-MX')}\n\n` + csv(filas);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `calificaciones-grupo-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  msg.textContent = '✓ Archivo descargado. Ábrelo con Excel.';
  setTimeout(() => { msg.hidden = true; }, 4000);
}

// ---------- AVISOS ----------
on('btn-publicar-aviso', 'click', publicarAviso);

async function cargarAvisos() {
  const cont = document.getElementById('avisos-lista');
  const empty = document.getElementById('avisos-empty');
  cont.innerHTML = '';
  if (!grupoActivo) { empty.hidden = false; empty.textContent = 'Elige un grupo primero.'; return; }
  const snap = await getDocs(query(collection(db, 'grupos', grupoActivo, 'avisos'), orderBy('creado', 'desc')));
  empty.hidden = !snap.empty;
  if (snap.empty) { empty.textContent = 'Aún no has publicado avisos en este grupo.'; return; }
  snap.forEach(d => {
    const a = d.data();
    const div = document.createElement('div');
    div.className = 'aviso-card';
    div.innerHTML = `<div class="aviso-card-top"><span class="aviso-card-titulo">${escaparHTML(a.titulo || 'Sin título')}</span><button type="button" class="btn-delete-student" data-id="${d.id}">Eliminar</button></div><div class="aviso-card-texto">${escaparHTML(a.texto || '')}</div>`;
    div.querySelector('.btn-delete-student').addEventListener('click', async () => {
      if (!confirm('¿Eliminar este aviso?')) return;
      await deleteDoc(doc(db, 'grupos', grupoActivo, 'avisos', d.id));
      cargarAvisos();
    });
    cont.appendChild(div);
  });
}

async function publicarAviso() {
  if (!grupoActivo) { alert('Elige un grupo primero.'); return; }
  const titulo = document.getElementById('aviso-titulo').value.trim();
  const texto = document.getElementById('aviso-texto').value.trim();
  if (!titulo && !texto) { alert('Escribe al menos un título o contenido.'); return; }
  try { await addDoc(collection(db, 'grupos', grupoActivo, 'avisos'), { titulo, texto, creado: serverTimestamp() }); }
  catch (err) { marcarResultado('btn-publicar-aviso', 'aviso-msg', false, '', 'No se pudo publicar: ' + (err.message || err)); return; }
  document.getElementById('aviso-titulo').value = ''; document.getElementById('aviso-texto').value = '';
  marcarResultado('btn-publicar-aviso', 'aviso-msg', true, '✓ Aviso publicado.', '');
  cargarAvisos();
}