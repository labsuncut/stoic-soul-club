// Catalogue and order logic shared by the shop and the staff dashboard.
import { HttpError, randomToken } from './http.js';

export const STATUSES = ['awaiting_payment', 'new', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

// Which status can follow which. Staff can only move an order along these paths.
const NEXT = {
  awaiting_payment: ['cancelled'],
  new: ['packed', 'cancelled'],
  packed: ['shipped', 'new', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

// Card orders that were never paid hold stock for this long, then go back on the shelf.
const PAYMENT_WINDOW_MIN = 30;

export function orderNumber(id) {
  return `S${1000 + id}`;
}

function parseImages(raw) {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

export function shapeProduct(p, variants, { staff = false } = {}) {
  const vs = variants.filter((v) => v.product_id === p.id).map((v) => ({
    id: v.id, size: v.size, color: v.color,
    ...(staff ? { sku: v.sku, stock: v.stock } : { in_stock: v.stock > 0, low: v.stock > 0 && v.stock <= 2 }),
  }));
  return {
    id: p.id, slug: p.slug, name_en: p.name_en, name_ar: p.name_ar || p.name_en,
    desc_en: p.desc_en, desc_ar: p.desc_ar || p.desc_en, category: p.category,
    price: p.price, compare_at: p.compare_at, images: parseImages(p.images), tone: p.tone,
    featured: !!p.featured, sample: !!p.sample,
    sold_out: !vs.some((v) => (staff ? v.stock > 0 : v.in_stock)),
    variants: vs,
    ...(staff ? { active: !!p.active, sort: p.sort } : {}),
  };
}

export async function listProducts(db, { staff = false, slug = null } = {}) {
  const where = [staff ? '1 = 1' : 'active = 1'];
  const args = [];
  if (slug) { where.push('slug = ?'); args.push(slug); }
  const { results: products } = await db
    .prepare(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY sort, id`)
    .bind(...args).all();
  if (!products.length) return [];
  const ids = products.map((p) => p.id);
  const { results: variants } = await db
    .prepare(`SELECT * FROM variants WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort, id`)
    .bind(...ids).all();
  return products.map((p) => shapeProduct(p, variants, { staff }));
}

// Puts stock back for card orders that were never paid. Runs lazily whenever
// someone checks out or staff open the dashboard, so no timer is needed.
export async function expireUnpaid(db) {
  const { results } = await db.prepare(
    `SELECT id FROM orders WHERE status = 'awaiting_payment'
     AND created_at < datetime('now', ?)`,
  ).bind(`-${PAYMENT_WINDOW_MIN} minutes`).all();
  for (const { id } of results) {
    await setStatus(db, id, 'cancelled', 'Payment not completed in time. Stock returned.', { system: true });
  }
}

export function deliveryFee(settings, zoneId, subtotal) {
  const zone = settings.zones.find((z) => z.id === zoneId);
  if (!zone) throw new HttpError(400, 'Please choose a delivery area.');
  const freeOver = Number(settings.free_delivery_over) || 0;
  return { zone, fee: freeOver && subtotal >= freeOver ? 0 : Math.max(0, Math.round(Number(zone.fee) || 0)) };
}

// Creates the order and takes the items out of stock in one all-or-nothing step.
export async function createOrder(db, settings, { items, customer, paymentMethod }) {
  const ids = [...new Set(items.map((i) => i.variant_id))];
  const { results: rows } = await db.prepare(
    `SELECT v.id, v.size, v.color, v.stock, p.name_en, p.name_ar, p.price, p.active
     FROM variants v JOIN products p ON p.id = v.product_id
     WHERE v.id IN (${ids.map(() => '?').join(',')})`,
  ).bind(...ids).all();
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines = [];
  for (const item of items) {
    const v = byId.get(item.variant_id);
    if (!v || !v.active) throw new HttpError(409, 'An item in your bag is no longer available. Please refresh your bag.');
    if (v.stock < item.qty) {
      throw new HttpError(409, v.stock === 0
        ? `${v.name_en} (${v.size}) just sold out. Please remove it from your bag.`
        : `Only ${v.stock} left of ${v.name_en} (${v.size}). Please lower the quantity.`);
    }
    lines.push({ ...v, qty: item.qty });
  }
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const { zone, fee } = deliveryFee(settings, customer.zone, subtotal);
  const token = randomToken();
  const status = paymentMethod === 'card' ? 'awaiting_payment' : 'new';
  const test = settings.payments_mode === 'live' ? 0 : 1;

  const orderId = '(SELECT id FROM orders WHERE token = ?)';
  const statements = [
    db.prepare(
      `INSERT INTO orders (token, status, payment_method, test, name, phone, email, zone, address, note, subtotal, delivery_fee, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(token, status, paymentMethod, test, customer.name, customer.phone, customer.email,
      zone.en, customer.address, customer.note, subtotal, fee, subtotal + fee),
    db.prepare(`INSERT INTO order_events (order_id, status, note) VALUES (${orderId}, ?, ?)`)
      .bind(token, status, paymentMethod === 'card' ? 'Order placed, waiting for card payment.' : 'Order placed, cash on delivery.'),
  ];
  for (const l of lines) {
    statements.push(db.prepare(
      `INSERT INTO order_items (order_id, variant_id, name_en, name_ar, size, color, qty, unit_price)
       VALUES (${orderId}, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(token, l.id, l.name_en, l.name_ar || l.name_en, l.size, l.color, l.qty, l.price));
    statements.push(db.prepare('UPDATE variants SET stock = stock - ? WHERE id = ?').bind(l.qty, l.id));
  }
  try {
    await db.batch(statements);
  } catch (err) {
    if (String(err.message).includes('CHECK')) {
      throw new HttpError(409, 'Someone just bought the last one of an item in your bag. Please refresh your bag.');
    }
    throw err;
  }
  return { token, status };
}

// Moves an order to a new status, returns stock when an order is cancelled or returned,
// and marks cash orders as paid when they are delivered.
export async function setStatus(db, id, status, note = '', { system = false } = {}) {
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) throw new HttpError(404, 'Order not found.');
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
  const allowed = system && order.status === 'awaiting_payment' ? ['new', 'cancelled'] : NEXT[order.status];
  if (!allowed.includes(status)) {
    throw new HttpError(409, `An order that is "${order.status}" can't become "${status}".`);
  }

  const statements = [
    // The WHERE on the old status stops two people changing the same order at once.
    db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND status = ?`)
      .bind(status, id, order.status),
    db.prepare('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)').bind(id, status, note),
  ];
  if ((status === 'cancelled' || status === 'returned') && !order.restocked) {
    const { results: items } = await db.prepare('SELECT variant_id, qty FROM order_items WHERE order_id = ?').bind(id).all();
    for (const it of items) {
      statements.push(db.prepare('UPDATE variants SET stock = stock + ? WHERE id = ?').bind(it.qty, it.variant_id));
    }
    statements.push(db.prepare('UPDATE orders SET restocked = 1 WHERE id = ?').bind(id));
  }
  if (status === 'delivered' && order.payment_method === 'cod') {
    statements.push(db.prepare(`UPDATE orders SET payment_status = 'paid' WHERE id = ?`).bind(id));
  }
  if (status === 'returned' && order.payment_status === 'paid') {
    statements.push(db.prepare(`UPDATE orders SET payment_status = 'refunded' WHERE id = ?`).bind(id));
  }
  const results = await db.batch(statements);
  if (!results[0].meta.changes) throw new HttpError(409, 'This order was just changed by someone else. Refresh and try again.');
}

export async function markPaid(db, order, ref) {
  await setStatus(db, order.id, 'new', `Card payment received (${ref}).`, { system: true });
  await db.prepare(`UPDATE orders SET payment_status = 'paid', payment_ref = ? WHERE id = ?`).bind(ref, order.id).run();
}

export async function loadOrder(db, where, value) {
  const order = await db.prepare(`SELECT * FROM orders WHERE ${where} = ?`).bind(value).first();
  if (!order) return null;
  const [{ results: items }, { results: events }] = await Promise.all([
    db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(order.id).all(),
    db.prepare('SELECT status, note, at FROM order_events WHERE order_id = ? ORDER BY id').bind(order.id).all(),
  ]);
  return { ...order, number: orderNumber(order.id), items, events };
}

// What the customer may see about their own order (no staff notes, no internal ids).
export function publicOrder(o) {
  return {
    number: o.number, status: o.status, payment_method: o.payment_method, payment_status: o.payment_status,
    test: !!o.test, name: o.name, zone: o.zone, address: o.address,
    subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total, created_at: o.created_at,
    items: o.items.map((i) => ({ name_en: i.name_en, name_ar: i.name_ar, size: i.size, color: i.color, qty: i.qty, unit_price: i.unit_price })),
    events: o.events.map((e) => ({ status: e.status, at: e.at })),
  };
}
