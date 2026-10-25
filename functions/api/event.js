// POST /api/event: first-party, cookie-free counts. Kinds: page_view, product_view,
// size_select, wa_click (an inquiry, never a sale), restock_click.
// Nothing personal is stored: no IP, no user agent, no cookie, no id.
import { handle, json, readBody, text, HttpError, ammanNow } from '../_lib/http.js';
import { getDb, getSettings } from '../_lib/db.js';

const KINDS = new Set(['page_view', 'product_view', 'size_select', 'wa_click', 'restock_click']);

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readBody(request);
  if (!KINDS.has(body.kind)) throw new HttpError(400, 'Unknown event.');
  if (!env.DB) return json({ ok: true, stored: false });
  const db = await getDb(env);
  const settings = await getSettings(db);
  if (settings.analytics !== '1') return json({ ok: true, stored: false });
  const source = /instagram|ig\b/i.test(String(body.source || '')) ? 'instagram' : text(body.source, 30).toLowerCase();
  await db.prepare('INSERT INTO events (kind, page, product, collection, size, source, day) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(body.kind, text(body.page, 80), text(body.product, 60), text(body.collection, 40), text(body.size, 10), source, ammanNow().date).run();
  return json({ ok: true, stored: true });
});
