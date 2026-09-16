import { sign, verifyPassword, logAdminAction, SESSION_MAX_AGE_MS } from '../_auth.js';

// POST /api/login — 관리자 비밀번호를 확인하고, 맞으면 서명된 세션 토큰을 HttpOnly
// 쿠키로 내려준다. 비밀번호 자체는 응답에도, 브라우저 저장소에도 남지 않는다.
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ADMIN_PASSWORD) {
    return Response.json({ error: 'ADMIN_PASSWORD가 설정되지 않았습니다.' }, { status: 500 });
  }
  const { password } = await request.json().catch(() => ({}));
  const ok = await verifyPassword(password, env);
  if (!ok) {
    await logAdminAction(context, 'login_fail');
    return Response.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
  }
  await logAdminAction(context, 'login_success');
  const payload = String(Date.now());
  const sig = await sign(payload, env.ADMIN_PASSWORD);
  const token = `${payload}.${sig}`;
  return Response.json({ ok: true }, {
    headers: {
      'Set-Cookie': `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`,
    },
  });
}
