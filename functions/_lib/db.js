// The database. Tables are created automatically the first time the site runs,
// so a fresh Cloudflare D1 database needs no setup beyond connecting it.
// Money is stored in fils (1 JOD = 1000 fils) so sums never get rounding errors.
import { HttpError, sha256, clientIp } from './http.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    desc_en TEXT NOT NULL DEFAULT '',
    desc_ar TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'tees',
    price INTEGER NOT NULL CHECK (price >= 0),
    compare_at INTEGER NOT NULL DEFAULT 0,
    images TEXT NOT NULL DEFAULT '[]',
    tone TEXT NOT NULL DEFAULT '#2b2b2b',
    featured INTEGER NOT NULL DEFAULT 0,
    sample INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // One row per size and colour. The CHECK stops stock going below zero, which makes
  // a whole checkout fail (and roll back) if one item sold out a second earlier.
  `CREATE TABLE IF NOT EXISTS variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    size TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sort INTEGER NOT NULL DEFAULT 0,
    UNIQUE (product_id, size, color)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('awaiting_payment','new','packed','shipped','delivered','cancelled','returned')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card','cod','cliq')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
    payment_ref TEXT NOT NULL DEFAULT '',
    test INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    zone TEXT NOT NULL,
    address TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    subtotal INTEGER NOT NULL,
    delivery_fee INTEGER NOT NULL,
    total INTEGER NOT NULL,
    restocked INTEGER NOT NULL DEFAULT 0,
    staff_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS orders_by_status ON orders (status, created_at)`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    variant_id INTEGER NOT NULL REFERENCES variants(id),
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS items_by_order ON order_items (order_id)`,
  // Every status change is written here, so staff and the customer see the order's story.
  `CREATE TABLE IF NOT EXISTS order_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS events_by_order ON order_events (order_id)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hits (
    bucket TEXT NOT NULL,
    who TEXT NOT NULL,
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS hits_lookup ON hits (bucket, who, at)`,
];

// Stoic Soul Club's Chapter One stock (founder count, 2026-10-10) and prices (D-008).
// This only fills an empty database; after that, staff manage products from the dashboard.
// [slug, name_en, name_ar, category, price_fils, tone, featured, colour, {size: stock}, desc_en, desc_ar]
const STARTER_PRODUCTS = [
  ['vengeance-washed-hoodie', 'VENGEANCE Washed Hoodie', 'هودي VENGEANCE مغسول', 'hoodies', 35000, '#55524c', 1,
    'Acid-washed charcoal', { S: 1, M: 3, L: 1, XL: 1, XXL: 0 },
    '450G acid-washed cotton, cut oversized. Big back print, small bust on the chest.\nSize M: 62 cm across the chest, 72 cm long.\nVENGEANCE is adversity turned into fuel.',
    'قطن مغسول 450 غرام بقصة واسعة. طبعة كبيرة على الظهر وشعار صغير على الصدر.\nمقاس M: عرض الصدر 62 سم، الطول 72 سم.'],
  ['vengeance-washed-tee', 'VENGEANCE Washed Tee', 'تيشيرت VENGEANCE مغسول', 'tees', 24000, '#5e5b55', 1,
    'Acid-washed charcoal', { S: 0, M: 1, L: 2, XL: 2, XXL: 2 },
    '250G acid-washed cotton, cut oversized. Big back print, small bust on the chest.\nSize M: 58 cm across the chest, 72 cm long.\nVENGEANCE is adversity turned into fuel.',
    'قطن مغسول 250 غرام بقصة واسعة. طبعة كبيرة على الظهر وشعار صغير على الصدر.\nمقاس M: عرض الصدر 58 سم، الطول 72 سم.'],
  ['kaizen-hoodie', 'KAIZEN Hoodie', 'هودي KAIZEN', 'hoodies', 32000, '#26252a', 1,
    'Black', { S: 1, M: 3, L: 3, XL: 3, XXL: 0 },
    '400G cotton in black. Very boxy, dropped shoulder. Big back print, small bust on the chest.\nSize M: 66 cm across the chest, 72 cm long.\nKAIZEN means getting a little better, every day.',
    'قطن 400 غرام باللون الأسود. قصة واسعة جدًا وكتف نازل. طبعة كبيرة على الظهر وشعار صغير على الصدر.\nمقاس M: عرض الصدر 66 سم، الطول 72 سم.'],
  ['kaizen-tee', 'KAIZEN Tee', 'تيشيرت KAIZEN', 'tees', 22000, '#2c2b30', 0,
    'Black', { S: 0, M: 2, L: 3, XL: 1, XXL: 0 },
    '260G cotton in black, puff logo on the chest, big back print. Relaxed regular fit; size up for baggy.\nSize M: 53 cm across the chest, 68 cm long.\nKAIZEN means getting a little better, every day.',
    'قطن 260 غرام باللون الأسود، شعار بارز على الصدر وطبعة كبيرة على الظهر. قصة عادية مريحة، اختر مقاسًا أكبر لإطلالة واسعة.\nمقاس M: عرض الصدر 53 سم، الطول 68 سم.'],
  ['tranquility-hoodie', 'TRANQUILITY Hoodie', 'هودي TRANQUILITY', 'hoodies', 32000, '#e8e3d8', 0,
    'White', { S: 1, M: 3, L: 2, XL: 3, XXL: 0 },
    '400G cotton in white. Very boxy, dropped shoulder. Big back print, small bust on the chest.\nSize M: 66 cm across the chest, 72 cm long.\nTRANQUILITY is calm and perspective.',
    'قطن 400 غرام باللون الأبيض. قصة واسعة جدًا وكتف نازل. طبعة كبيرة على الظهر وشعار صغير على الصدر.\nمقاس M: عرض الصدر 66 سم، الطول 72 سم.'],
  ['tranquility-tee', 'TRANQUILITY Tee', 'تيشيرت TRANQUILITY', 'tees', 22000, '#efebe2', 0,
    'White', { S: 1, M: 3, L: 4, XL: 2, XXL: 0 },
    '260G cotton in white, puff logo on the chest, big back print. Relaxed regular fit; size up for baggy.\nSize M: 53 cm across the chest, 68 cm long.\nTRANQUILITY is calm and perspective.',
    'قطن 260 غرام باللون الأبيض، شعار بارز على الصدر وطبعة كبيرة على الظهر. قصة عادية مريحة، اختر مقاسًا أكبر لإطلالة واسعة.\nمقاس M: عرض الصدر 53 سم، الطول 68 سم.'],
];

// Delivery zones and fees (fils). Staff change these from the dashboard.
// Free in Amman (a founder delivers), +3 JOD by courier elsewhere (D-009).
const DEFAULT_ZONES = [
  { id: 'amman', en: 'Amman', ar: 'عمّان', fee: 0 },
  { id: 'jordan', en: 'Rest of Jordan', ar: 'باقي محافظات الأردن', fee: 3000 },
];

const DEFAULT_SETTINGS = {
  store_open: '1',
  payments_mode: 'test', // 'test' = fake cards only. Real card payments need a payment provider account.
  card_enabled: '1',
  cod_enabled: '1',
  cliq_enabled: '1',
  cliq_alias: '', // CliQ shows at checkout only once an alias is filled in
  free_delivery_over: '0',
  zones: JSON.stringify(DEFAULT_ZONES),
  whatsapp: '',
  notice_en: '',
  notice_ar: '',
};

let ready = false;

export async function getDb(env) {
  if (!env.DB) {
    throw new HttpError(503, 'The database is not connected yet. Add a D1 binding named DB in Cloudflare.');
  }
  if (!ready) {
    await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM products').first();
    if (n === 0) await seedStarter(env.DB);
    const seed = env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    await env.DB.batch(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => seed.bind(k, v)));
    ready = true;
  }
  return env.DB;
}

async function seedStarter(db) {
  const rows = [];
  STARTER_PRODUCTS.forEach(([slug, en, ar, cat, price, tone, featured, colour, stock, den, dar], i) => {
    rows.push(db.prepare(
      `INSERT INTO products (slug, name_en, name_ar, desc_en, desc_ar, category, price, tone, featured, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(slug, en, ar, den, dar, cat, price, tone, featured, (i + 1) * 10));
    Object.entries(stock).forEach(([size, n], s) => {
      const sku = `${slug}-${size}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
      rows.push(db.prepare(
        `INSERT INTO variants (product_id, size, color, sku, stock, sort)
         VALUES ((SELECT id FROM products WHERE slug = ?), ?, ?, ?, ?, ?)`,
      ).bind(slug, size, colour, sku, n, s));
    });
  });
  await db.batch(rows);
}

export async function getSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all();
  const s = Object.fromEntries(results.map((r) => [r.key, r.value]));
  try { s.zones = JSON.parse(s.zones || '[]'); } catch { s.zones = []; }
  return s;
}

// Allows `limit` actions per `minutes` from one visitor. The visitor is stored
// as a hash of their IP address, never the address itself.
export async function rateLimit(db, request, bucket, limit, minutes) {
  const who = (await sha256(`${clientIp(request)}|${bucket}`)).slice(0, 32);
  const since = Date.now() - minutes * 60_000;
  const { n } = await db
    .prepare('SELECT COUNT(*) AS n FROM hits WHERE bucket = ? AND who = ? AND at > ?')
    .bind(bucket, who, since)
    .first();
  if (n >= limit) throw new HttpError(429, 'Too many tries. Please wait a few minutes, or message us.');
  await db.batch([
    db.prepare('INSERT INTO hits (bucket, who, at) VALUES (?, ?, ?)').bind(bucket, who, Date.now()),
    db.prepare('DELETE FROM hits WHERE at < ?').bind(Date.now() - 24 * 3_600_000),
  ]);
}
