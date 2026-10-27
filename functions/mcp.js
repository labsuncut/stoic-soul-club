// POST /mcp: the "Stoic Website" connector. A Model Context Protocol server (Streamable HTTP,
// JSON only) that Stoic HQ on claude.ai, or a Claude chat, uses to read and change this site.
// It wraps the staff API routes, so every rule (validation, rate limits) lives there, once.
//
// Login is a tool: connect {password} answers with a 12-hour token, and every other tool that
// changes or reads staff data takes that token. The password is never stored. Inquiries are
// WhatsApp clicks, never sales.
import { handle, json, HttpError } from './_lib/http.js';
import { isStaff } from './_lib/auth.js';
import * as login from './api/staff/login.js';
import * as overview from './api/staff/overview.js';
import * as settings from './api/staff/settings.js';
import * as products from './api/staff/products.js';
import * as variants from './api/staff/variants.js';
import * as collections from './api/staff/collections.js';
import * as lookbooks from './api/staff/lookbooks.js';
import * as upload from './api/staff/upload.js';
import * as health from './api/health.js';

const PROTOCOL = '2025-06-18';
const SERVER = { name: 'Stoic Website', version: '1.0.0' };

const TOKEN = { type: 'string', description: 'The staff token from the connect tool.' };
const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });

// name -> {description, inputSchema, run(args, ctx)}
const TOOLS = {
  connect: {
    description: 'Log in with the staff password. Answers with a token valid for 12 hours; pass it as "token" to the other tools.',
    inputSchema: obj({ password: { type: 'string', description: 'The staff password.' } }, ['password']),
    run: (a, ctx) => call(ctx, login.onRequestPost, { body: { password: a.password, token: true } }),
  },
  get_health: {
    description: 'Is the site wired up: database, ordering (WhatsApp number), photo uploads, product count. No login needed.',
    inputSchema: obj({}),
    run: (a, ctx) => call(ctx, health.onRequestGet, { noAuth: true }),
  },
  get_overview: {
    description: 'What people looked at and how many opened WhatsApp (inquiries, not sales): today, 7 days, 30 days, most asked pieces, traffic sources, daily series, low stock, pieces in stock, alerts.',
    inputSchema: obj({ token: TOKEN }, ['token']),
    run: (a, ctx) => call(ctx, overview.onRequestGet, { token: a.token }),
  },
  get_settings: {
    description: 'Every site setting: WhatsApp number, Instagram, contact email, homepage words (hero_headline, hero_cta, hero_caption, announcement, manifesto, story_text), policies (ordering_text, shipping_text, payment_text, swap_text), media (hero_image, hero_video, hero_video_webm, hero_video_phone, hero_poster, manifesto_image, story_image, logo_image) and switches (site_public, restock_inquiries, analytics as "1" or "0").',
    inputSchema: obj({ token: TOKEN }, ['token']),
    run: (a, ctx) => call(ctx, settings.onRequestGet, { token: a.token }),
  },
  set_settings: {
    description: 'Change one or more site settings (same keys as get_settings). Only the keys you send change. Switches take true/false. WhatsApp is digits in international format without +, like 9627XXXXXXXX. Media take an https link or an uploaded /img/ address.',
    inputSchema: obj({ token: TOKEN, settings: { type: 'object', description: 'Keys and new values.', additionalProperties: true } }, ['token', 'settings']),
    run: (a, ctx) => call(ctx, settings.onRequestPost, { token: a.token, body: a.settings }),
  },
  get_products: {
    description: 'Every product (drafts too) with price in JOD, images, status and stock per size and colour (variants with their variant id).',
    inputSchema: obj({ token: TOKEN }, ['token']),
    run: (a, ctx) => call(ctx, products.onRequestGet, { token: a.token }),
  },
  save_product: {
    description: 'Add a product (no id) or change one (with id). Send the whole product: slug, name, description, fit, category (tees|hoodies|bottoms|accessories), collection, price (JOD), compare_at, images (list of "url | caption"), tone (#hex), featured, status (draft|available|sold_out|archived), sort, materials, care, story, sku.',
    inputSchema: obj({ token: TOKEN, product: { type: 'object', description: 'The product fields.', additionalProperties: true } }, ['token', 'product']),
    run: (a, ctx) => call(ctx, products.onRequestPost, { token: a.token, body: { product: a.product } }),
  },
  set_stock: {
    description: 'Set the stock of one size and colour (variant id from get_products).',
    inputSchema: obj({ token: TOKEN, variant_id: { type: 'integer' }, stock: { type: 'integer', minimum: 0 } }, ['token', 'variant_id', 'stock']),
    run: (a, ctx) => call(ctx, variants.onRequestPost, { token: a.token, body: { variant_id: a.variant_id, stock: a.stock } }),
  },
  add_variant: {
    description: 'Add a size and colour to a product with its starting stock.',
    inputSchema: obj({ token: TOKEN, product_id: { type: 'integer' }, size: { type: 'string' }, color: { type: 'string' }, stock: { type: 'integer', minimum: 0 } }, ['token', 'product_id', 'size', 'stock']),
    run: (a, ctx) => call(ctx, variants.onRequestPost, { token: a.token, body: { product_id: a.product_id, size: a.size, color: a.color || '', stock: a.stock } }),
  },
  remove_variant: {
    description: 'Remove one size and colour from a product.',
    inputSchema: obj({ token: TOKEN, variant_id: { type: 'integer' } }, ['token', 'variant_id']),
    run: (a, ctx) => call(ctx, variants.onRequestPost, { token: a.token, body: { variant_id: a.variant_id, remove: true } }),
  },
  get_collections: {
    description: 'The chapters (KAIZEN, TRANQUILITY, VENGEANCE and the next) with their status.',
    inputSchema: obj({ token: TOKEN }, ['token']),
    run: (a, ctx) => call(ctx, collections.onRequestGet, { token: a.token }),
  },
  save_collection: {
    description: 'Add or change a chapter: slug, title, chapter (number), meaning, intro, images, status (draft|current|archived), sort; include id to change one.',
    inputSchema: obj({ token: TOKEN, collection: { type: 'object', additionalProperties: true } }, ['token', 'collection']),
    run: (a, ctx) => call(ctx, collections.onRequestPost, { token: a.token, body: { collection: a.collection } }),
  },
  get_lookbooks: {
    description: 'The lookbooks with their photos.',
    inputSchema: obj({ token: TOKEN }, ['token']),
    run: (a, ctx) => call(ctx, lookbooks.onRequestGet, { token: a.token }),
  },
  save_lookbook: {
    description: 'Add or change a lookbook (slug, title, collection, credit, intro, status draft|published, featured, sort, photos as a list of {image, caption, alt, tag}); include id to change one.',
    inputSchema: obj({ token: TOKEN, lookbook: { type: 'object', additionalProperties: true } }, ['token', 'lookbook']),
    run: (a, ctx) => call(ctx, lookbooks.onRequestPost, { token: a.token, body: { lookbook: a.lookbook } }),
  },
  upload_file: {
    description: 'Upload a photo (webp, jpg, png) or a short video (mp4, webm) as base64, up to 6 MB. Answers with the /img/ address to put in a setting or product. Needs the R2 bucket to be connected.',
    inputSchema: obj({ token: TOKEN, filename: { type: 'string' }, content_type: { type: 'string', description: 'image/webp, image/jpeg, image/png, video/mp4 or video/webm' }, base64: { type: 'string' } }, ['token', 'content_type', 'base64']),
    run: async (a, ctx) => {
      if (typeof a.base64 !== 'string' || a.base64.length > 8_200_000) throw new HttpError(413, 'Keep uploads under 6 MB.');
      let bytes;
      try { bytes = Uint8Array.from(atob(a.base64.replace(/\s/g, '')), (c) => c.charCodeAt(0)); } catch { throw new HttpError(400, 'The file data is not valid base64.'); }
      const form = new FormData();
      form.set('file', new File([bytes], String(a.filename || 'upload'), { type: String(a.content_type || '') }));
      return call(ctx, upload.onRequestPost, { token: a.token, form });
    },
  },
};

