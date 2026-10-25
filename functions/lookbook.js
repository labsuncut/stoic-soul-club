import { page } from './_lib/page.js';
import { lookbookIndex } from './_lib/pages.js';
export const onRequestGet = page((site, origin) => lookbookIndex(site, origin));
