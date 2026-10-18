// GET /api/staff/subscribers          everyone on the drop list, newest first
// GET /api/staff/subscribers?csv=1    the same list as a CSV file
import { handle, json, csvCell } from '../../_lib/http.js';
import { getDb } from '../../_lib/db.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const db = await getDb(env);
  const { results } = await db.prepare('SELECT contact, kind, lang, created_at FROM subscribers ORDER BY id DESC').all();
  if (!new URL(request.url).searchParams.has('csv')) return json({ subscribers: results });
  const lines = results.map((r) => [r.contact, r.kind, r.lang, r.created_at].map(csvCell).join(','));
  return new Response(`﻿${['contact,kind,language,date_utc', ...lines].join('\n')}\n`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="stoic-drop-list.csv"',
      'cache-control': 'no-store',
    },
  });
});
