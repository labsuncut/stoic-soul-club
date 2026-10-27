// Every /api/staff/* route needs a logged-in staff member, except login itself. Stoic HQ (on
// claude.ai) calls these routes with a token instead of the cookie, so cross-origin preflights
// are answered and token-based answers carry the CORS headers.
import { handle, sameOrigin, corsHeaders, withCors, HttpError } from '../../_lib/http.js';
import { isStaff } from '../../_lib/auth.js';

export const onRequest = handle(async ({ request, env, next }) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  sameOrigin(request);
  const path = new URL(request.url).pathname;
  if (path !== '/api/staff/login' && !(await isStaff(request, env))) {
    return withCors(new Response(JSON.stringify({ error: 'Please log in.' }), { status: 401, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }), request);
  }
  return withCors(await next(), request);
});
