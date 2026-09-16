// POST /api/logout — 관리자 세션 쿠키를 만료시킨다.
export async function onRequestPost() {
  return Response.json({ ok: true }, {
    headers: {
      'Set-Cookie': 'admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    },
  });
}
