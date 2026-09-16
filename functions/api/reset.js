import { requireAdmin, logAdminAction } from '../_auth.js';
import defaults from '../_defaults.json';

// POST /api/reset — 모든 브랜드/제품/설정을 원본 기본값으로 되돌림 (관리자 전용)
// 되돌리기 전 상태를 reset_snapshots 테이블에 남겨두어, 실수로 초기화했을 때
// /api/reset/undo 로 복구할 수 있게 한다.
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

  const [brandsRows, productsRows, settingsRow] = await Promise.all([
    env.DB.prepare('SELECT id, data, position FROM brands').all(),
    env.DB.prepare('SELECT id, data, position FROM products').all(),
    env.DB.prepare("SELECT data FROM site_settings WHERE key = 'settings'").first(),
  ]);

  await env.DB.prepare(
    "INSERT INTO reset_snapshots (created_at, brands, products, site_settings) VALUES (datetime('now'), ?, ?, ?)"
  ).bind(
    JSON.stringify(brandsRows.results || []),
    JSON.stringify(productsRows.results || []),
    settingsRow ? settingsRow.data : null
  ).run();

  // 스냅샷은 최근 20개만 보관한다 (무한정 쌓이지 않도록).
  await env.DB.prepare(
    'DELETE FROM reset_snapshots WHERE id NOT IN (SELECT id FROM reset_snapshots ORDER BY id DESC LIMIT 20)'
  ).run();

  await env.DB.batch([
    env.DB.prepare('DELETE FROM brands'),
    env.DB.prepare('DELETE FROM products'),
    env.DB.prepare('DELETE FROM site_settings'),
    ...defaults.brands.map((b, idx) =>
      env.DB.prepare('INSERT INTO brands (id, data, position) VALUES (?, ?, ?)').bind(b.id, JSON.stringify(b), idx)
    ),
    ...defaults.products.map((p, idx) =>
      env.DB.prepare('INSERT INTO products (id, data, position) VALUES (?, ?, ?)').bind(p.id, JSON.stringify(p), idx)
    ),
    env.DB.prepare('INSERT INTO site_settings (key, data) VALUES (\'settings\', ?)').bind(JSON.stringify(defaults.siteSettings))
  ]);

  await logAdminAction(context, 'reset');

  return Response.json({ ok: true });
}
