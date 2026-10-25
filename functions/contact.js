import { page } from './_lib/page.js';
import { contact } from './_lib/pages.js';
export const onRequestGet = page((site, origin) => contact(site, origin));
