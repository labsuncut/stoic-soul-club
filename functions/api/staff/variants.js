// POST /api/staff/variants {variant_id, stock}                       set stock
// POST /api/staff/variants {product_id, size, color, stock}          add a size or colour
// POST /api/staff/variants {variant_id, remove: true}                remove one never ordered
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';

function stockOf(v) {
  const n = Number.parseInt(v, 10);
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw new HttpError(400, 'Stock must be a whole number, 0 or more.');
  return n;
}

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readBody(request);
  const db = await getDb(env);
  const vid = Number.parseInt(body.variant_id, 10);
  if (Number.isInteger(vid) && body.remove) {
    const used = await db.prepare('SELECT 1 FROM order_items WHERE variant_id = ? LIMIT 1').bind(vid).first();
    if (used) throw new HttpError(409, 'This size has orders, so it can\'t be removed. Set its stock to 0 instead.');
    await db.prepare('DELETE FROM variants WHERE id = ?').bind(vid).run();
    return json({ ok: true });
  }
  if (Number.isInteger(vid)) {
    await db.prepare('UPDATE variants SET stock = ? WHERE id = ?').bind(stockOf(body.stock), vid).run();
    return json({ ok: true });
  }
  const pid = Number.parseInt(body.product_id, 10);
  const product = Number.isInteger(pid) ? await db.prepare('SELECT slug FROM products WHERE id = ?').bind(pid).first() : null;
  if (!product) throw new HttpError(404, 'Product not found.');
  const size = text(body.size, 20, { required: true, label: 'Size' });
  const color = text(body.color, 30);
  const sku = `${product.slug}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  try {
    await db.prepare('INSERT INTO variants (product_id, size, color, sku, stock, sort) VALUES (?, ?, ?, ?, ?, 99)')
      .bind(pid, size, color, sku, stockOf(body.stock)).run();
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new HttpError(409, 'That size and colour already exist.');
    throw err;
  }
  return json({ ok: true }, 201);
});
