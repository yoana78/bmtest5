import { requireAdmin } from '../_auth.js';

// POST /api/upload — 이미지 업로드 (관리자 전용).
// 요청 본문: { dataUrl: "data:image/png;base64,...." }
// R2 버킷(IMAGES)이 연결돼 있으면 R2에 저장하고, 아직 연결 전이면 D1의 images 테이블에 base64로 저장한다
// (D1은 행 하나에 1MB 제한이 있으므로 이 폴백은 임시용 — R2 연결 후에는 새 업로드부터 자동으로 R2를 씀).
// 응답: { url: "/api/images/<id>" } — 이 주소로 GET하면 이미지가 그대로 내려온다.
export async function onRequestPost(context) {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  const { env } = context;
  const { dataUrl } = await context.request.json();
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return Response.json({ error: 'dataUrl required' }, { status: 400 });
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return Response.json({ error: 'Invalid dataUrl' }, { status: 400 });
  const [, mime, base64] = match;
  const id = crypto.randomUUID();

  if (env.IMAGES) {
    const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    await env.IMAGES.put(id, binary, { httpMetadata: { contentType: mime } });
  } else {
    // 이미지 하나가 너무 크면(약 900KB base64 기준) D1 행 크기 제한(1MB)에 걸릴 수 있음
    if (base64.length > 900000) {
      return Response.json({ error: 'Image too large for temporary storage — enable R2 in the Cloudflare dashboard for large uploads.' }, { status: 413 });
    }
    await env.DB.prepare('INSERT INTO images (id, mime, data) VALUES (?, ?, ?)').bind(id, mime, base64).run();
  }

  return Response.json({ url: `/api/images/${id}` });
}
