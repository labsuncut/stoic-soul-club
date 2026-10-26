// Stoic Soul Club opening. Butterflies come in out of the dark, circle, and gather where the
// bust stands; the bust surfaces beneath them; the others scatter and one lands on its shoulder
// and becomes the mark. Pure canvas, nothing else. Loaded in the head, before paint, so the
// first frame is already the opening.
window.SSCIntro = (function () {
  // Phase ends, in ms from the first frame.
  var T = { gather: 2500, land: 3300, swap: 3750, end: 5400 };
  var seen = false, reduced = false;
  try { seen = sessionStorage.getItem('ssc-intro') === '1'; } catch (e) { /* private mode */ }
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
  if (!seen) document.documentElement.classList.add('intro-on', 'had-intro');
  // Safety: if the page script never takes over (blocked, failed), uncover the page anyway.
  setTimeout(function () { if (!window.SSCIntro || !window.SSCIntro.started) document.documentElement.classList.remove('intro-on'); }, 9000);

  var BLUE = [120, 154, 179], BONE = [237, 232, 221];
  function easeInOut(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  // The bust without its butterfly, as a bitmap, plus where that butterfly sits: the landing place.
  function bustLayer(img, rect, dpr) {
    var w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    var off = document.createElement('canvas'); off.width = w; off.height = h;
    var c = off.getContext('2d'); c.drawImage(img, 0, 0, w, h);
    var im = c.getImageData(0, 0, w, h), d = im.data, blue = new Uint8Array(w * h);
    var sx = 0, sy = 0, n = 0, minx = w, maxx = 0, miny = h, maxy = 0;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4;
      if (d[i + 3] > 40 && d[i + 2] > d[i] + 30) { blue[y * w + x] = 1; sx += x; sy += y; n++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    // Clear the butterfly and a margin around it (its bone body too), so nothing of it is left on the stone.
    var R = Math.max(3, Math.round(4 * dpr));
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (!blue[y * w + x]) continue;
      d[(y * w + x) * 4 + 3] = 0;
      // Only the edge of the butterfly needs the margin cleared around it; inside it every pixel clears itself.
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && blue[y * w + x - 1] && blue[y * w + x + 1] && blue[(y - 1) * w + x] && blue[(y + 1) * w + x]) continue;
      for (var yy = Math.max(0, y - R); yy <= Math.min(h - 1, y + R); yy++) for (var xx = Math.max(0, x - R); xx <= Math.min(w - 1, x + R); xx++) d[(yy * w + xx) * 4 + 3] = 0;
    }
    c.putImageData(im, 0, 0);
    var land = n ? { x: sx / n, y: sy / n, s: Math.max(maxx - minx, maxy - miny) / 2 } : { x: w * .72, y: h * .3, s: w * .06 };
    return { canvas: off, land: land };
  }

  // One butterfly seen from above: two wings that beat by folding toward the body.
  function wing(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s * .12);
    ctx.bezierCurveTo(s * .5, -s * 1.08, s * 1.18, -s * .62, s * .96, -s * .06);
    ctx.bezierCurveTo(s * .98, s * .36, s * .6, s * .78, s * .1, s * .3);
    ctx.closePath();
    ctx.fill();
  }
  function drawButterfly(ctx, x, y, s, rot, flap, a, tone) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
    ctx.fillStyle = rgba(BLUE, tone);
    ctx.save(); ctx.scale(flap, 1); wing(ctx, s); ctx.restore();
    ctx.save(); ctx.scale(-flap, 1); wing(ctx, s); ctx.restore();
    ctx.fillStyle = rgba(BONE, .55);
    ctx.fillRect(-s * .05, -s * .42, s * .1, s * .84);
    ctx.restore();
  }

  function start(canvas, img, onLand) {
    // Phones draw at 1.5x: the butterflies are tiny and the bust only shows for two seconds, and a full 3x canvas costs frames.
    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2);
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
    var bx = rect.left * dpr, by = rect.top * dpr, bw = rect.width * dpr, bh = rect.height * dpr;
    var cx = bx + bw / 2, cy = by + bh * .48;
    // The bust layer (reading the picture pixel by pixel) is built a moment after the first
    // frames, off the page's loading work; it is not needed until the bust surfaces at 1.3 s.
    var layer = null, L = { x: bx + bw * .72, y: by + bh * .3, s: bw * .06 };
    setTimeout(function () { layer = bustLayer(img, rect, dpr); L = { x: bx + layer.land.x, y: by + layer.land.y, s: layer.land.s }; }, 80);
    var N = small ? 9 : 14;
    var B = [];
    for (var i = 0; i < N; i++) {
      var th = Math.random() * Math.PI * 2;
      var far = Math.max(W, H) * (.62 + Math.random() * .3);
      B.push({
        th0: th, w: (Math.random() < .5 ? -1 : 1) * (.9 + Math.random() * .7) / 1000,  // radians per ms around the bust
        r0: far, r1: bh * (.42 + Math.random() * .32),                                  // from off the screen to a ring around the bust
        squash: .62 + Math.random() * .22,                                              // the ring seen at an angle
        delay: Math.random() * 700,
        s: (small ? 7 : 9) * dpr * (.8 + Math.random() * .6),
        f: 7 + Math.random() * 4, ph: Math.random() * 7,                                // wing beats per second, phase
        n1: Math.random() * 7, n2: Math.random() * 7, nk: (4 + Math.random() * 6) * dpr,
        tone: .7 + Math.random() * .3, rot: 0, x: 0, y: 0, px: 0, py: 0,
        up: (small ? 120 : 180) * dpr * (.6 + Math.random() * .8)
      });
    }
    var hero = B[0]; hero.delay = 120; hero.tone = 1; hero.s = 10 * dpr; hero.r1 = bh * .5; hero.w = Math.abs(hero.w);
    var t0 = null, raf = 0, stopped = false, landed = false, heroFrom = null, handOff = T.gather - 450;

    function orbit(b, t) {
      // Where a butterfly circling the bust is at time t, before any scattering.
      var e = clamp01((t - b.delay) / (T.gather - b.delay));
      var r = b.r0 + (b.r1 - b.r0) * easeOut(e);
      var th = b.th0 + b.w * Math.max(0, t - b.delay);
      var nx = Math.sin(t * .0021 + b.n1) * b.nk + Math.sin(t * .0007 + b.n2) * b.nk * .6;
      var ny = Math.cos(t * .0017 + b.n2) * b.nk;
      return [cx + Math.cos(th) * r + nx, cy + Math.sin(th) * r * b.squash + ny];
    }

    ctx.fillStyle = '#0E0D0C'; ctx.fillRect(0, 0, W, H);

    function frame(now) {
      if (stopped) return;
      if (t0 === null) t0 = now;
      var t = now - t0;
      // If the screen shifted since the start (a toolbar moved), follow the mark to where it is now.
      var a1 = anchor.getBoundingClientRect(), b1 = canvas.getBoundingClientRect();
      var ox = ((a1.left - b1.left) - (a0.left - box.left)) * dpr, oy = ((a1.top - b1.top) - (a0.top - box.top)) * dpr;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0E0D0C'; ctx.fillRect(0, 0, W, H);

      // A cold pool of light where the bust will stand, growing as they gather.
      var pool = clamp01((t - 900) / 1600);
      if (pool > 0) {
        var g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, bw * 1.6);
        g.addColorStop(0, rgba(BLUE, .09 * pool)); g.addColorStop(.5, rgba(BONE, .03 * pool)); g.addColorStop(1, rgba(BONE, 0));
        ctx.fillStyle = g; ctx.fillRect(cx + ox - bw * 1.6, cy + oy - bw * 1.6, bw * 3.2, bw * 3.2); // the gradient is transparent beyond this square
      }
      // The bust surfaces beneath them, without its butterfly, and goes once the real mark has taken over.
      var bustIn = clamp01((t - 1300) / 1100), bustOut = clamp01((t - T.land) / (T.swap - T.land));
      var bustA = easeInOut(bustIn) * (1 - bustOut);
      if (bustA > 0 && layer) { ctx.globalAlpha = bustA; ctx.drawImage(layer.canvas, bx + ox, by + oy, bw, bh); ctx.globalAlpha = 1; }

      for (var i = 0; i < N; i++) {
        var b = B[i], x, y, a, s = b.s, flap, rot;
        if (t < b.delay) continue;
        var isHero = b === hero;
        if (isHero && t >= handOff) {
          // The one that stays: from its place in the ring to the shoulder, on a slow arc, wings easing to rest.
          if (!heroFrom) { heroFrom = orbit(b, handOff); }
          var u = easeInOut(clamp01((t - handOff) / (T.land - handOff)));
          var lx = L.x + ox, ly = L.y + oy;
          var mx = (heroFrom[0] + lx) / 2 - (lx - heroFrom[0]) * .25, my = Math.min(heroFrom[1], ly) - bh * .32;
          x = (1 - u) * (1 - u) * heroFrom[0] + 2 * (1 - u) * u * mx + u * u * lx;
          y = (1 - u) * (1 - u) * heroFrom[1] + 2 * (1 - u) * u * my + u * u * ly;
          s = b.s + (L.s - b.s) * u;
          var beat = b.f * (1 - .75 * u);
          flap = u >= 1 ? .96 : .28 + .7 * Math.abs(Math.cos(t / 1000 * Math.PI * beat + b.ph));
          a = 1 - clamp01((t - T.land) / (T.swap - T.land));
          if (u >= 1 && !landed) { landed = true; try { onLand && onLand(); } catch (e) { /* the page decides */ } }
        } else {
          var o = orbit(b, t);
          x = o[0]; y = o[1];
          var inA = clamp01((t - b.delay) / 600);
          a = inA * b.tone;
          if (t > T.gather) {
            // The rest scatter: up and out, fading as they go.
            var v = easeInOut(clamp01((t - T.gather) / 850));
            var dx = o[0] - cx, dy = o[1] - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
            x += dx / len * v * b.up * 1.2; y += dy / len * v * b.up * .5 - v * b.up;
            a *= 1 - v;
          }
          flap = .28 + .7 * Math.abs(Math.cos(t / 1000 * Math.PI * b.f + b.ph));
        }
        if (b.px || b.py) { var hx = x - b.px, hy = y - b.py; if (hx * hx + hy * hy > .25) { var target = Math.atan2(hy, hx) + Math.PI / 2; var dr = Math.atan2(Math.sin(target - b.rot), Math.cos(target - b.rot)); b.rot += dr * .18; } }
        if (isHero && t >= handOff) { var ru = easeInOut(clamp01((t - handOff) / (T.land - handOff))); b.rot = b.rot * (1 - ru * .9) + (-.35) * ru * .9; }
        b.px = x; b.py = y;
        drawButterfly(ctx, x, y, s, b.rot, flap, a, b.tone);
      }
      if (t < T.end) raf = requestAnimationFrame(frame); else stopped = true;
    }
    raf = requestAnimationFrame(frame);
    return { stop: function () { stopped = true; cancelAnimationFrame(raf); }, total: T.end };
  }
  return { start: start, seen: seen, reduced: reduced, started: false, T: T };
})();
