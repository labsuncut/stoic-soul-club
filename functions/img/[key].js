// /img/<key>: photos uploaded from the staff dashboard, stored in the R2 bucket bound as IMAGES.
export async function onRequestGet({ params, env, request }) {
  const key = String(params.key || '');
  if (!env.IMAGES || !/^[a-z0-9][a-z0-9.-]{3,80}$/.test(key)) return new Response('Not found', { status: 404 });
  const etag = request.headers.get('if-none-match');
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  if (etag && etag === obj.httpEtag) return new Response(null, { status: 304 });
  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'image/webp',
      'cache-control': 'public, max-age=31536000, immutable',
      etag: obj.httpEtag,
      'x-content-type-options': 'nosniff',
    },
  });
}
