// The database. Tables are created automatically the first time the site runs,
// so a fresh Cloudflare D1 database needs no setup beyond connecting it as DB.
// Money is stored in fils (1 JOD = 1000 fils) so sums never get rounding errors.
import { HttpError, sha256, clientIp } from './http.js';
import { SEED_PRODUCTS, SEED_COLLECTIONS, SEED_LOOKBOOKS, DEFAULT_SETTINGS } from './seed.js';

export const PRODUCT_STATUS = ['draft', 'available', 'sold_out', 'archived'];
export const COLLECTION_STATUS = ['draft', 'current', 'archived'];
export const LOOKBOOK_STATUS = ['draft', 'published'];

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
  // One row per size and colour. stock 0 means that size is sold out.
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
  // A collection is a chapter: KAIZEN, TRANQUILITY, VENGEANCE and whatever comes next.
  `CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    chapter INTEGER NOT NULL DEFAULT 1,
    meaning TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL DEFAULT '#6888A0',
    images TEXT NOT NULL DEFAULT '[]',
    release_date TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','current','archived')),
    sort INTEGER NOT NULL DEFAULT 100
  )`,
  // A lookbook is one photoshoot or campaign; its photos feed the film strip.
  `CREATE TABLE IF NOT EXISTS lookbooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    collection TEXT NOT NULL DEFAULT '',
    credit TEXT NOT NULL DEFAULT '',
    intro TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    featured INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS lookbook_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lookbook_id INTEGER NOT NULL REFERENCES lookbooks(id),
    image TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    alt TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT 'campaign',
    sort INTEGER NOT NULL DEFAULT 100
  )`,
  `CREATE INDEX IF NOT EXISTS photos_by_lookbook ON lookbook_photos (lookbook_id, sort)`,
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
  // First-party, cookie-free counts: what was looked at and which clicks opened WhatsApp.
  // No names, phones, IPs or fingerprints are stored.
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    page TEXT NOT NULL DEFAULT '',
    product TEXT NOT NULL DEFAULT '',
    collection TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    day TEXT NOT NULL,
    at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS events_by_day ON events (day, kind)`,
];

// Columns added after the first launch. ALTER fails harmlessly once a column exists.
const ADDED_COLUMNS = [
  ['products', 'fit_en', "TEXT NOT NULL DEFAULT ''"],
  ['products', 'fit_ar', "TEXT NOT NULL DEFAULT ''"],
  ['products', 'status', "TEXT NOT NULL DEFAULT 'available'"],
  ['products', 'collection', "TEXT NOT NULL DEFAULT ''"],
  ['products', 'materials', "TEXT NOT NULL DEFAULT ''"],
  ['products', 'care', "TEXT NOT NULL DEFAULT ''"],
  ['products', 'story', "TEXT NOT NULL DEFAULT ''"],
  ['products', 'sku', "TEXT NOT NULL DEFAULT ''"],
];

let ready = false;

export async function getDb(env) {
  if (!env.DB) {
    throw new HttpError(503, 'The database is not connected yet. Add a D1 binding named DB in Cloudflare.');
  }
  if (!ready) {
    await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
    const added = [];
    for (const [table, column, type] of ADDED_COLUMNS) {
      try {
        await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
        added.push(column);
      } catch (err) {
        if (!/duplicate column/i.test(String(err.message))) throw err;
      }
    }
    if (added.includes('status')) {
      // Products from the trial store: active ones stay on sale, hidden ones become drafts.
      await env.DB.prepare(`UPDATE products SET status = CASE active WHEN 1 THEN 'available' ELSE 'draft' END`).run();
    }
    if (added.includes('collection')) {
      // The trial products are named "KAIZEN Tee", "VENGEANCE Washed Hoodie": the first word is the chapter.
      await env.DB.prepare(`UPDATE products SET collection = lower(substr(name_en, 1, instr(name_en || ' ', ' ') - 1)) WHERE collection = ''`).run();
      await fillSeedDetails(env.DB);
    }
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM products').first();
    if (n === 0) await seedProducts(env.DB);
    const { c } = await env.DB.prepare('SELECT COUNT(*) AS c FROM collections').first();
    if (c === 0) await seedCollections(env.DB);
    const { l } = await env.DB.prepare('SELECT COUNT(*) AS l FROM lookbooks').first();
    if (l === 0) await seedLookbooks(env.DB);
    const seed = env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    await env.DB.batch(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => seed.bind(k, v)));
    ready = true;
  }
  return env.DB;
}

// Materials, care, fit and story for the trial products that were loaded before these fields existed.
async function fillSeedDetails(db) {
  const put = db.prepare(`UPDATE products SET materials = ?, care = ?, story = ?, fit_en = ? WHERE slug = ? AND materials = ''`);
  await db.batch(SEED_PRODUCTS.map((p) => put.bind(p.materials, p.care, p.story, p.fit, p.slug)));
}

async function seedProducts(db) {
  for (const p of SEED_PRODUCTS) {
    const r = await db.prepare(
      `INSERT INTO products (slug, name_en, desc_en, fit_en, category, collection, price, images, tone, featured, status, sort, materials, care, story, sku)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(p.slug, p.name, p.description, p.fit, p.category, p.collection, p.price, p.tone, p.featured ? 1 : 0, p.status, p.sort, p.materials, p.care, p.story, p.sku).run();
    const id = r.meta.last_row_id;
    const ins = db.prepare('INSERT INTO variants (product_id, size, color, sku, stock, sort) VALUES (?, ?, ?, ?, ?, ?)');
    await db.batch(Object.entries(p.stock).map(([size, stock], i) =>
      ins.bind(id, size, p.color, `${p.sku}-${size}`, stock, i)));
  }
}

