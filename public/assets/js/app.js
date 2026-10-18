// Stoic shop: language, bag, product pages, checkout, test payment and order tracking.
// Each page says which part it needs with <body data-page="...">.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // ---------- Language ----------
  let lang = store.get('lang') === 'ar' ? 'ar' : 'en';
  const t = () => window.UI[lang];
  const originals = new Map();
  const rerenders = [];
  const pick = (obj, field) => (lang === 'ar' ? obj[`${field}_ar`] || obj[`${field}_en`] : obj[`${field}_en`]);

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    for (const el of $$('[data-i18n]')) {
      if (!originals.has(el)) originals.set(el, el.textContent);
      const ar = window.AR[el.dataset.i18n];
      el.textContent = lang === 'ar' && ar ? ar : originals.get(el);
    }
    for (const el of $$('[data-i18n-ph]')) {
      if (!originals.has(el)) originals.set(el, el.placeholder);
      const ar = window.AR[el.dataset.i18nPh];
      el.placeholder = lang === 'ar' && ar ? ar : originals.get(el);
    }
    const toggle = $('#lang-toggle');
    if (toggle) { toggle.textContent = lang === 'ar' ? 'English' : 'عربي'; toggle.lang = lang === 'ar' ? 'en' : 'ar'; }
    rerenders.forEach((fn) => fn());
  }
  $('#lang-toggle')?.addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; store.set('lang', lang); applyLang(); });

  // ---------- Helpers ----------
  async function api(path, options = {}) {
    const res = await fetch(path, { ...options, headers: options.body ? { 'content-type': 'application/json' } : {} });
    let data = {};
    try { data = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) { const err = new Error(data.error || 'Request failed'); err.status = res.status; throw err; }
    return data;
  }
  // Server messages are in English; Arabic shoppers get a general message instead.
  const errorText = (err) => (lang === 'en' && err.status && err.status < 500 ? err.message : t().failed);
  const money = (fils) => {
    const v = fils / 1000;
    const num = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '');
    return lang === 'ar' ? `${num} ${t().jod}` : `${t().jod} ${num}`;
  };
  // Pale placeholder colours (white garments) get dark lettering.
  const isLight = (hex) => {
    const n = Number.parseInt(String(hex || '').slice(1), 16);
    return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160;
  };
  const art = (p, cls = '') => {
    const img = p.images?.[0];
    return `<div class="art ${cls}${isLight(p.tone) ? ' light' : ''}" style="--tone:${esc(p.tone)}">${img
      ? `<img src="${esc(img)}" alt="${esc(pick(p, 'name'))}" loading="lazy">`
      : `<span aria-hidden="true">${esc(pick(p, 'name'))}</span>`}</div>`;
  };
  const priceHtml = (p) => `${money(p.price)}${p.compare_at > p.price ? `<span class="was">${money(p.compare_at)}</span>` : ''}`;
  const params = new URLSearchParams(location.search);

  let infoPromise;
  const info = () => (infoPromise ||= api('/api/info').catch(() => null));
  info().then((i) => {
    const n = i && (lang === 'ar' ? i.notice_ar || i.notice_en : i.notice_en);
    const bar = $('#notice');
    if (bar && n) { bar.textContent = n; bar.hidden = false; }
  });

  // ---------- Bag (kept in this browser until checkout) ----------
  const bag = {
    items() { try { const v = JSON.parse(store.get('stoic_bag') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } },
    save(list) { store.set('stoic_bag', JSON.stringify(list)); bag.badge(); },
    add(line) {
      const list = bag.items();
      const found = list.find((l) => l.variant_id === line.variant_id);
      if (found) found.qty = Math.min(10, found.qty + 1); else list.push({ ...line, qty: 1 });
      bag.save(list);
    },
    setQty(id, qty) { bag.save(bag.items().map((l) => (l.variant_id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0)); },
    clear() { bag.save([]); },
    count() { return bag.items().reduce((n, l) => n + l.qty, 0); },
    badge() { for (const el of $$('.bag-count')) { const n = bag.count(); el.textContent = n; el.hidden = !n; } },
  };
  bag.badge();

  function toast(html) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  // ---------- Product cards ----------
  const card = (p) => `<a class="card" href="/product/${encodeURIComponent(p.slug)}">
      <div style="position:relative">${p.sold_out ? `<span class="tag">${t().soldOut}</span>` : p.compare_at > p.price ? `<span class="tag">${t().sale}</span>` : ''}${art(p)}</div>
      <h3>${esc(pick(p, 'name'))}</h3><div class="price">${priceHtml(p)}</div></a>`;

  let productsPromise;
  const products = () => (productsPromise ||= api('/api/products').then((d) => d.products));

  function pageHome() {
    const grid = $('#featured');
    const render = (list) => {
      const chosen = list.filter((p) => p.featured);
      grid.innerHTML = (chosen.length ? chosen : list).slice(0, 6).map(card).join('');
    };
    products().then((list) => { render(list); rerenders.push(() => render(list)); })
      .catch((e) => { grid.innerHTML = `<p class="msg bad">${esc(errorText(e))}</p>`; });

    // "Tell me when it drops": on until staff switch it off in Settings.
    const form = $('#drop-form');
    info().then((i) => { if (i?.drop_signup) $('#drop').hidden = false; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#drop-msg');
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        await api('/api/notify', { method: 'POST', body: JSON.stringify({ contact: form.contact.value, website: form.website.value, lang }) });
        form.querySelector('.drop-row').hidden = true;
        msg.className = 'msg ok';
        msg.textContent = t().dropDone;
      } catch (err) {
        msg.className = 'msg bad';
        msg.textContent = errorText(err);
      } finally { btn.disabled = false; }
    });
  }

  function pageHelp() {
    info().then((i) => {
      const link = $('#ask-wa');
      if (!i?.whatsapp || !link) return;
      link.href = `https://wa.me/${encodeURIComponent(i.whatsapp)}?text=${encodeURIComponent(t().waHello)}`;
      link.hidden = false;
    });
  }

  function pageShop() {
    const grid = $('#grid');
    const filters = $('#filters');
    let cat = params.get('c') || 'all';
    let list = [];
    const render = () => {
      const cats = ['all', ...new Set(list.map((p) => p.category))];
      filters.innerHTML = cats.map((c) => `<button type="button" class="chip" data-c="${esc(c)}" aria-pressed="${c === cat}">${esc(c === 'all' ? t().all : t().cats[c] || c)}</button>`).join('');
      const shown = cat === 'all' ? list : list.filter((p) => p.category === cat);
      grid.innerHTML = shown.map(card).join('') || `<p class="empty">—</p>`;
    };
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      cat = b.dataset.c;
      history.replaceState(null, '', cat === 'all' ? '/shop' : `/shop?c=${encodeURIComponent(cat)}`);
      render();
    });
    products().then((l) => { list = l; render(); rerenders.push(render); })
      .catch((e) => { grid.innerHTML = `<p class="msg bad">${esc(errorText(e))}</p>`; });
  }

  // ---------- Product page ----------
  function pageProduct() {
    const root = $('#pdp');
    const slug = root.dataset.slug || params.get('slug') || location.pathname.split('/').filter(Boolean)[1];
    let p;
    let size = null;
    let colour = null;
    const embedded = $('#product-data');
    const load = embedded
      ? Promise.resolve(JSON.parse(embedded.textContent))
      : api(`/api/products?slug=${encodeURIComponent(slug || '')}`).then((d) => d.product);

    let zones = [];
    function variant() { return p.variants.find((v) => v.size === size && v.color === colour); }

    function render() {
      const colours = [...new Set(p.variants.map((v) => v.color))];
      const sizes = [...new Set(p.variants.map((v) => v.size))];
      if (!colour) colour = colours[0];
      const inColour = (s) => p.variants.find((v) => v.size === s && v.color === colour);
      if (sizes.length === 1 && inColour(sizes[0])?.in_stock) size = sizes[0];
      const v = size ? variant() : null;
      const imgs = p.images.length ? p.images : [null, null];
      document.title = `${pick(p, 'name')} · Stoic Soul Club`;
      root.innerHTML = `
        <div class="gallery">${imgs.map((src) => art({ ...p, images: src ? [src] : [] })).join('')}</div>
        <div class="info">
          <p class="eyebrow">${esc(t().cats[p.category] || p.category)}${p.sample ? ` · ${t().sample}` : ''}</p>
          <h1>${esc(pick(p, 'name'))}</h1>
          <div class="price">${priceHtml(p)}</div>
          <p class="desc">${esc(pick(p, 'desc'))}</p>
          ${colours.length > 1 || colours[0] ? `<div class="opt-label"><span data-i18n="pdp.colour">${lang === 'ar' ? window.AR['pdp.colour'] : 'Colour'}</span><span>${esc(colour)}</span></div>
          <div class="opts" role="group">${colours.map((c) => `<button type="button" class="opt" data-colour="${esc(c)}" aria-pressed="${c === colour}">${esc(c)}</button>`).join('')}</div>` : ''}
          ${pick(p, 'fit') ? `<p class="fit">${esc(pick(p, 'fit'))}</p>` : ''}
          <div class="opt-label"><span>${lang === 'ar' ? window.AR['pdp.size'] : 'Size'}</span></div>
          <div class="opts" role="group">${sizes.map((s) => {
            const sv = inColour(s);
            return `<button type="button" class="opt" data-size="${esc(s)}" aria-pressed="${s === size}" ${!sv || !sv.in_stock ? 'disabled' : ''}>${esc(s)}</button>`;
          }).join('')}</div>
          <p class="stock-note" aria-live="polite">${v?.low ? t().low(2) : ''}</p>
          <button type="button" class="btn block" id="add" ${p.sold_out ? 'disabled' : ''}>${p.sold_out ? t().soldOut : size ? t().add : t().pick}</button>
          ${zones.length ? `<p class="promise-line">${promiseLine()}</p>` : ''}
          <div style="margin-top:24px">
            <details><summary>${lang === 'ar' ? window.AR['pdp.guide'] : 'Size help'}</summary>
              <p class="fine">${lang === 'ar' ? window.AR['pdp.guideNote'] : 'Measurements are laid flat. Not sure? Send us your height and usual size and we will tell you which one, with numbers, not guesses.'}</p></details>
            <details><summary>${lang === 'ar' ? window.AR['pdp.delivery'] : 'Delivery and exchanges'}</summary><p class="fine">${lang === 'ar' ? window.AR['pdp.deliveryD'] : 'Free delivery in Amman, 3 JOD to the rest of Jordan. Wrong size? Swap it within 7 days if it is unworn with tags.'} <a href="/help">${lang === 'ar' ? 'المزيد' : 'More'}</a></p></details>
          </div>
        </div>`;
    }

    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-colour]');
      const s = e.target.closest('[data-size]');
      if (c) { colour = c.dataset.colour; const still = variant(); if (!still?.in_stock) size = null; render(); }
      if (s && !s.disabled) { size = s.dataset.size; render(); }
      if (e.target.closest('#add')) {
        const v = size && variant();
        if (!v) { $('.stock-note').textContent = t().pick; return; }
        bag.add({ variant_id: v.id, slug: p.slug, name_en: p.name_en, name_ar: p.name_ar, size: v.size, color: v.color, price: p.price, tone: p.tone, image: p.images[0] || '' });
        toast(`<span>${t().added}</span><a href="/bag">${t().view}</a>`);
      }
    });

    // Delivery promise under Add to bag, built from the real delivery fees in Settings.
    function promiseLine() {
      const name = (z) => esc(lang === 'ar' ? z.ar || z.en : z.en);
      return [...zones.map((z) => (z.fee ? t().zoneFee(name(z), money(z.fee)) : t().zoneFree(name(z)))), t().swap].join(' · ');
    }

    Promise.all([load, info()]).then(([data, i]) => {
      p = data;
      zones = i?.zones || [];
      render(); rerenders.push(render);
    }).catch((e) => { root.innerHTML = `<p class="msg bad">${esc(errorText(e))}</p>`; });
  }

  // ---------- Bag and checkout ----------
  function pageBag() {
    const linesEl = $('#lines');
    const form = $('#checkout');
    const zoneSel = $('#zone');
    let settings = null;

    function totals() {
      const subtotal = bag.items().reduce((s, l) => s + l.price * l.qty, 0);
      const zone = settings?.zones.find((z) => z.id === zoneSel.value);
      const free = settings?.free_delivery_over && subtotal >= settings.free_delivery_over;
      const fee = zone ? (free ? 0 : zone.fee) : null;
      $('#sub').textContent = money(subtotal);
      $('#fee').textContent = fee === null ? '—' : fee === 0 ? t().free : money(fee);
      $('#total').textContent = money(subtotal + (fee || 0));
      $('#free-note').textContent = settings?.free_delivery_over ? t().freeOver(money(settings.free_delivery_over)) : '';
    }

    function render() {
      const items = bag.items();
      $('#bag-empty').hidden = items.length > 0;
      $('#bag-full').hidden = items.length === 0;
      linesEl.innerHTML = items.map((l) => `<li class="line">
          <a href="/product/${encodeURIComponent(l.slug)}">${art({ tone: l.tone, images: l.image ? [l.image] : [], name_en: l.name_en, name_ar: l.name_ar })}</a>
          <div><h3>${esc(pick(l, 'name'))}</h3><div class="meta">${esc([l.color, l.size].filter(Boolean).join(' · '))}</div>
            <div class="qty"><button type="button" data-dec="${l.variant_id}" aria-label="-">−</button><output>${l.qty}</output><button type="button" data-inc="${l.variant_id}" aria-label="+">+</button></div></div>
          <div style="text-align:end"><div>${money(l.price * l.qty)}</div><button type="button" class="link" data-rm="${l.variant_id}">${t().remove}</button></div>
        </li>`).join('');
      if (settings) {
        const keep = zoneSel.value;
        zoneSel.innerHTML = `<option value="">${t().chooseZone}</option>${settings.zones.map((z) => `<option value="${esc(z.id)}">${esc(lang === 'ar' ? z.ar || z.en : z.en)} · ${z.fee ? money(z.fee) : t().free}</option>`).join('')}`;
        zoneSel.value = keep;
        $('#opt-card').hidden = !settings.card;
        $('#opt-cod').hidden = !settings.cod;
        $('#opt-cliq').hidden = !settings.cliq;
        if (!settings.store_open) { $('#co-msg').textContent = t().closed; $('#co-msg').className = 'msg bad'; }
      }
      totals();
    }

    linesEl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const id = Number(b.dataset.inc || b.dataset.dec || b.dataset.rm);
      const line = bag.items().find((l) => l.variant_id === id);
      if (!line) return;
      if (b.dataset.inc) bag.setQty(id, Math.min(10, line.qty + 1));
      if (b.dataset.dec) bag.setQty(id, line.qty - 1);
      if (b.dataset.rm) bag.setQty(id, 0);
      render();
    });
    zoneSel.addEventListener('change', totals);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#co-msg');
      const btn = $('#place');
      const fd = new FormData(form);
      btn.disabled = true;
      msg.className = 'msg';
      msg.textContent = t().placing;
      try {
        const res = await api('/api/checkout', {
          method: 'POST',
          body: JSON.stringify({
            items: bag.items().map((l) => ({ variant_id: l.variant_id, qty: l.qty })),
            customer: Object.fromEntries(['name', 'phone', 'email', 'zone', 'address', 'note'].map((k) => [k, fd.get(k) || ''])),
            payment: fd.get('payment'),
            website: fd.get('website') || '',
          }),
        });
        bag.clear();
        location.href = res.next;
      } catch (err) {
        msg.className = 'msg bad';
        msg.textContent = errorText(err);
        btn.disabled = false;
      }
    });

    render();
    rerenders.push(render);
    info().then((i) => { settings = i; render(); });
  }

  // ---------- Practice card payment ----------
  function pagePay() {
    const token = params.get('t') || '';
    const form = $('#payform');
    api(`/api/order?t=${encodeURIComponent(token)}`).then(({ order }) => {
      const show = () => { $('#pay-total').textContent = `${order.number} · ${money(order.total)}`; };
      show(); rerenders.push(show);
      if (order.status !== 'awaiting_payment') location.replace(`/order/?t=${encodeURIComponent(token)}`);
    }).catch((e) => { $('#pay-msg').className = 'msg bad'; $('#pay-msg').textContent = errorText(e); form.hidden = true; });

    $('#card').addEventListener('input', (e) => {
      const d = e.target.value.replace(/\D/g, '').slice(0, 16);
      e.target.value = d.replace(/(.{4})/g, '$1 ').trim();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#pay-msg');
      const btn = $('#pay-btn');
      btn.disabled = true;
      msg.className = 'msg';
      msg.textContent = t().paying;
      try {
        const res = await api('/api/pay/test', { method: 'POST', body: JSON.stringify({ t: token, card: $('#card').value }) });
        location.href = res.next;
      } catch (err) {
        msg.className = 'msg bad';
        msg.textContent = errorText(err);
        btn.disabled = false;
      }
    });
  }

  // ---------- Order tracking ----------
  function pageOrder() {
    const token = params.get('t') || '';
    const root = $('#order');
    let order;
    let wa = '';
    let cliq = '';
    const render = () => {
      const steps = ['new', 'packed', 'shipped', 'delivered'];
      const reached = steps.indexOf(order.status);
      const ended = order.status === 'cancelled' || order.status === 'returned' || order.status === 'awaiting_payment';
      document.title = `${order.number} · Stoic Soul Club`;
      root.innerHTML = `
        ${params.get('new') ? `<p class="eyebrow">${lang === 'ar' ? window.AR['order.thanks'] : 'Thank you, we have your order.'}</p>` : ''}
        <h1>${esc(order.number)}</h1>
        <p><span class="badge">${esc(t().status[order.status])}</span> ${order.test ? `<span class="badge" style="color:var(--warn)">${t().testOrder}</span>` : ''}</p>
        ${ended ? '' : `<ol class="steps">${t().steps.map((s, i) => `<li class="${i <= reached ? 'done' : ''}">${esc(s)}</li>`).join('')}</ol>`}
        ${order.status === 'awaiting_payment' ? `<p><a class="btn" href="/pay/?t=${encodeURIComponent(token)}">${t().payNow}</a></p>` : ''}
        ${order.payment_method === 'cliq' && order.payment_status !== 'paid' && cliq && !ended ? `<div class="testcard">${t().cliqHow(money(order.total), esc(cliq), esc(order.number))}</div>` : ''}
        <ul class="lines">${order.items.map((i) => `<li class="line" style="grid-template-columns:1fr auto">
          <div><h3>${esc(pick(i, 'name'))} × ${i.qty}</h3><div class="meta">${esc([i.color, i.size].filter(Boolean).join(' · '))}</div></div>
          <div>${money(i.unit_price * i.qty)}</div></li>`).join('')}</ul>
        <div style="max-width:360px;margin-inline-start:auto;margin-top:12px">
          <div class="sum"><span>${lang === 'ar' ? window.AR['co.subtotal'] : 'Subtotal'}</span><span>${money(order.subtotal)}</span></div>
          <div class="sum"><span>${lang === 'ar' ? window.AR['co.delivery'] : 'Delivery'}</span><span>${order.delivery_fee ? money(order.delivery_fee) : t().free}</span></div>
          <div class="sum total"><span>${lang === 'ar' ? window.AR['co.total'] : 'Total'}</span><span>${money(order.total)}</span></div>
          <p class="fine">${t()[order.payment_method]} · ${order.payment_status === 'paid' ? t().paid : t().unpaid}</p>
        </div>
        <h2 style="font-size:20px;margin-top:28px">${lang === 'ar' ? window.AR['order.ship'] : 'Delivering to'}</h2>
        <p>${esc(order.name)}<br>${esc(order.zone)} · ${esc(order.address)}</p>
        ${wa ? `<p><a class="btn ghost" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent(t().waMsg(order.number))}" target="_blank" rel="noopener">${lang === 'ar' ? window.AR['order.wa'] : 'Message us on WhatsApp'}</a></p>` : ''}
        <p class="fine">${lang === 'ar' ? 'احفظ رابط هذه الصفحة لتتبع طلبك.' : 'Bookmark this page to follow your order.'}</p>`;
    };
    Promise.all([api(`/api/order?t=${encodeURIComponent(token)}`), info()])
      .then(([d, i]) => { order = d.order; wa = i?.whatsapp || ''; cliq = i?.cliq_alias || ''; render(); rerenders.push(render); })
      .catch((e) => { root.innerHTML = `<p class="msg bad">${esc(errorText(e))}</p>`; });
  }

  const pages = { home: pageHome, shop: pageShop, product: pageProduct, help: pageHelp, bag: pageBag, pay: pagePay, order: pageOrder };
  pages[document.body.dataset.page]?.();
  applyLang();
})();
