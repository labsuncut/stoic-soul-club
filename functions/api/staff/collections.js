// GET/POST /api/staff/collections: the chapters (KAIZEN, TRANQUILITY, VENGEANCE, the next one).
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb, COLLECTION_STATUS } from '../../_lib/db.js';
import { invalidate, imageList } from '../../_lib/content.js';

export const onRequestGet = handle(async ({ env }) => {
  const db = await getDb(env);
  const { results } = await db.prepare('SELECT * FROM collections ORDER BY sort, id').all();
  return json({ collections: results.map((c) => ({ ...c, images: JSON.parse(c.images || '[]') })) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  const { collection: c = {} } = await readBody(request);
  const db = await getDb(env);
  const slug = text(c.slug, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new HttpError(400, 'Give the chapter a web name (like kaizen).');
  const chapter = Number.parseInt(c.chapter, 10);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 999) throw new HttpError(400, 'Chapter must be a number from 1.');
  const fields = [
    slug, text(c.title, 60, { required: true, label: 'Title' }), chapter, text(c.meaning, 200),
    String(c.description || '').trim().slice(0, 1500), /^#[0-9a-f]{6}$/i.test(c.accent || '') ? c.accent : '#6888A0',
    JSON.stringify(imageList(c.images)), text(c.release_date, 40),
    COLLECTION_STATUS.includes(c.status) ? c.status : 'draft', Number.parseInt(c.sort, 10) || 100,
  ];
  const id = Number.parseInt(c.id, 10);
  try {
    if (Number.isInteger(id)) {
      const r = await db.prepare('UPDATE collections SET slug=?, title=?, chapter=?, meaning=?, description=?, accent=?, images=?, release_date=?, status=?, sort=? WHERE id=?').bind(...fields, id).run();
      if (!r.meta.changes) throw new HttpError(404, 'Chapter not found.');
      invalidate();
      return json({ ok: true, id });
    }
    const r = await db.prepare('INSERT INTO collections (slug, title, chapter, meaning, description, accent, images, release_date, status, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(...fields).run();
    invalidate();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new HttpError(409, 'Another chapter already uses that web name.');
    throw err;
  }
});
