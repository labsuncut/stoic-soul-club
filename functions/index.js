import { page } from './_lib/page.js';
import { home } from './_lib/pages.js';
export const onRequestGet = page((site, origin) => home(site, origin));
