/* recordar.js — «Recordarme en este celular».
   La sesión del alumno vive en sessionStorage (se pierde cuando el navegador cierra la pestaña).
   Si el alumno deja marcada la casilla al entrar, este archivo guarda una copia en localStorage por 30 días
   y la devuelve a la pestaña cuando vuelve, así no tiene que escribir su PIN cada vez.
   · «Salir» (o un PIN que ya no coincide porque el docente lo cambió) borra la copia guardada.
   · En el examen siempre se pide el PIN: ahí no se usa ni se guarda la copia.
   Se carga como script normal en el <head>, antes de los módulos de cada página. */
(function () {
  var KEYS = ['oc_sesion_alumno', 'ep_sesion_alumno'];
  var DIAS = 30, PREF = 'recordar_pref', DESDE = 'recordar_restaurada';
  var EXAMEN = /examen\.html$/.test(location.pathname);
  var ls, ss; try { ls = window.localStorage; ss = window.sessionStorage; } catch (e) { return; }
  if (!ls || !ss) return;
  var guardada = function (k) { return 'recordar:' + k; };
  var quiere = function () { try { return ls.getItem(PREF) !== '0'; } catch (e) { return true; } };

  // 1. Al llegar: si la pestaña no tiene sesión y hay una copia vigente, se restaura.
  KEYS.forEach(function (k) {
    try {
      var raw = ls.getItem(guardada(k)); if (!raw) return;
      var c = JSON.parse(raw);
      if (!c || !c.s || !c.exp || c.exp < Date.now()) { ls.removeItem(guardada(k)); return; }
      if (EXAMEN) { if (ss.getItem(DESDE + ':' + k) === '1') { Storage.prototype.removeItem.call(ss, k); Storage.prototype.removeItem.call(ss, DESDE + ':' + k); } return; }
      if (!ss.getItem(k)) { Storage.prototype.setItem.call(ss, k, c.s); Storage.prototype.setItem.call(ss, DESDE + ':' + k, '1'); }
    } catch (e) { /* nada */ }
  });

  // 2. Cuando la página guarda o borra la sesión de la pestaña, se refleja en la copia del celular.
  var set0 = Storage.prototype.setItem, rem0 = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    set0.apply(this, arguments);
    try {
      if (this === ss && KEYS.indexOf(k) >= 0) {
        rem0.call(ss, DESDE + ':' + k);
        if (EXAMEN) return;
        if (quiere()) set0.call(ls, guardada(k), JSON.stringify({ s: String(v), exp: Date.now() + DIAS * 864e5 }));
        else rem0.call(ls, guardada(k));
      }
    } catch (e) { /* nada */ }
  };
  Storage.prototype.removeItem = function (k) {
    rem0.apply(this, arguments);
    try { if (this === ss && KEYS.indexOf(k) >= 0 && !EXAMEN) { rem0.call(ls, guardada(k)); rem0.call(ss, DESDE + ':' + k); } } catch (e) { /* nada */ }
  };

  // 3. La casilla en cada formulario de entrada (nombre + PIN), también en los que aparecen después.
  if (EXAMEN) return;
  function poner(form) {
    if (form.dataset.recordar) return; form.dataset.recordar = '1';
    var lab = document.createElement('label');
    lab.className = 'recordar-cel';
    lab.style.cssText = 'display:flex;gap:.5rem;align-items:flex-start;margin:.6rem 0;font-size:.9rem;line-height:1.35;cursor:pointer;text-align:left';
    lab.innerHTML = '<input type="checkbox" style="width:18px;height:18px;margin-top:.1rem;flex:none"' + (quiere() ? ' checked' : '') + '><span><b>Recordarme en este celular</b> (30 días). <small style="opacity:.75">No la marques en una computadora prestada.</small></span>';
    lab.querySelector('input').addEventListener('change', function (e) { try { set0.call(ls, PREF, e.target.checked ? '1' : '0'); } catch (x) { /* nada */ } });
    var b = form.querySelector('button[type=submit], button:not([type])');
    if (b && b.parentNode) b.parentNode.insertBefore(lab, b); else form.appendChild(lab);
  }
  function buscar(raiz) {
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('input[id$="-pin"], input[name="pin"]').forEach(function (i) { var f = i.closest('form'); if (f) poner(f); });
  }
  function arrancar() {
    buscar(document);
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) buscar(n.matches && n.matches('form') ? n.parentNode || n : n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) arrancar(); else document.addEventListener('DOMContentLoaded', arrancar);
})();
