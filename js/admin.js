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
import { BASE, enEquipo, formacionDe, formaciones, ordenFormaciones, formacionDeTarea, equiposDe, tareasDeFormacion, urlUnir, qrSvg } from "./equipos.js";
import { TEMAS_TAREAS, TAREAS_DIG, califica, catalogoId, nombreCatalogo, sugerirAtlas, sugerirCuadro, sugerirDesarma, CUADRO_MM, INFLUENCIAS, sugerirInfluencias } from "./clase-datos.js";

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
  if (tab === 'tareas') { cargarCatalogo('tareas'); cargarTareasDig(); }
  if (tab === 'participacion') cargarCatalogo('participaciones');
  if (tab === 'proyecto') cargarProyecto();
  if (tab === 'equipos') cargarEquiposTab();
  if (tab === 'monitor') iniciarMonitor(); else detenerMonitor();
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

// ---- Equipos (grupos/{g}/equipos/{id}; su trabajo en .../equipos/{id}/atlas/{tarea})
// Se arman por «formaciones»: cada vez que formas equipos (con QR o a mano) queda una
// formación, y cada tarea en equipo usa una (grupos/{g}.equiposTarea[tarea] = formación).
// Así reutilizas los mismos equipos en varias tareas o formas nuevos solo para una.
const LETRAS_COD = 'ACDEFHJKMNPRTUVWXY3479';
let ATLAS_DATA = null;
let EQUIPOS = [], eqUnsub = null, gEqUnsub = null, eqGrupo = null, G_DATA = {}, FSEL = BASE, QR_FID = BASE, NUEVA_PARA = '';
const ordenEq = (a, b) => (a.numero || 999) - (b.numero || 999) || (a.nombre || '').localeCompare(b.nombre || '', 'es');
const eqDeF = fid => equiposDe(EQUIPOS, fid).sort(ordenEq);
const nombreF = fid => (formaciones(G_DATA)[fid] || {}).nombre || 'Equipos';
const tareasF = fid => tareasDeFormacion(G_DATA, fid, TAREAS_DIG);
const nombreTareaCorto = a => `${a.tema} · ${a.nombre}`;
function codigoNuevo(usados) { let c; do { c = Array.from({ length: 4 }, () => LETRAS_COD[Math.floor(Math.random() * LETRAS_COD.length)]).join(''); } while (usados.has(c)); usados.add(c); return c; }
function escucharEquiposAdmin() {
  if (!grupoActivo) return;
  if (eqGrupo === grupoActivo && eqUnsub) return;
  if (eqUnsub) eqUnsub(); if (gEqUnsub) gEqUnsub();
  eqGrupo = grupoActivo; EQUIPOS = []; G_DATA = {}; FSEL = BASE;
  gEqUnsub = onSnapshot(doc(db, 'grupos', grupoActivo), sn => { G_DATA = sn.exists() ? sn.data() : {}; if (!formaciones(G_DATA)[FSEL]) FSEL = BASE; refrescarEquiposUI(); }, () => {});
  eqUnsub = onSnapshot(collection(db, 'grupos', grupoActivo, 'equipos'), sn => { EQUIPOS = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort(ordenEq); refrescarEquiposUI(); }, () => {});
}
function refrescarEquiposUI() {
  pintarEquipos();
  pintarTdEquipos();
  if (!document.getElementById('qr-proyeccion').hidden) pintarProyeccion();
}
function cargarEquiposTab() {
  const cont = document.getElementById('equipos-lista'); if (!cont) return;
  if (!grupoActivo) { cont.innerHTML = '<p class="empty-inline">Elige un grupo primero.</p>'; return; }
  escucharEquiposAdmin(); pintarEquipos();
}
function irAEquipos(fid, nuevaPara) {
  FSEL = fid || FSEL; NUEVA_PARA = nuevaPara || '';
  const b = document.querySelector('.tab-btn[data-tab="equipos"]'); if (b) b.click();
  pintarEquipos();
  if (nuevaPara) { const f = document.getElementById('eqn-nombre'); if (f) setTimeout(() => f.focus(), 50); }
  document.getElementById('tab-equipos').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function pintarEquipos() {
  const lista = document.getElementById('equipos-lista'); if (!lista || !grupoActivo) return;
  const F = formaciones(G_DATA), f = F[FSEL] || F[BASE];
  // formaciones
  document.getElementById('eq-formaciones').innerHTML = ordenFormaciones(G_DATA).map(([fid, x]) => `<button type="button" class="chip-mon" data-f="${fid}" aria-pressed="${fid === FSEL}">${x.abiertas ? '🔓' : '🔒'} ${escaparHTML(x.nombre)} <small>· ${eqDeF(fid).length} equipo${eqDeF(fid).length === 1 ? '' : 's'}</small></button>`).join('')
    + `<button type="button" class="chip-mon eq-nueva-btn" id="eq-nueva-abrir" aria-pressed="${!!NUEVA_PARA || document.getElementById('eq-nueva').hidden === false}">➕ Formar equipos nuevos</button>`;
  document.querySelectorAll('#eq-formaciones [data-f]').forEach(b => b.addEventListener('click', () => { FSEL = b.dataset.f; NUEVA_PARA = ''; document.getElementById('eq-nueva').hidden = true; pintarFormEquipo(null); pintarEquipos(); }));
  document.getElementById('eq-nueva-abrir').addEventListener('click', () => { const n = document.getElementById('eq-nueva'); n.hidden = !n.hidden; if (!n.hidden) pintarNueva(); pintarEquipos(); });
  if (NUEVA_PARA) { document.getElementById('eq-nueva').hidden = false; pintarNueva(); }
  // cabecera de la formación elegida
  const usan = tareasF(FSEL);
  document.getElementById('eq-f-cab').innerHTML = `<div class="eq-f-tit"><h3 class="section-title" style="margin:0">👥 ${escaparHTML(f.nombre)}</h3><button type="button" class="btn btn-small" id="eq-f-ren">✏️ Renombrar</button>${FSEL !== BASE && !usan.length ? '<button type="button" class="btn btn-small" id="eq-f-del">Eliminar</button>' : ''}</div>
    <p class="eq-f-usan"><b>La usan:</b> ${usan.length ? usan.map(a => `<span class="eq-tag">${a.icono} ${escaparHTML(nombreTareaCorto(a))}</span>`).join(' ') : '<i>ninguna tarea todavía</i> (asígnala en Tareas → Tareas digitales, botón 👥)'}</p>`;
  document.getElementById('eq-f-ren').addEventListener('click', async () => {
    const n = prompt('Nombre de esta formación de equipos:', f.nombre); if (!n || !n.trim()) return;
    await setDoc(doc(db, 'grupos', grupoActivo), { formaciones: { [FSEL]: { nombre: n.trim() } } }, { merge: true });
  });
  const bd = document.getElementById('eq-f-del');
  if (bd) bd.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar «${f.nombre}» y sus ${eqDeF(FSEL).length} equipos? Ninguna tarea la usa.`)) return;
    const fid = FSEL; FSEL = BASE;
    await Promise.all(eqDeF(fid).map(e => deleteDoc(doc(db, 'grupos', grupoActivo, 'equipos', e.id))));
    await updateDoc(doc(db, 'grupos', grupoActivo), { [`formaciones.${fid}`]: deleteField() });
  });
  const ab = document.getElementById('eq-abierto');
  ab.setAttribute('aria-pressed', String(!!f.abiertas)); ab.textContent = f.abiertas ? '🔓 Inscripciones abiertas' : '🔒 Inscripciones cerradas';
  const mios = eqDeF(FSEL);
  const nombreDe = id => (alumnosCache.find(a => a.id === id) || {}).nombre || id;
  const enEq = new Set(mios.flatMap(e => e.integrantes || []));
  const sin = alumnosCache.filter(a => !enEq.has(a.id));
  document.getElementById('eq-sin-lista').textContent = sin.length ? sin.map(a => a.nombre).join(', ') : 'nadie, ¡todos tienen equipo!';
  lista.innerHTML = mios.length ? `<div class="equipos-grid">${mios.map(eq => {
    const n = (eq.integrantes || []).length, lleno = eq.max && n >= eq.max;
    return `<div class="equipo-card"><div class="eq-card-cab"><div><b>${escaparHTML(eq.nombre)}</b>${eq.codigo ? `<span class="eq-codigo">${escaparHTML(eq.codigo)}</span>` : ''}</div>${eq.codigo ? `<button type="button" class="eq-qr-mini" data-eq-qr="${eq.id}" title="Ver el QR en grande">${qrSvg(urlUnir(eq.codigo), { titulo: eq.nombre })}</button>` : ''}</div>
      <p class="eq-cupo ${lleno ? 'lleno' : ''}">${n}${eq.max ? ` de ${eq.max}` : ''} integrante${n === 1 && !eq.max ? '' : 's'}${lleno ? ' · completo' : ''}</p>
      <p>${(eq.integrantes || []).map(i => escaparHTML(nombreDe(i))).join(', ') || '<i>sin integrantes</i>'}</p>
      <div><button type="button" class="btn btn-small" data-eq-edit="${eq.id}">Editar</button> <button type="button" class="btn btn-small" data-eq-del="${eq.id}">Eliminar</button></div></div>`;
  }).join('')}</div>` : '<p class="empty-inline">Esta formación todavía no tiene equipos: genéralos con QR o ármalos a mano.</p>';
  if (!document.getElementById('equipo-id').value) pintarFormEquipo(null);
  lista.querySelectorAll('[data-eq-qr]').forEach(b => b.addEventListener('click', () => abrirProyeccion(FSEL, false, b.dataset.eqQr)));
  lista.querySelectorAll('[data-eq-edit]').forEach(b => b.addEventListener('click', () => { pintarFormEquipo(EQUIPOS.find(x => x.id === b.dataset.eqEdit)); document.getElementById('equipo-nombre').focus(); }));
  lista.querySelectorAll('[data-eq-del]').forEach(b => b.addEventListener('click', async () => {
    const eq = EQUIPOS.find(x => x.id === b.dataset.eqDel);
    if (!confirm(`¿Eliminar el equipo «${eq.nombre}»? Sus integrantes ya no verán el trabajo del equipo (lo que escribieron no se borra).`)) return;
    await deleteDoc(doc(db, 'grupos', grupoActivo, 'equipos', eq.id));
  }));
}
// formulario «Formar equipos nuevos»: nombre, para qué tarea, cuántos y de cuántos
function pintarNueva() {
  const caja = document.getElementById('eq-nueva'); if (caja._para === NUEVA_PARA && caja.innerHTML) return; caja._para = NUEVA_PARA;
  const equipo = Object.values(TAREAS_DIG).filter(enEquipo);
  const hoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  const sug = NUEVA_PARA ? `Equipos para ${TAREAS_DIG[NUEVA_PARA].nombre}` : `Equipos del ${hoy}`;
  caja.innerHTML = `<h4 class="eq-sub" style="margin-top:0">➕ Formar equipos nuevos</h4>
    <p class="field-hint">Los equipos que ya tienes no se tocan: las tareas que los usan los siguen usando. Los nuevos tendrán sus propios códigos QR.</p>
    <label class="field-label" for="eqn-nombre">Nombre de esta formación</label><input id="eqn-nombre" type="text" maxlength="60" value="${escaparHTML(sug)}">
    <label class="field-label" for="eqn-tarea">¿Para qué tarea?</label><select id="eqn-tarea"><option value="">Ninguna por ahora (la asigno después)</option>${equipo.map(a => `<option value="${a.id}" ${a.id === NUEVA_PARA ? 'selected' : ''}>${escaparHTML(nombreTareaCorto(a))} — hoy usa «${escaparHTML(nombreF(formacionDeTarea(G_DATA, a.id)))}»</option>`).join('')}</select>
    <div class="eq-generar"><span>Generar</span><input id="eqn-n" type="number" min="1" max="20" value="6" aria-label="Número de equipos"><span>equipos de máximo</span><input id="eqn-max" type="number" min="1" max="15" value="4" aria-label="Máximo de integrantes"><span>integrantes, con código QR</span></div>
    <div class="equipo-botones"><button type="button" class="btn btn-primary" id="eqn-crear">Crear y generar los QR</button><button type="button" class="btn" id="eqn-cancelar">Cancelar</button></div>`;
  document.getElementById('eqn-cancelar').addEventListener('click', () => { NUEVA_PARA = ''; caja.hidden = true; caja._para = null; pintarEquipos(); });
  document.getElementById('eqn-crear').addEventListener('click', async () => {
    const nombre = document.getElementById('eqn-nombre').value.trim() || sug, tarea = document.getElementById('eqn-tarea').value;
    const n = Math.min(20, Math.max(1, parseInt(document.getElementById('eqn-n').value, 10) || 0)), max = Math.min(15, Math.max(1, parseInt(document.getElementById('eqn-max').value, 10) || 0));
    if (tarea && !confirm(`«${TAREAS_DIG[tarea].nombre}» va a usar estos equipos nuevos. Lo que ya hayan trabajado en ella con los equipos anteriores no se borra (vuelve a aparecer si regresas a esos equipos). ¿Continuar?`)) return;
    const fid = 'f' + Date.now().toString(36);
    await setDoc(doc(db, 'grupos', grupoActivo), { formaciones: { [fid]: { nombre, creada: Date.now(), abiertas: true } }, ...(tarea ? { equiposTarea: { [tarea]: fid } } : {}) }, { merge: true });
    await generarEquipos(fid, n, max);
    FSEL = fid; NUEVA_PARA = ''; caja.hidden = true; caja._para = null; pintarEquipos();
  });
}
async function generarEquipos(fid, n, max) {
  const base = Math.max(0, ...eqDeF(fid).map(x => x.numero || 0)), usados = new Set(EQUIPOS.map(e => e.codigo));
  await Promise.all(Array.from({ length: n }, (_, i) => setDoc(doc(db, 'grupos', grupoActivo, 'equipos', 'e' + Date.now().toString(36) + i),
    { nombre: `Equipo ${base + i + 1}`, numero: base + i + 1, codigo: codigoNuevo(usados), max, formacion: fid, integrantes: [], nombres: [], actualizado: serverTimestamp() })));
}
function pintarFormEquipo(eq) {
  document.getElementById('equipo-id').value = eq ? eq.id : '';
  document.getElementById('equipo-nombre').value = eq ? eq.nombre : '';
  document.getElementById('equipo-guardar').textContent = eq ? 'Guardar cambios' : 'Crear equipo';
  document.getElementById('equipo-cancelar').hidden = !eq;
  const enOtro = {}; eqDeF(FSEL).forEach(x => { if (!eq || x.id !== eq.id) (x.integrantes || []).forEach(i => { enOtro[i] = x.nombre; }); });
  const mios = new Set(eq ? eq.integrantes || [] : []);
  document.getElementById('equipo-alumnos').innerHTML = alumnosCache.map(a => `<label class="${enOtro[a.id] ? 'en-otro' : ''}"><input type="checkbox" value="${a.id}" ${mios.has(a.id) ? 'checked' : ''}> ${escaparHTML(a.nombre)}${enOtro[a.id] ? ` <small>(en «${escaparHTML(enOtro[a.id])}»)</small>` : ''}</label>`).join('');
}
const nombresDe = ids => ids.map(i => (alumnosCache.find(a => a.id === i) || {}).nombre || i);
on('equipo-cancelar', 'click', () => pintarFormEquipo(null));
on('equipo-form', 'submit', async ev => {
  ev.preventDefault();
  const msg = document.getElementById('equipo-msg');
  const nombre = document.getElementById('equipo-nombre').value.trim();
  const ids = [...document.querySelectorAll('#equipo-alumnos input:checked')].map(i => i.value);
  if (!nombre || !ids.length) { msg.textContent = 'Escribe el nombre del equipo y elige al menos un integrante.'; msg.hidden = false; return; }
  const idEd = document.getElementById('equipo-id').value, id = idEd || ('e' + Date.now().toString(36));
  const previo = EQUIPOS.find(x => x.id === idEd) || {}, fid = idEd ? formacionDe(previo) : FSEL;
  try {
    // en una misma formación, un alumno solo puede estar en un equipo: se quita de los demás
    await Promise.all(eqDeF(fid).filter(x => x.id !== id && (x.integrantes || []).some(i => ids.includes(i))).map(x => {
      const integ = x.integrantes.filter(i => !ids.includes(i));
      return updateDoc(doc(db, 'grupos', grupoActivo, 'equipos', x.id), { integrantes: integ, nombres: nombresDe(integ) });
    }));
    await setDoc(doc(db, 'grupos', grupoActivo, 'equipos', id), {
      nombre, integrantes: ids, nombres: nombresDe(ids), codigo: previo.codigo || codigoNuevo(new Set(EQUIPOS.map(e => e.codigo))), max: Math.max(previo.max || 0, ids.length) || ids.length,
      numero: previo.numero || (Math.max(0, ...eqDeF(fid).map(x => x.numero || 0)) + 1), formacion: fid, actualizado: serverTimestamp()
    }, { merge: true });
    pintarFormEquipo(null);
    msg.textContent = 'Equipo guardado ✓'; msg.hidden = false; setTimeout(() => { msg.hidden = true; }, 2500);
  } catch (e) { msg.textContent = 'No se pudo guardar: ' + (e.message || e); msg.hidden = false; }
});
on('eq-generar', 'click', async () => {
  if (!grupoActivo) return;
  const n = Math.min(20, Math.max(1, parseInt(document.getElementById('eq-n').value, 10) || 0)), max = Math.min(15, Math.max(1, parseInt(document.getElementById('eq-max').value, 10) || 0));
  if (!confirm(`¿Agregar ${n} equipo${n === 1 ? '' : 's'} de máximo ${max} integrantes a «${nombreF(FSEL)}», cada uno con su código QR?${eqDeF(FSEL).length ? ' Los equipos que ya tiene se conservan.' : ''}`)) return;
  await generarEquipos(FSEL, n, max);
  if (!formaciones(G_DATA)[FSEL].abiertas) await alternarInscripciones(FSEL, true);
});
async function alternarInscripciones(fid, valor) {
  const v = typeof valor === 'boolean' ? valor : !formaciones(G_DATA)[fid].abiertas;
  await setDoc(doc(db, 'grupos', grupoActivo), { formaciones: { [fid]: { abiertas: v } }, ...(fid === BASE ? { equiposAbiertos: v } : {}) }, { merge: true });
}
on('eq-abierto', 'click', () => alternarInscripciones(FSEL));
function pintarProyeccion() {
  const grid = document.getElementById('qr-grid'), solo = grid.dataset.solo || '';
  const conCod = eqDeF(QR_FID).filter(e => e.codigo && (!solo || e.id === solo));
  const usan = tareasF(QR_FID);
  document.getElementById('qr-tit').textContent = `Únete a tu equipo · ${nombreF(QR_FID)}`;
  document.getElementById('qr-sub').textContent = `${usan.length ? 'Para: ' + usan.map(a => a.nombre).join(', ') + '. ' : ''}Escanea el código de tu equipo con la cámara del celular, o entra a Tareas y escribe sus 4 letras.${formaciones(G_DATA)[QR_FID].abiertas ? '' : ' (Las inscripciones están cerradas.)'}`;
  grid.classList.toggle('qr-uno', !!solo);
  grid.innerHTML = conCod.length ? conCod.map(eq => { const n = (eq.integrantes || []).length; return `<div class="qr-card"><h3>${escaparHTML(eq.nombre)}</h3>${qrSvg(urlUnir(eq.codigo), { titulo: eq.nombre })}<p class="qr-cod">${escaparHTML(eq.codigo)}</p><p class="qr-cupo">${n}${eq.max ? ` / ${eq.max}` : ''} integrantes${eq.max && n >= eq.max ? ' · completo' : ''}</p></div>`; }).join('')
    : '<p>Primero genera los equipos de esta formación.</p>';
}
function abrirProyeccion(fid, imprimir, solo) {
  escucharEquiposAdmin();
  QR_FID = fid || FSEL; document.getElementById('qr-grid').dataset.solo = solo || '';
  pintarProyeccion(); document.getElementById('qr-proyeccion').hidden = false; document.body.classList.add('con-qr');
  if (imprimir) setTimeout(() => window.print(), 400);
}
on('eq-proyectar', 'click', () => abrirProyeccion(FSEL, false));
on('eq-imprimir', 'click', () => abrirProyeccion(FSEL, true));
on('qr-cerrar', 'click', () => { document.getElementById('qr-proyeccion').hidden = true; document.body.classList.remove('con-qr'); });
// en Tareas digitales: qué equipos usa cada tarea en equipo
function pintarTdEquipos() {
  document.querySelectorAll('[data-eqt]').forEach(b => { const fid = formacionDeTarea(G_DATA, b.dataset.eqt); b.innerHTML = `👥 ${escaparHTML(nombreF(fid))} <small>(${eqDeF(fid).length})</small>`; });
  const caja = document.querySelector('.td-eqbox'); if (caja) pintarTdCaja(caja);
}
function pintarTdCaja(caja) {
  const id = caja.dataset.t, a = TAREAS_DIG[id], fid = formacionDeTarea(G_DATA, id), f = formaciones(G_DATA)[fid];
  const act = document.activeElement; if (act && caja.contains(act) && act.tagName === 'SELECT') return;
  caja.innerHTML = `<p><b>${a.icono} ${escaparHTML(a.nombre)}</b> usa los equipos de:</p>
    <select class="td-eqsel" aria-label="Formación de equipos de esta tarea">${ordenFormaciones(G_DATA).map(([k, x]) => `<option value="${k}" ${k === fid ? 'selected' : ''}>${escaparHTML(x.nombre)} (${eqDeF(k).length} equipo${eqDeF(k).length === 1 ? '' : 's'})</option>`).join('')}</select>
    <p class="field-hint" style="margin:6px 0">${eqDeF(fid).length} equipo${eqDeF(fid).length === 1 ? '' : 's'} · inscripciones ${f.abiertas ? 'abiertas 🔓' : 'cerradas 🔒'}. Lo que un equipo trabaja en esta tarea se queda con ese equipo.</p>
    <div class="td-eqacc"><button type="button" class="btn btn-small btn-primary" data-x="nueva">➕ Formar equipos nuevos solo para esta tarea</button><button type="button" class="btn btn-small" data-x="proy">📽️ Proyectar sus QR</button><button type="button" class="btn btn-small" data-x="imp">🖨️ Imprimir</button><button type="button" class="btn btn-small" data-x="ab">${f.abiertas ? '🔒 Cerrar inscripciones' : '🔓 Abrir inscripciones'}</button><button type="button" class="btn btn-small" data-x="ver">Editar equipos →</button></div>`;
  caja.querySelector('.td-eqsel').addEventListener('change', async e => {
    const nf = e.target.value;
    if (!confirm(`¿«${a.nombre}» usará los equipos de «${nombreF(nf)}»? Lo que ya hayan trabajado con los equipos anteriores no se borra.`)) { e.target.value = fid; return; }
    await setDoc(doc(db, 'grupos', grupoActivo), { equiposTarea: { [id]: nf } }, { merge: true });
  });
  caja.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => {
    const x = b.dataset.x;
    if (x === 'nueva') irAEquipos(fid, id);
    else if (x === 'proy') abrirProyeccion(fid, false);
    else if (x === 'imp') abrirProyeccion(fid, true);
    else if (x === 'ab') alternarInscripciones(fid);
    else irAEquipos(fid);
  }));
}

// ---- Monitor en vivo de Mi atlas: equipos e individual, con mapas que se colorean al instante
const MON = { act: 'atlas', clave: false, cont: 'africa', ver: 'todos', subs: [], datos: {}, equipos: [], grupo: null, reloj: null, abierto: null };
let MON_ATLAS = null, MON_PAIS = {};
async function iniciarMonitor() {
  if (!grupoActivo) { document.getElementById('mon-grid').innerHTML = '<p class="empty-inline">Elige un grupo primero.</p>'; return; }
  if (!MON_ATLAS) {
    try { MON_ATLAS = ATLAS_DATA || await fetch('data/atlas.json').then(r => r.json()); } catch { document.getElementById('mon-grid').innerHTML = '<p class="empty-inline">No se pudo cargar el Atlas.</p>'; return; }
    Object.values(MON_ATLAS.regiones).forEach(r => r.paises.forEach(p => { MON_PAIS[p.id] = { n: p.n.replace(/ \(.*\)$/, ''), cont: r.cont }; }));
    const cc = document.getElementById('mon-conts');
    cc.innerHTML = Object.entries(MON_ATLAS.continentes).map(([k, c]) => `<button type="button" class="chip-mon" data-c="${k}" aria-pressed="${k === MON.cont}">${escaparHTML(c.nombre)}</button>`).join('');
    cc.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { MON.cont = b.dataset.c; cc.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); suscribirEquiposCont(); pintarMonitor(true); }));
    document.querySelectorAll('#mon-ver [data-v]').forEach(b => b.addEventListener('click', () => { MON.ver = b.dataset.v; document.querySelectorAll('#mon-ver [data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); pintarMonitor(true); }));
    document.querySelectorAll('#mon-act [data-a]').forEach(b => b.addEventListener('click', () => {
      MON.act = b.dataset.a; document.querySelectorAll('#mon-act [data-a]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      document.getElementById('mon-clave').hidden = MON.act !== 'cuadro'; document.getElementById('mon-votar').hidden = MON.act !== 'influencias'; document.getElementById('mon-resultados').hidden = MON.act !== 'influencias'; document.getElementById('mon-conts').hidden = MON.act !== 'atlas'; document.getElementById('mon-ver').querySelectorAll('[data-v]').forEach(x => { x.hidden = MON.act !== 'atlas'; });
      Object.keys(MON.datos).filter(k => k.startsWith('e:')).forEach(k => delete MON.datos[k]); suscribirEquiposCont(); pintarMonitor(true);
    }));
    document.getElementById('mon-votar').addEventListener('click', async () => { const ab = MON.votacion === 'abierta'; if (ab && !confirm('¿Cerrar la votación? Los alumnos ya no podrán votar ni cambiar su voto.')) return; await setDoc(doc(db, 'grupos', grupoActivo), { votaciones: { [INFLUENCIAS.votacion]: ab ? 'cerrada' : 'abierta' } }, { merge: true }); });
    document.getElementById('mon-resultados').addEventListener('click', abrirResultados);
    document.getElementById('mon-qr').addEventListener('click', () => abrirProyeccion(formacionDeTarea(MON.g, monTarea()), false));
    document.getElementById('voto-cerrar').addEventListener('click', cerrarResultados);
    document.getElementById('mon-clave').addEventListener('click', async () => { await setDoc(doc(db, 'grupos', grupoActivo), { claves: { cuadroMM: !MON.clave } }, { merge: true }); });
    document.getElementById('mon-full').addEventListener('click', e => { const on = document.body.classList.toggle('mon-completo'); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? '✕ Salir de pantalla completa' : '⛶ Pantalla completa'; });
    document.getElementById('mon-det-cerrar').addEventListener('click', cerrarDetalle);
    document.getElementById('mon-detalle').addEventListener('click', e => { if (e.target.id === 'mon-detalle') cerrarDetalle(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && MON.abierto) cerrarDetalle(); });
  }
  detenerMonitor();
  MON.grupo = grupoActivo; MON.datos = {}; MON.equipos = []; MON.todos = []; MON.g = {};
  const g = grupoActivo;
  // individual: un oyente por alumno
  alumnosCache.forEach(a => MON.subs.push(onSnapshot(doc(db, 'grupos', g, 'alumnos', a.id, 'atlas', 'mi-atlas'), sn => {
    MON.datos['a:' + a.id] = sn.exists() ? sn.data() : null; programarPintado('a:' + a.id);
  }, () => {})));
  // equipos
  MON.eqSub = onSnapshot(collection(db, 'grupos', g, 'equipos'), sn => {
    MON.todos = sn.docs.map(d => ({ id: d.id, ...d.data() }));
    suscribirEquiposCont(); pintarMonitor(true);
  }, () => {});
  MON.subs.push(onSnapshot(doc(db, 'grupos', g), sn => { MON.g = sn.exists() ? sn.data() : {}; if (monFiltrar()) { Object.keys(MON.datos).filter(k => k.startsWith('e:')).forEach(k => delete MON.datos[k]); suscribirEquiposCont(); pintarMonitor(true); } MON.votacion = sn.exists() ? ((sn.data().votaciones || {})[INFLUENCIAS.votacion] || 'cerrada') : 'cerrada'; const bv = document.getElementById('mon-votar'); bv.setAttribute('aria-pressed', String(MON.votacion === 'abierta')); bv.textContent = MON.votacion === 'abierta' ? '🔒 Cerrar votación' : '🗳️ Abrir votación'; MON.clave = !!(sn.exists() && (sn.data().claves || {}).cuadroMM); const b = document.getElementById('mon-clave'); b.setAttribute('aria-pressed', String(MON.clave)); b.textContent = MON.clave ? '🔒 Ocultar clave a los alumnos' : '🔑 Liberar clave'; }, () => {}));
  MON.reloj = setInterval(() => pintarTiempos(), 10000);
  pintarMonitor(true);
}
// en el monitor solo aparecen los equipos que usa la tarea que estás viendo
const monTarea = () => MON.act === 'cuadro' ? 'cuadro-mm' : MON.act === 'influencias' ? 'influencias' : 'atlas-' + MON.cont;
function monFiltrar() {
  const antes = MON.equipos.map(e => e.id).join();
  MON.equipos = equiposDe(MON.todos || [], formacionDeTarea(MON.g, monTarea())).sort(ordenEq);
  return antes !== MON.equipos.map(e => e.id).join();
}
function suscribirEquiposCont() {
  (MON.eqSubs || []).forEach(u => u()); MON.eqSubs = [];
  monFiltrar();
  const docAct = MON.act === 'cuadro' ? 'act-cuadro-mm' : MON.act === 'influencias' ? INFLUENCIAS.id : MON.cont;
  MON.equipos.forEach(eq => MON.eqSubs.push(onSnapshot(doc(db, 'grupos', MON.grupo, 'equipos', eq.id, 'atlas', docAct), sn => {
    MON.datos['e:' + eq.id] = sn.exists() ? sn.data() : null; programarPintado('e:' + eq.id);
  }, () => {})));
  // quienes hacen el cuadro o las influencias solos (sin equipo): su trabajo vive en su cuenta
  Object.keys(MON.datos).filter(k => k.startsWith('i:')).forEach(k => delete MON.datos[k]);
  if (MON.act === 'cuadro' || MON.act === 'influencias') {
    const docInd = MON.act === 'cuadro' ? 'tarea-cuadro-mm' : 'tarea-influencias';
    alumnosCache.forEach(a => MON.eqSubs.push(onSnapshot(doc(db, 'grupos', MON.grupo, 'alumnos', a.id, 'atlas', docInd), sn => {
      MON.datos['i:' + a.id] = sn.exists() ? { ...sn.data(), ultimoNombre: sn.data().ultimoNombre || a.nombre } : null; programarPintado('i:' + a.id);
    }, () => {})));
  }
}
function detenerMonitor() {
  document.body.classList.remove('mon-completo'); const mf = document.getElementById('mon-full'); if (mf) { mf.setAttribute('aria-pressed', 'false'); mf.textContent = '⛶ Pantalla completa'; }
  MON.subs.forEach(u => u()); MON.subs = []; (MON.eqSubs || []).forEach(u => u()); MON.eqSubs = [];
  if (MON.eqSub) { MON.eqSub(); MON.eqSub = null; }
  clearInterval(MON.reloj); MON.reloj = null;
}
// convierte los datos guardados a un formato común: {regiones:[...], asign, por, act, ultimo, autor}
function monVista(clave) {
  const d = MON.datos[clave]; if (!d) return null;
  if (clave.startsWith('e:')) {
    const regs = Object.entries(d.regiones || {}).map(([id, r]) => ({ ...r, id })).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return { regiones: regs, asign: d.asign || {}, por: d.por || {}, paises: d.paises || {}, act: d.actualizado, ultimo: d.ultimoCambio || '', autor: d.ultimoNombre || '' };
  }
  const c = ((d.datos || {}).conts || {})[MON.cont] || null;
  return { regiones: c ? c.regiones || [] : [], asign: c ? c.asign || {} : {}, por: {}, paises: c ? c.paises || {} : {}, act: d.actualizado, ultimo: d.ultimoCont === MON.cont || !d.ultimoCont ? (d.ultimoCambio || '') : '', autor: '', vacio: !c };
}
const MON_CAMPOS = [['clima', 'Clima y paisaje'], ['ingredientes', 'Ingredientes base'], ['platillos', 'Platillos'], ['tecnicas', 'Técnicas y utensilios'], ['historia', 'Historia e influencias'], ['dato', 'Dato curioso'], ['fuentes', 'Fuentes']];
function monMapa(v, clase) {
  const k = MON.cont, [x, y, w, h] = MON_ATLAS.mundo.cajas[k];
  const col = id => { const rid = v && v.asign[id]; const r = rid && v.regiones.find(z => z.id === rid); return r ? r.color : ''; };
  let s = `<svg class="${clase}" viewBox="${x - w * .03} ${y - h * .03} ${w * 1.06} ${h * 1.06}" aria-hidden="true">`;
  MON_ATLAS.mundo.paises.forEach(p => { if (p.i && MON_PAIS[p.i] && MON_PAIS[p.i].cont === k) { const c = col(p.i); s += `<path d="${p.d}" data-i="${p.i}"${c ? ` style="fill:${c}"` : ''}><title>${escaparHTML(MON_PAIS[p.i].n)}</title></path>`; } });
  MON_ATLAS.mundo.islas.forEach(i => { if (MON_PAIS[i.i] && MON_PAIS[i.i].cont === k) { const c = col(i.i); s += `<circle cx="${i.x}" cy="${i.y}" r="${w / 70}" data-i="${escaparHTML(i.i)}"${c ? ` style="fill:${c}"` : ''}/>`; } });
  return s + '</svg>';
}
function monStats(v) {
  const total = Object.values(MON_PAIS).filter(p => p.cont === MON.cont).length;
  const cl = v ? Object.keys(v.asign).filter(i => MON_PAIS[i] && MON_PAIS[i].cont === MON.cont).length : 0;
  const fi = v ? v.regiones.filter(r => MON_CAMPOS.filter(([f]) => (r[f] || '').trim()).length >= 4).length : 0;
  const pal = v ? v.regiones.reduce((s, r) => s + MON_CAMPOS.reduce((x, [f]) => x + ((r[f] || '').trim().match(/\S+/g) || []).length, 0), 0) : 0;
  return { total, cl, fi, pal, regs: v ? v.regiones.length : 0 };
}
function hace(ts) {
  if (!ts || !ts.toMillis) return { txt: 'sin actividad', cls: 'gris' };
  const s = Math.max(0, Math.round((Date.now() - ts.toMillis()) / 1000));
  const txt = s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : ts.toDate().toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return { txt, cls: s < 120 ? 'verde' : s < 300 ? 'amarillo' : 'gris' };
}
function monTarjetas() {
  const out = [];
  if (MON.act === 'cuadro' || MON.act === 'influencias') {
    MON.equipos.forEach(eq => out.push({ clave: 'e:' + eq.id, titulo: eq.nombre, sub: (eq.nombres || []).join(', ') || 'sin integrantes', tipo: 'equipo' }));
    alumnosCache.forEach(a => { if (MON.datos['i:' + a.id]) out.push({ clave: 'i:' + a.id, titulo: a.nombre, sub: 'trabajo individual', tipo: 'alumno' }); });
    return out;
  }
  if (MON.ver !== 'individual') MON.equipos.forEach(eq => out.push({ clave: 'e:' + eq.id, titulo: eq.nombre, sub: (eq.nombres || []).join(', ') || 'sin integrantes', tipo: 'equipo' }));
  if (MON.ver !== 'equipos') alumnosCache.forEach(a => { const d = MON.datos['a:' + a.id]; if (d) out.push({ clave: 'a:' + a.id, titulo: a.nombre, sub: d.equipo ? `👥 ${d.equipo}` : 'trabajo individual', tipo: 'alumno' }); });
  return out;
}
let monPend = new Set(), monT = null;
function programarPintado(clave) { monPend.add(clave); clearTimeout(monT); monT = setTimeout(() => { const ks = [...monPend]; monPend.clear(); ks.forEach(actualizarTarjeta); if (MON.abierto && ks.includes(MON.abierto)) pintarDetalle(); pintarResumen(); }, 150); }
function pintarMonitor(todo) {
  const grid = document.getElementById('mon-grid'); if (!grid || MON.grupo !== grupoActivo && MON.grupo) return;
  const ts = monTarjetas();
  grid.innerHTML = ts.length ? ts.map(t => `<button type="button" class="mon-card" data-clave="${t.clave}"><div class="mon-card-cab"><span class="mon-tipo">${t.tipo === 'equipo' ? '👥' : '👤'}</span><div><b>${escaparHTML(t.titulo)}</b><small>${escaparHTML(t.sub)}</small></div><span class="mon-punto" data-punto></span></div>
      <div class="mon-mapa" data-mapa></div><div class="mon-barra"><i data-barra></i></div><p class="mon-num" data-num></p><p class="mon-ult" data-ult></p></button>`).join('')
    : MON.act === 'atlas' ? '<p class="empty-inline">Todavía no hay equipos ni alumnos trabajando en Mi atlas.</p>'
      : '<p class="empty-inline">Todavía no hay equipos para esta actividad ni alumnos trabajándola solos. Para formar los equipos toca <b>🔳 Códigos QR</b> (si ya existen) o ve a Tareas → Tareas digitales → 👥 de esta tarea → «Formar equipos nuevos».</p>';
  grid.querySelectorAll('.mon-card').forEach(b => { actualizarTarjeta(b.dataset.clave, true); b.addEventListener('click', () => abrirDetalle(b.dataset.clave)); });
  const pre = MON.act === 'atlas' ? 'a:' : 'i:';
  const sin = alumnosCache.filter(a => !MON.datos[pre + a.id] && !MON.equipos.some(e => (e.integrantes || []).includes(a.id)));
  document.getElementById('mon-sin').textContent = (MON.ver !== 'equipos' || MON.act !== 'atlas') && sin.length ? `Sin equipo y sin empezar ${MON.act === 'atlas' ? 'Mi atlas' : 'esta actividad'}: ${sin.map(a => a.nombre).join(', ')}.` : '';
  pintarResumen();
}
function actualizarTarjeta(clave, nuevo) {
  const card = document.querySelector(`.mon-card[data-clave="${clave}"]`);
  if (!card) { if ((clave.startsWith('a:') && MON.ver !== 'equipos' || clave.startsWith('i:')) && MON.datos[clave]) pintarMonitor(true); return; }
  if (MON.act === 'cuadro') return actualizarCuadro(card, clave, nuevo);
  if (MON.act === 'influencias') return actualizarInfluencias(card, clave, nuevo);
  const v = monVista(clave), st = monStats(v);
  const mapa = card.querySelector('[data-mapa]');
  if (nuevo || !mapa.firstChild) mapa.innerHTML = monMapa(v, 'mon-svg');
  else mapa.querySelectorAll('[data-i]').forEach(e => { const rid = v && v.asign[e.dataset.i]; const r = rid && v.regiones.find(z => z.id === rid); const c = r ? r.color : ''; if (e.style.fill !== c) { e.style.fill = c; if (c) { e.classList.remove('mon-nuevo'); void e.getBBox; e.classList.add('mon-nuevo'); } } });
  card.querySelector('[data-barra]').style.width = (st.total ? Math.round(100 * st.cl / st.total) : 0) + '%';
  card.querySelector('[data-num]').innerHTML = `<b>${st.cl}/${st.total}</b> países · ${st.regs} ${st.regs === 1 ? 'región' : 'regiones'} · ${st.fi} ficha${st.fi === 1 ? '' : 's'} · ${st.pal} palabras`;
  const ul = card.querySelector('[data-ult]');
  ul.innerHTML = v && v.ultimo ? `✍️ ${v.autor ? `<b>${escaparHTML(v.autor)}</b> ` : ''}${escaparHTML(v.ultimo)}` : (v && !v.vacio ? '' : '<i>todavía no empieza este continente</i>');
  card.dataset.act = v && v.act && v.act.toMillis ? v.act.toMillis() : '';
  pintarTiempo(card, v ? v.act : null);
  if (!nuevo) { card.classList.remove('mon-latido'); void card.offsetWidth; card.classList.add('mon-latido'); }
}
// ---- cuadro comparativo mexica–maya en el monitor
const CU_FILAS = CUADRO_MM.filas.map(([f, t, , inv]) => [f, t, inv]);
const CU_COLS = [['mexica', 'Mexica', '#A63D2F'], ['maya', 'Maya', '#2E6FA8'], ['parecido', 'Se parecen', '#3F7A4F']];
function actualizarCuadro(card, clave, nuevo) {
  const d = MON.datos[clave] || {}, cel = d.celdas || {};
  const llenas = CU_FILAS.flatMap(([f]) => CU_COLS.map(([c]) => (cel[`${f}_${c}`] || '').trim())).filter(Boolean).length, total = CU_FILAS.length * CU_COLS.length;
  card.querySelector('[data-mapa]').innerHTML = `<div class="cu-mini">${CU_FILAS.map(([f]) => CU_COLS.map(([c, , col]) => `<i style="${(cel[`${f}_${c}`] || '').trim() ? `background:${col}` : ''}"></i>`).join('')).join('')}</div>`;
  card.querySelector('[data-barra]').style.width = Math.round(100 * llenas / total) + '%';
  card.querySelector('[data-num]').innerHTML = `<b>${llenas}/${total}</b> celdas llenas`;
  card.querySelector('[data-ult]').innerHTML = d.ultimoCambio ? `✍️ <b>${escaparHTML(d.ultimoNombre || '')}</b> ${escaparHTML(d.ultimoCambio)}` : '<i>todavía no empiezan</i>';
  pintarTiempo(card, d.actualizado || null);
  if (!nuevo) { card.classList.remove('mon-latido'); void card.offsetWidth; card.classList.add('mon-latido'); }
}
function actualizarInfluencias(card, clave, nuevo) {
  const d = MON.datos[clave] || {}, inf = d.inf || {};
  const si = INFLUENCIAS.lista.filter(([k]) => inf[k] && inf[k].si).length;
  card.querySelector('[data-mapa]').innerHTML = `<div class="in-mini"><p>${d.platillo ? `🍽️ <b>${escaparHTML(d.platillo)}</b>` : '<i>sin platillo</i>'}</p><div>${INFLUENCIAS.lista.map(([k, n, col]) => `<span title="${n}" style="${inf[k] && inf[k].si ? `background:${col};color:#fff` : ''}">${n.slice(0, 3)}</span>`).join('')}</div></div>`;
  card.querySelector('[data-barra]').style.width = Math.round(100 * si / 7) + '%';
  card.querySelector('[data-num]').innerHTML = `<b>${si}/7</b> influencias · ${sugerirInfluencias(d).detalle.split('·').pop().trim()}`;
  card.querySelector('[data-ult]').innerHTML = d.ultimoCambio ? `✍️ <b>${escaparHTML(d.ultimoNombre || '')}</b> ${escaparHTML(d.ultimoCambio)}` : '<i>todavía no empiezan</i>';
  pintarTiempo(card, d.actualizado || null);
  if (!nuevo) { card.classList.remove('mon-latido'); void card.offsetWidth; card.classList.add('mon-latido'); }
}
// ---- resultados de la votación, en vivo para proyectar
let VOTOS = { subs: [], votos: {} };
function abrirResultados() {
  cerrarResultados(true);
  document.getElementById('voto-proy').hidden = false; document.body.classList.add('con-qr');
  alumnosCache.forEach(a => VOTOS.subs.push(onSnapshot(doc(db, 'grupos', grupoActivo, 'alumnos', a.id, 'atlas', 'tarea-voto-influencias'), sn => { VOTOS.votos[a.id] = sn.exists() ? sn.data().voto : null; pintarResultados(); }, () => {})));
  pintarResultados();
}
function cerrarResultados(soloSubs) { VOTOS.subs.forEach(u => u()); VOTOS.subs = []; VOTOS.votos = {}; if (soloSubs !== true) { document.getElementById('voto-proy').hidden = true; document.body.classList.remove('con-qr'); } }
function pintarResultados() {
  const cuenta = {}; Object.values(VOTOS.votos).forEach(v => { if (v) cuenta[v] = (cuenta[v] || 0) + 1; });
  const total = Object.values(cuenta).reduce((a, b) => a + b, 0);
  const filas = MON.equipos.map(eq => ({ eq, pl: (MON.datos['e:' + eq.id] || {}).platillo || '', n: cuenta[eq.id] || 0 })).filter(x => x.pl || x.n).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...filas.map(x => x.n));
  document.getElementById('voto-total').textContent = `${total} voto${total === 1 ? '' : 's'} de ${alumnosCache.length} alumnos · ${MON.votacion === 'abierta' ? 'votación abierta' : 'votación cerrada'}`;
  document.getElementById('voto-barras').innerHTML = filas.length ? filas.map((x, i) => `<div class="voto-fila ${i === 0 && x.n ? 'lider' : ''}"><div class="voto-nom"><b>${escaparHTML(x.pl || '(sin platillo)')}</b><small>${escaparHTML(x.eq.nombre)}</small></div><div class="voto-barra"><i style="width:${Math.round(100 * x.n / max)}%"></i></div><span class="voto-n">${x.n}</span></div>`).join('') : '<p>Todavía ningún equipo eligió platillo.</p>';
}
function pintarTiempo(card, ts) { const h = hace(ts), p = card.querySelector('[data-punto]'); p.className = 'mon-punto ' + h.cls; p.textContent = h.txt; }
function actividadDe(clave) { if (MON.act === 'cuadro' || MON.act === 'influencias') return (MON.datos[clave] || {}).actualizado || null; const v = monVista(clave); return v ? v.act : null; }
function pintarTiempos() { document.querySelectorAll('.mon-card').forEach(c => pintarTiempo(c, actividadDe(c.dataset.clave))); pintarResumen(); }
function pintarResumen() {
  const el = document.getElementById('mon-resumen'); if (!el) return;
  const ts = monTarjetas(); const activos = ts.filter(t => hace(actividadDe(t.clave)).cls === 'verde').length;
  el.innerHTML = `<span class="mon-punto verde"></span> <b>${activos}</b> trabajando ahora (últimos 2 min) · ${ts.length} en total · ${MON.act === 'influencias' ? 'Siete influencias' : MON.act === 'cuadro' ? 'Cuadro mexica–maya' : escaparHTML(MON_ATLAS ? MON_ATLAS.continentes[MON.cont].nombre : '')} · 👥 ${escaparHTML((formaciones(MON.g)[formacionDeTarea(MON.g, monTarea())] || {}).nombre || '')}`;
}
function abrirDetalle(clave) { MON.abierto = clave; document.getElementById('mon-detalle').hidden = false; document.body.classList.add('con-qr'); pintarDetalle(true); }
function cerrarDetalle() { MON.abierto = null; document.getElementById('mon-detalle').hidden = true; document.body.classList.remove('con-qr'); }
function pintarDetalle(nuevo) {
  const clave = MON.abierto; if (!clave) return;
  if (MON.act === 'influencias') {
    const t = monTarjetas().find(x => x.clave === clave) || { titulo: '', sub: '' }, d = MON.datos[clave] || {}, inf = d.inf || {}, por = d.por || {};
    const e = x => escaparHTML(x || '').replace(/\n/g, '<br>');
    document.getElementById('mon-det-titulo').textContent = `${t.titulo}${d.platillo ? ' · ' + d.platillo : ''}`;
    document.getElementById('mon-det-sub').textContent = `${t.sub} · Siete influencias · ${hace(d.actualizado).txt}`;
    document.getElementById('mon-det-cuerpo').innerHTML = `<div class="taller-tabla-wrap"><table class="cu-det"><thead><tr><th>Influencia</th><th>¿Está?</th><th>Evidencia</th></tr></thead><tbody>${INFLUENCIAS.lista.map(([k, n, col]) => { const v = inf[k] || {}; return `<tr><th style="border-left:5px solid ${col}">${n}${por[k] ? `<br><small class="mon-autor">✍️ ${escaparHTML(por[k])}</small>` : ''}</th><td>${v.si === true ? '<b style="color:#3F7A4F">Sí</b>' : v.si === false ? 'No' : '—'}</td><td>${(v.ev || '').trim() ? e(v.ev) : '<span class="mon-vacio">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
      <h4>Argumento ${por.argumento ? `<small class="mon-autor">✍️ ${escaparHTML(por.argumento)}</small>` : ''}</h4><p>${(d.argumento || '').trim() ? e(d.argumento) : '<span class="mon-vacio">—</span>'}</p>`;
    return;
  }
  if (MON.act === 'cuadro') {
    const t = monTarjetas().find(x => x.clave === clave) || { titulo: '', sub: '' }, d = MON.datos[clave] || {}, cel = d.celdas || {}, por = d.por || {};
    document.getElementById('mon-det-titulo').textContent = t.titulo;
    document.getElementById('mon-det-sub').textContent = `${t.sub} · Cuadro comparativo mexica–maya · ${hace(d.actualizado).txt}`;
    const e = x => escaparHTML(x || '').replace(/\n/g, '<br>');
    document.getElementById('mon-det-cuerpo').innerHTML = `<div class="taller-tabla-wrap"><table class="cu-det"><thead><tr><th></th>${CU_COLS.map(([, n, col]) => `<th style="color:${col}">${n}</th>`).join('')}</tr></thead><tbody>${CU_FILAS.map(([f, n, inv]) => `<tr><th>${inv ? '🔎 ' : ''}${n}${inv ? `<br><small class="mon-autor">📚 ${(cel[f + '_fuente'] || '').trim() ? escaparHTML(cel[f + '_fuente']) : '<i>sin fuente</i>'}</small>` : ''}</th>${CU_COLS.map(([c]) => { const k = `${f}_${c}`; return `<td>${(cel[k] || '').trim() ? e(cel[k]) : '<span class="mon-vacio">—</span>'}${por[k] ? `<br><small class="mon-autor">✍️ ${escaparHTML(por[k])}</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    return;
  }
  const t = monTarjetas().find(x => x.clave === clave) || { titulo: '', sub: '' }, v = monVista(clave), st = monStats(v);
  document.getElementById('mon-det-titulo').textContent = t.titulo;
  document.getElementById('mon-det-sub').textContent = `${t.sub} · ${MON_ATLAS.continentes[MON.cont].nombre} · ${st.cl}/${st.total} países · ${hace(v && v.act).txt}`;
  const cuerpo = document.getElementById('mon-det-cuerpo');
  const abiertas = new Set([...cuerpo.querySelectorAll('details[open]')].map(d => d.dataset.id));
  const e = x => escaparHTML(x || '').replace(/\n/g, '<br>');
  cuerpo.innerHTML = `<div class="mon-det-grid"><div class="mon-det-mapa">${monMapa(v, 'mon-svg grande')}${v && v.ultimo ? `<p class="mon-ult">✍️ ${v.autor ? `<b>${escaparHTML(v.autor)}</b> ` : ''}${escaparHTML(v.ultimo)}</p>` : ''}</div>
    <div class="mon-det-fichas">${v && v.regiones.length ? v.regiones.map(r => {
      const ps = Object.entries(v.asign).filter(([, x]) => x === r.id).map(([i]) => (MON_PAIS[i] || {}).n || i).sort((a, b) => a.localeCompare(b, 'es'));
      const por = v.por[r.id] || {}, llenos = MON_CAMPOS.filter(([f]) => (r[f] || '').trim()).length;
      return `<details data-id="${r.id}" ${abiertas.has(r.id) || nuevo && v.regiones.length <= 2 ? 'open' : ''} style="--c:${escaparHTML(r.color)}"><summary><i></i><b>${escaparHTML(r.nombre)}</b><small>${ps.length} países · ${llenos}/7</small></summary>
        <p><b>Países:</b> ${escaparHTML(ps.join(', ') || '—')}</p>${MON_CAMPOS.map(([f, tt]) => `<p><b>${tt}</b>${por[f] ? ` <small class="mon-autor">✍️ ${escaparHTML(por[f])}</small>` : ''}<br>${(r[f] || '').trim() ? e(r[f]) : '<span class="mon-vacio">—</span>'}</p>`).join('')}</details>`;
    }).join('') : '<p class="empty-inline">Todavía no crean regiones en este continente.</p>'}</div></div>`;
}

// ---- Tareas digitales: catálogo, abrir/cerrar y calificar con sugerencia
let TD_ATLAS = null;
async function cargarTareasDig() {
  const cont = document.getElementById('td-lista'); if (!cont) return;
  if (!grupoActivo) { cont.innerHTML = '<p class="empty-inline">Elige un grupo primero.</p>'; return; }
  cont.innerHTML = '<p class="empty-inline">Cargando…</p>';
  let est = {}, enCat = new Set();
  try { const g = await getDoc(doc(db, 'grupos', grupoActivo)); est = (g.exists() && g.data().tareasDig) || {}; } catch { /* */ }
  try { const sn = await getDocs(collection(db, 'grupos', grupoActivo, 'tareas_catalogo')); sn.forEach(d => { if (d.id.startsWith('dig-')) enCat.add(d.id); }); } catch { /* */ }
  cont.innerHTML = TEMAS_TAREAS.map(t => `<div class="td-tema"><p class="td-tit"><b>${escaparHTML(t.tema)} · ${escaparHTML(t.titulo)}</b> <small>${escaparHTML(t.fechaTexto)}</small></p>${t.acts.filter(califica).map(a => {
    const cat = enCat.has(catalogoId(a.id)), ab = !(est[a.id] && est[a.id].abierta === false);
    return `<div class="td-fila"><span class="td-nom">${a.icono} ${escaparHTML(a.nombre)}</span>
      <button type="button" class="btn btn-small td-cat ${cat ? 'si' : ''}" data-cat="${a.id}" ${cat ? 'disabled' : ''}>${cat ? '✓ En el catálogo' : '+ Agregar al catálogo'}</button>
      <button type="button" class="btn btn-small td-ab ${ab ? 'si' : 'no'}" data-ab="${a.id}">${ab ? '🔓 Abierta' : '🔒 Cerrada'}</button>
      ${enEquipo(a) ? `<button type="button" class="btn btn-small td-eq" data-eqt="${a.id}" aria-expanded="false">👥 Equipos</button>` : ''}
      <button type="button" class="btn btn-small btn-primary" data-cal="${a.id}">Calificar</button></div>`;
  }).join('')}</div>`).join('');
  cont.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', async () => {
    const a = TAREAS_DIG[b.dataset.cat];
    if (!confirm(`¿Agregar «${nombreCatalogo(a)}» a las tareas del Parcial 2?\n\nDesde este momento cuenta para la calificación: a quien no la entregue le contará como cero en el promedio de tareas.`)) return;
    await setDoc(doc(db, 'grupos', grupoActivo, 'tareas_catalogo', catalogoId(a.id)), { nombre: nombreCatalogo(a), fecha: a.fecha, parcial: 'p2', digital: a.id, creado: serverTimestamp() });
    cargarTareasDig(); cargarCatalogo('tareas');
  }));
  cont.querySelectorAll('[data-ab]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.ab, ab = !(est[id] && est[id].abierta === false);
    if (ab && !confirm('¿Cerrar la tarea? Los alumnos ya no podrán hacer cambios (lo que llevan se conserva).')) return;
    await setDoc(doc(db, 'grupos', grupoActivo), { tareasDig: { [id]: { abierta: !ab } } }, { merge: true });
    cargarTareasDig();
  }));
  escucharEquiposAdmin(); pintarTdEquipos();
  cont.querySelectorAll('[data-eqt]').forEach(b => b.addEventListener('click', () => {
    const previa = cont.querySelector('.td-eqbox'), mismo = previa && previa.dataset.t === b.dataset.eqt;
    if (previa) previa.remove(); cont.querySelectorAll('[data-eqt]').forEach(x => x.setAttribute('aria-expanded', 'false'));
    if (mismo) return;
    const caja = document.createElement('div'); caja.className = 'td-eqbox'; caja.dataset.t = b.dataset.eqt;
    b.closest('.td-fila').after(caja); b.setAttribute('aria-expanded', 'true'); pintarTdCaja(caja);
  }));
  cont.querySelectorAll('[data-cal]').forEach(b => b.addEventListener('click', () => calificarTareaDig(TAREAS_DIG[b.dataset.cal], enCat.has(catalogoId(b.dataset.cal)))));
}
async function calificarTareaDig(a, enCatalogo) {
  const wrap = document.getElementById('td-calificar'); wrap.hidden = false;
  wrap.innerHTML = '<p class="empty-inline">Reuniendo el trabajo de cada alumno…</p>';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const g = grupoActivo;
  let equipos = [];
  try { const [gs, sn] = await Promise.all([getDoc(doc(db, 'grupos', g)), getDocs(collection(db, 'grupos', g, 'equipos'))]); equipos = equiposDe(sn.docs.map(d => ({ id: d.id, ...d.data() })), formacionDeTarea(gs.exists() ? gs.data() : {}, a.id)); } catch { /* */ }
  if (a.tipo === 'atlas' && !TD_ATLAS) { try { TD_ATLAS = await fetch('data/atlas.json').then(r => r.json()); } catch { TD_ATLAS = null; } }
  const total = a.tipo === 'atlas' && TD_ATLAS ? Object.values(TD_ATLAS.regiones).filter(r => r.cont === a.cont).reduce((x, r) => x + r.paises.length, 0) : 0;
  const cacheEq = {};
  const docEquipo = async (eq, id) => { const k = eq.id + '/' + id; if (!(k in cacheEq)) { try { const s = await getDoc(doc(db, 'grupos', g, 'equipos', eq.id, 'atlas', id)); cacheEq[k] = s.exists() ? s.data() : null; } catch { cacheEq[k] = null; } } return cacheEq[k]; };
  const filas = await Promise.all(alumnosCache.map(async al => {
    const eq = enEquipo(a) ? equipos.find(e => (e.integrantes || []).includes(al.id)) || null : null;
    let sug = { nota: 0, detalle: 'Sin trabajo' }, entregado = null, resumen = '', cal = '';
    try { const c = await getDoc(doc(db, 'grupos', g, 'alumnos', al.id, 'tareas', catalogoId(a.id))); if (c.exists()) cal = c.data().calificacion ?? ''; } catch { /* */ }
    try {
      if (a.tipo === 'atlas') {
        let c = null;
        if (eq) { const d = await docEquipo(eq, a.cont); if (d) { c = { regiones: Object.entries(d.regiones || {}).map(([id, r]) => ({ ...r, id })), asign: d.asign || {} }; entregado = d.entregado || null; } }
        if (!c) { const s = await getDoc(doc(db, 'grupos', g, 'alumnos', al.id, 'atlas', 'mi-atlas')); if (s.exists()) { const dd = s.data().datos || {}; c = (dd.conts || {})[a.cont] || null; const en = (dd.entregas || {})[a.cont]; if (en) entregado = { t: en }; } }
        sug = sugerirAtlas(c, total); resumen = c ? (c.regiones || []).map(r => `${r.nombre} (${Object.values(c.asign).filter(x => x === r.id).length})`).join(' · ') : '';
      } else if (a.tipo === 'cuadro') {
        const d = eq ? await docEquipo(eq, CUADRO_MM.id) : null;
        let datos = d;
        if (!datos) { const s = await getDoc(doc(db, 'grupos', g, 'alumnos', al.id, 'atlas', 'tarea-cuadro-mm')); datos = s.exists() ? s.data() : null; }
        if (datos) { sug = sugerirCuadro(datos.celdas); entregado = datos.entregado || null; resumen = CUADRO_MM.filas.map(([f, t]) => `${t}: ${CUADRO_MM.columnas.map(([c]) => (datos.celdas || {})[`${f}_${c}`] ? '●' : '○').join('')}`).join(' · '); }
      } else if (a.tipo === 'influencias') {
        let datos = eq ? await docEquipo(eq, INFLUENCIAS.id) : null;
        if (!datos) { const s = await getDoc(doc(db, 'grupos', g, 'alumnos', al.id, 'atlas', 'tarea-influencias')); datos = s.exists() ? s.data() : null; }
        if (datos) { sug = sugerirInfluencias(datos); entregado = datos.entregado || null; resumen = INFLUENCIAS.lista.map(([k, n]) => `${n}: ${((datos.inf || {})[k] || {}).si ? 'sí' : '—'}`).join(' · ') + (datos.argumento ? ' · ' + datos.argumento.slice(0, 200) : ''); }
      } else if (a.tipo === 'desarma') {
        const s = await getDoc(doc(db, 'grupos', g, 'alumnos', al.id, 'atlas', 'tarea-desarma'));
        if (s.exists()) { const m = s.data().datos || {}; sug = sugerirDesarma(m); entregado = s.data().entregado || null; resumen = (m.reflexion || '').slice(0, 260); }
      }
    } catch { /* */ }
    return { al, eq, sug, entregado, resumen, cal };
  }));
  const f = t => t && t.toDate ? t.toDate().toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : typeof t === 'number' ? new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  wrap.innerHTML = `<h4 class="td-h4">Calificar: ${escaparHTML(nombreCatalogo(a))}</h4>
    ${enCatalogo ? '' : '<p class="aviso-td">⚠️ Esta tarea todavía no está en el catálogo: las calificaciones se guardan, pero no cuentan en el promedio hasta que la agregues.</p>'}
    <p class="field-hint">La calificación sugerida sale de qué tan completo está el trabajo${a.tipo === 'atlas' ? ' (la mitad por países clasificados y la mitad por fichas con al menos 4 de 7 apartados)' : a.tipo === 'cuadro' ? ' (celdas llenas de 21)' : a.tipo === 'influencias' ? ' (1 punto por elegir platillo, 1.5 por cada influencia con evidencia —hasta 4— y 3 por un argumento de al menos 60 palabras)' : ' (ingredientes, que estén clasificados y una conclusión de al menos 40 palabras)'}. En equipo, todos reciben la misma sugerencia; puedes ajustar a quien no aportó (en el Monitor ves quién escribió qué).</p>
    <div class="quiz-actions" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;"><button type="button" class="btn btn-ghost-dark btn-small" id="td-usar">Usar sugeridas en las vacías</button><button type="button" class="btn btn-ghost-dark btn-small" id="td-cerrar">Cerrar</button></div>
    <div class="taller-tabla-wrap"><table class="taller-tabla td-tabla"><thead><tr><th>Alumno</th><th>Trabajo</th><th>Entrega</th><th>Sugerida</th><th>Calificación</th></tr></thead><tbody>
    ${filas.map(x => `<tr data-id="${x.al.id}"><td><b>${escaparHTML(x.al.nombre)}</b>${x.eq ? `<br><small>👥 ${escaparHTML(x.eq.nombre)}</small>` : ''}</td>
      <td><small>${escaparHTML(x.sug.detalle)}</small>${x.resumen ? `<details><summary>Ver</summary><small>${escaparHTML(x.resumen)}</small></details>` : ''}</td>
      <td>${x.entregado ? `<span class="td-ok">✓ ${escaparHTML(f(x.entregado.t))}</span>` : '<span class="td-no">No entregada</span>'}</td>
      <td><b class="td-sug">${x.sug.nota}</b></td>
      <td><input type="number" min="0" max="10" step="0.1" class="calif-input td-in" value="${x.cal}" placeholder="0-10" data-sug="${x.sug.nota}"></td></tr>`).join('')}</tbody></table></div>
    <button type="button" class="btn btn-primary btn-block" id="td-guardar">Guardar calificaciones</button><p class="save-msg" id="td-msg" hidden></p>`;
  document.getElementById('td-cerrar').addEventListener('click', () => { wrap.hidden = true; });
  document.getElementById('td-usar').addEventListener('click', () => wrap.querySelectorAll('.td-in').forEach(i => { if (i.value === '') i.value = i.dataset.sug; }));
  document.getElementById('td-guardar').addEventListener('click', async () => {
    const msg = document.getElementById('td-msg'), escr = [];
    wrap.querySelectorAll('tr[data-id]').forEach(tr => {
      const i = tr.querySelector('.td-in'), ref = doc(db, 'grupos', g, 'alumnos', tr.dataset.id, 'tareas', catalogoId(a.id));
      if (i.value === '') escr.push(deleteDoc(ref).catch(() => {}));
      else escr.push(setDoc(ref, { parcial: 'p2', nombre: nombreCatalogo(a), fecha: a.fecha, calificacion: Math.max(0, Math.min(10, parseFloat(i.value))), actualizado: serverTimestamp() }));
    });
    try { await Promise.all(escr); msg.textContent = '✓ Calificaciones guardadas. Ya se ven en Mi progreso.'; msg.hidden = false; }
    catch (e) { msg.textContent = 'No se pudo guardar: ' + (e.message || e); msg.hidden = false; }
  });
}

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