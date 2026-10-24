(function () {
  'use strict';

  /* Al recargar, la página siempre vuelve al inicio (aunque la URL tenga #contacto) */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  window.addEventListener('load', function () { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });

  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = false; // las animaciones se muestran siempre
  var soft = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.5 : 1;

  /* ---------- Navegación ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  function closeMenu() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Abrir menú'); }
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  document.querySelectorAll('#navMenu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Parallax + barra de proceso (un solo bucle) ---------- */
  var parallaxImgs = [].slice.call(document.querySelectorAll('img[data-speed]'));
  var steps = document.getElementById('steps');
  var stepItems = steps ? [].slice.call(steps.querySelectorAll('.step')) : [];
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.pageYOffset;
    var vh = window.innerHeight;

    nav.classList.toggle('is-solid', y > 40);

    // Parallax: cada imagen se desplaza más lento que el contenido (portada, banda y "Nosotros")
    parallaxImgs.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var offset = (r.top + r.height / 2 - vh / 2) * -(parseFloat(img.dataset.speed) || 0.15) * soft;
      img.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    });

    // Proceso: la línea avanza con el scroll
    if (steps) {
      var s = steps.getBoundingClientRect();
      var start = vh * 0.8;
      var p = (start - s.top) / (s.height + vh * 0.1);
      p = Math.max(0, Math.min(1, p));
      steps.style.setProperty('--p', p.toFixed(3));
      stepItems.forEach(function (el, i) {
        var threshold = i / (stepItems.length - 1) * 0.92;
        el.classList.toggle('is-on', p >= threshold && p > 0);
      });
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* ---------- Filas desplegables ---------- */
  var rows = document.getElementById('rows');
  var rowEls = [].slice.call(rows.querySelectorAll('.row'));
  rowEls.forEach(function (row) {
    var btn = row.querySelector('.row__btn');
    btn.addEventListener('click', function () {
      var willOpen = !row.classList.contains('is-open');
      rowEls.forEach(function (r) {
        r.classList.remove('is-open');
        r.querySelector('.row__btn').setAttribute('aria-expanded', 'false');
      });
      if (willOpen) { row.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { rows.classList.add('is-in'); io.disconnect(); } });
    }, { threshold: 0.15 });
    io.observe(rows);
  } else {
    rows.classList.add('is-in');
  }

  /* ---------- Carrusel: de derecha a izquierda, en bucle ----------
     Repite las fotos hasta cubrir la pantalla y las duplica para que el bucle no tenga cortes.
     El movimiento se hace en píxeles ENTEROS de pantalla y a un ritmo constante de cuadros
     (según la frecuencia del monitor), para evitar el temblor del movimiento subpíxel. */
  var track = document.getElementById('galleryTrack');
  if (track) {
    var gallery = track.parentNode;
    var base = [].slice.call(track.children);
    var lastW = 0, halfCss = 0, pos = 0, paused = false, visible = true;
    var dpr = window.devicePixelRatio || 1;

    var buildGallery = function () {
      var w = window.innerWidth;
      if (w === lastW) return;
      lastW = w;
      [].slice.call(track.querySelectorAll('[data-clone]')).forEach(function (n) { track.removeChild(n); });
      var cs = getComputedStyle(base[0]);
      var itemW = Math.round(base[0].offsetWidth + parseFloat(cs.marginRight));
      if (!itemW) return;
      var setW = itemW * base.length;
      var k = Math.max(1, Math.ceil(w / setW));
      for (var s = 1; s < 2 * k; s++) {
        base.forEach(function (el) {
          var c = el.cloneNode(true);
          c.setAttribute('data-clone', ''); c.setAttribute('aria-hidden', 'true');
          c.querySelector('img').alt = '';
          track.appendChild(c);
        });
      }
      halfCss = k * setW;
    };
    buildGallery();
    window.addEventListener('resize', function () { dpr = window.devicePixelRatio || 1; buildGallery(); });
    gallery.addEventListener('mouseenter', function () { paused = true; });
    gallery.addEventListener('mouseleave', function () { paused = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: '100px' }).observe(gallery);
    }

    // 1) medir la frecuencia real del monitor; 2) mover siempre 1 o más píxeles enteros cada N cuadros
    var stamps = [];
    function measure(t) {
      stamps.push(t);
      if (stamps.length < 32) { requestAnimationFrame(measure); return; }
      var d = [];
      for (var i = 2; i < stamps.length; i++) d.push(stamps[i] - stamps[i - 1]);
      d.sort(function (a, b) { return a - b; });
      var hz = 1000 / d[Math.floor(d.length / 2)];
      var every = Math.max(1, Math.round(hz / 60));                      // 60 Hz → cada cuadro; 120/144 Hz → cada 2
      var step = Math.max(1, Math.round(55 * dpr * every / hz));          // ≈ 55 px de pantalla por segundo
      var frame = 0;
      (function loop() {
        if (!paused && visible && ++frame % every === 0) {
          pos += step;
          var halfDev = Math.round(halfCss * dpr);
          if (pos >= halfDev) pos -= halfDev;
          track.style.transform = 'translate3d(' + (-pos / dpr) + 'px,0,0)';
        }
        requestAnimationFrame(loop);
      })();
    }
    requestAnimationFrame(measure);
  }

  /* ---------- Subtítulo con efecto máquina de escribir ---------- */
  var tw = document.getElementById('typewrite');
  if (tw) {
    var words = [];
    try { words = JSON.parse(tw.getAttribute('data-type')); } catch (err) {}
    var period = parseInt(tw.getAttribute('data-period'), 10) || 1800;
    var out = tw.querySelector('.tw-text');
    if (words.length) {
      var n = 0, txt = '', deleting = false;
      (function tick() {
        var full = words[n % words.length];
        txt = deleting ? full.substring(0, txt.length - 1) : full.substring(0, txt.length + 1);
        out.textContent = txt;
        var delay = 110 - Math.random() * 50;
        if (deleting) delay /= 2;
        if (!deleting && txt === full) { delay = period; deleting = true; }
        else if (deleting && txt === '') { deleting = false; n++; delay = 400; }
        setTimeout(tick, delay);
      })();
    }
  }

  /* ---------- Contacto: arma el email y abre el programa de correo ---------- */
  var MAIL = 'rsconsultora.gestion@gmail.com';
  var form = document.getElementById('form');
  var note = document.getElementById('formNote');
  var nombre = form.elements['nombre'];
  var mensaje = form.elements['respuesta'];

  // Los enlaces "Cotizar..." precargan el producto en el mensaje
  document.querySelectorAll('.row__link').forEach(function (a) {
    a.addEventListener('click', function () {
      var t = a.getAttribute('data-topic');
      if (t && !mensaje.value.trim()) mensaje.value = 'Quisiera cotizar: ' + t + '. ';
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = [nombre, mensaje];
    var bad = fields.filter(function (f) { return !f.value.trim(); });
    fields.forEach(function (f) { f.classList.toggle('is-invalid', !f.value.trim()); });
    note.classList.remove('is-ok');
    if (bad.length) {
      note.textContent = 'Completá tu nombre y tu mensaje para continuar.';
      bad[0].focus();
      return;
    }
    var subject = 'Consulta de importación - ' + nombre.value.trim();
    var body = 'Hola, soy ' + nombre.value.trim() + '.\n\n' + mensaje.value.trim() + '\n\nSaludos.';
    var q = 'subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

    // Mensaje de confirmación con alternativa por si no hay programa de correo instalado
    note.classList.add('is-ok');
    note.textContent = 'Se abrió tu programa de correo. ¿No se abrió? ';
    var gmail = document.createElement('a');
    gmail.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(MAIL) + '&' + q;
    gmail.target = '_blank'; gmail.rel = 'noopener noreferrer';
    gmail.textContent = 'Abrir en Gmail';
    note.appendChild(gmail);
    note.appendChild(document.createTextNode(' o escribinos a ' + MAIL + '.'));

    window.location.href = 'mailto:' + MAIL + '?' + q;
  });
})();
