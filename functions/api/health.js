// GET /api/health: is the site wired up? Safe to share: no secrets, no counts of people.
import { json } from '../_lib/http.js';
import { loadSite } from '../_lib/content.js';

export async function onRequestGet({ env }) {
  let site; let error = '';
  try { site = await loadSite(env); } catch (err) { error = String((err && err.message) || err); }
  const settings = site ? site.settings : {};
  return json({
    ok: !!site && !site.fallback && !!settings.whatsapp,
    database: env.DB ? (site && !site.fallback ? 'connected' : 'error') : 'not bound',
    content: site && !site.fallback ? 'database' : 'starter',
    ordering: settings.whatsapp ? 'on' : 'off (no WhatsApp number saved in the dashboard)',
    photo_uploads: env.IMAGES ? 'connected' : 'not connected (R2 bucket not bound as IMAGES)',
    products: site ? site.products.length : 0,
    error,
  }, 200, { 'cache-control': 'no-store' });
}
