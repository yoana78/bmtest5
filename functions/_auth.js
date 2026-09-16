// 관리자 전용(쓰기) API를 보호하는 공용 인증 체크.
// 로그인(/api/login) 성공 시 서버가 HttpOnly 쿠키로 서명된 세션 토큰을 내려주고,
// 이후 모든 쓰기 요청은 브라우저가 자동으로 실어 보내는 그 쿠키로 인증한다.
// 비밀번호 자체는 브라우저 어디에도 저장되지 않는다 (예전의 sessionStorage Bearer 토큰 방식 폐기).
export async function requireAdmin(context) {
  const ok = await isAuthed(context.request, context.env);
  if (!ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return null; // 통과
}

export async function isAuthed(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);
  if (!match) return false;
  return await verifyToken(match[1], env.ADMIN_PASSWORD);
}

async function verifyToken(token, secret) {
  if (!secret) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  // 세션 유효기간: 24시간
  const age = Date.now() - Number(payload);
  if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000) return false;
  const expected = await sign(payload, secret);
  return timingSafeEqual(expected, sig);
}

export async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/[+/=]/g, '');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
