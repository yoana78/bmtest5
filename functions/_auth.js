// 관리자 전용(쓰기) API를 보호하는 공용 인증 체크.
// 로그인(/api/login) 성공 시 서버가 HttpOnly 쿠키로 서명된 세션 토큰을 내려주고,
// 이후 모든 쓰기 요청은 브라우저가 자동으로 실어 보내는 그 쿠키로 인증한다.
// 비밀번호 자체는 브라우저 어디에도 저장되지 않는다.
//
// 실제 로그인 비밀번호는 D1의 admin_auth 테이블에 salt+PBKDF2 해시로 저장되며,
// 관리자가 "비밀번호 변경"으로 언제든 바꿀 수 있다. 아직 한 번도 바꾼 적이 없으면
// 배포 시 설정한 ADMIN_PASSWORD 환경변수와 그대로 비교한다(부트스트랩).
// 세션 서명에 쓰는 비밀키는 항상 ADMIN_PASSWORD 환경변수를 쓰므로(로그인 비밀번호와
// 분리되어 있음), 이미 발급된 세션은 비밀번호를 바꿔도 끊기지 않는다.
export const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4시간

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
  const age = Date.now() - Number(payload);
  if (!Number.isFinite(age) || age < 0 || age > SESSION_MAX_AGE_MS) return false;
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

async function ensureAuthTables(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS admin_auth (
      id TEXT PRIMARY KEY,
      salt TEXT NOT NULL,
      hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS admin_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      ip TEXT,
      action TEXT NOT NULL
    )`
  ).run();
}

// PBKDF2(SHA-256, 100,000회)로 비밀번호를 해시한다. salt를 안 주면 새로 만든다.
async function hashPassword(password, saltB64) {
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const usedSalt = saltB64 || btoa(String.fromCharCode(...salt));
  return { hash, salt: usedSalt };
}

// 로그인/비밀번호 변경 시 입력값이 현재 등록된 비밀번호와 맞는지 확인한다.
export async function verifyPassword(candidate, env) {
  await ensureAuthTables(env);
  const row = await env.DB.prepare("SELECT salt, hash FROM admin_auth WHERE id = 'default'").first();
  if (!row) return candidate === env.ADMIN_PASSWORD; // 아직 한 번도 안 바꿨으면 배포 시 값과 비교
  const { hash } = await hashPassword(candidate, row.salt);
  return timingSafeEqual(hash, row.hash);
}

// 새 비밀번호를 D1에 저장한다 (다음 로그인부터는 이 값을 쓴다).
export async function setPassword(newPassword, env) {
  await ensureAuthTables(env);
  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.prepare(
    `INSERT INTO admin_auth (id, salt, hash, updated_at) VALUES ('default', ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET salt = excluded.salt, hash = excluded.hash, updated_at = excluded.updated_at`
  ).bind(salt, hash).run();
}

// 로그인 성공/실패, 비밀번호 변경, 초기화(reset) 등 계정 보안과 관련된 동작을
// 누가(IP) 언제 했는지 남긴다. 최근 500건만 보관.
export async function logAdminAction(context, action) {
  try {
    const { request, env } = context;
    await ensureAuthTables(env);
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    await env.DB.prepare(
      "INSERT INTO admin_audit_log (created_at, ip, action) VALUES (datetime('now'), ?, ?)"
    ).bind(ip, action).run();
    await env.DB.prepare(
      'DELETE FROM admin_audit_log WHERE id NOT IN (SELECT id FROM admin_audit_log ORDER BY id DESC LIMIT 500)'
    ).run();
  } catch {
    // 로그 저장 실패가 실제 관리자 작업을 막으면 안 된다.
  }
}
