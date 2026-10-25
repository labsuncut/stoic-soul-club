import { page } from '../_lib/page.js';
import { lookbook } from '../_lib/pages.js';
import { bySlug } from '../_lib/content.js';
export const onRequestGet = page((site, origin, url) => {
  const slug = url.pathname.split('/')[2] || '';
  const l = /^[a-z0-9-]{1,60}$/.test(slug) ? bySlug(site.lookbooks, slug) : null;
  return l ? lookbook(site, origin, l) : null;
});
