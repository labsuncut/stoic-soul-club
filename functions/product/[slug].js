// /product/<slug>: the product page, filled in on the server so Google, WhatsApp
// link previews and AI search tools see the real name, price, stock and photo.
import { getDb } from '../_lib/db.js';
import { listProducts } from '../_lib/store.js';

const SITE_NAME = 'Stoic Soul Club';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON inside <script> must not be able to close the tag.
const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

export async function onRequestGet({ params, request, env }) {
  const url = new URL(request.url);
  const slug = String(params.slug || '').toLowerCase();
  let product = null;
  try {
    [product] = /^[a-z0-9-]{1,60}$/.test(slug) ? await listProducts(await getDb(env), { slug }) : [];
  } catch (err) {
    console.error(err);
  }
  if (!product) {
    const notFound = await env.ASSETS.fetch(new URL('/404', url));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  }

  const page = await env.ASSETS.fetch(new URL('/product-template', url));
  const canonical = `${url.origin}/product/${product.slug}`;
  const title = `${product.name_en} · ${SITE_NAME}`;
  const desc = (product.desc_en || `${product.name_en} from ${SITE_NAME}.`).slice(0, 160);
  const image = product.images[0] ? new URL(product.images[0], url.origin).href : `${url.origin}/assets/img/og.png`;
  const price = (product.price / 1000).toFixed(2);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name_en,
    description: product.desc_en,
    image: [image],
    sku: product.slug,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'JOD',
      price,
      availability: product.sold_out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  const head = `<script type="application/ld+json">${safeJson(ld)}</script>
<script type="application/json" id="product-data">${safeJson(product)}</script>
<meta property="og:image" content="${esc(image)}">
<meta property="product:price:amount" content="${price}">
<meta property="product:price:currency" content="JOD">
`;

  const set = (attr, value) => ({ element(el) { el.setAttribute(attr, value); } });
  const rewritten = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('meta[name="description"]', set('content', desc))
    .on('meta[property="og:title"]', set('content', title))
    .on('meta[property="og:description"]', set('content', desc))
    .on('meta[property="og:url"]', set('content', canonical))
    .on('meta[property="og:type"]', set('content', 'product'))
    .on('link[rel="canonical"]', set('href', canonical))
    .on('#pdp', set('data-slug', product.slug))
    .on('#crumb', { element(el) { el.setInnerContent(product.name_en); } })
    .on('head', { comments(c) { if (c.text.trim() === 'PRODUCT-HEAD') c.replace(head, { html: true }); } })
    .transform(page);
  const headers = new Headers(rewritten.headers);
  headers.set('cache-control', 'no-store');
  return new Response(rewritten.body, { status: 200, headers });
}
