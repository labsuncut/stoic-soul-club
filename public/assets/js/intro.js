// Stoic Soul Club opening. A field of dust over the city at night; the grains drift, then
// stream in curved paths into the centre and settle into the shape of the bust. Pure canvas.
// This file is loaded in the head, before paint, so the first frame is already the intro.
window.SSCIntro = (function () {
  var T = { dust: 1100, flow: 2000, hold: 800, fade: 700 }; // phase lengths in ms
  var seen = false, reduced = false;
  try { seen = sessionStorage.getItem('ssc-intro') === '1'; } catch (e) { /* private mode */ }
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
  if (!seen) document.documentElement.classList.add('intro-on');
  // Safety: if the page script never takes over (blocked, failed), uncover the page anyway.
  setTimeout(function () { if (!window.SSCIntro || !window.SSCIntro.started) document.documentElement.classList.remove('intro-on'); }, 9000);

  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  // Read the bust's shape from its picture: every opaque pixel (on a grid) is a place a grain can settle.
  function targets(img, rect, dpr, step) {
    var w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    var off = document.createElement('canvas'); off.width = w; off.height = h;
    var c = off.getContext('2d'); c.drawImage(img, 0, 0, w, h);
    var data = c.getImageData(0, 0, w, h).data, pts = [];
    for (var y = 0; y < h; y += step) for (var x = 0; x < w; x += step) {
      var i = (y * w + x) * 4;
      if (data[i + 3] > 140) {
        // Grains that land on the butterfly keep its blue; the rest are stone and bone.
        var blue = data[i + 2] > data[i] + 30;
        pts.push([rect.left * dpr + x + (Math.random() - .5) * step, rect.top * dpr + y + (Math.random() - .5) * step, blue ? 1 : 0, data[i] / 255]);
      }
    }
    for (var k = pts.length - 1; k > 0; k--) { var j = (Math.random() * (k + 1)) | 0; var t = pts[k]; pts[k] = pts[j]; pts[j] = t; }
    return pts;
  }

  function start(canvas, img) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Size the drawing to the canvas's own box and pin that size, so a phone browser's toolbar
    // growing or shrinking cannot stretch the picture away from where the real mark appears.
    var box = canvas.getBoundingClientRect();
    var W = canvas.width = Math.round(box.width * dpr), H = canvas.height = Math.round(box.height * dpr);
    canvas.style.width = box.width + 'px'; canvas.style.height = box.height + 'px'; canvas.style.bottom = 'auto'; canvas.style.right = 'auto';
    var ctx = canvas.getContext('2d');
    var anchor = img.parentNode, a0 = anchor.getBoundingClientRect();
    var r0 = img.getBoundingClientRect();
    var rect = { left: r0.left - box.left, top: r0.top - box.top, width: r0.width, height: r0.height };
    var small = box.width < 700;
    var pts = targets(img, rect, dpr, small ? 3 : 3);
    var N = Math.min(pts.length, small ? 1600 : 3000);
    var cx = (rect.left + rect.width / 2) * dpr, cy = (rect.top + rect.height / 2) * dpr;
    var P = [];
    for (var i = 0; i < N; i++) {
      var t = pts[i % pts.length];
      // Grains start everywhere on the screen, like dust in a beam of light.
      var sx = Math.random() * W, sy = Math.random() * H;
      var dx = t[0] - sx, dy = t[1] - sy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      P.push({
        sx: sx, sy: sy, tx: t[0], ty: t[1],
        nx: -dy / len, ny: dx / len,                              // sideways direction, for the curve of the path
        k: (Math.random() < .5 ? -1 : 1) * (40 + Math.random() * 160) * dpr * (len / (W * .6)),
        delay: Math.random() * .55,                               // they leave in waves, not all at once
        ph: Math.random() * Math.PI * 2, f: .8 + Math.random() * 1.6,
        s: (0.9 + Math.random() * 1.3) * dpr,
        blue: t[2] === 1, tone: .55 + t[3] * .45                   // the statue's own light and shade
      });
    }
    ctx.fillStyle = '#0E0D0C'; ctx.fillRect(0, 0, W, H);
    var t0 = null, raf = 0, stopped = false;
    var tDust = T.dust, tFlow = tDust + T.flow, tHold = tFlow + T.hold, tEnd = tHold + T.fade;

    function frame(now) {
      if (stopped) return;
      if (t0 === null) t0 = now;
      var t = now - t0;
      // If the screen shifted since the start (a toolbar moved), follow the mark to where it is now.
      var a1 = anchor.getBoundingClientRect(), b1 = canvas.getBoundingClientRect();
      var ox = ((a1.left - b1.left) - (a0.left - box.left)) * dpr, oy = ((a1.top - b1.top) - (a0.top - box.top)) * dpr;
      var inFlow = t > tDust && t < tFlow;
      // A translucent wash of ink each frame leaves soft trails behind moving grains.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = inFlow ? 'rgba(14,13,12,.22)' : 'rgba(14,13,12,.45)';
      ctx.fillRect(0, 0, W, H);
      // A cold pool of light where the bust will stand, growing as the grains arrive.
      var arrive = Math.min(1, Math.max(0, (t - tDust - 600) / 1800));
      if (arrive > 0) {
        var g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rect.width * dpr * 1.7);
        g.addColorStop(0, 'rgba(120,154,179,' + (0.08 * arrive) + ')'); g.addColorStop(.5, 'rgba(237,232,221,' + (0.03 * arrive) + ')'); g.addColorStop(1, 'rgba(237,232,221,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'lighter';
      var fadeOut = t > tHold ? Math.min(1, (t - tHold) / T.fade) : 0;
      for (var i = 0; i < N; i++) {
        var p = P[i], x, y, a;
        if (t <= tDust) {
          // Dust: the grains hang in the air and barely move.
          x = p.sx + Math.sin(t * .0006 + p.ph) * 2.5 * dpr; y = p.sy + Math.cos(t * .0005 + p.ph) * 2.5 * dpr;
          a = .2 + .55 * Math.abs(Math.sin(t * .0012 * p.f + p.ph));
          a *= Math.min(1, t / 500);
        } else {
          var e = Math.min(1, Math.max(0, (t - tDust - p.delay * T.flow) / (T.flow * (1 - p.delay))));
          var u = ease(e);
          x = p.sx + (p.tx + ox - p.sx) * u + p.nx * p.k * Math.sin(Math.PI * u);
          y = p.sy + (p.ty + oy - p.sy) * u + p.ny * p.k * Math.sin(Math.PI * u);
          // Brighter as they travel; once in place they take the statue's own shading and breathe a little.
          a = (.35 + .55 * u) * (e >= 1 ? p.tone : 1) + (e >= 1 ? .08 * Math.sin(t * .004 + p.ph) : 0);
          if (t > tFlow) { x += Math.sin(t * .003 + p.ph) * .4 * dpr; y += Math.cos(t * .0025 + p.ph) * .4 * dpr; }
        }
        a *= (1 - fadeOut);
        if (a <= 0) continue;
        ctx.fillStyle = p.blue ? 'rgba(130,170,200,' + a + ')' : 'rgba(237,232,221,' + a + ')';
        ctx.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s);
      }
      if (t < tEnd) raf = requestAnimationFrame(frame); else stopped = true;
    }
    raf = requestAnimationFrame(frame);
    return { stop: function () { stopped = true; cancelAnimationFrame(raf); }, total: tEnd };
  }
  return { start: start, seen: seen, reduced: reduced, started: false };
})();
