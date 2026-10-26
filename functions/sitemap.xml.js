// /sitemap.xml: every public page, product and lookbook, from the database.
import { loadSite } from './_lib/content.js';

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const site = await loadSite(env);
  const urls = ['/', '/shop', '/lookbook', '/archive', '/story', '/contact',
    ...site.products.map((p) => `/product/${p.slug}`),
    ...site.lookbooks.map((l) => `/lookbook/${l.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

// Link checkers and uptime monitors send HEAD; the runtime drops the body.
export const onRequestHead = onRequestGet;
