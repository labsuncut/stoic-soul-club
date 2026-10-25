// Wraps a page template: loads the site, renders, and never crashes a visitor.
import { loadSite } from './content.js';
import { headers, notFound } from './render.js';

export function page(render) {
  return async ({ request, env }) => {
    const url = new URL(request.url);
    const site = await loadSite(env);
    try {
      const html = await render(site, url.origin, url);
      if (html === null) return new Response(notFound(site, url.origin), { status: 404, headers: headers(site) });
      return new Response(html, { headers: headers(site) });
    } catch (err) {
      console.error(err);
      return new Response(notFound(site, url.origin), { status: 500, headers: headers(site, { 'cache-control': 'no-store' }) });
    }
  };
}
