import { isAuthed } from '../_auth.js';

// GET /api/session — 현재 브라우저의 admin_session 쿠키가 아직 유효한지 확인한다.
// Admin.jsx가 페이지를 새로 열었을 때 매번 비밀번호를 다시 묻지 않고,
// 유효기간(24시간) 안이면 로그인 상태를 이어갈 수 있게 해준다.
export async function onRequestGet({ request, env }) {
  const authenticated = await isAuthed(request, env);
  return Response.json({ authenticated }, { headers: { 'Cache-Control': 'no-store' } });
}
