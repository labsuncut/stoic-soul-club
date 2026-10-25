// GET/POST /api/staff/lookbooks: one lookbook per photoshoot, with its photos and captions.
// POST {lookbook: {..., photos: [{image, caption, alt, tag}]}} replaces the photo list in order.
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb, LOOKBOOK_STATUS } from '../../_lib/db.js';
import { invalidate } from '../../_lib/content.js';

export const onRequestGet = handle(async ({ env }) => {
  const db = await getDb(env);
  const [{ results: books }, { results: photos }] = await Promise.all([
    db.prepare('SELECT * FROM lookbooks ORDER BY sort, id').all(),
    db.prepare('SELECT * FROM lookbook_photos ORDER BY sort, id').all(),
  ]);
  return json({ lookbooks: books.map((l) => ({ ...l, photos: photos.filter((ph) => ph.lookbook_id === l.id) })) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  const { lookbook: l = {} } = await readBody(request);
  const db = await getDb(env);
  const slug = text(l.slug, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new HttpError(400, 'Give the lookbook a web name (like chapter-one).');
  if (l.remove) {
    const id = Number.parseInt(l.id, 10);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Which lookbook?');
    await db.batch([db.prepare('DELETE FROM lookbook_photos WHERE lookbook_id = ?').bind(id), db.prepare('DELETE FROM lookbooks WHERE id = ?').bind(id)]);
    invalidate();
    return json({ ok: true });
  }
  const fields = [
    slug, text(l.title, 80, { required: true, label: 'Title' }), text(l.collection, 40).toLowerCase(), text(l.credit, 120),
    String(l.intro || '').trim().slice(0, 600), LOOKBOOK_STATUS.includes(l.status) ? l.status : 'draft', l.featured ? 1 : 0, Number.parseInt(l.sort, 10) || 100,
  ];
  const photos = (Array.isArray(l.photos) ? l.photos : []).slice(0, 60).map((ph) => ({
    image: /^(https:\/\/|\/img\/|\/assets\/)[^\s"'<>]+$/.test(String(ph.image || '').trim()) ? String(ph.image).trim() : '',
    caption: text(ph.caption, 160), alt: text(ph.alt, 200), tag: ph.tag === 'community' ? 'community' : 'campaign',
  })).filter((ph) => ph.image || ph.caption);
  let id = Number.parseInt(l.id, 10);
  try {
    if (Number.isInteger(id)) {
      const r = await db.prepare('UPDATE lookbooks SET slug=?, title=?, collection=?, credit=?, intro=?, status=?, featured=?, sort=? WHERE id=?').bind(...fields, id).run();
      if (!r.meta.changes) throw new HttpError(404, 'Lookbook not found.');
    } else {
      const r = await db.prepare('INSERT INTO lookbooks (slug, title, collection, credit, intro, status, featured, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(...fields).run();
      id = r.meta.last_row_id;
    }
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new HttpError(409, 'Another lookbook already uses that web name.');
    throw err;
  }
  if (l.featured) await db.prepare('UPDATE lookbooks SET featured = 0 WHERE id != ?').bind(id).run();
  const ins = db.prepare('INSERT INTO lookbook_photos (lookbook_id, image, caption, alt, tag, sort) VALUES (?, ?, ?, ?, ?, ?)');
  await db.batch([
    db.prepare('DELETE FROM lookbook_photos WHERE lookbook_id = ?').bind(id),
    ...photos.map((ph, i) => ins.bind(id, ph.image, ph.caption, ph.alt || ph.caption, ph.tag, (i + 1) * 10)),
  ]);
  invalidate();
  return json({ ok: true, id });
});
