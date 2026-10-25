// GET/POST /api/staff/settings: the WhatsApp number, Instagram, homepage words, policies, switches.
import { handle, json, readBody, text, HttpError } from '../../_lib/http.js';
import { getDb, getSettings, putSettings } from '../../_lib/db.js';
import { invalidate } from '../../_lib/content.js';

const SHORT = ['instagram', 'hero_headline', 'hero_cta', 'hero_caption', 'contact_email'];
const LONG = ['manifesto', 'announcement', 'ordering_text', 'shipping_text', 'payment_text', 'swap_text', 'story_text'];
const IMAGES = ['hero_image', 'hero_video', 'manifesto_image', 'story_image', 'logo_image'];
const SWITCHES = ['site_public', 'restock_inquiries', 'analytics'];

export const onRequestGet = handle(async ({ env }) => json({ settings: await getSettings(await getDb(env)), images: !!env.IMAGES }));

export const onRequestPost = handle(async ({ request, env }) => {
  const s = await readBody(request);
  const db = await getDb(env);
  const updates = {};
  for (const k of SWITCHES) if (k in s) updates[k] = s[k] ? '1' : '0';
  for (const k of SHORT) if (k in s) updates[k] = text(s[k], 160);
  for (const k of LONG) if (k in s) updates[k] = String(s[k] || '').trim().slice(0, 2000);
  for (const k of IMAGES) if (k in s) {
    const v = String(s[k] || '').trim();
    if (v && !/^(https:\/\/|\/img\/|\/assets\/)[^\s"'<>]+$/.test(v)) throw new HttpError(400, `${k.replace('_', ' ')} must be an uploaded file or an https link.`);
    updates[k] = v;
  }
  if ('whatsapp' in s) {
    const digits = String(s.whatsapp || '').replace(/\D/g, '');
    if (digits && (digits.length < 10 || digits.length > 15 || digits.startsWith('0'))) throw new HttpError(400, 'The WhatsApp number must be in international format without + or spaces, like 9627XXXXXXXX.');
    updates.whatsapp = digits;
  }
  if ('instagram' in updates) updates.instagram = updates.instagram.replace(/^@/, '').replace(/[^a-z0-9._]/gi, '');
  if ('contact_email' in updates && updates.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.contact_email)) throw new HttpError(400, 'Please enter a valid email.');
  await putSettings(db, updates);
  invalidate();
  return json({ ok: true, settings: await getSettings(db) });
});
