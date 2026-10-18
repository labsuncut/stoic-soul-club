// /sitemap.xml: the list of pages Google should know about, including every product.
import { getDb } from './_lib/db.js';
import { listProducts } from './_lib/store.js';

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  let products = [];
  try { products = await listProducts(await getDb(env)); } catch (err) { console.error(err); }
  const urls = ['/', '/shop', '/about', '/help', ...products.map((p) => `/product/${p.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
