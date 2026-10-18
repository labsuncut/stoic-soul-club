// GET  /api/staff/products            every product, with stock per size and colour
// POST /api/staff/products {product}  add a product (no id) or change one (with id)
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';
import { listProducts } from '../../_lib/store.js';

const CATEGORIES = ['tees', 'hoodies', 'bottoms', 'accessories'];

function money(v, label) {
  const n = Math.round(Number(v) * 1000);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new HttpError(400, `${label} must be a price in JOD, like 18 or 18.500.`);
  return n;
}

export const onRequestGet = handle(async ({ env }) => json({ products: await listProducts(await getDb(env), { staff: true }) }));

export const onRequestPost = handle(async ({ request, env }) => {
  const { product: p = {} } = await readBody(request);
  const db = await getDb(env);
  const slug = text(p.slug, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new HttpError(400, 'Give the product a web name (like essential-tee).');
  const images = (Array.isArray(p.images) ? p.images : String(p.images || '').split('\n'))
    .map((u) => String(u).trim()).filter((u) => /^(https:\/\/|\/assets\/)[^\s"'<>]+$/.test(u)).slice(0, 8);
  const tone = /^#[0-9a-f]{6}$/i.test(p.tone || '') ? p.tone : '#2b2b2b';
  const fields = [
    slug,
    text(p.name_en, 80, { required: true, label: 'English name' }),
    text(p.name_ar, 80),
    String(p.desc_en || '').trim().slice(0, 1500),
    String(p.desc_ar || '').trim().slice(0, 1500),
    CATEGORIES.includes(p.category) ? p.category : 'tees',
    money(p.price, 'Price'),
    p.compare_at ? money(p.compare_at, 'Old price') : 0,
    JSON.stringify(images),
    tone,
    p.featured ? 1 : 0,
    p.active === false ? 0 : 1,
    Number.parseInt(p.sort, 10) || 100,
  ];
  const id = Number.parseInt(p.id, 10);
  try {
    if (Number.isInteger(id)) {
      const r = await db.prepare(
        `UPDATE products SET slug=?, name_en=?, name_ar=?, desc_en=?, desc_ar=?, category=?, price=?, compare_at=?,
           images=?, tone=?, featured=?, active=?, sort=?, sample=0 WHERE id=?`,
      ).bind(...fields, id).run();
      if (!r.meta.changes) throw new HttpError(404, 'Product not found.');
      return json({ ok: true, id });
    }
    const r = await db.prepare(
      `INSERT INTO products (slug, name_en, name_ar, desc_en, desc_ar, category, price, compare_at, images, tone, featured, active, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(...fields).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new HttpError(409, 'Another product already uses that web name.');
    throw err;
  }
});
