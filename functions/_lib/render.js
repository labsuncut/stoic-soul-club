// HTML for every public page. Pages are built on the server so Google, WhatsApp previews and
// AI search tools see real content without JavaScript. The browser script only adds motion
// and the WhatsApp order message.
import { money, chapterLabel } from './content.js';

export const SITE = 'Stoic Soul Club';
// Bump when site.css, site.js or intro.js change, so browsers that cached the old files load the new ones.
export const ASSET_V = '12';
const DEFAULT_DESC = 'Independent streetwear from Amman. Heavy cotton tees and hoodies with a chapter on the back. Order on WhatsApp.';

// Pixel sizes of the photographs shipped with the site, so the browser can reserve their space
// before they load (no layout jumps). Staff uploads are sized by their frame's aspect ratio in CSS.
const KNOWN_DIMS = { '/assets/img/ch1/logo-mark-lg.webp': [640, 721], '/assets/img/ch1/logo-mark.webp': [212, 240], '/assets/img/ch1/logo-black.webp': [1200, 1200] };
export function dims(url) {
  const u = String(url || '');
  const d = KNOWN_DIMS[u] || (/^\/assets\/img\/ch1\/v2-.*\.webp$/.test(u) ? [1600, 1200] : null);
  return d ? ` width="${d[0]}" height="${d[1]}"` : '';
}
// The shipped photos exist at four widths (see assets/img/ch1), so a phone downloads the small
// one. `sizes` says how wide the picture is laid out; anything else gets its plain src.
const PHOTO_WIDTHS = [480, 800, 1200];
export function srcsetOf(url) {
  const m = /^(\/assets\/img\/ch1\/v2-[\w-]+?)(?:-(?:480|800|1200))?\.webp$/.exec(String(url || ''));
  return m ? { base: `${m[1]}.webp`, set: [...PHOTO_WIDTHS.map((w) => `${m[1]}-${w}.webp ${w}w`), `${m[1]}.webp 1600w`].join(', ') } : null;
}
export const COVER_SIZES = '(min-width: 980px) 56vw, 100vw';
export function photo(url, sizes) {
  const r = srcsetOf(url);
  return r ? `${dims(r.base)} srcset="${r.set}" sizes="${sizes}"` : dims(url);
}
export const MARK_SRCSET = ' srcset="/assets/img/ch1/logo-mark-lg-320.webp 320w, /assets/img/ch1/logo-mark-lg.webp 640w"';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const paragraphs = (text) => String(text || '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('');
const pad = (n) => String(n).padStart(2, '0');
const imgUrl = (origin, u) => (u ? new URL(u, origin).href : '');

// Page numbers for the folio line. The site reads like one issue; these are its pages.
const PAGES = { home: 1, shop: 2, product: 3, lookbook: 4, archive: 5, story: 6, contact: 7, notfound: 0 };

const BUTTERFLY = '<svg class="butterfly" viewBox="0 0 44 36" aria-hidden="true"><path fill="currentColor" d="M22 18C18 6 8 0 3 3s0 14 8 15c-7 3-8 12-2 14s11-6 13-14c2 8 7 16 13 14s5-11-2-14c8-1 13-12 8-15S26 6 22 18z"/></svg>';

export function headers(site, extra = {}) {
  const h = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=60',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'strict-transport-security': 'max-age=31536000',
    ...extra,
  };
  if (site.settings.site_public !== '1') h['x-robots-tag'] = 'noindex';
  return h;
}

// ---------- Layout ----------

