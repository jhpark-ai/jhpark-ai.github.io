/* Junghwan Park · personal page
   Dependency-free: the email link, the publication filter, the loss-landscape figure in the hero,
   and the "training run" read-out in the top bar. */

(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Email: assembled here so the address is not a plain mailto in the HTML ── */
  var source = document.querySelector('[data-user][data-domain]');
  if (source) {
    var address = source.dataset.user + '@' + source.dataset.domain;
    document.querySelectorAll('.js-email').forEach(function (el) {
      el.href = 'mailto:' + address;
      if (el.classList.contains('js-email-text')) el.textContent = address;
    });
  }

  /* ── Publication filter. The counts follow the markup, so adding a paper needs no other edit. ── */
  var filters = document.querySelectorAll('.flt'), groups = document.querySelectorAll('.pg');
  groups.forEach(function (g) {
    var n = g.querySelector('.pg-title span');
    if (n) n.textContent = g.querySelectorAll('.pub').length;
  });
  filters.forEach(function (btn) {
    var count = btn.querySelector('span');
    if (count) count.textContent = document.querySelectorAll(btn.dataset.f === 'all' ? '.pub' : '.pg[data-type="' + btn.dataset.f + '"] .pub').length;
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.toggle('on', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      groups.forEach(function (g) { g.hidden = !(btn.dataset.f === 'all' || g.dataset.type === btn.dataset.f); });
    });
  });

  /* ── the loss: a shallow bowl, four wells (x, y, width, depth) in the order of the research cards,
        a bump in the middle, and some ripple ── */
  var WELLS = [[1.50, -0.70, 0.85, 1.10], [-1.55, 0.75, 1.05, 1.05], [0.35, 1.85, 0.80, 1.00], [-0.80, -1.60, 1.00, 1.25]];
  function L(x, y) {
    var v = 0.085 * (x * x + y * y), i, dx, dy;
    for (i = 0; i < WELLS.length; i++) { dx = x - WELLS[i][0]; dy = y - WELLS[i][1]; v -= WELLS[i][3] * Math.exp(-(dx * dx + dy * dy) / WELLS[i][2]); }
    dx = x + 0.25; dy = y + 0.3; v += 0.5 * Math.exp(-(dx * dx + dy * dy) / 1.3);
    return v + 0.15 * Math.sin(2.1 * x + 0.5) * Math.cos(1.9 * y - 0.4) + 0.06 * Math.sin(4.3 * x - 1.0) * Math.sin(3.7 * y + 0.8);
  }
  function grad(x, y) { var e = 1e-3; return [(L(x + e, y) - L(x - e, y)) / (2 * e), (L(x, y + e) - L(x, y - e)) / (2 * e)]; }
  /* settle each well centre on its true minimum */
  var MIN = WELLS.map(function (w) {
    var x = w[0], y = w[1], g;
    for (var i = 0; i < 400; i++) { g = grad(x, y); x -= 0.05 * g[0]; y -= 0.05 * g[1]; }
    return [x, y, L(x, y)];
  });

  var STOPS = [[38, 23, 106], [104, 43, 160], [196, 60, 142], [242, 121, 58], [243, 201, 58]];
  function ramp(t) {
    t = Math.max(0, Math.min(0.9999, t || 0)) * 4;
    var i = Math.floor(t), f = t - i, a = STOPS[i], b = STOPS[i + 1];
    return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
  }

  /* ── mesh ── */
  var N = 54, R = 3, V = N + 1, gz = new Float32Array(V * V), zmin = 1e9, zmax = -1e9, i, j;
  for (j = 0; j < V; j++) for (i = 0; i < V; i++) {
    var zz = L(-R + 2 * R * i / N, -R + 2 * R * j / N);
    gz[j * V + i] = zz; if (zz < zmin) zmin = zz; if (zz > zmax) zmax = zz;
  }
  var fills = new Array(N * N), strokes = new Array(N * N);
  for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
    var m = (gz[j * V + i] + gz[j * V + i + 1] + gz[(j + 1) * V + i] + gz[(j + 1) * V + i + 1]) / 4;
    var t = Math.pow(Math.max(0, (m - zmin) / (zmax - zmin)), 0.8), c = ramp(t);
    /* paper mixed with a little of the ramp colour: an opaque fill gives hidden-line removal */
    fills[j * N + i] = 'rgb(' + Math.round(246 + (c[0] - 246) * 0.2) + ',' + Math.round(245 + (c[1] - 245) * 0.2) + ',' + Math.round(241 + (c[2] - 241) * 0.2) + ')';
    strokes[j * N + i] = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  /* ── view ── */
  var stage = $('stage'), cv = $('surf'), ctx = cv.getContext('2d');
  var W = 0, H = 0, sc = 1, cx = 0, cy = 0, ZS = 1.35, zmid = (zmin + zmax) / 2;
  var yaw0 = 0.62, pitch = 0.70, yaw = yaw0, cs = 1, sn = 0, sa = 0, ca = 1;
  var px = new Float32Array(V * V), py = new Float32Array(V * V);
  function P(x, y, z) {
    var xr = x * cs - y * sn, yr = x * sn + y * cs;
    return [cx + xr * sc, cy + (yr * sa - (z - zmid) * ZS * ca) * sc];
  }
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width) return;
    W = r.width; H = r.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sc = Math.min(W / 8.9, H / 7.0); cx = W / 2; cy = H * 0.52;
    draw();
  }

  /* ── one satellite coming down the surface ──
     It does not go straight downhill. It heads along the downhill direction turned by almost a right angle,
     so it runs nearly along the contour and loses height only slowly: a spiral into whichever basin it is in.
     Height only ever decreases, so once it is below the lowest pass out of a basin it cannot leave, and that
     is when the basin's name appears. */
  var V0 = 0.65;           /* surface units per second */
  var DS = 0.006;          /* length of one integration step */
  var TURN_OUT = 80, TURN_IN = 84.5;   /* degrees off downhill: before and after it is inside a basin */
  var sat = null;
  /* lowest pass out of each basin, measured from its floor */
  var PASS = MIN.map(function (mn) {
    var lowest = 1e9;
    for (var a = 0; a < 72; a++) {
      var ux = Math.cos(a * 0.0873), uy = Math.sin(a * 0.0873), top = -1e9;
      for (var r = 0.05; r <= 1.7; r += 0.05) top = Math.max(top, L(mn[0] + ux * r, mn[1] + uy * r));
      lowest = Math.min(lowest, top);
    }
    return lowest - mn[2];
  });
  function init() {
    var a = Math.random() * 6.2832, r = 2.5 + Math.random() * 0.25;
    sat = { x: Math.cos(a) * r, y: Math.sin(a) * r, dir: Math.random() < 0.5 ? 1 : -1, turn: TURN_OUT, carry: 0,
            trail: [], basin: -1, show: 0, fade: 0, rest: 0, stuck: 0, landed: false, leaving: false };
    sat.trail.push([sat.x, sat.y]);
  }
  function move() {
    var o = sat, t = o.turn * 0.017453, c = Math.cos(t), s = Math.sin(t) * o.dir;
    function heading(x, y) {
      var g = grad(x, y), gm = Math.hypot(g[0], g[1]) || 1e-9, ux = -g[0] / gm, uy = -g[1] / gm;
      return [ux * c - uy * s, uy * c + ux * s];
    }
    /* midpoint step: a plain Euler step drifts outwards on a tight circle and would never arrive */
    var h1 = heading(o.x, o.y), h2 = heading(o.x + h1[0] * DS / 2, o.y + h1[1] * DS / 2);
    o.x = Math.max(-R, Math.min(R, o.x + h2[0] * DS));
    o.y = Math.max(-R, Math.min(R, o.y + h2[1] * DS));
    var last = o.trail[o.trail.length - 1], dx = o.x - last[0], dy = o.y - last[1];
    if (dx * dx + dy * dy > 0.0006) o.trail.push([o.x, o.y]);
    var n, d;
    if (o.basin < 0) {
      for (n = 0; n < MIN.length; n++) {
        d = Math.hypot(o.x - MIN[n][0], o.y - MIN[n][1]);
        if (d < 0.6 && L(o.x, o.y) - MIN[n][2] < 0.9 * PASS[n]) { o.basin = n; break; }
      }
    } else {
      if (o.turn < TURN_IN) o.turn = Math.min(TURN_IN, o.turn + 0.04);
      if (Math.hypot(o.x - MIN[o.basin][0], o.y - MIN[o.basin][1]) < 0.03) o.landed = true;
    }
  }
  /* advance by real elapsed time, so the pace is the same on any display */
  function advance(seconds) {
    var o = sat;
    seconds = Math.min(seconds, 0.05);
    if (o.leaving) { o.fade -= seconds / 1.1; if (o.fade <= 0) init(); return; }
    o.fade = Math.min(1, o.fade + seconds / 0.6);
    if (o.basin >= 0) o.show = Math.min(1, o.show + seconds / 0.5);
    if (o.landed) { o.rest += seconds; if (o.rest > 3) o.leaving = true; return; }
    var g = grad(o.x, o.y), gm = Math.hypot(g[0], g[1]);
    o.carry += seconds * V0 * Math.max(0.16, Math.min(1, gm / 0.3));   /* ease off as the slope flattens */
    while (o.carry >= DS && !o.landed) { move(); o.carry -= DS; }
    /* a dimple that is not one of the named basins: start again */
    if (o.basin < 0 && gm < 0.03) { o.stuck += seconds; if (o.stuck > 2) o.leaving = true; } else o.stuck = 0;
  }

  /* basin names come from the research cards, so the page has one place to edit them */
  var LABELS = Array.prototype.map.call(document.querySelectorAll('#research .rs h3'), function (h) { return h.textContent; });
  function draw() {
    if (!W) return;
    cs = Math.cos(yaw); sn = Math.sin(yaw); sa = Math.sin(pitch); ca = Math.cos(pitch);
    ctx.clearRect(0, 0, W, H);
    var a, b, q, p, k;
    for (b = 0; b < V; b++) for (a = 0; a < V; a++) {
      p = P(-R + 2 * R * a / N, -R + 2 * R * b / N, gz[b * V + a]); px[b * V + a] = p[0]; py[b * V + a] = p[1];
    }
    /* painter's order: far to near along both grid axes */
    ctx.lineWidth = 0.8; ctx.lineJoin = 'round';
    for (var jj = 0; jj < N; jj++) {
      b = cs >= 0 ? jj : N - 1 - jj;
      for (var ii = 0; ii < N; ii++) {
        a = sn >= 0 ? ii : N - 1 - ii;
        q = b * V + a; k = b * N + a;
        ctx.beginPath(); ctx.moveTo(px[q], py[q]); ctx.lineTo(px[q + 1], py[q + 1]); ctx.lineTo(px[q + V + 1], py[q + V + 1]); ctx.lineTo(px[q + V], py[q + V]); ctx.closePath();
        ctx.fillStyle = fills[k]; ctx.fill(); ctx.strokeStyle = strokes[k]; ctx.stroke();
      }
    }

    /* axis names along the two near edges */
    ctx.font = 'italic 400 17px "STIX Two Text", "Times New Roman", serif'; ctx.fillStyle = '#676b74'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var e1 = cs >= 0 ? R + 0.42 : -R - 0.42, e2 = sn >= 0 ? R + 0.42 : -R - 0.42;
    p = P(0, e1, L(0, cs >= 0 ? R : -R)); ctx.fillText('θ₁', p[0], p[1] + 6);
    p = P(e2, 0, L(sn >= 0 ? R : -R, 0)); ctx.fillText('θ₂', p[0], p[1] + 6);

    if (!sat) return;
    var o = sat, fade = Math.max(0, o.fade), len = o.trail.length, n;

    /* the path so far: older parts fainter */
    ctx.lineCap = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = '#15161a';
    for (var c0 = 0; c0 < len - 1; c0 += 10) {
      ctx.globalAlpha = fade * (0.3 + 0.6 * Math.pow((c0 + 10) / len, 1.5));
      ctx.beginPath();
      for (n = c0; n <= Math.min(len - 1, c0 + 10); n++) {
        var tp = o.trail[n], q2 = P(tp[0], tp[1], L(tp[0], tp[1]) + 0.015);
        if (n === c0) ctx.moveTo(q2[0], q2[1]); else ctx.lineTo(q2[0], q2[1]);
      }
      if (c0 + 10 >= len - 1) { var hq = P(o.x, o.y, L(o.x, o.y) + 0.015); ctx.lineTo(hq[0], hq[1]); }
      ctx.stroke();
    }

    /* the name of the basin it fell into */
    if (o.basin >= 0) {
      var mn = MIN[o.basin], lo = P(mn[0], mn[1], mn[2]), hi = P(mn[0], mn[1], mn[2] + 1.45);
      ctx.globalAlpha = fade * o.show;
      ctx.strokeStyle = '#15161a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lo[0], lo[1]); ctx.lineTo(hi[0], hi[1]); ctx.stroke();
      ctx.font = '600 12.5px "Inter Tight", Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
      var label = LABELS[o.basin], tw = ctx.measureText(label).width + 34;
      var left = Math.max(4, Math.min(W - tw - 4, hi[0] - 13));
      ctx.fillStyle = '#15161a'; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(left, hi[1] - 24, tw, 24, 12); else ctx.rect(left, hi[1] - 24, tw, 24);
      ctx.fill();
      ctx.fillStyle = '#f6f5f1'; ctx.fillText(label, left + 25, hi[1] - 7.5);
      ctx.font = 'italic 400 14px "STIX Two Text", "Times New Roman", serif'; ctx.fillStyle = '#f3c93a';
      ctx.fillText(String(o.basin + 1), left + 10, hi[1] - 7);
    }

    /* the satellite */
    var hp = P(o.x, o.y, L(o.x, o.y) + 0.02);
    ctx.globalAlpha = fade * 0.3; ctx.fillStyle = '#15161a';
    ctx.beginPath(); ctx.ellipse(hp[0], hp[1], 6, 2.6, 0, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = fade;
    ctx.font = '28px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🛰️', hp[0], hp[1] - 14);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }

  var raf = 0, visible = true, t0 = performance.now(), prev = 0, dragging = false, lastX = 0, user = 0;
  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) { prev = 0; return; }
    if (!dragging) yaw = yaw0 + user + 0.2 * Math.sin((now - t0) / 9000);
    advance(prev ? (now - prev) / 1000 : 0.016);
    prev = now;
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
  /* without motion: show one finished descent */
  function still() {
    for (var tries = 0; tries < 20; tries++) { init(); for (var n = 0; n < 40000 && !sat.landed; n++) move(); if (sat.landed) break; }
    sat.fade = 1; sat.show = 1; draw();
  }

  stage.addEventListener('pointerdown', function (ev) { dragging = true; lastX = ev.clientX; stage.setPointerCapture(ev.pointerId); });
  stage.addEventListener('pointermove', function (ev) {
    if (!dragging) return;
    var d = (ev.clientX - lastX) * 0.006; lastX = ev.clientX; user += d; yaw += d;
    if (reduce) draw();
  });
  function drop() { dragging = false; t0 = performance.now(); yaw0 = yaw - user; }
  stage.addEventListener('pointerup', drop); stage.addEventListener('pointercancel', drop);
  $('again').addEventListener('click', function () { if (reduce) still(); else init(); });

  init();
  resize();
  if (reduce) still(); else start();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  /* ── top bar: page scroll as a training run ── */
  var PTS = 60, curve = [];
  for (i = 0; i <= PTS; i++) {
    var u = i / PTS;
    curve.push(0.11 + 2.19 * Math.exp(-4.6 * u) + 0.05 * Math.sin(u * 37) * Math.exp(-2.5 * u));
  }
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var u = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
    var n = Math.round(u * PTS), dstr = '', x = 0, y = 0;
    for (var q = 0; q <= n; q++) { x = q / PTS * 92; y = 22 - curve[q] / 2.3 * 20; dstr += (q ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    $('curve').setAttribute('d', dstr);
    $('curve-dot').setAttribute('cx', x.toFixed(1)); $('curve-dot').setAttribute('cy', y.toFixed(1));
    $('t-step').textContent = ('000' + Math.round(u * 9000)).slice(-4);
    $('t-loss').textContent = curve[n].toFixed(3);
    $('prog').style.transform = 'scaleX(' + u + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
