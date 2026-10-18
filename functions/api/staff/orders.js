// GET /api/staff/orders?status=new&q=search: order list, newest first.
import { handle, json } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';
import { orderNumber, STATUSES } from '../../_lib/store.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  const where = [];
  const args = [];
  if (status === 'open') where.push(`status IN ('new','packed','shipped')`);
  else if (STATUSES.includes(status)) { where.push('status = ?'); args.push(status); }
  if (q) {
    const num = /^s?(\d+)$/i.exec(q);
    if (num) { where.push('id = ?'); args.push(Number(num[1]) - 1000); }
    else { where.push('(name LIKE ? OR phone LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  }
  const db = await getDb(env);
  const { results } = await db.prepare(
    `SELECT o.id, o.status, o.payment_method, o.payment_status, o.test, o.name, o.phone, o.zone, o.total, o.created_at,
       (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS pieces
     FROM orders o ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY o.id DESC LIMIT 200`,
  ).bind(...args).all();
  return json({ orders: results.map((o) => ({ ...o, number: orderNumber(o.id) })) });
});
