// 이 파일은 앱의 최상위 컴포넌트입니다.
// 모든 페이지에 공통으로 보이는 헤더/푸터를 배치하고,
// 주소(URL)에 따라 어떤 페이지 컴포넌트를 보여줄지 라우팅 규칙을 정의합니다.
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import About from './pages/About'
import Brands from './pages/Brands'
import ImportedBrands from './pages/ImportedBrands'
import BrandDetail from './pages/BrandDetail'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Trust from './pages/Trust'
import Contact from './pages/Contact'
import Admin from './pages/Admin'

function App() {
  return (
    <>
      {/* SECTION: 페이지 이동 시 스크롤을 맨 위로 올려주는 보이지 않는 유틸리티 컴포넌트 */}
      <ScrollToTop />
      {/* SECTION: 모든 페이지 상단 공통 헤더(로고, 메뉴, 언어/테마 전환) */}
      <Header />
      <main id="main-content" tabIndex={-1}>
        {/* SECTION: 주소(경로)별로 표시할 페이지를 연결하는 라우팅 테이블 */}
        <Routes>
          <Route path="/" element={<Home />} />               {/* 홈(메인) 페이지 */}
          <Route path="/about" element={<About />} />           {/* 회사 소개 페이지 */}
          <Route path="/brands" element={<Brands />} />         {/* 자사/취급 브랜드 목록 */}
          <Route path="/brands/:brandId" element={<BrandDetail />} />  {/* 브랜드 상세 */}
          <Route path="/imported-brands" element={<ImportedBrands />} /> {/* 수입 브랜드 목록 */}
          <Route path="/imported-brands/:brandId" element={<BrandDetail />} /> {/* 수입 브랜드 상세 */}
          <Route path="/catalog" element={<Catalog />} />       {/* 제품 카탈로그(목록/검색) */}
          <Route path="/catalog/:productId" element={<ProductDetail />} /> {/* 제품 상세 */}
          <Route path="/trust" element={<Trust />} />           {/* 인증/신뢰 정보 페이지 */}
          <Route path="/contact" element={<Contact />} />       {/* 문의하기 페이지 */}
          <Route path="/admin" element={<Admin />} />           {/* 관리자 페이지(데이터 수정) */}
        </Routes>
      </main>
      {/* SECTION: 모든 페이지 하단 공통 푸터(회사 정보, 링크 등) */}
      <Footer />
    </>
  )
}

export default App
