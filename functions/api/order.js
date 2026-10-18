// GET /api/order?t=token: the customer's view of their order. The token is the secret
// link they get after checkout; without it nobody can see the order.
import { handle, json, HttpError } from '../_lib/http.js';
import { getDb } from '../_lib/db.js';
import { loadOrder, publicOrder } from '../_lib/store.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const t = new URL(request.url).searchParams.get('t') || '';
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(t)) throw new HttpError(404, 'Order not found.');
  const order = await loadOrder(await getDb(env), 'token', t);
  if (!order) throw new HttpError(404, 'Order not found.');
  return json({ order: publicOrder(order) });
});
