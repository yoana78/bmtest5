// 이 파일은 앱의 진입점(entry point)입니다.
// index.html의 <div id="root">에 React 앱 전체를 렌더링하며,
// 라우터(HashRouter)와 전역 Provider(테마/언어/데이터)를 여기서 한 번에 감쌉니다.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import { DataProvider } from './context/DataContext'
import './renewal/renewal.css'
import App from './renewal/RenewalApp.jsx'

// Route anchors and scroll scenes own their initial position, including reloads.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

// HashRouter: 주소가 #/about 처럼 # 기반으로 동작 (정적 호스팅에서도 새로고침 시 404가 나지 않도록)
// LanguageProvider: 한국어/영어 다국어 상태 제공
// DataProvider: 브랜드/제품 등 데이터 상태 제공 (관리자 페이지에서 수정한 내용 포함)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <LanguageProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </LanguageProvider>
    </HashRouter>
  </StrictMode>,
)
