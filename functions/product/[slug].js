import { page } from '../_lib/page.js';
import { product } from '../_lib/pages.js';
import { bySlug } from '../_lib/content.js';
export const onRequestGet = page((site, origin, url) => {
  const slug = url.pathname.split('/')[2] || '';
  const p = /^[a-z0-9-]{1,60}$/.test(slug) ? bySlug(site.products, slug) : null;
  return p ? product(site, origin, p) : null;
});
// Link checkers and uptime monitors send HEAD; the runtime drops the body.
export const onRequestHead = onRequestGet;
