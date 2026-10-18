// GET  /api/staff/order?id=1                       full order with items and history
// POST /api/staff/order {id, status, note}         move it to the next step
// POST /api/staff/order {id, staff_note}           save a private note
// POST /api/staff/order {id, paid: true, ref}       cash or CliQ money arrived
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';
import { loadOrder, setStatus, markPaidByHand } from '../../_lib/store.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const id = Number.parseInt(new URL(request.url).searchParams.get('id'), 10);
  const order = Number.isInteger(id) ? await loadOrder(await getDb(env), 'id', id) : null;
  if (!order) throw new HttpError(404, 'Order not found.');
  const { token, ...rest } = order;
  return json({ order: { ...rest, link: `/order/?t=${token}` } });
});

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readBody(request);
  const id = Number.parseInt(body.id, 10);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Which order?');
  const db = await getDb(env);
  if (typeof body.staff_note === 'string') {
    await db.prepare('UPDATE orders SET staff_note = ? WHERE id = ?').bind(text(body.staff_note, 500), id).run();
  }
  if (body.paid === true) await markPaidByHand(db, id, text(body.ref, 60));
  if (body.status) await setStatus(db, id, String(body.status), text(body.note, 200));
  return json({ ok: true });
});
