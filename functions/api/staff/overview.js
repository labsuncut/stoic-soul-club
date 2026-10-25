// GET /api/staff/overview: what people looked at and how many opened WhatsApp. Inquiries, never sales.
import { handle, json } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';

export const onRequestGet = handle(async ({ env }) => {
  const db = await getDb(env);
  const since = (days) => `date('now', '+3 hours', '-${days} days')`;
  const counts = (days) => db.prepare(`SELECT kind, COUNT(*) AS n FROM events WHERE day >= ${since(days)} GROUP BY kind`).all();
  const [today, week, month, top, sources, daily, low, stock] = await Promise.all([
    counts(0), counts(7), counts(30),
    db.prepare(`SELECT product, SUM(kind = 'wa_click') AS inquiries, SUM(kind = 'product_view') AS views FROM events WHERE day >= ${since(30)} AND product != '' AND product != 'general' GROUP BY product ORDER BY inquiries DESC, views DESC LIMIT 10`).all(),
    db.prepare(`SELECT CASE WHEN source = '' THEN 'direct' ELSE source END AS source, COUNT(*) AS n FROM events WHERE day >= ${since(30)} AND kind IN ('page_view','product_view') GROUP BY 1 ORDER BY n DESC LIMIT 8`).all(),
    db.prepare(`SELECT day, SUM(kind IN ('page_view','product_view')) AS views, SUM(kind = 'wa_click') AS inquiries FROM events WHERE day >= ${since(14)} GROUP BY day ORDER BY day`).all(),
    db.prepare(`SELECT p.name_en AS name, v.size, v.color, v.stock FROM variants v JOIN products p ON p.id = v.product_id WHERE p.status = 'available' AND v.stock <= 1 ORDER BY v.stock, p.sort LIMIT 30`).all(),
    db.prepare(`SELECT COALESCE(SUM(v.stock), 0) AS pieces FROM variants v JOIN products p ON p.id = v.product_id WHERE p.status = 'available'`).first(),
  ]);
  const toMap = (r) => Object.fromEntries(r.results.map((x) => [x.kind, x.n]));
  return json({
    today: toMap(today), week: toMap(week), month: toMap(month),
    top: top.results, sources: sources.results, daily: daily.results, low_stock: low.results, pieces_in_stock: stock.pieces,
  });
});
