// Stoic staff dashboard: inquiries, products and stock, chapters, lookbooks, site words and photos.
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const jod = (fils) => `${(fils / 1000).toFixed(fils % 1000 ? 3 : 0)} JOD`;
  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  async function api(path, options = {}) {
    const res = await fetch(path, { ...options, headers: options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {} });
    let data = {};
    try { data = await res.json(); } catch { /* not JSON */ }
    if (res.status === 401 && path !== '/api/staff/login') showLogin();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
  const say = (el, text, ok = true) => { el.className = `msg ${ok ? 'ok' : 'bad'}`; el.textContent = text; };

  // ---------- Login ----------
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; $('#logout').hidden = true; }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; $('#logout').hidden = false; openTab('overview'); }
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await post('/api/staff/login', { password: $('#pw').value }); $('#pw').value = ''; showApp(); }
    catch (err) { say($('#login-msg'), err.message, false); }
  });
  $('#logout').addEventListener('click', async () => { await api('/api/staff/login', { method: 'DELETE' }); showLogin(); });

  // ---------- Tabs ----------
  const loaders = { overview: loadOverview, products: loadProducts, collections: loadCollections, lookbooks: loadLookbooks, site: loadSite };
  function openTab(name) {
    for (const b of $$('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
    for (const p of $$('[data-panel]')) p.hidden = p.dataset.panel !== name;
    loaders[name]().catch((err) => alert(err.message));
  }
  $('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) openTab(b.dataset.tab); });

  // ---------- Photos: shrink in the browser, upload, keep an ordered list ----------
  // A product photo is sent as WebP at most 1600 px on its long side (about 150 to 300 KB).
  async function shrink(file) {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;
    const max = file.dataset_logo ? 800 : 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const keepPng = file.type === 'image/png' && file.size < 600_000; // logos with transparency stay PNG
    const blob = await new Promise((r) => canvas.toBlob(r, keepPng ? 'image/png' : 'image/webp', 0.84));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, keepPng ? '.png' : '.webp'), { type: blob.type }) : file;
  }
  async function upload(file, isLogo = false) {
    if (isLogo) file.dataset_logo = true;
    const small = file.type.startsWith('video/') ? file : await shrink(file);
    const fd = new FormData();
    fd.append('file', small, small.name);
    const { url } = await api('/api/staff/upload', { method: 'POST', body: fd });
    return url;
  }
  // Each photo list lives in a .photos element; lookbook lists also carry captions and tags.
  const lists = {};
  function photoList(name) {
    const box = $(`[data-photos="${name}"]`);
    const withTags = box.classList.contains('photos-cap');
    const withCaptions = withTags || box.hasAttribute('data-captions');
    const single = box.hasAttribute('data-single');
    const video = box.hasAttribute('data-video');
    const items = [];
    const render = () => {
      box.innerHTML = items.map((it, i) => `<div class="photo ${it.image ? '' : 'empty'}" data-i="${i}">
        ${it.image ? (video ? `<video src="${esc(it.image)}" muted playsinline></video>` : `<img src="${esc(it.image)}" alt="">`) : `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='108' height='135'%3E%3Crect width='100%25' height='100%25' fill='%23e6e1d6'/%3E%3C/svg%3E" alt="">`}
        <button type="button" class="x" data-x aria-label="Remove">×</button>
        ${!single && items.length > 1 ? `<button type="button" class="mv" data-mv="-1" aria-label="Move left">‹</button><button type="button" class="mv r" data-mv="1" aria-label="Move right">›</button>` : ''}
        ${withCaptions ? `<input placeholder="Caption, e.g. KAIZEN hoodie, chest detail" value="${esc(it.caption)}" data-cap>` : ''}${withTags ? `<select data-tag><option value="campaign"${it.tag !== 'community' ? ' selected' : ''}>Campaign</option><option value="community"${it.tag === 'community' ? ' selected' : ''}>Community</option></select>` : ''}
      </div>`).join('');
      const hidden = box.parentElement.querySelector('[name="images"], input[type="hidden"]');
      if (hidden && !withTags) hidden.value = single ? (items[0]?.image || '') : items.map((it) => (it.caption ? `${it.image} | ${it.caption}` : it.image)).join('\n');
    };
    const list = {
      set(arr) { items.length = 0; for (const it of arr) items.push(typeof it === 'string' ? { image: it, caption: '', tag: 'campaign' } : { image: it.image || '', caption: it.caption || '', alt: it.alt || '', tag: it.tag || 'campaign' }); render(); },
      get() { return items.map((it) => ({ ...it })); },
      add(it) { if (single) items.length = 0; items.push(it); render(); },
    };
    box.addEventListener('click', (e) => {
      const el = e.target.closest('.photo'); if (!el) return;
      const i = Number(el.dataset.i);
      if (e.target.closest('[data-x]')) { items.splice(i, 1); render(); }
      const mv = e.target.closest('[data-mv]');
      if (mv) { const j = i + Number(mv.dataset.mv); if (j >= 0 && j < items.length) { [items[i], items[j]] = [items[j], items[i]]; render(); } }
    });
    box.addEventListener('input', (e) => {
      const el = e.target.closest('.photo'); if (!el) return;
      const it = items[Number(el.dataset.i)];
      if (e.target.matches('[data-cap]')) it.caption = e.target.value;
      if (e.target.matches('[data-tag]')) it.tag = e.target.value;
    });
    lists[name] = list;
    return list;
  }
  for (const box of $$('[data-photos]')) photoList(box.dataset.photos);
  document.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-upload]');
    if (!input || !input.files.length) return;
    const list = lists[input.dataset.upload];
    const wrap = input.closest('.field') || input.parentElement;
    wrap.classList.add('uploading');
    try {
      for (const file of input.files) list.add({ image: await upload(file, input.hasAttribute('data-logo')), caption: '', tag: 'campaign' });
    } catch (err) { alert(err.message); }
    finally { wrap.classList.remove('uploading'); input.value = ''; }
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-addlink]');
    if (link) { const url = prompt('Paste the photo or video link (https://…):'); if (url && /^https:\/\//.test(url.trim())) lists[link.dataset.addlink].add({ image: url.trim(), caption: '', tag: 'campaign' }); }
    const cap = e.target.closest('[data-addcaption]');
    if (cap) lists[cap.dataset.addcaption].add({ image: '', caption: '', tag: 'campaign' });
  });

  // ---------- Inquiries ----------
  async function loadOverview() {
    const d = await api('/api/staff/overview');
    const n = (m, k) => m[k] || 0;
    $('#kpis').innerHTML = [
      [n(d.today, 'wa_click'), 'WhatsApp inquiries today'],
      [n(d.week, 'wa_click'), 'Inquiries, last 7 days'],
      [n(d.week, 'product_view'), 'Product views, last 7 days'],
      [n(d.week, 'page_view') + n(d.week, 'product_view'), 'Visits, last 7 days'],
      [n(d.month, 'wa_click'), 'Inquiries, last 30 days'],
      [d.pieces_in_stock, 'Pieces in stock'],
    ].map(([v, label]) => `<div class="kpi"><b>${v}</b><span>${esc(label)}</span></div>`).join('');
    $('#top').innerHTML = d.top.length
      ? `<table class="tbl"><tr><th>Product</th><th>Views</th><th>Inquiries</th></tr>${d.top.map((r) => `<tr><td>${esc(r.product)}</td><td>${r.views}</td><td>${r.inquiries}</td></tr>`).join('')}</table>`
      : '<p class="fine">No product views counted yet.</p>';
    $('#sources').innerHTML = d.sources.length
      ? `<table class="tbl"><tr><th>Source</th><th>Visits</th></tr>${d.sources.map((r) => `<tr><td>${esc(r.source)}</td><td>${r.n}</td></tr>`).join('')}</table>`
      : '<p class="fine">Nothing counted yet.</p>';
    const maxV = Math.max(1, ...d.daily.map((r) => r.views));
    $('#daily').innerHTML = d.daily.length
      ? `<div class="daily">${d.daily.map((r) => `<div title="${r.day}: ${r.views} views, ${r.inquiries} inquiries"><b style="height:${Math.round(100 * r.views / maxV)}px"></b><i style="height:${Math.round(100 * r.inquiries / maxV)}px"></i>${r.day.slice(5)}</div>`).join('')}</div><p class="fine">Dark = views, blue = WhatsApp inquiries.</p>`
      : '<p class="fine">No visits counted in the last 14 days.</p>';
    $('#low').innerHTML = d.low_stock.length
      ? `<table class="tbl"><tr><th>Product</th><th>Colour</th><th>Size</th><th>Left</th></tr>${d.low_stock.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.color)}</td><td>${esc(r.size)}</td><td>${r.stock}</td></tr>`).join('')}</table>`
      : '<p class="fine">Nothing at 1 or 0.</p>';
  }

  // ---------- Products and stock ----------
  let products = [];
  let collections = [];
  async function fetchCollections() {
    ({ collections } = await api('/api/staff/collections'));
    const opts = `<option value="">None</option>${collections.map((c) => `<option value="${esc(c.slug)}">${esc(c.title)} (CH. ${c.chapter})</option>`).join('')}`;
    $('#p-collection').innerHTML = opts; $('#l-collection').innerHTML = opts;
  }
  async function loadProducts() {
    [{ products }] = await Promise.all([api('/api/staff/products'), fetchCollections()]);
    $('#p-list').innerHTML = products.map((p) => `
      <div class="card">
        <div class="card-head">
          ${p.images[0] ? `<img class="thumb" src="${esc(p.images[0])}" alt="">` : '<span class="thumb"></span>'}
          <h3>${esc(p.name)}</h3><span class="fine">${jod(p.price)}</span>
          <span class="pill ${p.raw_status}">${p.raw_status.replace('_', ' ')}</span>${p.status === 'sold_out' && p.raw_status === 'available' ? '<span class="pill sold_out">shows sold out</span>' : ''}
          ${p.featured ? '<span class="pill">Lead piece</span>' : ''}<span class="pill">${esc(p.collection || 'no chapter')}</span>
          <button type="button" class="link" data-edit="${p.id}">Edit</button>
          <a class="link" href="/product/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">View</a>
        </div>
        <table class="tbl"><tr><th>Colour</th><th>Size</th><th>SKU</th><th>In stock</th><th></th></tr>
          ${p.variants.map((v) => `<tr><td>${esc(v.color)}</td><td>${esc(v.size)}</td><td class="fine">${esc(v.sku)}</td>
            <td><input class="stock" type="number" min="0" value="${v.stock}" data-variant="${v.id}" aria-label="Stock"></td>
            <td><button type="button" class="link" data-remove="${v.id}">Remove</button></td></tr>`).join('')}
        </table>
        <div class="add-size"><input placeholder="Size" data-new-size="${p.id}"><input placeholder="Colour" data-new-colour="${p.id}" value="${esc(p.colors[0] || '')}"><input type="number" min="0" placeholder="Stock" data-new-stock="${p.id}"><button class="link" type="button" data-add="${p.id}">Add size</button></div>
      </div>`).join('') || '<p class="fine">No products yet.</p>';
  }
  $('#p-list').addEventListener('change', async (e) => {
    const input = e.target.closest('[data-variant]');
    if (!input) return;
    try { await post('/api/staff/variants', { variant_id: Number(input.dataset.variant), stock: input.value }); input.style.borderColor = '#2f6b3f'; }
    catch (err) { alert(err.message); }
  });
  $('#p-list').addEventListener('click', async (e) => {
    const t = e.target;
    try {
      if (t.dataset.edit) openProduct(products.find((p) => p.id === Number(t.dataset.edit)));
      if (t.dataset.remove && confirm('Remove this size?')) { await post('/api/staff/variants', { variant_id: Number(t.dataset.remove), remove: true }); await loadProducts(); }
      if (t.dataset.add) {
        const id = t.dataset.add;
        await post('/api/staff/variants', { product_id: Number(id), size: $(`[data-new-size="${id}"]`).value, color: $(`[data-new-colour="${id}"]`).value, stock: $(`[data-new-stock="${id}"]`).value || 0 });
        await loadProducts();
      }
    } catch (err) { alert(err.message); }
  });
  const pdialog = $('#p-dialog');
  const pform = $('#p-form');
  function openProduct(p) {
    pform.reset(); $('#p-msg').textContent = '';
    $('#p-title').textContent = p ? `Edit ${p.name}` : 'Add a product';
    const v = p || { tone: '#2b2b2b', status: 'draft', sort: 100, category: 'tees', images: [], collection: '' };
    for (const k of ['id', 'name', 'slug', 'status', 'collection', 'category', 'sku', 'description', 'fit', 'materials', 'care', 'story', 'sort', 'tone']) pform.elements[k].value = v[k] ?? (k === 'id' ? '' : '');
    pform.elements.status.value = p ? p.raw_status : 'draft';
    pform.elements.price.value = v.price != null ? v.price / 1000 : '';
    pform.elements.compare_at.value = v.compare_at ? v.compare_at / 1000 : '';
    pform.elements.featured.checked = !!v.featured;
    lists.product.set((v.images || []).map((image, i) => ({ image, caption: (v.captions || [])[i] || '' })));
    pdialog.showModal();
  }
  $('#p-new').addEventListener('click', () => openProduct(null));
  $('#p-cancel').addEventListener('click', () => pdialog.close());
  pform.elements.name.addEventListener('input', () => { if (!pform.elements.id.value) pform.elements.slug.value = slugify(pform.elements.name.value); });
  pform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = pform.elements;
    try {
      const product = Object.fromEntries(['id', 'name', 'slug', 'status', 'collection', 'category', 'sku', 'description', 'fit', 'materials', 'care', 'story', 'sort', 'tone', 'price', 'compare_at'].map((k) => [k, f[k].value]));
      product.id = product.id || undefined; product.featured = f.featured.checked; product.images = lists.product.get().filter((it) => it.image).map((it) => (it.caption ? `${it.image} | ${it.caption}` : it.image));
      await post('/api/staff/products', { product });
      pdialog.close(); await loadProducts();
    } catch (err) { say($('#p-msg'), err.message, false); }
  });

  // ---------- Chapters ----------
  async function loadCollections() {
    await fetchCollections();
    $('#c-list').innerHTML = collections.map((c) => `<div class="card"><div class="card-head">
      ${c.images[0] ? `<img class="thumb" src="${esc(c.images[0])}" alt="">` : '<span class="thumb"></span>'}
      <h3>${esc(c.title)}</h3><span class="fine">CH. ${c.chapter}</span><span class="pill ${c.status}">${c.status}</span><span class="pill" style="border-color:${esc(c.accent)};color:${esc(c.accent)}">${esc(c.accent)}</span>
      <button type="button" class="link" data-cedit="${c.id}">Edit</button></div><p class="fine">${esc(c.meaning)}</p></div>`).join('') || '<p class="fine">No chapters yet.</p>';
  }
  const cdialog = $('#c-dialog'); const cform = $('#c-form');
  function openCollection(c) {
    cform.reset(); $('#c-msg').textContent = '';
    $('#c-title').textContent = c ? `Edit ${c.title}` : 'Add a chapter';
    const v = c || { chapter: Math.max(1, ...collections.map((x) => x.chapter)), status: 'draft', accent: '#6888A0', sort: 100, images: [] };
    for (const k of ['id', 'title', 'slug', 'chapter', 'meaning', 'description', 'status', 'release_date', 'accent', 'sort']) cform.elements[k].value = v[k] ?? '';
    lists.collection.set(v.images || []);
    cdialog.showModal();
  }
  $('#c-new').addEventListener('click', () => openCollection(null));
  $('#c-cancel').addEventListener('click', () => cdialog.close());
  $('#c-list').addEventListener('click', (e) => { const b = e.target.closest('[data-cedit]'); if (b) openCollection(collections.find((c) => c.id === Number(b.dataset.cedit))); });
  cform.elements.title.addEventListener('input', () => { if (!cform.elements.id.value) cform.elements.slug.value = slugify(cform.elements.title.value); });
  cform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = cform.elements;
    try {
      const collection = Object.fromEntries(['id', 'title', 'slug', 'chapter', 'meaning', 'description', 'status', 'release_date', 'accent', 'sort'].map((k) => [k, f[k].value]));
      collection.id = collection.id || undefined; collection.images = lists.collection.get().map((it) => it.image).filter(Boolean);
      await post('/api/staff/collections', { collection });
      cdialog.close(); await loadCollections();
    } catch (err) { say($('#c-msg'), err.message, false); }
  });

  // ---------- Lookbooks ----------
  let lookbooks = [];
  async function loadLookbooks() {
    [{ lookbooks }] = await Promise.all([api('/api/staff/lookbooks'), fetchCollections()]);
    $('#l-list').innerHTML = lookbooks.map((l) => `<div class="card"><div class="card-head">
      ${(l.photos.find((ph) => ph.image) || {}).image ? `<img class="thumb" src="${esc(l.photos.find((ph) => ph.image).image)}" alt="">` : '<span class="thumb"></span>'}
      <h3>${esc(l.title)}</h3><span class="fine">${l.photos.length} photos${l.photos.some((ph) => !ph.image) ? ` (${l.photos.filter((ph) => !ph.image).length} still to shoot)` : ''}</span>
      <span class="pill ${l.status}">${l.status}</span>${l.featured ? '<span class="pill">Home page strip</span>' : ''}
      <button type="button" class="link" data-ledit="${l.id}">Edit</button><a class="link" href="/lookbook/${encodeURIComponent(l.slug)}" target="_blank" rel="noopener">View</a></div></div>`).join('') || '<p class="fine">No lookbooks yet.</p>';
  }
  const ldialog = $('#l-dialog'); const lform = $('#l-form');
  function openLookbook(l) {
    lform.reset(); $('#l-msg').textContent = '';
    $('#l-title').textContent = l ? `Edit ${l.title}` : 'Add a lookbook';
    const v = l || { status: 'draft', sort: 100, photos: [], collection: '' };
    for (const k of ['id', 'title', 'slug', 'collection', 'intro', 'credit', 'status', 'sort']) lform.elements[k].value = v[k] ?? '';
    lform.elements.featured.checked = !!v.featured;
    $('#l-remove').hidden = !l;
    lists.lookbook.set(v.photos || []);
    ldialog.showModal();
  }
  $('#l-new').addEventListener('click', () => openLookbook(null));
  $('#l-cancel').addEventListener('click', () => ldialog.close());
  $('#l-list').addEventListener('click', (e) => { const b = e.target.closest('[data-ledit]'); if (b) openLookbook(lookbooks.find((l) => l.id === Number(b.dataset.ledit))); });
  lform.elements.title.addEventListener('input', () => { if (!lform.elements.id.value) lform.elements.slug.value = slugify(lform.elements.title.value); });
  $('#l-remove').addEventListener('click', async () => {
    if (!confirm('Delete this lookbook and its captions? The photo files stay in storage.')) return;
    try { await post('/api/staff/lookbooks', { lookbook: { id: lform.elements.id.value, slug: lform.elements.slug.value || 'x', remove: true } }); ldialog.close(); await loadLookbooks(); }
    catch (err) { say($('#l-msg'), err.message, false); }
  });
  lform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = lform.elements;
    try {
      const lookbook = Object.fromEntries(['id', 'title', 'slug', 'collection', 'intro', 'credit', 'status', 'sort'].map((k) => [k, f[k].value]));
      lookbook.id = lookbook.id || undefined; lookbook.featured = f.featured.checked; lookbook.photos = lists.lookbook.get();
      await post('/api/staff/lookbooks', { lookbook });
      ldialog.close(); await loadLookbooks();
    } catch (err) { say($('#l-msg'), err.message, false); }
  });

  // ---------- Site ----------
  const SITE_TEXT = ['whatsapp', 'instagram', 'contact_email', 'hero_headline', 'hero_cta', 'hero_caption', 'announcement', 'manifesto', 'story_text', 'ordering_text', 'shipping_text', 'payment_text', 'swap_text'];
  const SITE_IMG = ['hero_image', 'hero_video', 'manifesto_image', 'story_image', 'logo_image'];
  const SITE_SWITCH = ['restock_inquiries', 'analytics', 'site_public'];
  async function loadSite() {
    const { settings: s, images } = await api('/api/staff/settings');
    const f = $('#s-form').elements;
    for (const k of SITE_TEXT) f[k].value = s[k] || '';
    for (const k of SITE_SWITCH) f[k].checked = s[k] === '1';
    for (const k of SITE_IMG) lists[k].set(s[k] ? [s[k]] : []);
    if (!images) say($('#s-msg'), 'Photo uploads are not set up yet (no R2 bucket bound as IMAGES). Pasting links still works.', false);
  }
  $('#s-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const body = {};
    for (const k of SITE_TEXT) body[k] = f[k].value;
    for (const k of SITE_SWITCH) body[k] = f[k].checked;
    for (const k of SITE_IMG) body[k] = (lists[k].get()[0] || {}).image || '';
    try { await post('/api/staff/settings', body); say($('#s-msg'), 'Saved. The site shows it within a minute.'); }
    catch (err) { say($('#s-msg'), err.message, false); }
  });

  api('/api/staff/login').then((d) => (d.staff ? showApp() : showLogin())).catch(showLogin);
})();
