import { page } from './_lib/page.js';
import { shop } from './_lib/pages.js';
export const onRequestGet = page((site, origin, url) => shop(site, origin, url));
