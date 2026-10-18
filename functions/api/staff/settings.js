// GET/POST /api/staff/settings: shop open or closed, payment options, delivery fees, notices.
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb, getSettings } from '../../_lib/db.js';

export const onRequestGet = handle(async ({ env }) => json({ settings: await getSettings(await getDb(env)) }));

export const onRequestPost = handle(async ({ request, env }) => {
  const s = await readBody(request);
  const db = await getDb(env);
  const updates = {};
  for (const k of ['store_open', 'card_enabled', 'cod_enabled', 'cliq_enabled']) if (k in s) updates[k] = s[k] ? '1' : '0';
  if ('notice_en' in s) updates.notice_en = text(s.notice_en, 200);
  if ('notice_ar' in s) updates.notice_ar = text(s.notice_ar, 200);
  if ('cliq_alias' in s) updates.cliq_alias = text(s.cliq_alias, 40);
  if ('whatsapp' in s) updates.whatsapp = text(s.whatsapp, 20).replace(/\D/g, '');
  if ('free_delivery_over' in s) {
    const n = Math.round(Number(s.free_delivery_over) * 1000);
    if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'Free delivery amount must be a number (0 = never free).');
    updates.free_delivery_over = String(n);
  }
  if ('zones' in s) {
    if (!Array.isArray(s.zones) || !s.zones.length || s.zones.length > 20) throw new HttpError(400, 'Add at least one delivery area.');
    updates.zones = JSON.stringify(s.zones.map((z, i) => {
      const fee = Math.round(Number(z.fee) * 1000);
      if (!Number.isFinite(fee) || fee < 0) throw new HttpError(400, 'Each delivery fee must be a number in JOD.');
      return {
        id: text(z.id, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-') || `zone-${i + 1}`,
        en: text(z.en, 40, { required: true, label: 'Area name' }),
        ar: text(z.ar, 40),
        fee,
      };
    }));
  }
  // Going live with real cards is a deliberate step: it needs a payment provider wired in first.
  if ('payments_mode' in s && s.payments_mode !== 'test') {
    throw new HttpError(400, 'Real card payments are not connected yet. The store stays in test mode.');
  }
  const put = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const list = Object.entries(updates);
  if (list.length) await db.batch(list.map(([k, v]) => put.bind(k, v)));
  return json({ ok: true, settings: await getSettings(db) });
});
