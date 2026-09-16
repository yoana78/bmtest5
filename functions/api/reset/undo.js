import { requireAdmin } from '../../_auth.js';

// POST /api/reset/undo — 가장 최근 초기화(reset) 직전 스냅샷으로 복원한다 (관리자 전용).
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

  const brands = JSON.parse(snap.brands);
  const products = JSON.parse(snap.products);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM brands'),
    env.DB.prepare('DELETE FROM products'),
    env.DB.prepare('DELETE FROM site_settings'),
    ...brands.map((b) =>
      env.DB.prepare('INSERT INTO brands (id, data, position) VALUES (?, ?, ?)').bind(b.id, b.data, b.position)
    ),
    ...products.map((p) =>
      env.DB.prepare('INSERT INTO products (id, data, position) VALUES (?, ?, ?)').bind(p.id, p.data, p.position)
    ),
    ...(snap.site_settings
      ? [env.DB.prepare("INSERT INTO site_settings (key, data) VALUES ('settings', ?)").bind(snap.site_settings)]
      : []),
    env.DB.prepare('DELETE FROM reset_snapshots WHERE id = ?').bind(snap.id),
  ]);

  return Response.json({ ok: true });
}
