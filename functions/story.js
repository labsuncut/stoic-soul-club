import { page } from './_lib/page.js';
import { story } from './_lib/pages.js';
export const onRequestGet = page((site, origin) => story(site, origin));
// Link checkers and uptime monitors send HEAD; the runtime drops the body.
export const onRequestHead = onRequestGet;
