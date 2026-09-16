import { requireAdmin } from '../../_auth.js';

// POST /api/products — 신규 제품 등록 (관리자 전용)
export async function onRequestPost(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const product = await context.request.json();
  if (!product.id || !product.nameKo || !product.brandId) {
    return Response.json({ error: 'id, nameKo, brandId required' }, { status: 400 });
  }

  const { env } = context;
  const row = await env.DB.prepare('SELECT MAX(position) as maxPos FROM products').first();
  const position = (row?.maxPos ?? -1) + 1;

  await env.DB.prepare('INSERT INTO products (id, data, position) VALUES (?, ?, ?)')
    .bind(product.id, JSON.stringify(product), position)
    .run();

  return Response.json({ ok: true, product });
}
