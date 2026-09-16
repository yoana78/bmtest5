import { requireAdmin, logAdminAction } from '../_auth.js';
import defaults from '../_defaults.json';

// POST /api/reset — 페이지 문구·이미지 설정만 기본값으로 되돌린다 (관리자 전용).
//
// 브랜드와 제품은 일부러 건드리지 않는다. 예전에는 이 버튼이 brands/products까지
// 통째로 지우고 _defaults.json으로 다시 심었는데, 그 파일은 사이트를 처음 만들 때
// 고정된 값이라 그 뒤에 등록한 제품이 초기화 한 번에 사라졌다.
// 되돌리기(/api/reset/undo)를 위해 직전 설정값을 스냅샷으로 남긴다.
export async function onRequestPost(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env } = context;

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS reset_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      brands TEXT NOT NULL,
      products TEXT NOT NULL,
      site_settings TEXT
    )`
  ).run();

  const settingsRow = await env.DB.prepare("SELECT data FROM site_settings WHERE key = 'settings'").first();

  // brands/products 칼럼은 NOT NULL이라 빈 배열을 넣어 스키마를 유지한다
  // (이 버튼은 더 이상 브랜드·제품을 건드리지 않으므로 복원 대상도 아니다).
  await env.DB.prepare(
    "INSERT INTO reset_snapshots (created_at, brands, products, site_settings) VALUES (datetime('now'), '[]', '[]', ?)"
  ).bind(settingsRow ? settingsRow.data : null).run();

  // 스냅샷은 최근 20개만 보관한다 (무한정 쌓이지 않도록).
  await env.DB.prepare(
    'DELETE FROM reset_snapshots WHERE id NOT IN (SELECT id FROM reset_snapshots ORDER BY id DESC LIMIT 20)'
  ).run();

  await env.DB.batch([
    env.DB.prepare('DELETE FROM site_settings'),
    env.DB.prepare('INSERT INTO site_settings (key, data) VALUES (\'settings\', ?)').bind(JSON.stringify(defaults.siteSettings))
  ]);

  await logAdminAction(context, 'reset');

  return Response.json({ ok: true });
}
