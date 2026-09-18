// 업로드된 이미지는 images 테이블에 저장되고, 그 주소(/api/images/<id>)가
// products / brands / site_settings 의 JSON 안에 문자열로 들어간다.
// 제품이나 브랜드를 지우면 그 레코드만 사라지고 이미지는 그대로 남아 용량만 차지하므로,
// 레코드를 지우거나 이미지를 교체한 뒤 "이제 아무 데서도 안 쓰는" 이미지를 정리한다.

const IMAGE_URL = /\/api\/images\/([0-9a-fA-F-]{36})/g;

// 레코드(문자열 또는 객체) 안에서 참조하는 업로드 이미지 id를 모두 뽑아낸다.
export function imageIdsIn(value) {
  if (value == null) return [];
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  const ids = new Set();
  for (const match of json.matchAll(IMAGE_URL)) ids.add(match[1]);
  return [...ids];
}

// 같은 이미지를 여러 제품이 함께 쓰는 경우가 있으므로, 지우기 전에 남은 참조가
// 정말 하나도 없는지 확인한다.
export async function deleteUnreferencedImages(env, ids) {
  if (!env?.DB || !ids?.length) return 0;
  let removed = 0;
  for (const id of ids) {
    const pattern = `%/api/images/${id}%`;
    const row = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM products WHERE data LIKE ?1)
            + (SELECT COUNT(*) FROM brands WHERE data LIKE ?1)
            + (SELECT COUNT(*) FROM site_settings WHERE data LIKE ?1) AS refs`
    ).bind(pattern).first();
    if (row && Number(row.refs) === 0) {
      await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(id).run();
      removed++;
    }
  }
  return removed;
}

// 수정 저장 시 교체되어 더 이상 쓰이지 않게 된 이미지를 정리한다.
export async function cleanupReplacedImages(env, before, after) {
  const stillUsed = new Set(imageIdsIn(after));
  const dropped = imageIdsIn(before).filter(id => !stillUsed.has(id));
  return deleteUnreferencedImages(env, dropped);
}
