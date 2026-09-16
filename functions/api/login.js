import { sign } from '../_auth.js';

// POST /api/login — 관리자 비밀번호를 서버(ADMIN_PASSWORD 환경변수)와 대조하고,
// 맞으면 서명된 세션 토큰을 HttpOnly 쿠키로 내려준다. 비밀번호 자체는 응답에도,
// 브라우저 저장소에도 남지 않는다.
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return Response.json({ error: 'ADMIN_PASSWORD가 설정되지 않았습니다.' }, { status: 500 });
  }
  const { password } = await request.json().catch(() => ({}));
  if (password !== env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
  }
  const payload = String(Date.now());
  const sig = await sign(payload, env.ADMIN_PASSWORD);
  const token = `${payload}.${sig}`;
  return Response.json({ ok: true }, {
    headers: {
      'Set-Cookie': `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
    },
  });
}
