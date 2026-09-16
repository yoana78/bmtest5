#!/bin/sh
# 이 프로젝트는 Cloudflare Pages가 소스를 빌드하지 않고 저장소 루트의 index.html을
# 그대로 서빙한다 (wrangler.jsonc의 pages_build_output_dir: "./"). 그래서 src/를
# 고친 뒤 반드시 이 스크립트로 빌드 결과를 루트에 복사해야 실제 배포에 반영된다.
# 이 단계를 건너뛰고 push하면 Functions(백엔드)만 바뀌고 화면은 그대로인 상태가 된다.
set -e
npm run build
cp dist/index.html index.html
echo "루트 index.html 갱신 완료 — git add index.html 후 커밋/푸쉬하세요."
