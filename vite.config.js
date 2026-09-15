import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

// 주의: 이 프로젝트는 소스 코드와 "배포용 index.html"이 같은 저장소(폴더)에 있음.
// vite가 빌드할 때 읽는 원본 HTML은 반드시 app/index.html 이어야 하고,
// 저장소 루트의 index.html은 "빌드 결과물"이 복사되는 자리이므로 vite의 입력으로 쓰면 안 됨
// (루트 index.html을 root로 두면, 매번 빌드할 때마다 직전 빌드 결과물을 다시 읽어들여
//  두 번째 빌드부터 완전히 망가지는 문제가 있었음 — 그래서 app/ 폴더로 분리함).
export default defineConfig({
  root: 'app',
  base: './',
  publicDir: '../public',
  resolve: { alias: { '/src': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  plugins: [
    react(),
    viteSingleFile()
  ],
  server: {
    watch: {
      ignored: ['**/data/**', '**/*.xlsx', '**/*.pptx', '**/*.docx']
    }
  }
})
