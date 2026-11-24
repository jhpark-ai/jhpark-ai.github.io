/* Junghwan Park · personal page
   Small, dependency-free behaviours: theme toggle, email link, publication
   filter, section highlighting in the nav, and the hero starfield. */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Theme toggle ─────────────────────────────────────────── */
  var toggle = document.querySelector('.theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (themeMeta) themeMeta.content = theme === 'light' ? '#f5f6fa' : '#04060c';
    if (toggle) toggle.setAttribute('aria-pressed', String(theme === 'light'));
  }
  applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ── Email: assembled here so the address is not a plain mailto in the HTML ── */
  var source = document.querySelector('[data-user][data-domain]');
  if (source) {
    var address = source.dataset.user + '@' + source.dataset.domain;
    document.querySelectorAll('.js-email').forEach(function (a) {
      a.href = 'mailto:' + address;
      if (a.classList.contains('js-email-text')) a.textContent = address;
    });
  }

  /* ── Publication filter ───────────────────────────────────── */
  var filters = document.querySelectorAll('.filter');
  var groups = document.querySelectorAll('.pub-group');

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var want = btn.dataset.filter;
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      groups.forEach(function (g) {
        g.hidden = !(want === 'all' || g.dataset.type === want);
      });
    });
  });

  /* Keep the counts on the filter buttons in sync with the markup. */
  filters.forEach(function (btn) {
    var count = btn.querySelector('.count');
    if (!count) return;
    var sel = btn.dataset.filter === 'all' ? '.pub' : '.pub-group[data-type="' + btn.dataset.filter + '"] .pub';
    count.textContent = document.querySelectorAll(sel).length;
  });

  /* ── Nav: border once scrolled, and highlight the current section ── */
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = {};
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Object.keys(navLinks).forEach(function (id) {
          navLinks[id].classList.toggle('is-current', id === entry.target.id);
        });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    Object.keys(navLinks).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ── Starfield in the hero ────────────────────────────────── */
  var canvas = document.getElementById('sky');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentElement;
  var stars = [];
  var pass = null;          // one satellite crossing the sky at a time
  var nextPassAt = 0;
  var width = 0, height = 0, raf = 0, visible = true;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function seed() {
    var count = Math.min(260, Math.round((width * height) / 5200));
    stars = [];
    for (var i = 0; i < count; i++) {
      var big = Math.random() < 0.08;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: big ? rand(1.0, 1.5) : rand(0.35, 0.9),
        a: big ? rand(0.7, 0.95) : rand(0.25, 0.7),
        speed: rand(0.0004, 0.0016),
        phase: rand(0, Math.PI * 2),
        tint: Math.random() < 0.18 ? '255,226,190' : (Math.random() < 0.4 ? '178,208,255' : '236,241,255')
      });
    }
  }

  function resize() {
    var w = hero.clientWidth, h = hero.clientHeight;
    if (w === width && Math.abs(h - height) < 4) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = w; height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw(performance.now());
  }

  function launchPass(now) {
    var fromLeft = Math.random() < 0.5;
    var y0 = rand(70, Math.min(height * 0.45, 420));   // stay in the upper sky, clear of the text below
    var angle = rand(-0.22, 0.22);
    var speed = rand(46, 70);                 // px per second
    pass = {
      x: fromLeft ? -20 : width + 20,
      y: y0,
      vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(angle) * speed,
      born: now
    };
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var twinkle = reduceMotion ? 1 : 0.72 + 0.28 * Math.sin(now * s.speed + s.phase);
      ctx.fillStyle = 'rgba(' + s.tint + ',' + (s.a * twinkle).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.2832);
      ctx.fill();
    }

    if (reduceMotion) return;

    if (!pass && now > nextPassAt) launchPass(now);
    if (pass) {
      var t = (now - pass.born) / 1000;
      var x = pass.x + pass.vx * t, y = pass.y + pass.vy * t;
      var progress = (x + 20) / (width + 40);
      var fade = Math.max(0, Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI));
      var tail = 26, len = Math.hypot(pass.vx, pass.vy);
      var tx = x - (pass.vx / len) * tail, ty = y - (pass.vy / len) * tail;
      var grad = ctx.createLinearGradient(x, y, tx, ty);
      grad.addColorStop(0, 'rgba(200,225,255,' + (0.55 * fade).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(200,225,255,0)');
      ctx.strokeStyle = grad; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = 'rgba(232,242,255,' + (0.95 * fade).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 6.2832); ctx.fill();
      if (x < -40 || x > width + 40 || y < -40 || y > height + 40) {
        pass = null;
        nextPassAt = now + rand(9000, 20000);
      }
    }
  }

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden || root.dataset.theme === 'light') return;
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !reduceMotion) raf = requestAnimationFrame(loop); }

  resize();
  nextPassAt = performance.now() + 2500;
  start();

  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  document.addEventListener('visibilitychange', start);
  if (toggle) toggle.addEventListener('click', start);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      start();
    }).observe(hero);
  }
})();
