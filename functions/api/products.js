// GET /api/products            every product on sale
// GET /api/products?slug=x     one product
import { handle, json, HttpError } from '../_lib/http.js';
import { getDb } from '../_lib/db.js';
import { listProducts } from '../_lib/store.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const slug = new URL(request.url).searchParams.get('slug');
  const db = await getDb(env);
  const products = await listProducts(db, { slug });
  if (slug && !products.length) throw new HttpError(404, 'Product not found.');
  return json(slug ? { product: products[0] } : { products });
});
