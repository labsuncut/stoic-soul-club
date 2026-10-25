// Everything a page needs, in one object: settings, products, collections and lookbooks.
// With no database connected (a local preview, a Pages preview without bindings) the
// starter content is used instead, so the site always renders.
import { getDb, getSettings } from './db.js';
import { SEED_PRODUCTS, SEED_COLLECTIONS, SEED_LOOKBOOKS, DEFAULT_SETTINGS, seedVariants } from './seed.js';

const CACHE_MS = 20_000;
let cache = { at: 0, site: null };

function parseList(raw) {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

// A photo entry is "url" or "url | caption".
export function splitImage(s) {
  const str = String(s || '');
  const i = str.indexOf(' | ');
  return i < 0 ? { url: str.trim(), caption: '' } : { url: str.slice(0, i).trim(), caption: str.slice(i + 3).trim() };
}

export function shapeProduct(p, variants, { staff = false } = {}) {
  const photos = parseList(p.images).map(splitImage);
  const vs = variants.filter((v) => v.product_id === p.id).map((v) => ({
    id: v.id, size: v.size, color: v.color, sku: v.sku, in_stock: v.stock > 0, ...(staff ? { stock: v.stock } : {}),
  }));
  const anyStock = vs.some((v) => v.in_stock);
  // A product with no size in stock reads as sold out even if staff forgot to flip the status.
  const status = p.status === 'available' && !anyStock ? 'sold_out' : p.status;
  return {
    id: p.id, slug: p.slug, sku: p.sku || '', name: p.name_en, description: p.desc_en || '',
    fit: p.fit_en || '', materials: p.materials || '', care: p.care || '', story: p.story || '',
    category: p.category, collection: p.collection || '',
    price: p.price, currency: 'JOD', compare_at: p.compare_at || 0,
    images: photos.map((ph) => ph.url), captions: photos.map((ph) => ph.caption), tone: p.tone, featured: !!p.featured,
    status, sort: p.sort,
    colors: [...new Set(vs.map((v) => v.color).filter(Boolean))],
    sizes: [...new Set(vs.map((v) => v.size).filter(Boolean))],
    variants: vs,
    orderable: status === 'available' && anyStock,
  };
}

function shapeCollection(c) {
  return { ...c, images: parseList(c.images).map((s) => splitImage(s).url) };
}

function shapeLookbook(l, photos) {
  return {
    ...l, featured: !!l.featured,
    photos: photos.filter((ph) => ph.lookbook_id === l.id).map((ph) => ({ ...ph, image: ph.image || '' })),
  };
}

function seedSite() {
  let vid = 1;
  const products = SEED_PRODUCTS.map((p, i) => {
    const row = {
      id: i + 1, slug: p.slug, sku: p.sku, name_en: p.name, desc_en: p.description, fit_en: p.fit, materials: p.materials,
      care: p.care, story: p.story, category: p.category, collection: p.collection, price: p.price, compare_at: 0,
      images: JSON.stringify(p.images || []), tone: p.tone, featured: p.featured ? 1 : 0, status: p.status, sort: p.sort,
    };
    const variants = seedVariants(p).map((v) => ({ id: vid++, product_id: row.id, ...v }));
    return shapeProduct(row, variants);
  });
  const collections = SEED_COLLECTIONS.map((c, i) => shapeCollection({ id: i + 1, release_date: '', sort: (i + 1) * 10, ...c, images: JSON.stringify(c.images || []) }));
  const lookbooks = SEED_LOOKBOOKS.map((l, i) => ({
    id: i + 1, slug: l.slug, title: l.title, collection: l.collection, credit: l.credit, intro: l.intro, status: l.status,
    featured: !!l.featured, sort: l.sort,
    photos: l.photos.map((ph, j) => ({ id: j + 1, lookbook_id: i + 1, image: ph.image || '', caption: ph.caption, alt: ph.alt || ph.caption, tag: ph.tag || 'campaign', sort: (j + 1) * 10 })),
  }));
  return { settings: { ...DEFAULT_SETTINGS }, products, collections, lookbooks, fallback: true };
}

async function loadFromDb(env) {
  const db = await getDb(env);
  const [settings, { results: products }, { results: variants }, { results: collections }, { results: lookbooks }, { results: photos }] = await Promise.all([
    getSettings(db),
    db.prepare(`SELECT * FROM products WHERE status != 'draft' ORDER BY sort, id`).all(),
    db.prepare('SELECT * FROM variants ORDER BY sort, id').all(),
    db.prepare(`SELECT * FROM collections WHERE status != 'draft' ORDER BY sort, id`).all(),
    db.prepare(`SELECT * FROM lookbooks WHERE status = 'published' ORDER BY sort, id`).all(),
    db.prepare('SELECT * FROM lookbook_photos ORDER BY sort, id').all(),
  ]);
  return {
    settings,
    products: products.map((p) => shapeProduct(p, variants)),
    collections: collections.map(shapeCollection),
    lookbooks: lookbooks.map((l) => shapeLookbook(l, photos)),
    fallback: false,
  };
}

export async function loadSite(env) {
  if (cache.site && Date.now() - cache.at < CACHE_MS) return cache.site;
  let site;
  if (env.DB) {
    try {
      site = await loadFromDb(env);
    } catch (err) {
      console.error('database read failed, showing starter content', err);
      site = seedSite();
    }
  } else {
    site = seedSite();
  }
  cache = { at: Date.now(), site };
  return site;
}

export function invalidate() {
  cache = { at: 0, site: null };
}

// Helpers the page templates share.
export const money = (fils, currency = 'JOD') => `${(fils / 1000).toFixed(fils % 1000 ? 3 : 0)} ${currency}`;
export const bySlug = (list, slug) => list.find((x) => x.slug === slug) || null;
export const chapterLabel = (n) => `CH. ${String(n).padStart(2, '0')}`;

// Photo addresses from the dashboard: uploaded files (/img/...), bundled assets or https links,
// each optionally followed by " | caption". Anything else is dropped.
export function imageList(raw) {
  return (Array.isArray(raw) ? raw : String(raw || '').split('\n'))
    .map(splitImage).filter(({ url }) => /^(https:\/\/|\/img\/|\/assets\/)[^\s"'<>|]+$/.test(url))
    .map(({ url, caption }) => (caption ? `${url} | ${caption.slice(0, 160)}` : url)).slice(0, 12);
}
