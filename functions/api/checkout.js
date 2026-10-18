// POST /api/checkout: place an order.
// Prices always come from the database, never from the shopper's browser.
import { handle, json, readBody, sameOrigin, text, phone, email, honeypot, HttpError } from '../_lib/http.js';
import { getDb, getSettings, rateLimit } from '../_lib/db.js';
import { createOrder, expireUnpaid } from '../_lib/store.js';
import { alertNewOrder } from '../_lib/notify.js';

export const onRequestPost = handle(async ({ request, env, waitUntil }) => {
  sameOrigin(request);
  const body = await readBody(request);
  honeypot(body);

  const raw = Array.isArray(body.items) ? body.items : [];
  if (!raw.length) throw new HttpError(400, 'Your bag is empty.');
  if (raw.length > 20) throw new HttpError(400, 'Too many different items in one order.');
  const merged = new Map();
  for (const it of raw) {
    const id = Number.parseInt(it?.variant_id, 10);
    const qty = Number.parseInt(it?.qty, 10);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) throw new HttpError(400, 'Your bag has an item we could not read. Please refresh it.');
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  const items = [...merged].map(([variant_id, qty]) => ({ variant_id, qty }));
  if (items.some((i) => i.qty > 10)) throw new HttpError(400, 'For more than 10 of one item, please message us.');

  const c = body.customer || {};
  const customer = {
    name: text(c.name, 80, { required: true, label: 'Your name' }),
    phone: phone(c.phone),
    email: email(c.email),
    zone: text(c.zone, 40, { required: true, label: 'Delivery area' }),
    address: text(c.address, 300, { required: true, label: 'Your address' }),
    note: text(c.note, 300),
  };
  const paymentMethod = ['card', 'cod', 'cliq'].includes(body.payment) ? body.payment : null;
  if (!paymentMethod) throw new HttpError(400, 'Please choose how to pay.');

  const db = await getDb(env);
  const settings = await getSettings(db);
  if (settings.store_open !== '1') throw new HttpError(403, 'The shop is closed for orders right now. Please check back soon.');
  if (paymentMethod === 'card' && settings.card_enabled !== '1') throw new HttpError(400, 'Card payment is off right now. Please choose cash on delivery.');
  if (paymentMethod === 'cod' && settings.cod_enabled !== '1') throw new HttpError(400, 'Cash on delivery is off right now. Please choose another way to pay.');
  if (paymentMethod === 'cliq' && !(settings.cliq_enabled === '1' && settings.cliq_alias)) throw new HttpError(400, 'CliQ is off right now. Please choose another way to pay.');

  await rateLimit(db, request, 'checkout', 8, 60);
  await expireUnpaid(db);
  const { token, status } = await createOrder(db, settings, { items, customer, paymentMethod });
  // Card orders are announced once paid, not when the shopper first reaches the card page.
  if (status === 'new') waitUntil(alertNewOrder(env, db, token, new URL(request.url).origin));
  const next = status === 'awaiting_payment' ? `/pay/?t=${token}` : `/order/?t=${token}&new=1`;
  return json({ ok: true, token, next }, 201);
});
