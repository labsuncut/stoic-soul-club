// GET /api/staff/overview: today's numbers and what needs doing.
import { handle, json } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';
import { expireUnpaid } from '../../_lib/store.js';

export const onRequestGet = handle(async ({ env }) => {
  const db = await getDb(env);
  await expireUnpaid(db);
  const one = (sql) => db.prepare(sql).first();
  const [todo, today, week, low, byStatus] = await Promise.all([
    one(`SELECT COUNT(*) AS n FROM orders WHERE status IN ('new','packed')`),
    one(`SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS sales FROM orders
         WHERE status NOT IN ('cancelled','awaiting_payment') AND date(created_at, '+3 hours') = date('now', '+3 hours')`),
    one(`SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS sales FROM orders
         WHERE status NOT IN ('cancelled','awaiting_payment') AND created_at >= datetime('now', '-7 days')`),
    db.prepare(`SELECT p.name_en, v.size, v.color, v.stock FROM variants v JOIN products p ON p.id = v.product_id
                WHERE p.active = 1 AND v.stock <= 2 ORDER BY v.stock, p.sort LIMIT 20`).all(),
    db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all(),
  ]);
  return json({
    to_handle: todo.n,
    today: { orders: today.n, sales: today.sales },
    week: { orders: week.n, sales: week.sales },
    low_stock: low.results,
    by_status: Object.fromEntries(byStatus.results.map((r) => [r.status, r.n])),
  });
});