export function layout({ site, origin, page, section, chapter = 1, title, description, path, image, ld = [], body, bodyClass = '' }) {
  const s = site.settings;
  const fullTitle = page === 'home' ? `${SITE} · ${s.hero_headline}` : `${title} · ${SITE}`;
  const desc = description || DEFAULT_DESC;
  const canonical = `${origin}${path}`;
  const og = imgUrl(origin, image) || `${origin}/assets/img/og.jpg`;
  const ig = s.instagram ? `https://www.instagram.com/${esc(s.instagram)}/` : '';
  const waFoot = s.whatsapp ? `https://wa.me/${esc(s.whatsapp)}?text=${encodeURIComponent('Hello Stoic Soul Club! I have a question about ordering.')}` : '';
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', name: SITE, url: `${origin}/`,
    logo: imgUrl(origin, s.logo_image) || `${origin}/assets/img/favicon.svg`,
    ...(ig ? { sameAs: [ig] } : {}),
  };
  const logo = s.logo_image
    ? `<img class="mark" src="${esc(s.logo_image)}"${s.logo_image === '/assets/img/ch1/logo-mark.webp' ? ' srcset="/assets/img/ch1/logo-mark-96.webp 96w, /assets/img/ch1/logo-mark.webp 212w" sizes="32px"' : ''} alt="" width="40" height="40">`
    : BUTTERFLY;
  const tagline = s.hero_headline ? s.hero_headline.charAt(0).toUpperCase() + s.hero_headline.slice(1).toLowerCase() : '';
  const navItems = [['/shop', 'Shop'], ...(site.lookbooks.length ? [['/lookbook', 'Lookbook']] : []), ['/archive', 'Archive'], ['/story', 'Story'], ['/contact', 'Contact']];
  const nav = navItems.map(([href, label]) => `<a href="${href}"${path.startsWith(href) ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${page === 'product' ? 'product' : 'website'}">
<meta property="og:site_name" content="${SITE}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#141311">
<meta name="view-transition" content="same-origin">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/archivo-normal.woff2" as="font" type="font/woff2" crossorigin>${page === 'home' && srcsetOf(image) ? `\n<link rel="preload" as="image" imagesrcset="${srcsetOf(image).set}" imagesizes="${COVER_SIZES}" fetchpriority="high">` : ''}
<script src="/assets/js/intro.js?v=${ASSET_V}" defer></script>
<link rel="stylesheet" href="/assets/css/site.css?v=${ASSET_V}">
${[org, ...ld].map((o) => `<script type="application/ld+json">${safeJson(o)}</script>`).join('\n')}
</head>
<body data-page="${page}" class="${bodyClass}${s.announcement ? ' has-announce' : ''}">
<div class="intro" id="intro" role="region" aria-label="Opening">
  <div class="intro-bg"></div>
  <canvas class="intro-canvas" id="intro-canvas"></canvas>
  <div class="intro-bloom"></div>
  <div class="intro-lock">
    <img class="intro-mark" id="intro-mark" src="/assets/img/ch1/logo-mark-lg.webp"${MARK_SRCSET} sizes="(min-width: 900px) 250px, 28vmin" alt="" width="640" height="721" decoding="async" fetchpriority="high">
    <span class="intro-word" id="intro-word">Stoic Soul Club</span>
  </div>
  <p class="intro-tag">${esc(tagline)}</p>
  <button class="intro-skip" type="button">Skip</button>
</div>
<a class="skip" href="#main">Skip to content</a>
${s.announcement ? `<div class="announce"><div class="wrap">${esc(s.announcement)}</div></div>` : ''}
<header class="masthead">
  <div class="folio" aria-label="Chapter ${pad(chapter)}, ${esc(section)}, page ${pad(PAGES[page] || 0)}">
    <span class="folio-ch">${chapterLabel(chapter)}</span><span class="folio-sep" aria-hidden="true">·</span><span class="folio-sec">${esc(section)}</span><span class="folio-sep" aria-hidden="true">·</span><span class="folio-p">P. ${pad(PAGES[page] || 0)}</span>
  </div>
  <a class="wordmark" href="/" aria-label="${SITE} home">${logo}<span>Stoic Soul Club</span></a>
  <nav class="nav" aria-label="Main">${nav}</nav>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span></span><span></span>Menu</button>
</header>
<nav class="menu" id="menu" aria-label="Main" hidden>
  ${navItems.map(([href, label], i) => `<a href="${href}"><small>${pad(i + 2)}</small>${label}</a>`).join('')}
  ${ig ? `<a class="menu-ig" href="${ig}" target="_blank" rel="noopener"><small>IG</small>@${esc(s.instagram)}</a>` : ''}
</nav>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <a class="wordmark" href="/">${logo}<span>Stoic Soul Club</span></a>
      <p class="foot-line">For the chapter you're in. Independent streetwear from Amman.</p>
      ${waFoot ? `<a class="foot-ig" href="${waFoot}" target="_blank" rel="noopener" data-wa-general>Message us on WhatsApp</a>` : ''}
      ${ig ? `<a class="foot-ig" href="${ig}" target="_blank" rel="noopener">Instagram @${esc(s.instagram)}</a>` : ''}
    </div>
    <div>
      <h2 class="foot-h">Pages</h2>
      <ul>${navItems.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2 class="foot-h">Ordering</h2>
      <p>${esc(s.ordering_text)}</p>
      <p>${esc(s.shipping_text)}</p>
    </div>
    <div>
      <h2 class="foot-h">Good to know</h2>
      <ul>
        <li><a href="/contact#swap">Size swaps</a></li>
        <li><a href="/contact#shipping">Delivery and shipping</a></li>
        <li><a href="/contact#payment">Payment</a></li>
        <li><a href="/contact#privacy">Privacy</a></li>
        ${s.contact_email ? `<li><a href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a></li>` : ''}
      </ul>
    </div>
  </div>
  <div class="wrap foot-giant-wrap"><p class="foot-giant" aria-hidden="true" data-text="Stoic Soul Club"></p></div>
  <div class="wrap foot-end"><span>© ${new Date().getFullYear()} Stoic Soul Club</span><span class="folio-ch">${chapterLabel(chapter)}</span></div>
</footer>
<script src="/assets/js/site.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

// ---------- Shared pieces ----------

// A photo frame from the contact sheet. Without an image it shows the shot's name so a
// missing picture is obvious and honest, never a stock photo.
export function frame({ image, alt, caption = '', n, ratio = '4/5', cls = '', eager = false, shot = '' }) {
  const num = n != null ? `<span class="frame-n" aria-hidden="true">${pad(n)}</span>` : '';
  const pic = image
    ? `<img src="${esc(image)}"${photo(image, '(min-width: 980px) 50vw, 100vw')} alt="${esc(alt || caption)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
    : `<div class="ph" role="img" aria-label="Photo to come: ${esc(shot || caption || alt)}"><span class="ph-label">Photo to come</span><span class="ph-shot">${esc(shot || caption || alt)}</span></div>`;
  return `<figure class="frame ${cls}" style="--ratio:${ratio}">${num}<div class="frame-img">${pic}</div>${caption && image ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
}

export function availability(p) {
  if (p.status === 'archived') return '<span class="tag tag-archived">Past release · not for sale</span>';
  if (p.status === 'sold_out') return '<span class="tag tag-soldout">Sold out</span>';
  const left = p.variants.filter((v) => v.in_stock).map((v) => v.size);
  return `<span class="tag tag-available">Available · ${esc(left.join(' '))}</span>`;
}

const CARD_SIZES = '(min-width: 980px) 30vw, (min-width: 720px) 45vw, 80vw';
export function productCard(p, n, { cls = '', clone = false } = {}) {
  const front = p.images[0] || '';
  const back = p.images[1] || '';
  const label = p.status === 'archived' ? 'Not for sale' : p.status === 'sold_out' ? 'Sold out' : '';
  return `<a class="product ${cls} ${p.status}" href="/product/${esc(p.slug)}" data-collection="${esc(p.collection)}"${clone ? ' aria-hidden="true" tabindex="-1"' : ''}>
    <figure class="frame" style="--ratio:4/5"><span class="frame-n" aria-hidden="true">${pad(n)}</span>
      <div class="frame-img">${front
        ? `<img src="${esc(front)}"${photo(front, CARD_SIZES)} alt="${esc(p.captions && p.captions[0] ? `${p.name}: ${p.captions[0]}` : p.name)}" loading="lazy" decoding="async">${back ? `<img class="alt" src="${esc(back)}"${photo(back, CARD_SIZES)} alt="" loading="lazy" decoding="async">` : ''}`
        : ticket(p)}
      ${label ? `<span class="ribbon">${label}</span>` : ''}</div>
    </figure>
    <div class="product-meta"><span class="product-name">${esc(p.name)}</span><span class="product-price">${money(p.price, p.currency)}</span></div>
    <div class="product-sub"><span class="product-col">${esc(p.collection.toUpperCase())}</span>${availability(p)}</div>
  </a>`;
}

// The headline split into lines, each masked for the cover animation.
export function statement(text, { tag = 'h1', cls = '' } = {}) {
  const lines = String(text).split(/\n|\s{2,}|\s\/\s/).map((l) => l.trim()).filter(Boolean);
  return `<${tag} class="statement ${cls}">${lines.map((l) => `<span class="line"><span class="line-in">${esc(l)}</span></span>`).join('')}</${tag}>`;
}

export function filmStrip(photos, { id = 'strip', label = 'Lookbook' } = {}) {
  if (!photos.length) return '';
  return `<div class="strip" id="${id}" data-strip aria-roledescription="carousel" aria-label="${esc(label)}">
    <div class="strip-holes" aria-hidden="true"></div>
    <div class="strip-track">${photos.map((ph, i) => `<div class="strip-cell" data-i="${i}" aria-roledescription="slide" aria-label="${i + 1} of ${photos.length}">${frame({ image: ph.image, alt: ph.alt, n: i + 1, ratio: '4/5', shot: ph.caption })}</div>`).join('')}</div>
    <div class="strip-holes" aria-hidden="true"></div>
    <div class="strip-bar"><span class="strip-cap" data-strip-caption>${esc(photos[0].caption)}</span><span class="strip-count"><span data-strip-n>01</span> / ${pad(photos.length)}</span>
      <span class="strip-btns"><button type="button" data-strip-prev aria-label="Previous photo">←</button><button type="button" data-strip-next aria-label="Next photo">→</button></span></div>
  </div>`;
}

// A piece without a photo: its name, chapter and weight set in type, with the chapter's colour.
export function ticket(p, { accent = '' } = {}) {
  const weight = (String(p.materials || '').match(/\d{3}\s?g/) || [''])[0];
  return `<div class="ticket"${accent ? ` style="--accent:${esc(accent)}"` : ''} aria-hidden="true">
    <span class="ticket-ch">${esc(p.collection.toUpperCase())}</span>
    <span class="ticket-name">${esc(p.name)}</span>
    <span class="ticket-sub">${esc([p.category, weight].filter(Boolean).join(' · '))}</span>
    ${BUTTERFLY}
  </div>`;
}

// The pieces reel: every product laid twice so the track can drift without an end. The second
// lap is hidden from assistive tech; without scripts it is not shown at all.
export function reel(products, { id = 'reel', label = 'The pieces' } = {}) {
  if (!products.length) return '';
  const lap = (clone) => products.map((p, i) => `<div class="reel-cell${clone ? ' is-clone' : ''}">${productCard(p, i + 1, { clone })}</div>`).join('');
  return `<div class="reel" id="${id}" data-reel aria-label="${esc(label)}">
    <div class="reel-track">${lap(false)}${lap(true)}</div>
  </div>`;
}

// A slow line of words between sections, repeated so it never runs out.
export function ticker(items) {
  const set = `<span class="ticker-set">${items.map((t) => `<span>${esc(t)}</span>${BUTTERFLY}`).join('')}</span>`;
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${set}${set}${set}${set}</div></div>`;
}

export const sectionHead = (n, label, text, { tag = 'h2', cls = '' } = {}) =>
  `<div class="sec-head ${cls}" data-rise><span class="sec-n">${pad(n)}</span><span class="sec-label">${esc(label)}</span></div>${text ? statement(text, { tag, cls: 'statement-s' }) : ''}`;

// ---------- Not found ----------
export function notFound(site, origin) {
  return layout({
    site, origin, page: 'notfound', section: 'Lost page', title: 'Page not found', path: '/404',
    body: `<section class="band band-ink"><div class="wrap">${sectionHead(0, 'Not every page is in this issue', 'THAT PAGE / IS NOT HERE.', { tag: 'h1' })}<p class="lead">The link may be old or mistyped.</p><p><a class="btn" href="/shop">Go to the shop</a> <a class="btn btn-ghost" href="/">Home</a></p></div></section>`,
  });
}