// Runs a staff route handler as if the HQ had called it over HTTP, and hands back its JSON.
async function call({ request, env }, fn, { token, body, form, noAuth } = {}) {
  const headers = new Headers({ accept: 'application/json' });
  if (token) headers.set('authorization', `Bearer ${String(token)}`);
  // cf-connecting-ip rides along so the login rate limit counts the real caller.
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('cf-connecting-ip', ip);
  const init = { method: body || form ? 'POST' : 'GET', headers };
  if (body) { headers.set('content-type', 'application/json'); init.body = JSON.stringify(body); }
  if (form) init.body = form;
  const fake = new Request(new URL('/api/staff/x', request.url), init);
  if (!noAuth && token !== undefined && !(await isStaff(fake, env))) throw new HttpError(401, 'Not logged in, or the token expired. Use connect again.');
  const res = await fn({ request: fake, env });
  const data = await res.json().catch(() => ({ error: `Unexpected answer (${res.status}).` }));
  if (!res.ok) throw new HttpError(res.status, data.error || `Error ${res.status}.`);
  return data;
}

const rpc = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function answer(msg, ctx) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(msg && msg.id, -32600, 'Invalid request.');
  const { id, method, params = {} } = msg;
  if (id === undefined) return null; // a notification (notifications/initialized etc.) gets no answer
  switch (method) {
    case 'initialize':
      return rpc(id, { protocolVersion: PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER,
        instructions: 'Stoic Soul Club website control. Call connect with the staff password first; pass its token to the other tools. WhatsApp clicks are inquiries, never sales.' });
    case 'ping':
      return rpc(id, {});
    case 'tools/list':
      return rpc(id, { tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema,
        annotations: { readOnlyHint: name.startsWith('get_'), destructiveHint: name === 'remove_variant', openWorldHint: false } })) });
    case 'tools/call': {
      const tool = TOOLS[params.name];
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params.name}`);
      try {
        const data = await tool.run(params.arguments || {}, ctx);
        return rpc(id, { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data, isError: false });
      } catch (err) {
        const text = err instanceof HttpError ? err.message : 'Something went wrong on the site.';
        if (!(err instanceof HttpError)) console.error(err);
        return rpc(id, { content: [{ type: 'text', text }], isError: true });
      }
    }
    case 'resources/list': return rpc(id, { resources: [] });
    case 'prompts/list': return rpc(id, { prompts: [] });
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export const onRequestPost = handle(async (ctx) => {
  const { request } = ctx;
  if (!(request.headers.get('content-type') || '').includes('application/json')) throw new HttpError(415, 'Send JSON-RPC as application/json.');
  const raw = await request.text();
  if (raw.length > 9_000_000) throw new HttpError(413, 'Too much data.');
  let msg;
  try { msg = JSON.parse(raw); } catch { return json(rpcError(null, -32700, 'Parse error.'), 400); }
  const list = Array.isArray(msg) ? msg : [msg];
  const replies = (await Promise.all(list.map((m) => answer(m, ctx)))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202 });
  return json(Array.isArray(msg) ? replies : replies[0], 200, { 'mcp-protocol-version': PROTOCOL });
});

// A GET would open a server-to-client event stream; this server never pushes, so there is none.
export const onRequestGet = () => json({ error: 'This is the Stoic Website MCP endpoint. Send JSON-RPC by POST.' }, 405, { allow: 'POST, DELETE' });
export const onRequestDelete = () => new Response(null, { status: 200 });
