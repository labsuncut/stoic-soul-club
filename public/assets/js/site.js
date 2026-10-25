// Stoic Soul Club: motion, the lookbook film strip, the product order message and the
// cookie-free counters. The pages work without this file; it only adds to them.
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  document.documentElement.classList.add('js');

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

  // ---------- Motion A and B: cover type, image reveals ----------
  const statements = $$('.statement');
  for (const el of statements) el.setAttribute('data-animate', '');
  const frames = $$('.frame').filter((f) => !f.closest('.strip') && !f.closest('.pdp-gallery'));
  for (const f of frames) f.setAttribute('data-reveal', '');
  const cover = $('.cover');
  const show = (el) => el.classList.add('in');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    for (const el of [...statements, ...frames]) io.observe(el);
  } else {
    for (const el of [...statements, ...frames]) show(el);
  }
  // The cover runs once on load, after the fonts are ready so the lines do not reflow mid-move.
  const start = () => { if (cover) show(cover); const h = cover && $('.statement', cover); if (h) show(h); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  setTimeout(start, 900);

  // ---------- Motion C: the film strip ----------
  // The track follows the finger 1:1; on release it glides exactly one frame, starting at the
  // finger's own speed and ending at zero speed (the engine approved on the Apollo site).
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
    let x = 0, raf = 0, dragging = false, startX = 0, startT = 0, lastX = 0, lastT = 0, vel = 0, base = 0;
    const apply = () => { track.style.transform = `translate3d(${-x}px,0,0)`; };
    const clamp = (n) => Math.max(0, Math.min(max(), n));
    function glide(to, v0) {
      cancelAnimationFrame(raf);
      const from = x, dist = to - from;
      if (reduced.matches || Math.abs(dist) < 1) { x = to; apply(); return; }
      const speed = Math.min(Math.abs(v0), 3);
      const dur = 300 + 260 * (1 - speed / 3);
      const t0 = performance.now();
      const tick = (now) => {
        const u = Math.min(1, (now - t0) / dur);
        const a = 1 - Math.pow(1 - u, 3) * (1 + 3 * u);
        const b = 1 - Math.pow(1 - u, 3);
        const k = speed / 3;
        const e = a * (1 - k) + b * k;
        x = from + dist * e; apply();
        if (u < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    const go = (n, v = 0) => { i = clamp(n); glide(i * step(), v); setLabel(); };
    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelAnimationFrame(raf);
      dragging = true; startX = lastX = e.clientX; startT = lastT = performance.now(); base = x; vel = 0;
      track.classList.add('dragging'); track.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
      x = Math.max(-40, Math.min(max() * step() + 40, base - (e.clientX - startX))); apply();
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false; track.classList.remove('dragging');
      const dx = e.clientX - startX;
      const near = Math.round(x / step());
      let n = near;
      if (Math.abs(dx) > 12 || Math.abs(vel) > 0.2) n = dx < 0 ? Math.max(near, i + 1) : Math.min(near, i - 1);
      go(n, -vel);
      if (Math.abs(dx) > 6) { const kill = (ev) => { ev.preventDefault(); ev.stopPropagation(); }; track.addEventListener('click', kill, { capture: true, once: true }); setTimeout(() => track.removeEventListener('click', kill, { capture: true }), 50); }
    };
    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);
    track.addEventListener('dragstart', (e) => e.preventDefault());
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
})();
