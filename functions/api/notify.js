// POST /api/notify {contact, lang}: "tell me when the drop opens". Takes a WhatsApp number or an email.
// Signing up twice is fine; the second time changes nothing.
import { handle, json, readBody, sameOrigin, phone, email, honeypot, HttpError } from '../_lib/http.js';
import { getDb, getSettings, rateLimit } from '../_lib/db.js';

// Local Jordan numbers (079…) become 96279…, so the list works straight away for WhatsApp.
function normalPhone(value) {
  let d = phone(value).replace('+', '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = `962${d.slice(1)}`;
  return d;
}

export const onRequestPost = handle(async ({ request, env }) => {
  sameOrigin(request);
  const body = await readBody(request);
  honeypot(body);
  const raw = typeof body.contact === 'string' ? body.contact.trim() : '';
  if (!raw) throw new HttpError(400, 'Add your WhatsApp number or email.');
  const kind = raw.includes('@') ? 'email' : 'phone';
  const contact = kind === 'email' ? email(raw).toLowerCase() : normalPhone(raw);
  const db = await getDb(env);
  const settings = await getSettings(db);
  if (settings.drop_signup !== '1') throw new HttpError(403, 'Sign-ups are closed right now.');
  await rateLimit(db, request, 'notify', 5, 60);
  await db.prepare('INSERT OR IGNORE INTO subscribers (contact, kind, lang) VALUES (?, ?, ?)')
    .bind(contact, kind, body.lang === 'ar' ? 'ar' : 'en').run();
  return json({ ok: true });
});
