import { requireAdmin, logAdminAction } from '../../_auth.js';

// POST /api/reset/undo — 가장 최근 "문구·이미지 초기화" 직전 설정값으로 되돌린다 (관리자 전용).
// 초기화와 마찬가지로 브랜드·제품은 건드리지 않는다.
export async function onRequestPost(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env } = context;

  const table = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reset_snapshots'"
  ).first();
  if (!table) return Response.json({ error: '복원할 스냅샷이 없습니다.' }, { status: 404 });

  const snap = await env.DB.prepare(
    'SELECT * FROM reset_snapshots ORDER BY id DESC LIMIT 1'
  ).first();
  if (!snap) return Response.json({ error: '복원할 스냅샷이 없습니다.' }, { status: 404 });

  await env.DB.batch([
    env.DB.prepare('DELETE FROM site_settings'),
    ...(snap.site_settings
      ? [env.DB.prepare("INSERT INTO site_settings (key, data) VALUES ('settings', ?)").bind(snap.site_settings)]
      : []),
    env.DB.prepare('DELETE FROM reset_snapshots WHERE id = ?').bind(snap.id),
  ]);

  await logAdminAction(context, 'reset_undo');

  return Response.json({ ok: true });
}
