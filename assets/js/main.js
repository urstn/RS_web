(function () {
  'use strict';

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
  var heroImg = document.getElementById('heroImg');
  var hero = document.querySelector('.hero');
  var heroContent = document.querySelector('.hero__content');
  var bandImgs = [].slice.call(document.querySelectorAll('.band__img'));
  var steps = document.getElementById('steps');
  var stepItems = steps ? [].slice.call(steps.querySelectorAll('.step')) : [];
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.pageYOffset;
    var vh = window.innerHeight;

    nav.classList.toggle('is-solid', y > 40);

    if (!reduce) {
      // Hero: la barcaza avanza hacia la izquierda y el agua se desplaza más lento
      if (heroImg && y < hero.offsetHeight + 100) {
        heroImg.style.transform =
          'translate3d(' + (y * -0.16 * soft).toFixed(1) + 'px,' + (y * 0.14 * soft).toFixed(1) + 'px,0) scale(1.07)';
        // El texto sube un poco más rápido y se desvanece: refuerza la sensación de capas
        heroContent.style.transform = 'translate3d(0,' + (y * -0.1).toFixed(1) + 'px,0)';
        heroContent.style.opacity = Math.max(0, 1 - y / (hero.offsetHeight * 0.85)).toFixed(2);
      }
      // Banda: imagen más lenta que el contenido
      bandImgs.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var offset = (r.top + r.height / 2 - vh / 2) * -(parseFloat(img.dataset.speed) || 0.15);
        img.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    }

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
  var product = form.elements['producto'];

  // Los enlaces "Cotizar..." precargan el producto
  document.querySelectorAll('.row__link').forEach(function (a) {
    a.addEventListener('click', function () {
      var t = a.getAttribute('data-topic');
      if (t && !product.value.trim()) product.value = t + ': ';
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = form.elements['nombre'];
    var tel = form.elements['telefono'];
    var fields = [nombre, product];
    var bad = fields.filter(function (f) { return !f.value.trim(); });
    fields.forEach(function (f) { f.classList.toggle('is-invalid', !f.value.trim()); });
    note.classList.remove('is-ok');
    if (bad.length) {
      note.textContent = 'Completá tu nombre y qué querés importar para continuar.';
      bad[0].focus();
      return;
    }
    var body = 'Hola, soy ' + nombre.value.trim() + '.\n\nQuisiera cotizar una importación:\n' + product.value.trim() +
      (tel.value.trim() ? '\n\nMi teléfono: ' + tel.value.trim() : '') + '\n\nSaludos.';
    var subject = 'Consulta de importación - ' + nombre.value.trim();
    note.classList.add('is-ok');
    note.textContent = 'Se abrió tu programa de correo. Si no se abrió, escribinos a ' + MAIL + '.';
    window.location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
})();