async function seedCollections(db) {
  const ins = db.prepare(
    `INSERT INTO collections (slug, title, chapter, meaning, description, accent, images, release_date, status, sort)
     VALUES (?, ?, ?, ?, ?, ?, '[]', '', ?, ?)`,
  );
  await db.batch(SEED_COLLECTIONS.map((c, i) => ins.bind(c.slug, c.title, c.chapter, c.meaning, c.description, c.accent, c.status, (i + 1) * 10)));
}

async function seedLookbooks(db) {
  for (const l of SEED_LOOKBOOKS) {
    const r = await db.prepare(
      `INSERT INTO lookbooks (slug, title, collection, credit, intro, status, featured, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(l.slug, l.title, l.collection, l.credit, l.intro, l.status, l.featured ? 1 : 0, l.sort).run();
    const ins = db.prepare('INSERT INTO lookbook_photos (lookbook_id, image, caption, alt, tag, sort) VALUES (?, ?, ?, ?, ?, ?)');
    await db.batch(l.photos.map((ph, i) => ins.bind(r.meta.last_row_id, ph.image || '', ph.caption, ph.alt || ph.caption, ph.tag || 'campaign', (i + 1) * 10)));
  }
}

export async function getSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of results) s[r.key] = r.value;
  return s;
}

export async function putSettings(db, updates) {
  const put = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const list = Object.entries(updates);
  if (list.length) await db.batch(list.map(([k, v]) => put.bind(k, String(v))));
}

// Allows `limit` tries per `minutes` for one visitor and purpose (used by the staff login).
export async function rateLimit(db, request, bucket, limit, minutes) {
  const who = await sha256(`${bucket}|${clientIp(request)}`);
  const now = Date.now();
  const since = now - minutes * 60_000;
  const { n } = await db.prepare('SELECT COUNT(*) AS n FROM hits WHERE bucket = ? AND who = ? AND at > ?').bind(bucket, who, since).first();
  if (n >= limit) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  await db.batch([
    db.prepare('INSERT INTO hits (bucket, who, at) VALUES (?, ?, ?)').bind(bucket, who, now),
    db.prepare('DELETE FROM hits WHERE at < ?').bind(now - 24 * 3_600_000),
  ]);
}
