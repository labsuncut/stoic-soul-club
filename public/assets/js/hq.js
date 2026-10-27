// Website control, opened from Stoic HQ. Runs on the site itself, so it talks to the staff API
// directly (cookie session). HQ hands over its stock and prices in the link (#hq=…), so the two
// can be compared and pushed; without that hand-off the page still shows and edits everything
// on the site. Inquiries are WhatsApp clicks, never sales.
(() => {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NF = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
  const jod = (n) => NF.format(Math.round((+n || 0) * 100) / 100);
  const WORDS = [['whatsapp', 'WhatsApp number (international, digits only)', 'text'], ['instagram', 'Instagram handle', 'text'], ['contact_email', 'Contact email (optional)', 'text'],
    ['hero_headline', 'Cover headline', 'text'], ['hero_cta', 'Cover button', 'text'], ['hero_caption', 'Cover caption', 'text'], ['announcement', 'Announcement bar (empty = none)', 'text'],
    ['manifesto', 'Philosophy (short)', 'area'], ['story_text', 'Story page', 'area'], ['ordering_text', 'How ordering works', 'area'], ['shipping_text', 'Delivery', 'area'], ['payment_text', 'Payment', 'area'], ['swap_text', 'Size swap', 'area']];
  const MEDIA = [['hero_image', 'Cover photo', 'image'], ['hero_poster', 'Cover film: still frame', 'image'], ['hero_video', 'Cover film (MP4, under 12 MB)', 'video'], ['hero_video_webm', 'Cover film, WebM (optional)', 'video'], ['hero_video_phone', 'Cover film, phone cut (optional)', 'video'], ['manifesto_image', 'Philosophy photo', 'image'], ['story_image', 'Story photo', 'image'], ['logo_image', 'Logo mark', 'image']];

  const W = { staff: null, settings: null, overview: null, products: null, health: null, uploads: false, busy: '', err: '', at: 0, hq: null };

  // The hand-off from Stoic HQ: #hq=<base64url JSON {who, at, stock:[{sku,label,slug,size,left}], prices:[{label,slug,price}]}>.
  function readHandoff() {
    const m = location.hash.match(/^#hq=([A-Za-z0-9_-]+)/);
    try {
      if (m) {
        const json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))));
        sessionStorage.setItem('ssc-hq', json);
        history.replaceState(null, '', location.pathname);
      }
      const raw = sessionStorage.getItem('ssc-hq');
      W.hq = raw ? JSON.parse(raw) : null;
    } catch { W.hq = null; }
  }

  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 2400); }

  async function api(path, opts) {
    opts = opts || {};
    const h = {};
    if (opts.json) { h['content-type'] = 'application/json'; opts.body = JSON.stringify(opts.json); opts.method = opts.method || 'POST'; }
    let r;
    try { r = await fetch(path, { method: opts.method || 'GET', headers: h, body: opts.body, credentials: 'same-origin' }); }
    catch { throw new Error('No connection. Check the internet and try again.'); }
    let d = null; try { d = await r.json(); } catch { /* not JSON */ }
    if (r.status === 401 && path !== '/api/staff/login') { W.staff = false; W.settings = null; render(); throw new Error('The session expired. Log in again.'); }
    if (!r.ok) throw new Error((d && d.error) || ('The website answered ' + r.status));
    return d;
  }

  async function load() {
    W.busy = 'load'; W.err = ''; render();
    try {
      const [st, ov, pr, he] = await Promise.all([api('/api/staff/settings'), api('/api/staff/overview'), api('/api/staff/products'), api('/api/health')]);
      W.settings = st.settings; W.uploads = !!st.images; W.overview = ov; W.products = pr.products; W.health = he; W.at = Date.now();
    } catch (e) { W.err = e.message; }
    W.busy = ''; render();
  }

  async function login(pw) {
    if (!pw) return;
    W.busy = 'login'; W.err = ''; render();
    try { await api('/api/staff/login', { json: { password: pw } }); W.staff = true; await load(); }
    catch (e) { W.err = e.message; W.busy = ''; render(); }
  }

  async function logout() { try { await api('/api/staff/login', { method: 'DELETE' }); } catch { /* ignore */ } W.staff = false; W.settings = null; render(); }

  // One site variant per HQ row: the product by slug, the size in the product's first colour.
  function variantOf(slug, size) {
    const p = (W.products || []).find((x) => x.slug === slug); if (!p) return null;
    const color = (p.variants[0] || {}).color; const v = p.variants.find((x) => x.size === size && x.color === color);
    return v ? { p, v } : null;
  }
  function stockDiff() {
    if (!W.hq || !Array.isArray(W.hq.stock)) return null;
    return W.hq.stock.map((r) => { const m = variantOf(r.slug, r.size); const left = Math.max(0, +r.left || 0);
      return { label: r.label, hq: left, site: m ? m.v.stock : null, vid: m ? m.v.id : null, diff: m ? m.v.stock !== left : false }; });
  }
  function priceDiff() {
    if (!W.hq || !Array.isArray(W.hq.prices)) return null;
    const rows = [];
    for (const r of W.hq.prices) { const p = (W.products || []).find((x) => x.slug === r.slug); if (!p) continue;
      const hq = +r.price; const site = p.price / 1000; rows.push({ p, label: r.label, hq, site, diff: Math.abs(hq - site) > 0.0005 }); }
    return rows;
  }
  function productBody(p, price) {
    return { id: p.id, slug: p.slug, name: p.name, description: p.description, fit: p.fit, category: p.category, collection: p.collection, price, compare_at: p.compare_at ? p.compare_at / 1000 : 0,
      images: p.images.map((u, i) => (p.captions && p.captions[i] ? u + ' | ' + p.captions[i] : u)), tone: p.tone, featured: p.featured, status: p.raw_status, sort: p.sort, materials: p.materials, care: p.care, story: p.story, sku: p.sku };
  }

  async function pushStock() {
    const rows = (stockDiff() || []).filter((r) => r.diff && r.vid); if (!rows.length) return toast('Website stock already matches');
    W.busy = 'stock'; render();
    try { for (const r of rows) await api('/api/staff/variants', { json: { variant_id: r.vid, stock: r.hq } }); toast('Website stock updated (' + rows.length + ')'); await load(); }
    catch (e) { W.busy = ''; W.err = e.message; render(); }
  }
  async function pushPrices() {
    const rows = (priceDiff() || []).filter((r) => r.diff); if (!rows.length) return toast('Website prices already match');
    W.busy = 'prices'; render();
    try { for (const r of rows) await api('/api/staff/products', { json: { product: productBody(r.p, r.hq) } }); toast('Website prices updated'); await load(); }
    catch (e) { W.busy = ''; W.err = e.message; render(); }
  }
  // Stock edited by hand on this page (no HQ hand-off, or a size HQ does not track).
  async function setStock(vid, stock) {
    try { await api('/api/staff/variants', { json: { variant_id: vid, stock } }); toast('Saved'); const p = (W.products || []).find((x) => x.variants.some((v) => v.id === vid)); const v = p && p.variants.find((x) => x.id === vid); if (v) v.stock = stock; }
    catch (e) { toast(e.message); }
  }
  async function saveWords(f) {
    const body = {}; for (const [k] of WORDS) body[k] = f.elements[k].value;
    body.site_public = f.elements.site_public.value === '1'; body.restock_inquiries = f.elements.restock_inquiries.value === '1';
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try { const d = await api('/api/staff/settings', { json: body }); W.settings = d.settings; toast('Saved. The site shows it within a minute.'); }
    catch (e) { toast(e.message); }
    btn.disabled = false;
  }
  async function saveMedia(f) {
    const body = {}; for (const [k] of MEDIA) body[k] = f.elements[k].value.trim();
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try { const d = await api('/api/staff/settings', { json: body }); W.settings = d.settings; toast('Saved. The site shows it within a minute.'); render(); }
    catch (e) { toast(e.message); }
    btn.disabled = false;
  }
  async function upload(key, file) {
    if (!file) return; const fd = new FormData(); fd.append('file', file); toast('Uploading ' + file.name + '…');
    try { const d = await api('/api/staff/upload', { method: 'POST', body: fd }); const inp = $('#media-form [name="' + key + '"]'); if (inp) inp.value = d.url; toast('Uploaded. Press Save to use it.'); }
    catch (e) { toast(e.message); }
  }

  const chips = (name, opts, val) => '<div class="chips" role="radiogroup">' + opts.map(([v, l]) => { const id = name + '-' + v; return '<input type="radio" name="' + name + '" id="' + id + '" value="' + v + '"' + (String(val) === v ? ' checked' : '') + '><label for="' + id + '">' + l + '</label>'; }).join('') + '</div>';
  const bars = (obj, unit) => { const e = Object.entries(obj).sort((a, b) => b[1] - a[1]); if (!e.length) return '<div class="muted" style="font-size:13.5px">Nothing yet.</div>'; const max = Math.max(...e.map((x) => x[1])) || 1;
    return '<div class="bars">' + e.map(([k, v]) => '<div class="bar-row"><span>' + esc(k) + '</span><span class="track"><span style="width:' + (v / max * 100).toFixed(1) + '%"></span></span><span class="v">' + v + ' ' + unit + '</span></div>').join('') + '</div>'; };
  const n = (o, k) => (o && o[k]) || 0;

  function render() {
    const main = $('#main');
    $('#who').innerHTML = W.hq && W.hq.who ? '<span>From HQ: ' + esc(W.hq.who) + '</span>' : (W.staff ? '<span>Staff</span>' : '');
    if (W.staff === null) { main.innerHTML = '<div class="empty"><div class="big-line">Loading…</div></div>'; return; }
    if (!W.staff) {
      main.innerHTML = '<section><div class="sec-h"><h2>WEBSITE</h2><a class="btn ghost" href="/" target="_blank" rel="noopener">stoicsoulclub.com ↗</a></div>' +
        '<div class="slab" style="display:grid;gap:12px;max-width:560px"><p style="margin:0">Log in with the staff password. The session lasts 12 hours on this device.</p>' +
        '<form id="login" style="display:grid;gap:10px"><label class="f">Staff password<input type="password" name="pw" autocomplete="current-password"></label>' + (W.err ? '<div class="err">' + esc(W.err) + '</div>' : '') +
        '<div class="toolbar"><button type="submit" class="btn primary"' + (W.busy ? ' disabled' : '') + '>' + (W.busy ? 'Logging in…' : 'Log in') + '</button></div></form></div></section>';
      const f = $('#login input'); if (f && window.innerWidth > 700) f.focus();
      return;
    }
    if (!W.settings) { main.innerHTML = '<section>' + (W.err ? '<div class="banner">' + esc(W.err) + ' <button class="btn" data-refresh="1">Try again</button> <button class="btn ghost" data-logout="1">Log out</button></div>' : '<div class="empty"><div class="big-line">Loading the website…</div></div>') + '</section>'; return; }
    const ov = W.overview || {}, st = W.settings, he = W.health || {};
    let h = '<section><div class="sec-h"><h2>WEBSITE</h2><a class="btn ghost" href="/" target="_blank" rel="noopener">stoicsoulclub.com ↗</a></div>' +
      '<div class="toolbar" style="margin-bottom:12px"><span class="tag ' + (he.ok ? 'c' : 'h') + '">' + (he.ok ? 'Live, ordering on' : 'Check: ' + esc(he.ordering || he.error || 'not ok')) + '</span>' +
      '<span class="muted" style="font-size:12.5px">' + (st.site_public === '1' ? 'Visible to search engines' : 'Hidden from search engines until launch') + ' · read ' + new Date(W.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</span>' +
      '<span style="margin-left:auto"></span><button class="btn" data-refresh="1"' + (W.busy ? ' disabled' : '') + '>' + (W.busy === 'load' ? 'Refreshing…' : 'Refresh') + '</button><button class="btn ghost" data-logout="1">Log out</button></div>';
    if (W.err) h += '<div class="banner" style="margin-bottom:12px">' + esc(W.err) + '</div>';
    for (const a of (ov.alerts || [])) h += '<div class="banner" style="margin-bottom:12px">' + esc(a.text) + '</div>';
    h += '<div class="kpis">' +
      '<div class="kpi"><div class="lbl">Inquiries today</div><div class="val num">' + n(ov.today, 'wa_click') + '</div><div class="sub">WhatsApp opened from the site</div></div>' +
      '<div class="kpi"><div class="lbl">Inquiries, 7 days</div><div class="val num">' + n(ov.week, 'wa_click') + '</div><div class="sub">' + n(ov.month, 'wa_click') + ' in 30 days</div></div>' +
      '<div class="kpi"><div class="lbl">Visits, 7 days</div><div class="val num">' + (n(ov.week, 'page_view') + n(ov.week, 'product_view')) + '</div><div class="sub">' + n(ov.week, 'product_view') + ' piece pages opened</div></div>' +
      '<div class="kpi"><div class="lbl">Pieces on the site</div><div class="val num">' + (ov.pieces_in_stock || 0) + '</div><div class="sub">in stock across all sizes</div></div></div>' +
      '<p class="muted" style="margin:8px 0 0;font-size:12.5px">An inquiry is someone opening WhatsApp from the site. It is not a sale: log sales in the HQ when they happen.</p></section>';
    const top = {}; (ov.top || []).forEach((t) => { top[t.product] = t.inquiries || 0; }); const src = {}; (ov.sources || []).forEach((s) => { src[s.source] = s.n; });
    h += '<div class="two"><section><div class="sec-h"><h2>MOST ASKED ABOUT</h2><span class="hint">30 days, inquiries per piece</span></div><div class="slab">' + bars(top, 'inq') + '</div></section>' +
      '<section><div class="sec-h"><h2>WHERE VISITORS CAME FROM</h2><span class="hint">30 days</span></div><div class="slab">' + bars(src, 'views') + '</div></section></div>';
    // stock
    const rows = stockDiff();
    if (rows) {
      const diffs = rows.filter((r) => r.diff); const unmapped = rows.filter((r) => r.vid == null);
      h += '<section><div class="sec-h"><h2>STOCK ON THE WEBSITE</h2><span class="hint">' + (diffs.length ? diffs.length + ' size' + (diffs.length > 1 ? 's' : '') + ' differ from the HQ' : 'matches the HQ' + (W.hq.at ? ' (as of ' + esc(W.hq.at) + ')' : '')) + '</span></div><div class="slab">' +
        '<p class="muted" style="margin:0 0 10px;font-size:13.5px">The website shows a size as sold out when its stock is 0. Push sends the HQ\'s "left" numbers to the site. Open this page from the HQ again for fresh numbers.</p>';
      if (diffs.length) h += '<div class="grid-scroll"><table class="grid-t"><thead><tr><th>Piece</th><th>HQ</th><th>Website</th></tr></thead><tbody>' + diffs.map((r) => '<tr><td class="item">' + esc(r.label) + '</td><td class="num">' + r.hq + '</td><td class="num" style="color:var(--warn)">' + (r.site == null ? '–' : r.site) + '</td></tr>').join('') + '</tbody></table></div>';
      if (unmapped.length) h += '<p class="muted" style="font-size:12.5px">Not on the website: ' + esc(unmapped.map((r) => r.label).join(', ')) + '</p>';
      h += '<div class="toolbar" style="margin-top:10px"><button class="btn primary" data-pushstock="1"' + (W.busy || !diffs.length ? ' disabled' : '') + '>' + (W.busy === 'stock' ? 'Updating…' : 'Push stock to the website') + '</button>' +
        (ov.low_stock && ov.low_stock.length ? '<span class="muted" style="font-size:12.5px">Low on the site: ' + esc(ov.low_stock.slice(0, 6).map((l) => l.name + ' ' + l.size + (l.stock ? ' (1)' : ' (0)')).join(', ')) + (ov.low_stock.length > 6 ? '…' : '') + '</span>' : '') + '</div></div></section>';
    } else {
      h += '<section><div class="sec-h"><h2>STOCK ON THE WEBSITE</h2><span class="hint">Open this page from the HQ to compare with its numbers</span></div><div class="slab">' +
        '<p class="muted" style="margin:0 0 10px;font-size:13.5px">Stock per size as the website has it. Change a number and press Enter to save it; 0 shows the size as sold out.</p><div class="grid-scroll"><table class="grid-t"><thead><tr><th>Piece</th>' + ['S', 'M', 'L', 'XL', 'XXL'].map((s) => '<th>' + s + '</th>').join('') + '</tr></thead><tbody>' +
        (W.products || []).map((p) => { const color = (p.variants[0] || {}).color; return '<tr><td class="item">' + esc(p.name) + '</td>' + ['S', 'M', 'L', 'XL', 'XXL'].map((s) => { const v = p.variants.find((x) => x.size === s && x.color === color); return '<td>' + (v ? '<input type="number" min="0" step="1" value="' + v.stock + '" data-stock="' + v.id + '" aria-label="' + esc(p.name + ' ' + s) + '">' : '–') + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div></div></section>';
    }
    // prices
    const pr = priceDiff();
    if (pr) {
      const pd = pr.filter((r) => r.diff);
      h += '<section><div class="sec-h"><h2>PRICES ON THE WEBSITE</h2><span class="hint">' + (pd.length ? pd.length + ' differ from the HQ' : 'match the HQ') + '</span></div><div class="slab">' +
        '<div class="grid-scroll"><table class="grid-t"><thead><tr><th>Piece</th><th>HQ</th><th>Website</th></tr></thead><tbody>' + pr.map((r) => '<tr><td class="item">' + esc(r.label) + '</td><td class="num">' + jod(r.hq) + '</td><td class="num"' + (r.diff ? ' style="color:var(--warn)"' : '') + '>' + jod(r.site) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="toolbar" style="margin-top:10px"><button class="btn primary" data-pushprices="1"' + (W.busy || !pd.length ? ' disabled' : '') + '>' + (W.busy === 'prices' ? 'Updating…' : 'Push prices to the website') + '</button><span class="muted" style="font-size:12.5px">Prices come from the HQ, Setup → Prices &amp; costs.</span></div></div></section>';
    } else {
      h += '<section><div class="sec-h"><h2>PRICES ON THE WEBSITE</h2><span class="hint">JOD</span></div><div class="slab"><div class="grid-scroll"><table class="grid-t"><thead><tr><th>Piece</th><th>Price</th><th>Status</th></tr></thead><tbody>' +
        (W.products || []).map((p) => '<tr><td class="item">' + esc(p.name) + '</td><td class="num">' + jod(p.price / 1000) + '</td><td>' + esc(p.raw_status) + '</td></tr>').join('') + '</tbody></table></div><p class="muted" style="margin:10px 0 0;font-size:12.5px">To change prices, open this page from the HQ and push them from Setup.</p></div></section>';
    }
    // words
    const yn = (name, val) => chips(name, [['1', 'On'], ['0', 'Off']], val);
    h += '<section><div class="sec-h"><h2>WORDS ON THE WEBSITE</h2><span class="hint">Only facts that are decided</span></div><form id="words-form" class="slab" style="display:grid;gap:12px">' +
      '<div class="fgrid">' + WORDS.map(([k, l, t]) => '<label class="f' + (t === 'area' ? ' full' : '') + '">' + esc(l) + (t === 'area' ? '<textarea name="' + k + '">' + esc(st[k]) + '</textarea>' : '<input type="text" name="' + k + '" value="' + esc(st[k]) + '"' + (k === 'whatsapp' ? ' inputmode="numeric"' : '') + '>') + '</label>').join('') + '</div>' +
      '<div class="fgrid"><div><div class="ftitle">Visible to search engines (launch)</div>' + yn('site_public', st.site_public === '1' ? '1' : '0') + '<div class="muted" style="font-size:12px;margin-top:4px">Stays off until the launch is agreed.</div></div>' +
      '<div><div class="ftitle">Restock inquiries on sold-out sizes</div>' + yn('restock_inquiries', st.restock_inquiries === '1' ? '1' : '0') + '</div></div>' +
      '<div class="toolbar"><button type="submit" class="btn primary">Save words</button></div></form></section>';
    // media
    h += '<section><div class="sec-h"><h2>PHOTOS AND FILM</h2><span class="hint">' + (W.uploads ? 'Upload a file or paste a link' : 'Uploads not connected yet (no R2 bucket): paste links, or send files to Claude') + '</span></div><form id="media-form" class="slab" style="display:grid;gap:12px">' +
      '<p class="muted" style="margin:0;font-size:13.5px">With a cover film set, the home cover plays it as the visitor scrolls (4 to 8 s, silent, 1280×720, under 2 MB; Claude encodes it). Empty = the cover photo. The still frame shows first and when the film cannot load.</p>' +
      '<div class="fgrid">' + MEDIA.map(([k, l, t]) => '<div class="f"><span>' + esc(l) + '</span><div style="display:flex;gap:6px;align-items:center">' +
        (t === 'image' && st[k] ? '<img src="' + esc(st[k]) + '" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex:none">' : '') +
        '<input type="text" name="' + k + '" value="' + esc(st[k]) + '" placeholder="https://… or /assets/…">' +
        (W.uploads ? '<label class="btn" style="flex:none">Upload<input type="file" hidden accept="' + (t === 'video' ? 'video/mp4,video/webm' : 'image/*') + '" data-upload="' + k + '"></label>' : '') + '</div></div>').join('') + '</div>' +
      '<div class="toolbar"><button type="submit" class="btn primary">Save photos and film</button></div></form></section>';
    main.innerHTML = h;
  }

  document.addEventListener('submit', (e) => {
    const f = e.target; e.preventDefault();
    if (f.id === 'login') login(f.elements.pw.value);
    else if (f.id === 'words-form') saveWords(f);
    else if (f.id === 'media-form') saveMedia(f);
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.refresh) load(); else if (b.dataset.logout) logout(); else if (b.dataset.pushstock) pushStock(); else if (b.dataset.pushprices) pushPrices();
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.upload) upload(t.dataset.upload, t.files[0]);
    else if (t.dataset.stock) { const v = Math.max(0, Math.round(+t.value || 0)); t.value = v; setStock(+t.dataset.stock, v); }
  });

  readHandoff();
  render();
  api('/api/staff/login').then((d) => { W.staff = !!d.staff; if (W.staff) load(); else render(); }).catch(() => { W.staff = false; render(); });
})();
