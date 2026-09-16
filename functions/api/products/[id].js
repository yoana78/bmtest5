import { requireAdmin } from '../../_auth.js';

// 제품 id에 한글이 포함된 경우, Cloudflare Pages Functions는 URL 경로의
// %-인코딩을 자동으로 디코딩해주지 않아 params.id가 인코딩된 그대로 들어온다.
// 그대로 두면 DB에 저장된 원래 한글 id와 일치하지 않아 조회에 실패하므로 직접 디코딩한다.
function decodeId(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// PUT /api/products/:id — 기존 제품 수정 (부분 업데이트, 관리자 전용)
export async function onRequestPut(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env, params } = context;
  const id = decodeId(params.id);
  const updates = await context.request.json();

  const existing = await env.DB.prepare('SELECT data FROM products WHERE id = ?').bind(id).first();
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const parsedExisting = JSON.parse(existing.data);
  // 제품 스키마에 정의된 필드만 덮어쓸 수 있게 제한한다 — 클라이언트가 임의의 새
  // 필드를 끼워넣어 저장하는 것을 막기 위함. 다만 "기존 레코드에 이미 있는 키"만
  // 허용하면, 아직 그 필드를 한 번도 저장한 적 없는 제품에 값을 처음 넣을 때
  // (예: 상세정보 이미지 infoImages) 조용히 버려지므로 스키마 목록도 함께 허용한다.
  const PRODUCT_SCHEMA_FIELDS = new Set([
    'nameKo', 'nameEn', 'brandId', 'category', 'petType', 'code', 'spec',
    'shelfLife', 'shelfLifeEn', 'origin', 'originEn', 'features', 'featuresEn',
    'ingredients', 'ingredientsEn', 'nutrition', 'image', 'purchaseUrl', 'infoImages'
  ]);
  const allowedUpdates = {};
  for (const key of Object.keys(updates)) {
    if (key in parsedExisting || PRODUCT_SCHEMA_FIELDS.has(key)) allowedUpdates[key] = updates[key];
  }
  const merged = { ...parsedExisting, ...allowedUpdates };
  await env.DB.prepare('UPDATE products SET data = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(JSON.stringify(merged), id)
    .run();

  return Response.json({ ok: true, product: merged });
}

// DELETE /api/products/:id — 제품 삭제 (관리자 전용)
export async function onRequestDelete(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env, params } = context;
  const id = decodeId(params.id);
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return Response.json({ ok: true });
}
