import { requireAdmin } from '../../_auth.js';

// POST /api/brands — 신규 브랜드 등록 (관리자 전용)
export async function onRequestPost(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const brand = await context.request.json();
  if (!brand.id || !brand.nameKo) {
    return Response.json({ error: 'id, nameKo required' }, { status: 400 });
  }

  const { env } = context;
  const row = await env.DB.prepare('SELECT MAX(position) as maxPos FROM brands').first();
  const position = (row?.maxPos ?? -1) + 1;

  await env.DB.prepare('INSERT INTO brands (id, data, position) VALUES (?, ?, ?)')
    .bind(brand.id, JSON.stringify(brand), position)
    .run();

  return Response.json({ ok: true, brand });
}
