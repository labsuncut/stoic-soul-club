// POST /api/staff/variants {variant_id, stock}                set stock for one size and colour
// POST /api/staff/variants {product_id, size, color, stock}   add a size or colour
// POST /api/staff/variants {variant_id, remove: true}         remove one
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';
import { invalidate } from '../../_lib/content.js';

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
    await db.prepare('DELETE FROM variants WHERE id = ?').bind(vid).run();
    invalidate();
    return json({ ok: true });
  }
  if (Number.isInteger(vid)) {
    await db.prepare('UPDATE variants SET stock = ? WHERE id = ?').bind(stockOf(body.stock), vid).run();
    invalidate();
    return json({ ok: true });
  }
  const pid = Number.parseInt(body.product_id, 10);
  const product = Number.isInteger(pid) ? await db.prepare('SELECT slug, sku FROM products WHERE id = ?').bind(pid).first() : null;
  if (!product) throw new HttpError(404, 'Product not found.');
  const size = text(body.size, 20, { required: true, label: 'Size' }).toUpperCase();
  const color = text(body.color, 30);
  const sku = `${product.sku || product.slug}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-+/g, '-');
  try {
    await db.prepare('INSERT INTO variants (product_id, size, color, sku, stock, sort) VALUES (?, ?, ?, ?, ?, 99)')
      .bind(pid, size, color, sku, stockOf(body.stock)).run();
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new HttpError(409, 'That size and colour already exist.');
    throw err;
  }
  invalidate();
  return json({ ok: true }, 201);
});
