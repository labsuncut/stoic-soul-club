// POST /api/pay/test {t, card}: the practice payment provider.
// It behaves like a real card page but no money moves. It only works while the
// store is in test mode. Real card payments replace this with a provider such as
// PayTabs or HyperPay, which send the shopper to their own secure page.
//   4242 4242 4242 4242  -> payment succeeds
//   4000 0000 0000 0002  -> card declined
import { handle, json, readBody, sameOrigin, randomToken, HttpError } from '../../_lib/http.js';
import { getDb, getSettings, rateLimit } from '../../_lib/db.js';
import { loadOrder, markPaid } from '../../_lib/store.js';

export const onRequestPost = handle(async ({ request, env }) => {
  sameOrigin(request);
  const body = await readBody(request);
  const db = await getDb(env);
  const settings = await getSettings(db);
  if (settings.payments_mode !== 'test') throw new HttpError(403, 'Test payments are switched off.');
  await rateLimit(db, request, 'pay', 20, 60);

  const t = typeof body.t === 'string' ? body.t : '';
  const order = /^[A-Za-z0-9_-]{20,40}$/.test(t) ? await loadOrder(db, 'token', t) : null;
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.status !== 'awaiting_payment') {
    throw new HttpError(409, order.payment_status === 'paid' ? 'This order is already paid.' : 'This order can no longer be paid. Please order again.');
  }

  const card = String(body.card || '').replace(/\D/g, '');
  if (card === '4000000000000002') throw new HttpError(402, 'Card declined (test card). Try 4242 4242 4242 4242.');
  if (card !== '4242424242424242') throw new HttpError(400, 'This is a test store: use the test card 4242 4242 4242 4242.');

  await markPaid(db, order, `TEST-${randomToken(6)}`);
  return json({ ok: true, next: `/order/?t=${t}&new=1` });
});
