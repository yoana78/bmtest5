import { requireAdmin } from '../../_auth.js';
import { imageIdsIn, deleteUnreferencedImages, cleanupReplacedImages } from '../../_images.js';

// PUT /api/brands/:id — 기존 브랜드 수정 (부분 업데이트, 관리자 전용)
export async function onRequestPut(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env, params } = context;
  const { position, ...updates } = await context.request.json();

  const existing = await env.DB.prepare('SELECT data FROM brands WHERE id = ?').bind(params.id).first();
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const parsedExisting = JSON.parse(existing.data);
  // 브랜드 스키마에 정의된 필드만 덮어쓸 수 있게 제한한다 — 클라이언트가 임의의 새
  // 필드를 끼워넣어 저장하는 것을 막기 위함. 기존 레코드에 아직 없는 필드(예: 나중에
  // 추가된 bgImage)라도 스키마에 정의되어 있으면 처음으로 채워 넣을 수 있어야 하므로,
  // "기존에 있던 키"뿐 아니라 이 목록에 있는 키도 함께 허용한다.
  const BRAND_SCHEMA_FIELDS = new Set([
    'nameKo', 'nameEn', 'tagline', 'taglineEn', 'logo', 'hasLogo', 'logoScale',
    'bgImage', 'descriptionKo', 'descriptionEn', 'categories', 'color', 'type'
  ]);
  const allowedUpdates = {};
  for (const key of Object.keys(updates)) {
    if (key in parsedExisting || BRAND_SCHEMA_FIELDS.has(key)) allowedUpdates[key] = updates[key];
  }
  const merged = { ...parsedExisting, ...allowedUpdates };
  if (position !== undefined) {
    await env.DB.prepare('UPDATE brands SET data = ?, position = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(JSON.stringify(merged), position, params.id)
      .run();
  } else {
    await env.DB.prepare('UPDATE brands SET data = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(JSON.stringify(merged), params.id)
      .run();
  }

  // 로고를 교체했다면 예전 로고 이미지는 아무도 안 쓰게 되므로 지운다.
  await cleanupReplacedImages(env, parsedExisting, merged);

  return Response.json({ ok: true, brand: merged });
}

// DELETE /api/brands/:id — 브랜드 삭제 (관리자 전용)
export async function onRequestDelete(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env, params } = context;

  // 브랜드가 쓰던 로고 주소를 먼저 확보한 뒤 브랜드를 지우고, 다른 곳에서도 안 쓰이면 이미지도 지운다.
  const existing = await env.DB.prepare('SELECT data FROM brands WHERE id = ?').bind(params.id).first();
  const usedImages = existing ? imageIdsIn(existing.data) : [];

  await env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(params.id).run();
  const removedImages = await deleteUnreferencedImages(env, usedImages);

  return Response.json({ ok: true, removedImages });
}
