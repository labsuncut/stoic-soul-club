// GET /api/staff/export: every order line as a CSV file for Excel or Google Sheets.
import { handle, csvCell as cell } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';
import { orderNumber } from '../../_lib/store.js';

const jod = (fils) => (fils / 1000).toFixed(3);

export const onRequestGet = handle(async ({ env }) => {
  const db = await getDb(env);
  const { results } = await db.prepare(
    `SELECT o.id, o.created_at, o.status, o.payment_method, o.payment_status, o.test, o.name, o.phone, o.email, o.zone, o.address,
       o.subtotal, o.delivery_fee, o.total, i.name_en, i.size, i.color, i.qty, i.unit_price
     FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.id, i.id`,
  ).all();
  const head = ['order', 'date_utc', 'status', 'payment', 'paid', 'test', 'name', 'phone', 'email', 'area', 'address',
    'item', 'size', 'colour', 'qty', 'unit_jod', 'order_subtotal_jod', 'delivery_jod', 'order_total_jod'];
  const lines = results.map((r) => [orderNumber(r.id), r.created_at, r.status, r.payment_method, r.payment_status, r.test ? 'yes' : 'no',
    r.name, r.phone, r.email, r.zone, r.address, r.name_en, r.size, r.color, r.qty, jod(r.unit_price),
    jod(r.subtotal), jod(r.delivery_fee), jod(r.total)].map(cell).join(','));
  return new Response(`﻿${[head.join(','), ...lines].join('\n')}\n`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="stoic-orders.csv"',
      'cache-control': 'no-store',
    },
  });
});
