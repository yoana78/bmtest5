import { requireAdmin } from '../_auth.js';

// PUT /api/settings — 사이트 설정(문의 이메일, 히어로 이미지 등) 부분 업데이트 (관리자 전용)
export async function onRequestPut(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env } = context;
  let updates;
  try {
    updates = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 사이트 설정은 계속 새 항목이 추가되는 범용 객체라 필드를 미리 확정할 수 없다.
  // 대신 프로토타입 오염으로 이어질 수 있는 위험한 키와, 지나치게 큰 payload만 차단한다.
  const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  if (!updates || typeof updates !== 'object' || Array.isArray(updates) ||
      Object.keys(updates).some((k) => DANGEROUS_KEYS.includes(k))) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const serialized = JSON.stringify(updates);
  if (serialized.length > 2_000_000) {
    return Response.json({ error: 'Payload too large' }, { status: 413 });
  }

  const existing = await env.DB.prepare('SELECT data FROM site_settings WHERE key = ?').bind('settings').first();
  const merged = { ...(existing ? JSON.parse(existing.data) : {}), ...updates };

  await env.DB.prepare(
    `INSERT INTO site_settings (key, data, updated_at) VALUES ('settings', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(JSON.stringify(merged)).run();

  return Response.json({ ok: true, siteSettings: merged });
}
