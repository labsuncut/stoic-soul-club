// Stoic staff dashboard: today's numbers, orders, products and stock, settings.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PAY = { cod: 'Cash on delivery', cliq: 'CliQ', card: 'Card' };
  const jod = (fils) => `JOD ${(fils / 1000).toFixed(fils % 1000 ? 3 : 0)}`;
  const when = (sqlUtc) => new Date(`${sqlUtc.replace(' ', 'T')}Z`).toLocaleString('en-GB', { timeZone: 'Asia/Amman', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const LABEL = {
    awaiting_payment: 'Waiting for payment', new: 'To pack', packed: 'Packed', shipped: 'On the way',
    delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned',
  };
  // Buttons staff see for each status, in the order they'd use them.
  const ACTIONS = {
    new: [['packed', 'Mark packed'], ['cancelled', 'Cancel order']],
    packed: [['shipped', 'Hand to courier'], ['new', 'Back to "to pack"'], ['cancelled', 'Cancel order']],
    shipped: [['delivered', 'Mark delivered'], ['returned', 'Returned to us']],
    delivered: [['returned', 'Customer returned it']],
    awaiting_payment: [['cancelled', 'Cancel order']],
  };
  // Ready-made WhatsApp messages to the customer for each step.
  const WA = {
    new: (o) => `Hi ${o.name}, thanks for your Stoic order ${o.number}. We're preparing it now and will let you know when it's on the way.`,
    packed: (o) => `Hi ${o.name}, your Stoic order ${o.number} is packed and will be handed to the courier soon.`,
    shipped: (o) => `Hi ${o.name}, your Stoic order ${o.number} is on the way to ${o.zone}.${o.payment_method === 'cod' && o.payment_status !== 'paid' ? ` Please have ${jod(o.total)} ready in cash.` : ''}`,
    delivered: (o) => `Hi ${o.name}, we hope you love your Stoic pieces. If a size isn't right, reply here and we'll sort an exchange.`,
  };

  async function api(path, options = {}) {
    const res = await fetch(path, { ...options, headers: options.body ? { 'content-type': 'application/json' } : {} });
    let data = {};
    try { data = await res.json(); } catch { /* not JSON */ }
    if (res.status === 401 && path !== '/api/staff/login') { showLogin(); }
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });

  // ---------- Login ----------
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; $('#logout').hidden = true; }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; $('#logout').hidden = false; openTab('overview'); }
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#login-msg');
    try { await post('/api/staff/login', { password: $('#pw').value }); $('#pw').value = ''; showApp(); }
    catch (err) { msg.className = 'msg bad'; msg.textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => { await api('/api/staff/login', { method: 'DELETE' }); showLogin(); });

  // ---------- Tabs ----------
  const loaders = { overview: loadOverview, orders: loadOrders, products: loadProducts, settings: loadSettings };
  function openTab(name) {
    for (const b of $$('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
    for (const p of $$('[data-panel]')) p.hidden = p.dataset.panel !== name;
    loaders[name]().catch((err) => alert(err.message));
  }
  $('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) openTab(b.dataset.tab); });

  // ---------- Today ----------
  async function loadOverview() {
    const d = await api('/api/staff/overview');
    $('#kpis').innerHTML = [
      [d.to_handle, 'Orders to pack or send'],
      [d.today.orders, `Orders today · ${jod(d.today.sales)}`],
      [d.week.orders, `Orders last 7 days · ${jod(d.week.sales)}`],
      [d.by_status.awaiting_payment || 0, 'Waiting for card payment'],
    ].map(([n, label]) => `<div class="kpi"><b>${n}</b><span>${esc(label)}</span></div>`).join('');
    $('#low').innerHTML = d.low_stock.length
      ? `<table class="tbl"><tr><th>Product</th><th>Colour</th><th>Size</th><th>Left</th></tr>${d.low_stock.map((r) => `<tr><td>${esc(r.name_en)}</td><td>${esc(r.color)}</td><td>${esc(r.size)}</td><td>${r.stock}</td></tr>`).join('')}</table>`
      : '<p class="fine">Nothing is running low.</p>';
  }

  // ---------- Orders ----------
  let currentOrder = null;
  async function loadOrders() {
    const q = new URLSearchParams({ status: $('#o-status').value, q: $('#o-q').value.trim() });
    const { orders } = await api(`/api/staff/orders?${q}`);
    $('#o-list').innerHTML = orders.length ? orders.map((o) => `
      <button type="button" class="orow" data-id="${o.id}" aria-current="${o.id === currentOrder}">
        <span>${esc(o.number)}</span><span class="who">${esc(o.name)}</span><span class="pill ${o.status}">${LABEL[o.status]}</span>
        <span class="sub">${when(o.created_at)} · ${o.pieces} pc · ${jod(o.total)} · ${PAY[o.payment_method]} ${o.payment_status === 'paid' ? '(paid)' : ''} · ${esc(o.zone)}${o.test ? ' · test' : ''}</span>
      </button>`).join('') : '<p class="fine">No orders here yet.</p>';
  }
  let searchTimer;
  $('#o-status').addEventListener('change', loadOrders);
  $('#o-q').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadOrders, 300); });
  $('#o-list').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) showOrder(Number(b.dataset.id)); });

  async function showOrder(id) {
    currentOrder = id;
    for (const b of $$('.orow')) b.setAttribute('aria-current', String(Number(b.dataset.id) === id));
    const { order: o } = await api(`/api/staff/order?id=${id}`);
    const phone = o.phone.replace(/\D/g, '').replace(/^0/, '962');
    const wa = WA[o.status] ? `https://wa.me/${phone}?text=${encodeURIComponent(WA[o.status](o))}` : `https://wa.me/${phone}`;
    $('#o-detail').innerHTML = `
      <div class="prod-head"><h2 style="margin:0">${esc(o.number)}</h2><span class="pill ${o.status}">${LABEL[o.status]}</span>${o.test ? '<span class="pill test">Test order</span>' : ''}</div>
      <p class="fine">${when(o.created_at)} · ${PAY[o.payment_method]} · ${o.payment_status}${o.payment_ref ? ` (${esc(o.payment_ref)})` : ''}</p>
      <div class="actions">${(ACTIONS[o.status] || []).map(([s, label]) => `<button type="button" class="btn ${s === 'cancelled' || s === 'returned' || s === 'new' ? 'ghost' : ''}" data-status="${s}">${label}</button>`).join('')}
        ${o.payment_status === 'unpaid' && o.payment_method !== 'card' && !['cancelled', 'returned'].includes(o.status) ? `<button type="button" class="btn ghost" data-paid>${o.payment_method === 'cliq' ? 'CliQ received' : 'Cash received'}</button>` : ''}
        <a class="btn ghost" href="${wa}" target="_blank" rel="noopener">WhatsApp customer</a></div>
      <h3>Customer</h3>
      <p>${esc(o.name)} · <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>${o.email ? ` · ${esc(o.email)}` : ''}<br>${esc(o.zone)} · ${esc(o.address)}${o.note ? `<br><i>${esc(o.note)}</i>` : ''}</p>
      <h3>Items</h3>
      <table class="tbl">${o.items.map((i) => `<tr><td>${esc(i.name_en)}</td><td>${esc(i.color)} ${esc(i.size)}</td><td>× ${i.qty}</td><td>${jod(i.unit_price * i.qty)}</td></tr>`).join('')}
        <tr><td colspan="3">Delivery</td><td>${jod(o.delivery_fee)}</td></tr><tr><th colspan="3">Total</th><th>${jod(o.total)}</th></tr></table>
      <h3>Private note</h3>
      <textarea id="o-note" maxlength="500">${esc(o.staff_note)}</textarea>
      <button class="link" type="button" id="o-note-save">Save note</button>
      <h3>History</h3>
      <ul class="timeline">${o.events.map((ev) => `<li>${when(ev.at)} · ${LABEL[ev.status] || ev.status}${ev.note ? ` · ${esc(ev.note)}` : ''}</li>`).join('')}</ul>
      <p class="fine" style="margin-top:14px"><a href="${esc(o.link)}" target="_blank" rel="noopener">Customer's order page</a></p>`;
  }
  $('#o-detail').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-status]');
    try {
      if (b) {
        const s = b.dataset.status;
        if ((s === 'cancelled' || s === 'returned') && !confirm(`${b.textContent}? Its items go back into stock.`)) return;
        await post('/api/staff/order', { id: currentOrder, status: s });
        await Promise.all([showOrder(currentOrder), loadOrders()]);
      }
      if (e.target.closest('[data-paid]')) {
        const ref = prompt('Reference (optional, e.g. CliQ transfer number):') ?? null;
        if (ref === null) return;
        await post('/api/staff/order', { id: currentOrder, paid: true, ref });
        await Promise.all([showOrder(currentOrder), loadOrders()]);
      }
      if (e.target.id === 'o-note-save') {
        await post('/api/staff/order', { id: currentOrder, staff_note: $('#o-note').value });
        e.target.textContent = 'Saved';
      }
    } catch (err) { alert(err.message); }
  });

  // ---------- Products and stock ----------
  let products = [];
  async function loadProducts() {
    ({ products } = await api('/api/staff/products'));
    $('#p-list').innerHTML = products.map((p) => `
      <div class="prod">
        <div class="prod-head">
          <h3>${esc(p.name_en)}</h3><span class="fine">${jod(p.price)}</span>
          ${p.sample ? '<span class="pill test">Sample</span>' : ''}${p.active ? '' : '<span class="pill cancelled">Hidden</span>'}${p.featured ? '<span class="pill">Home page</span>' : ''}
          <button type="button" class="link" data-edit="${p.id}">Edit</button>
          <a class="link" href="/product/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">View</a>
        </div>
        <table class="tbl"><tr><th>Colour</th><th>Size</th><th>SKU</th><th>In stock</th><th></th></tr>
          ${p.variants.map((v) => `<tr><td>${esc(v.color)}</td><td>${esc(v.size)}</td><td class="fine">${esc(v.sku)}</td>
            <td><input class="stock" type="number" min="0" value="${v.stock}" data-variant="${v.id}" aria-label="Stock"></td>
            <td><button type="button" class="link" data-remove="${v.id}">Remove</button></td></tr>`).join('')}
        </table>
        <div class="add-size"><input placeholder="Size" data-new-size="${p.id}"><input placeholder="Colour" data-new-colour="${p.id}"><input type="number" min="0" placeholder="Stock" data-new-stock="${p.id}"><button class="link" type="button" data-add="${p.id}">Add size</button></div>
      </div>`).join('');
  }
  $('#p-list').addEventListener('change', async (e) => {
    const input = e.target.closest('[data-variant]');
    if (!input) return;
    try { await post('/api/staff/variants', { variant_id: Number(input.dataset.variant), stock: input.value }); input.style.borderColor = 'var(--ok)'; }
    catch (err) { alert(err.message); }
  });
  $('#p-list').addEventListener('click', async (e) => {
    const t = e.target;
    try {
      if (t.dataset.edit) openProduct(products.find((p) => p.id === Number(t.dataset.edit)));
      if (t.dataset.remove && confirm('Remove this size?')) { await post('/api/staff/variants', { variant_id: Number(t.dataset.remove), remove: true }); await loadProducts(); }
      if (t.dataset.add) {
        const id = t.dataset.add;
        await post('/api/staff/variants', {
          product_id: Number(id), size: $(`[data-new-size="${id}"]`).value, color: $(`[data-new-colour="${id}"]`).value, stock: $(`[data-new-stock="${id}"]`).value || 0,
        });
        await loadProducts();
      }
    } catch (err) { alert(err.message); }
  });

  const dialog = $('#p-dialog');
  const pform = $('#p-form');
  function openProduct(p) {
    pform.reset();
    $('#p-msg').textContent = '';
    $('#p-title').textContent = p ? `Edit ${p.name_en}` : 'Add a product';
    const v = p || { tone: '#2b2b2b', active: true, sort: 100, category: 'tees', images: [] };
    for (const [k, val] of Object.entries({
      id: v.id ?? '', name_en: v.name_en ?? '', name_ar: v.name_ar ?? '', desc_en: v.desc_en ?? '', desc_ar: v.desc_ar ?? '',
      price: v.price != null ? v.price / 1000 : '', compare_at: v.compare_at ? v.compare_at / 1000 : '', category: v.category,
      slug: v.slug ?? '', images: (v.images || []).join('\n'), tone: v.tone, sort: v.sort,
    })) pform.elements[k].value = val;
    pform.elements.featured.checked = !!v.featured;
    pform.elements.active.checked = v.active !== false;
    dialog.showModal();
  }
  $('#p-new').addEventListener('click', () => openProduct(null));
  $('#p-cancel').addEventListener('click', () => dialog.close());
  pform.elements.name_en.addEventListener('input', () => {
    if (!pform.elements.id.value) pform.elements.slug.value = pform.elements.name_en.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });
  pform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = pform.elements;
    try {
      await post('/api/staff/products', { product: {
        id: f.id.value || undefined, name_en: f.name_en.value, name_ar: f.name_ar.value, desc_en: f.desc_en.value, desc_ar: f.desc_ar.value,
        price: f.price.value, compare_at: f.compare_at.value || 0, category: f.category.value, slug: f.slug.value,
        images: f.images.value, tone: f.tone.value, sort: f.sort.value, featured: f.featured.checked, active: f.active.checked,
      } });
      dialog.close();
      await loadProducts();
    } catch (err) { $('#p-msg').className = 'msg bad'; $('#p-msg').textContent = err.message; }
  });

  // ---------- Settings ----------
  const zoneRow = (z = { en: '', ar: '', fee: 0, id: '' }) => `<tr data-zone="${esc(z.id)}">
    <td><input value="${esc(z.en)}" data-k="en" required></td><td><input value="${esc(z.ar)}" data-k="ar" dir="rtl"></td>
    <td><input type="number" step="0.5" min="0" value="${z.fee / 1000}" data-k="fee"></td><td><button type="button" class="link" data-zrm>Remove</button></td></tr>`;
  async function loadSettings() {
    const { settings: s } = await api('/api/staff/settings');
    const f = $('#s-form').elements;
    for (const k of ['store_open', 'cod_enabled', 'card_enabled', 'cliq_enabled']) f[k].checked = s[k] === '1';
    for (const k of ['whatsapp', 'cliq_alias', 'notice_en', 'notice_ar']) f[k].value = s[k] || '';
    f.free_delivery_over.value = (Number(s.free_delivery_over) || 0) / 1000;
    $('#zones tbody').innerHTML = s.zones.map(zoneRow).join('');
    $('#tg-state').textContent = s.telegram_chat ? 'Telegram alerts are on.' : 'Telegram alerts are off.';
    $('#tg-off').hidden = !s.telegram_chat;
  }
  $('#tg-connect').addEventListener('click', async () => {
    try { const r = await post('/api/staff/telegram', {}); $('#tg-state').textContent = `Alerts go to ${r.chat}. A test message was sent.`; $('#tg-off').hidden = false; }
    catch (err) { $('#tg-state').textContent = err.message; }
  });
  $('#tg-off').addEventListener('click', async () => {
    await post('/api/staff/settings', { telegram_chat: '' }); await loadSettings();
  });
  $('#z-add').addEventListener('click', () => $('#zones tbody').insertAdjacentHTML('beforeend', zoneRow()));
  $('#zones').addEventListener('click', (e) => { if (e.target.matches('[data-zrm]')) e.target.closest('tr').remove(); });
  $('#s-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const msg = $('#s-msg');
    try {
      await post('/api/staff/settings', {
        store_open: f.store_open.checked, cod_enabled: f.cod_enabled.checked, card_enabled: f.card_enabled.checked, cliq_enabled: f.cliq_enabled.checked, cliq_alias: f.cliq_alias.value,
        whatsapp: f.whatsapp.value, notice_en: f.notice_en.value, notice_ar: f.notice_ar.value, free_delivery_over: f.free_delivery_over.value || 0,
        zones: $$('#zones tbody tr').map((tr) => ({ id: tr.dataset.zone || $('[data-k="en"]', tr).value, en: $('[data-k="en"]', tr).value, ar: $('[data-k="ar"]', tr).value, fee: $('[data-k="fee"]', tr).value })),
      });
      msg.className = 'msg ok'; msg.textContent = 'Saved.';
    } catch (err) { msg.className = 'msg bad'; msg.textContent = err.message; }
  });

  api('/api/staff/login').then((d) => (d.staff ? showApp() : showLogin())).catch(showLogin);
})();
