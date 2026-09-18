// GET /api/images/:id — 업로드된 이미지를 그대로 서빙 (공개, 인증 불필요 — 홈페이지 방문자 전체가 봐야 하므로)
export async function onRequestGet(context) {
  const { env, params } = context;

  if (env.IMAGES) {
    const object = await env.IMAGES.get(params.id);
    if (object) {
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
  }

  const row = await env.DB.prepare('SELECT mime, data FROM images WHERE id = ?').bind(params.id).first();
  if (!row) return new Response('Not found', { status: 404 });

  // 방문자마다 호출되는 경로라서 콜백을 거치는 Uint8Array.from 대신 단순 루프로 디코딩한다.
  // 이미지 한 장이 base64로 수십만 글자라, 콜백 호출 비용이 쌓이면 Worker CPU 한도(1102)에 걸린다.
  const text = atob(row.data);
  const binary = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) binary[i] = text.charCodeAt(i);
  return new Response(binary, {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
