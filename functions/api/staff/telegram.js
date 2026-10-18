// POST /api/staff/telegram: connects order alerts to the Telegram chat that most recently
// messaged the bot (so: message the bot first, then press Connect), and sends a test alert.
import { handle, json, HttpError } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';
import { telegram } from '../../_lib/notify.js';

export const onRequestPost = handle(async ({ env }) => {
  if (!env.TELEGRAM_BOT_TOKEN) throw new HttpError(400, 'Add the TELEGRAM_BOT_TOKEN secret in Cloudflare first, then redeploy.');
  let updates;
  try { updates = await telegram(env, 'getUpdates', { limit: 50 }); }
  catch (err) { throw new HttpError(400, `Telegram said: ${err.message}. Check the bot token.`); }
  const chats = updates.map((u) => (u.message || u.my_chat_member || u.channel_post || {}).chat).filter(Boolean);
  const chat = chats[chats.length - 1];
  if (!chat) throw new HttpError(400, 'No message found. Open your bot in Telegram, send it "hi", then press Connect again.');
  await telegram(env, 'sendMessage', { chat_id: chat.id, text: 'Stoic Soul Club order alerts are on. New orders will show up here.' });
  const db = await getDb(env);
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind('telegram_chat', String(chat.id)).run();
  return json({ ok: true, chat: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || String(chat.id) });
});
