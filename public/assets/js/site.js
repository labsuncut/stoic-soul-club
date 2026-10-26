// Stoic Soul Club: the opening, motion, the pieces reel, the chapter stage, the lookbook film
// strip, the product order message and the cookie-free counters. The pages work without this
// file; it only adds to them.
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const root = document.documentElement;
  root.classList.add('js');

  // ---------- Counters (no cookies, no ids, nothing personal) ----------
  const source = (() => {
    const utm = new URLSearchParams(location.search).get('utm_source');
    if (utm) return utm.slice(0, 30);
    try { const ref = document.referrer && new URL(document.referrer).hostname; if (ref && /instagram\.com$/.test(ref)) return 'instagram'; if (ref && ref !== location.hostname) return ref.slice(0, 30); } catch { /* ignore */ }
    return '';
  })();
  function track(kind, data = {}) {
    try {
      const body = JSON.stringify({ kind, page: location.pathname.slice(0, 80), source, ...data });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
      else fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch { /* counting must never break the page */ }
  }

  // ---------- Menu ----------
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.lastChild.textContent = open ? 'Close' : 'Menu';
      document.body.style.overflow = open ? 'hidden' : '';
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) menuBtn.click(); });
  }

  // ---------- One frame loop for everything that follows the scroll ----------
  const followers = [];
  let queued = false;
  const runFollowers = () => { queued = false; for (const fn of followers) fn(); };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(runFollowers); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  const head = $('.masthead');
  if (head) followers.push(() => head.classList.toggle('scrolled', scrollY > 24));

  // ---------- Motion A and B: statements, frames, things that rise ----------
  const statements = $$('.statement');
  for (const el of statements) el.setAttribute('data-animate', '');
  const frames = $$('.frame').filter((f) => !f.closest('.strip') && !f.closest('.pdp-gallery') && !f.closest('.reel'));
  for (const f of frames) f.setAttribute('data-reveal', '');
  const risers = $$('[data-rise], .legend');
  const cover = $('.cover');
  const show = (el) => el.classList.add('in');
  const watched = [...statements, ...frames, ...risers].filter((el) => !cover || !cover.contains(el));
  if ('IntersectionObserver' in window && !reduced.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    for (const el of watched) io.observe(el);
  } else {
    for (const el of watched) show(el);
  }
  // The cover runs once, after the opening and after the fonts are ready so the lines do not reflow mid-move.
  let coverStarted = false;
  function startCover() {
    if (coverStarted) return;
    coverStarted = true;
    const go = () => { if (cover) { show(cover); const h = $('.statement', cover); if (h) show(h); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    setTimeout(go, 900);
  }
  // The cover photo sinks slower than the page, and a soft light follows the pointer across it.
  if (cover) {
    if (!reduced.matches) followers.push(() => cover.style.setProperty('--sy', String(Math.min(scrollY, innerHeight * 1.3))));
    if (matchMedia('(hover: hover)').matches) cover.addEventListener('pointermove', (e) => {
      const r = cover.getBoundingClientRect();
      cover.style.setProperty('--mx', `${e.clientX - r.left}px`); cover.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  // Things that drift slower than the page (the interlude photograph).
  const drifters = $$('[data-parallax]');
  if (drifters.length && !reduced.matches) followers.push(() => {
    for (const el of drifters) {
      const r = (el.closest('section') || el).getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const k = parseFloat(el.dataset.parallax) || 0;
      el.style.setProperty('--py', ((r.top + r.height / 2 - innerHeight / 2) * k).toFixed(1));
    }
  });

  // ---------- The opening ----------
  // Butterflies come in out of the dark and gather where the bust stands; one lands on its
  // shoulder and becomes the mark, the name writes itself, then both fly to their places in
  // the masthead. Once per visit; a tap, Escape or Skip ends it. People who asked their phone
  // for less motion get the short version (mark, name, line) without the butterflies.
  const intro = $('#intro');
  const I = window.SSCIntro;
  const wordmark = $('.masthead .wordmark');
  if (intro && I && !I.seen) {
    I.started = true;
    let done = false, scene = null, timer = 0;
    const markImg = $('#intro-mark'), word = $('#intro-word');
    const flyTo = (el, target) => {
      if (!el) return;
      if (!target) { el.style.opacity = '0'; return; }
      const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
      el.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})`;
    };
    const end = () => {
      if (done) return;
      done = true; clearTimeout(timer);
      try { sessionStorage.setItem('ssc-intro', '1'); } catch { /* private mode */ }
      if (wordmark) wordmark.classList.add('landing');
      intro.classList.add('done');
      root.classList.remove('intro-on');
      flyTo(markImg, wordmark && $('.mark', wordmark)); flyTo(word, wordmark && $('span', wordmark));
      setTimeout(() => { if (wordmark) wordmark.classList.remove('landing'); }, 800);
      setTimeout(() => { intro.classList.remove('play'); intro.hidden = true; if (scene) scene.stop(); startCover(); }, 1200);
    };
    intro.classList.add('play');
    const begin = () => {
      if (done || intro.classList.contains('rolling')) return;
      if (I.reduced) { intro.classList.add('rolling', 'quick', 'landed'); timer = setTimeout(end, 2600); return; }
      try { scene = I.start($('#intro-canvas'), markImg, () => intro.classList.add('landed')); } catch { end(); return; }
      intro.classList.add('rolling');
      timer = setTimeout(end, 5500);
    };
    // The scene needs the bust's picture to know its shape; start the clock once it is ready (or at once if it never loads).
    if (markImg.decode) markImg.decode().then(begin, begin); else if (markImg.complete) begin(); else { markImg.onload = begin; markImg.onerror = begin; }
    setTimeout(begin, 1500);
    intro.addEventListener('click', end);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') end(); });
    setTimeout(end, 9500); // safety net
  } else {
    if (intro) intro.hidden = true;
    root.classList.remove('intro-on');
    startCover();
  }

  // ---------- The shared glide: one frame, starting at the finger's speed, ending at rest ----------
  // (the engine approved on the Apollo site: no jump at release, no long tail)
  function tween(from, to, v0, apply, onDone) {
    const dist = to - from;
    if (reduced.matches || Math.abs(dist) < 1) { apply(to); if (onDone) onDone(); return () => {}; }
    const speed = Math.min(Math.abs(v0), 3);
    const dur = 300 + 260 * (1 - speed / 3);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const a = 1 - Math.pow(1 - u, 3) * (1 + 3 * u);
      const b = 1 - Math.pow(1 - u, 3);
      const k = speed / 3;
      apply(from + dist * (a * (1 - k) + b * k));
      if (u < 1) raf = requestAnimationFrame(tick); else if (onDone) onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }
  // After a real drag, the click that ends it must not open the piece under the finger.
  function swallowClick(track) {
    const kill = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    track.addEventListener('click', kill, { capture: true, once: true });
    setTimeout(() => track.removeEventListener('click', kill, { capture: true }), 50);
  }
  // One grab handler for every track. A mouse drags through pointer events. A finger uses touch
  // events directly (iOS does not always honour touch-action for pointer events) and decides
  // within the first few pixels whether it is swiping the track or scrolling the page: a
  // horizontal swipe takes the track 1:1 and the page stays put; a vertical one is left to the
  // page. A trackpad's sideways scroll moves the track too and settles when it stops.
  function grab(track, h) {
    let dragging = false, startX = 0, startY = 0, lastX = 0, lastT = 0, vel = 0, lock = null, wheelT = 0, wheelDx = 0;
    const begin = (cx, cy) => { dragging = true; lock = null; startX = lastX = cx; startY = cy; lastT = performance.now(); vel = 0; track.classList.add('dragging'); h.start(); };
    const move = (cx) => {
      const now = performance.now();
      vel = (cx - lastX) / Math.max(1, now - lastT); lastX = cx; lastT = now;
      h.move(cx - startX);
    };
    const finish = (cx) => {
      if (!dragging) return;
      dragging = false; track.classList.remove('dragging');
      const dx = cx - startX;
      if (Math.abs(dx) > 6) swallowClick(track);
      h.end(dx, vel);
    };
    const hasTouch = 'ontouchstart' in window;
    track.addEventListener('pointerdown', (e) => {
      if (hasTouch && e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      begin(e.clientX, e.clientY); lock = 'x';
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    });
    track.addEventListener('pointermove', (e) => { if (dragging && lock === 'x' && !(hasTouch && e.pointerType === 'touch')) move(e.clientX); });
    const pointerUp = (e) => { if (!(hasTouch && e.pointerType === 'touch')) finish(e.clientX); };
    track.addEventListener('pointerup', pointerUp);
    track.addEventListener('pointercancel', pointerUp);
    if (hasTouch) {
      track.addEventListener('touchstart', (e) => { if (e.touches.length === 1) begin(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      track.addEventListener('touchmove', (e) => {
        if (!dragging || e.touches.length !== 1) return;
        const t = e.touches[0];
        if (!lock) {
          const ax = Math.abs(t.clientX - startX), ay = Math.abs(t.clientY - startY);
          if (ax < 6 && ay < 6) return;
          lock = ax > ay ? 'x' : 'y';
          if (lock === 'y') { dragging = false; track.classList.remove('dragging'); h.end(0, 0); return; }
        }
        e.preventDefault();
        move(t.clientX);
      }, { passive: false });
      const touchEnd = (e) => { if (dragging) finish(e.changedTouches.length ? e.changedTouches[0].clientX : lastX); };
      track.addEventListener('touchend', touchEnd);
      track.addEventListener('touchcancel', touchEnd);
    }
    track.addEventListener('wheel', (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      if (!wheelT) { h.start(); wheelDx = 0; }
      wheelDx -= dx; h.move(wheelDx);
      clearTimeout(wheelT);
      wheelT = setTimeout(() => { wheelT = 0; h.end(wheelDx, 0, true); }, 110);
    }, { passive: false });
    track.addEventListener('dragstart', (e) => e.preventDefault());
  }

  // ---------- The pieces reel ----------
  // The track walks on its own, endlessly (the pieces are laid twice), a little faster while the
  // page scrolls. A finger, a mouse or a trackpad takes it 1:1; on release it settles on the next
  // piece (a quick flick carries it a few pieces further) and rests for a while before walking
  // again. The arrows step one piece. Hovering pauses it.
  for (const reelEl of $$('[data-reel]')) {
    const track = $('.reel-track', reelEl);
    const cells = $$('.reel-cell', track);
    const n = cells.length / 2;
    if (!(n >= 2) || reduced.matches) continue;
    track.classList.add('is-engine');
    const walk = coarse.matches ? 20 : 30; // px per second
    let x = 0, lap = 0, last = 0, boost = 0, lastScroll = scrollY, holdUntil = 0, hover = false;
    let dragging = false, base = 0, cancelGlide = () => {}, gliding = false;
    const measure = () => { lap = cells[n].offsetLeft - cells[0].offsetLeft; };
    const step = () => cells[1].offsetLeft - cells[0].offsetLeft;
    const wrap = (v) => ((v % lap) + lap) % lap;
    const apply = () => { track.style.transform = `translate3d(${-x}px,0,0)`; };
    measure();
    followers.push(() => { const dy = scrollY - lastScroll; lastScroll = scrollY; boost = Math.max(-900, Math.min(900, boost + dy * 1.1)); });
    const frame = (now) => {
      const dt = Math.min(50, now - (last || now)); last = now;
      if (!dragging && !gliding) {
        const moving = Math.abs(boost) > 1;
        if ((!hover && now > holdUntil) || moving) { x = wrap(x + ((hover || now <= holdUntil ? 0 : walk) + boost) * dt / 1000); apply(); }
        boost *= 0.93;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    const glideTo = (target, v0) => {
      gliding = true;
      cancelGlide = tween(x, target, v0, (v) => { x = v; apply(); }, () => { gliding = false; x = wrap(x); apply(); holdUntil = performance.now() + 4000; });
    };
    const settle = (dir, v0) => {
      const st = step();
      // Where a flick would carry the track, snapped to a piece: at least one piece in the swipe's
      // direction, at most three.
      const carry = Math.max(-3, Math.min(3, Math.round((x + v0 * 220) / st) - Math.round(x / st)));
      const near = Math.round(x / st);
      let target = near;
      if (dir > 0) target = Math.max(Math.floor(x / st + 1e-6) + 1, near + Math.max(0, carry));
      else if (dir < 0) target = Math.min(Math.ceil(x / st - 1e-6) - 1, near + Math.min(0, carry));
      glideTo(target * st, v0);
    };
    const nudge = (dir) => {
      cancelGlide(); boost = 0;
      const st = step(), cur = dir > 0 ? Math.floor(x / st + 1e-6) : Math.ceil(x / st - 1e-6);
      glideTo((cur + dir) * st, 0);
    };
    grab(track, {
      start() { cancelGlide(); gliding = false; boost = 0; dragging = true; base = x; },
      move(dx) { x = base - dx; apply(); },
      end(dx, vel, nearest) {
        dragging = false;
        const dir = !nearest && (Math.abs(dx) > 12 || Math.abs(vel) > 0.2) ? (dx < 0 ? 1 : -1) : 0;
        settle(dir, -vel);
      },
    });
    $('[data-reel-prev]', reelEl.parentElement)?.addEventListener('click', () => nudge(-1));
    $('[data-reel-next]', reelEl.parentElement)?.addEventListener('click', () => nudge(1));
    reelEl.tabIndex = 0;
    reelEl.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { nudge(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { nudge(-1); e.preventDefault(); } });
    if (matchMedia('(hover: hover)').matches) { reelEl.addEventListener('pointerenter', () => { hover = true; }); reelEl.addEventListener('pointerleave', () => { hover = false; }); }
    addEventListener('resize', () => { measure(); x = wrap(x); apply(); });
    apply();
  }

  // ---------- The chapter stage ----------
  // The stage stays on screen while the page scrolls one chapter at a time through it. The
  // page's own scrolling is never taken over; the stage only reads where the page is.
  const sceneEl = $('[data-scene]');
  if (sceneEl && !reduced.matches) {
    const stage = $('.scene-stage', sceneEl);
    const panels = $$('[data-panel]', sceneEl);
    const dots = $$('.scene-rail li', sceneEl);
    const n = panels.length;
    let active = -1;
    if (n) followers.push(() => {
      const top = sceneEl.getBoundingClientRect().top;
      const span = Math.max(1, sceneEl.offsetHeight - stage.offsetHeight);
      const p = Math.min(1, Math.max(0, -top / span));
      const seg = Math.min(n - 1e-4, p * n);
      const i = Math.floor(seg), local = seg - i;
      if (i !== active) {
        active = i;
        panels.forEach((el, k) => { el.classList.toggle('is-active', k === i); el.classList.toggle('is-past', k < i); });
        dots.forEach((el, k) => el.classList.toggle('on', k === i));
        stage.style.setProperty('--accent', panels[i].style.getPropertyValue('--accent'));
      }
      panels[i].style.setProperty('--p', local.toFixed(4));
    });
  } else if (sceneEl) {
    for (const el of $$('[data-panel]', sceneEl)) el.classList.add('is-active');
  }

  // ---------- The philosophy: words fill as the reader reaches them ----------
  for (const fillEl of $$('[data-fill]')) {
    const ws = $$('.w', fillEl);
    if (reduced.matches || !ws.length) { for (const w of ws) w.classList.add('on'); continue; }
    let lastK = -1;
    followers.push(() => {
      const r = fillEl.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.25)));
      const k = Math.round(p * ws.length);
      if (k === lastK) return;
      lastK = k;
      ws.forEach((w, i) => w.classList.toggle('on', i < k));
    });
  }

  // ---------- Motion C: the film strip ----------
  // The track follows the finger 1:1; on release it glides exactly one frame, starting at the
  // finger's own speed and ending at zero speed.
  for (const strip of $$('[data-strip]')) {
    const track = $('.strip-track', strip);
    const cells = $$('.strip-cell', track);
    const cap = $('[data-strip-caption]', strip);
    const num = $('[data-strip-n]', strip);
    if (cells.length < 2) continue;
    let i = 0;
    const setLabel = () => {
      const f = $('figcaption', cells[i]) || { textContent: '' };
      const ph = $('.ph-shot', cells[i]);
      if (cap) cap.textContent = (ph ? ph.textContent : '') || cells[i].dataset.caption || f.textContent || '';
      if (num) num.textContent = String(i + 1).padStart(2, '0');
    };
    for (const c of cells) { const shot = $('.ph-shot', c) || $('img', c); c.dataset.caption = shot ? (shot.textContent || shot.alt) : ''; }
    const step = () => cells[1].offsetLeft - cells[0].offsetLeft;
    const max = () => cells.length - Math.max(1, Math.floor((track.clientWidth - parseFloat(getComputedStyle(track).paddingLeft) * 2 + 12) / step()));
    track.classList.add('is-engine');
    let x = 0, base = 0, cancelGlide = () => {};
    const apply = () => { track.style.transform = `translate3d(${-x}px,0,0)`; };
    const clamp = (n) => Math.max(0, Math.min(max(), n));
    const go = (n, v = 0) => { i = clamp(n); cancelGlide(); cancelGlide = tween(x, i * step(), v, (val) => { x = val; apply(); }); setLabel(); };
    grab(track, {
      start() { cancelGlide(); base = x; },
      move(dx) { x = Math.max(-40, Math.min(max() * step() + 40, base - dx)); apply(); },
      end(dx, vel, nearest) {
        const near = Math.round(x / step());
        let n = near;
        if (!nearest && (Math.abs(dx) > 12 || Math.abs(vel) > 0.2)) n = dx < 0 ? Math.max(near, i + 1) : Math.min(near, i - 1);
        go(n, -vel);
      },
    });
    $('[data-strip-prev]', strip)?.addEventListener('click', () => go(i - 1));
    $('[data-strip-next]', strip)?.addEventListener('click', () => go(i + 1));
    strip.tabIndex = 0;
    strip.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); } });
    addEventListener('resize', () => { x = clamp(i) * step(); i = clamp(i); apply(); });
    setLabel();
  }

  // ---------- Motion D and the order message: product page ----------
  const data = $('#product-data');
  if (data) {
    let p = {};
    try { p = JSON.parse(data.textContent); } catch { /* no product */ }
    track('product_view', { product: p.slug, collection: p.collection });
    const form = $('[data-order]');
    const btn = $('[data-order-btn]');
    const hint = $('[data-order-hint]');
    const gallery = $('[data-gallery]');
    const message = ({ color, size, country }) => [
      'Hello Stoic Soul Club!',
      "I'd like to inquire about:",
      `Product: ${p.name}`,
      color ? `Variant: ${color}` : null,
      `Size: ${size}`,
      `Displayed Price: ${p.price}`,
      `Destination Country: ${country}`,
      `Product Link: ${p.url}`,
      'Could you please confirm availability and the final amount including delivery?',
    ].filter(Boolean).join('\n');
    const waLink = (text) => `https://wa.me/${encodeURIComponent(p.whatsapp)}?text=${encodeURIComponent(text)}`;
    const choice = () => form && {
      color: (form.querySelector('input[name=color]:checked') || {}).value || (p.colors.length === 1 ? p.colors[0] : ''),
      size: (form.querySelector('input[name=size]:checked') || {}).value || '',
      country: form.country ? form.country.value : 'Jordan',
    };
    // Sizes follow the chosen colour: a size that is gone in this colour is struck through.
    function refresh() {
      if (!form) return;
      const c = choice();
      for (const input of form.querySelectorAll('input[name=size]')) {
        const key = `${c.color}|${input.value}`;
        const ok = c.color ? !!p.stock[key] : p.colors.some((col) => p.stock[`${col}|${input.value}`]);
        input.disabled = !ok; input.closest('.chip').classList.toggle('out', !ok);
        if (!ok && input.checked) input.checked = false;
      }
      const ready = !!p.whatsapp && !!choice().size && (!p.colors.length || !!choice().color);
      btn.disabled = !ready;
      if (hint && p.whatsapp) hint.textContent = ready
        ? `WhatsApp opens with your inquiry written for ${p.name}, size ${choice().size}. You send it. Nothing is reserved or paid until Stoic confirms.`
        : 'Pick a size first. WhatsApp opens with your inquiry written; you send it. Nothing is reserved or paid until Stoic confirms.';
    }
    if (form) {
      form.addEventListener('change', (e) => {
        if (e.target.name === 'size' && e.target.checked) track('size_select', { product: p.slug, collection: p.collection, size: e.target.value });
        refresh();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const c = choice();
        if (btn.disabled || !c.size) { refresh(); return; }
        track('wa_click', { product: p.slug, collection: p.collection, size: c.size });
        // Opened by the customer's own tap, in a new tab on desktop and the app on phones. Nothing is sent by us.
        window.open(waLink(message(c)), '_blank', 'noopener');
      });
      refresh();
    }
    const restock = $('[data-restock]');
    if (restock && p.whatsapp) {
      restock.href = waLink(`Hello Stoic Soul Club! Will ${p.name} be restocked? I'd like to know when it is available again.\n${p.url}`);
      restock.target = '_blank'; restock.rel = 'noopener';
      restock.addEventListener('click', () => track('restock_click', { product: p.slug, collection: p.collection }));
    }
    // On phones the gallery swipes like the strip; on desktop it is an editorial column.
    if (gallery && coarse.matches) gallery.classList.add('is-swipe');
  } else if (document.body.dataset.page === 'home') {
    track('page_view');
  }
  $('[data-wa-general]')?.addEventListener('click', () => track('wa_click', { product: 'general' }));

  runFollowers();
  addEventListener('load', schedule);
})();
