// POST /api/staff/upload (multipart, field "file"): stores a photo in the R2 bucket bound as IMAGES
// and answers with its address (/img/<key>). The browser shrinks photos before sending them.
import { handle, json, HttpError } from '../../_lib/http.js';

const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4' };
const MAX = { image: 8_000_000, video: 12_000_000 };

export const onRequestPost = handle(async ({ request, env }) => {
  if (!env.IMAGES) throw new HttpError(503, 'Photo uploads are not set up yet: create an R2 bucket in Cloudflare and bind it to this project as IMAGES, then retry the deployment. Until then, paste a photo link.');
  const form = await request.formData().catch(() => null);
  const file = form && form.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'Choose a file to upload.');
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(415, 'Upload a JPG, PNG, WebP photo or an MP4 video.');
  const limit = file.type.startsWith('video/') ? MAX.video : MAX.image;
  if (file.size > limit) throw new HttpError(413, `That file is too big (${Math.round(file.size / 1e6)} MB). Keep photos under 8 MB and videos under 12 MB.`);
  const key = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ ok: true, url: `/img/${key}` }, 201);
});
