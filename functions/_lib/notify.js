// Instant new-order alerts to the team's Telegram. Off until two things exist in Cloudflare:
// the secret TELEGRAM_BOT_TOKEN, and a chat connected from the dashboard's Settings tab.
// Alerts carry no phone numbers or addresses, only what's needed to know an order came in.
import { getSettings } from './db.js';
import { orderNumber } from './store.js';

const PAY = { cod: 'Cash on delivery', cliq: 'CliQ (check the transfer)', card: 'Card' };

export async function telegram(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.description || `Telegram answered ${res.status}`);
  return data.result;
}

export async function alertNewOrder(env, db, token, origin) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) return;
    const settings = await getSettings(db);
    if (!settings.telegram_chat) return;
    const o = await db.prepare(
      `SELECT o.id, o.total, o.payment_method, o.zone, o.test, (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS pieces
       FROM orders o WHERE o.token = ?`,
    ).bind(token).first();
    if (!o) return;
    const jod = (o.total / 1000).toFixed(o.total % 1000 ? 3 : 0);
    const text = [
      `${o.test ? '[TEST] ' : ''}New order ${orderNumber(o.id)}`,
      `${o.pieces} piece${o.pieces === 1 ? '' : 's'} · JOD ${jod}`,
      `${PAY[o.payment_method]} · ${(settings.zones.find((z) => z.id === o.zone) || {}).en || o.zone}`,
      `${origin}/staff/`,
    ].join('\n');
    await telegram(env, 'sendMessage', { chat_id: settings.telegram_chat, text, disable_web_page_preview: true });
  } catch (err) {
    console.error('order alert failed', err); // an alert failing must never break a sale
  }
}
