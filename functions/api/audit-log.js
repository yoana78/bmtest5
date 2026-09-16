import { requireAdmin } from '../_auth.js';

// GET /api/audit-log — 로그인/비밀번호 변경/초기화 등 계정 보안 관련 이력을 IP와 함께 조회 (관리자 전용)
export async function onRequestGet(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env } = context;
  const table = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'admin_audit_log'"
  ).first();
  if (!table) return Response.json({ logs: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const { results } = await env.DB.prepare(
    'SELECT created_at, ip, action FROM admin_audit_log ORDER BY id DESC LIMIT 100'
  ).all();
  return Response.json({ logs: results || [] }, { headers: { 'Cache-Control': 'no-store' } });
}
