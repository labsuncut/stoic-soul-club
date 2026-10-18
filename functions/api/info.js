// GET /api/info: store settings the shop needs (delivery fees, payment options, notices).
import { handle, json } from '../_lib/http.js';
import { getDb, getSettings } from '../_lib/db.js';

export const onRequestGet = handle(async ({ env }) => {
  const s = await getSettings(await getDb(env));
  return json({
    store_open: s.store_open === '1',
    payments_mode: s.payments_mode,
    card: s.card_enabled === '1',
    cod: s.cod_enabled === '1',
    free_delivery_over: Number(s.free_delivery_over) || 0,
    zones: s.zones,
    whatsapp: s.whatsapp,
    notice_en: s.notice_en,
    notice_ar: s.notice_ar,
  });
});
