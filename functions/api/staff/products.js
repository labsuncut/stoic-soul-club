// GET  /api/staff/products            every product (drafts too), with stock per size and colour
// POST /api/staff/products {product}  add a product (no id) or change one (with id)
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb, PRODUCT_STATUS } from '../../_lib/db.js';
import { shapeProduct, invalidate, imageList } from '../../_lib/content.js';

const CATEGORIES = ['tees', 'hoodies', 'bottoms', 'accessories'];

function money(v, label) {
  const n = Math.round(Number(v) * 1000);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new HttpError(400, `${label} must be a price in JOD, like 22 or 22.500.`);
  return n;
}


export const onRequestGet = handle(async ({ env }) => {
  const db = await getDb(env);
  const [{ results: products }, { results: variants }] = await Promise.all([
    db.prepare('SELECT * FROM products ORDER BY sort, id').all(),
    db.prepare('SELECT * FROM variants ORDER BY sort, id').all(),
  ]);
  return json({ products: products.map((p) => ({ ...shapeProduct(p, variants, { staff: true }), raw_status: p.status })) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  const { product: p = {} } = await readBody(request);
  const db = await getDb(env);
  const slug = text(p.slug, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new HttpError(400, 'Give the product a web name (like kaizen-tee).');
  const long = (v) => String(v || '').trim().slice(0, 1500);
  const fields = [
    slug,
    text(p.name, 80, { required: true, label: 'Name' }),
    long(p.description),
    text(p.fit, 200),
    CATEGORIES.includes(p.category) ? p.category : 'tees',
    text(p.collection, 40).toLowerCase(),
    money(p.price, 'Price'),
    p.compare_at ? money(p.compare_at, 'Old price') : 0,
    JSON.stringify(imageList(p.images)),
    /^#[0-9a-f]{6}$/i.test(p.tone || '') ? p.tone : '#2b2b2b',
    p.featured ? 1 : 0,
    PRODUCT_STATUS.includes(p.status) ? p.status : 'draft',
    Number.parseInt(p.sort, 10) || 100,
    long(p.materials),
    long(p.care),
    long(p.story),
    text(p.sku, 40),
  ];
  const id = Number.parseInt(p.id, 10);
  try {
    if (Number.isInteger(id)) {
      const r = await db.prepare(
        `UPDATE products SET slug=?, name_en=?, desc_en=?, fit_en=?, category=?, collection=?, price=?, compare_at=?, images=?, tone=?, featured=?, status=?, sort=?, materials=?, care=?, story=?, sku=?, active=1, sample=0 WHERE id=?`,
      ).bind(...fields, id).run();
      if (!r.meta.changes) throw new HttpError(404, 'Product not found.');
      invalidate();
      return json({ ok: true, id });
    }
    const r = await db.prepare(
      `INSERT INTO products (slug, name_en, desc_en, fit_en, category, collection, price, compare_at, images, tone, featured, status, sort, materials, care, story, sku)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(...fields).run();
    invalidate();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new HttpError(409, 'Another product already uses that web name.');
    throw err;
  }
});
