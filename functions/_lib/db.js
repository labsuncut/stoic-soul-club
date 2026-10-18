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
    category TEXT NOT NULL DEFAULT 'tops',
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
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card','cod')),
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

// Sample catalogue so the store works on day one. Every item is marked as a sample;
// staff replace them with the real Stoic products from the dashboard.
// [slug, name_en, name_ar, category, price_fils, tone, featured, sizes, colours, desc_en, desc_ar]
const SAMPLE_PRODUCTS = [
  ['essential-tee', 'Essential Tee', 'تيشيرت أساسي', 'tops', 18000, '#3a3a36', 1,
    ['S', 'M', 'L', 'XL'], ['Black', 'Bone'],
    'Heavy cotton, boxy fit, made to be worn every day.',
    'قطن ثقيل وقصة واسعة، مصنوع للبس اليومي.'],
  ['heavyweight-hoodie', 'Heavyweight Hoodie', 'هودي ثقيل', 'tops', 42000, '#4a463f', 1,
    ['S', 'M', 'L', 'XL'], ['Black', 'Stone'],
    'Brushed fleece inside, clean front, no logos shouting.',
    'صوف ناعم من الداخل وواجهة بسيطة بلا شعارات صاخبة.'],
  ['crewneck-sweatshirt', 'Crewneck Sweatshirt', 'سويتشيرت برقبة دائرية', 'tops', 35000, '#5b5a52', 0,
    ['S', 'M', 'L', 'XL'], ['Charcoal'],
    'A quiet layer for cold Amman evenings.',
    'طبقة هادئة لأمسيات عمّان الباردة.'],
  ['relaxed-trousers', 'Relaxed Trousers', 'بنطال واسع', 'bottoms', 38000, '#2f3330', 1,
    ['S', 'M', 'L', 'XL'], ['Black', 'Olive'],
    'Wide leg, elastic back, pockets deep enough for a phone.',
    'قصة واسعة وخصر مطاطي من الخلف وجيوب تتسع للهاتف.'],
  ['canvas-overshirt', 'Canvas Overshirt', 'قميص كانفاس خارجي', 'outerwear', 48000, '#6b6250', 0,
    ['M', 'L', 'XL'], ['Sand'],
    'Sturdy canvas that softens the more you wear it.',
    'كانفاس متين يصبح أنعم كلما لبسته.'],
  ['logo-cap', 'Six-Panel Cap', 'كاب', 'accessories', 15000, '#2a2a2a', 0,
    ['One size'], ['Black'],
    'Washed cotton cap with an adjustable strap.',
    'كاب قطني مغسول بحزام قابل للتعديل.'],
];

// Delivery zones and fees (fils). Staff change these from the dashboard.
const DEFAULT_ZONES = [
  { id: 'amman', en: 'Amman', ar: 'عمّان', fee: 2000 },
  { id: 'zarqa', en: 'Zarqa and Russeifa', ar: 'الزرقاء والرصيفة', fee: 3000 },
  { id: 'irbid', en: 'Irbid', ar: 'إربد', fee: 3500 },
  { id: 'other', en: 'Other cities', ar: 'مدن أخرى', fee: 4000 },
];

const DEFAULT_SETTINGS = {
  store_open: '1',
  payments_mode: 'test', // 'test' = fake cards only. Real card payments need a payment provider account.
  card_enabled: '1',
  cod_enabled: '1',
  free_delivery_over: '60000',
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
    if (n === 0) await seedSamples(env.DB);
    const seed = env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    await env.DB.batch(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => seed.bind(k, v)));
    ready = true;
  }
  return env.DB;
}

async function seedSamples(db) {
  const rows = [];
  SAMPLE_PRODUCTS.forEach(([slug, en, ar, cat, price, tone, featured, sizes, colours, den, dar], i) => {
    rows.push(db.prepare(
      `INSERT INTO products (slug, name_en, name_ar, desc_en, desc_ar, category, price, tone, featured, sample, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).bind(slug, en, ar, den, dar, cat, price, tone, featured, (i + 1) * 10));
    let s = 0;
    for (const colour of colours) {
      for (const size of sizes) {
        const sku = `${slug}-${colour}-${size}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
        rows.push(db.prepare(
          `INSERT INTO variants (product_id, size, color, sku, stock, sort)
           VALUES ((SELECT id FROM products WHERE slug = ?), ?, ?, ?, ?, ?)`,
        ).bind(slug, size, colour, sku, size === 'XL' ? 2 : 6, s++));
      }
    }
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
