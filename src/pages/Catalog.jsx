// 리뉴얼 제품 카탈로그 페이지 (Product Catalog Renewal 2026)
// 1. 역동적 서브 히어로 (글로벌 펫푸드 & 용품 비주얼)
// 2. 통합 스마트 컨트롤 바 (실시간 검색, 정렬 옵션, 총 제품 수)
// 3. 듀얼 인터랙티브 필터 (카테고리 칩 + 브랜드 칩, 개수 배지, 액티브 태그, 초기화)
// 4. 모던 4열 제품 쇼케이스 그리드 (마우스 호버 시 카테고리 태그 네온 발광)
// 5. 제품 카드 클릭 시 모달 팝업(상세보기) 연동 + 별도 페이지 링크 제공
// 6. 페이지네이션 지원

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useData } from '../context/DataContext';
import { translateIngredients } from '../utils/translateIngredients';

const CATEGORIES = [
  { id: 'all', ko: '전체', en: 'All' },
  { id: '사료', ko: '사료', en: 'Feed' },
  { id: '간식', ko: '간식', en: 'Treats' },
  { id: '모래', ko: '모래', en: 'Cat Litter' },
  { id: '용품', ko: '용품', en: 'Supplies' }
];

const categoryEnMap = {
  '사료': 'Feed',
  '간식': 'Treats',
  '모래': 'Cat Litter',
  '용품': 'Supplies'
};

const petTypeEnMap = {
  'dog': 'Dog',
  'cat': 'Cat'
};

const petTypeKoMap = {
  'dog': '강아지',
  'cat': '고양이'
};

const ITEMS_PER_PAGE = 24;

export default function Catalog() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { brands, products = [] } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 쿼리 파라미터 연동
  const initialCategory = searchParams.get('category') || 'all';
  const initialBrand = searchParams.get('brand') || 'all';
  const initialSearch = searchParams.get('q') || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('nameAsc'); // 'nameAsc' | 'nameDesc' | 'code'
  const [currentPage, setCurrentPage] = useState(1);

  // 모달 팝업 상태 (선택된 제품 객체)
  const [modalProduct, setModalProduct] = useState(null);
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'nutrition'

  const isFirstRender = useRef(true);

  // URL 파라미터 변경 시 상태 동기화
  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    const b = searchParams.get('brand') || 'all';
    const q = searchParams.get('q') || '';
    setSelectedCategory(cat);
    setSelectedBrand(b);
    setSearchQuery(q);
    setCurrentPage(1);
  }, [searchParams]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalProduct(null);
      }
    };
    if (modalProduct) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalProduct]);

  // 필터나 검색어 변경 시 페이지 1로 리셋
  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
    updateSearchParams({ category: catId === 'all' ? null : catId });
  };

  const handleBrandChange = (brandId) => {
    setSelectedBrand(brandId);
    setCurrentPage(1);
    updateSearchParams({ brand: brandId === 'all' ? null : brandId });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(1);
    updateSearchParams({ q: val ? val : null });
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSearchQuery('');
    setCurrentPage(1);
    setSearchParams({});
  };

  const updateSearchParams = (updates) => {
    const current = Object.fromEntries(searchParams.entries());
    const next = { ...current, ...updates };
    Object.keys(next).forEach(k => {
      if (!next[k]) delete next[k];
    });
    setSearchParams(next, { replace: true });
  };

  // 모달 열기 핸들러
  const handleOpenModal = (e, product) => {
    e.preventDefault();
    setModalProduct(product);
    const feats = isEn ? (product.featuresEn || product.features || []) : (product.features || []);
    const featsList = Array.isArray(feats) ? feats : (typeof feats === 'string' ? feats.split('\n') : []);
    const hasInfoImages = Array.isArray(product.infoImages) && product.infoImages.length > 0;
    setModalTab(featsList.length > 0 || hasInfoImages ? 'info' : 'nutrition');
  };

  // 필터 조건에 따른 제품 리스트
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchBrand = selectedBrand === 'all' || p.brandId === selectedBrand;
      let matchSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const brandObj = brands.find(b => b.id === p.brandId);
        const brandKo = brandObj?.nameKo?.toLowerCase() || '';
        const brandEn = brandObj?.nameEn?.toLowerCase() || '';
        const nameKo = (p.nameKo || '').toLowerCase();
        const nameEn = (p.nameEn || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        const spec = (p.spec || '').toLowerCase();

        matchSearch = nameKo.includes(q) || nameEn.includes(q) || brandKo.includes(q) || brandEn.includes(q) || code.includes(q) || spec.includes(q);
      }
      return matchCat && matchBrand && matchSearch;
    });
  }, [products, selectedCategory, selectedBrand, searchQuery, brands]);

  // 정렬 처리
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'nameAsc') {
      list.sort((a, b) => {
        const nameA = isEn ? (a.nameEn || a.nameKo) : a.nameKo;
        const nameB = isEn ? (b.nameEn || b.nameKo) : b.nameKo;
        return nameA.localeCompare(nameB, isEn ? 'en' : 'ko');
      });
    } else if (sortBy === 'nameDesc') {
      list.sort((a, b) => {
        const nameA = isEn ? (a.nameEn || a.nameKo) : a.nameKo;
        const nameB = isEn ? (b.nameEn || b.nameKo) : b.nameKo;
        return nameB.localeCompare(nameA, isEn ? 'en' : 'ko');
      });
    } else if (sortBy === 'code') {
      list.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    }
    return list;
  }, [filteredProducts, sortBy, isEn]);

  // 페이지네이션 처리
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage]);

  // 페이지 변경 시 부드럽게 스크롤 이동 (첫 렌더 제외)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const filterEl = document.getElementById('catalog-content-start');
    if (filterEl) {
      filterEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);

  // 각 카테고리별 개수
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    CATEGORIES.forEach(c => {
      if (c.id !== 'all') {
        counts[c.id] = products.filter(p => p.category === c.id).length;
      }
    });
    return counts;
  }, [products]);

  // 각 브랜드별 개수
  const brandCounts = useMemo(() => {
    const counts = { all: products.length };
    brands.forEach(b => {
      counts[b.id] = products.filter(p => p.brandId === b.id).length;
    });
    return counts;
  }, [products, brands]);

  const activeBrandObj = brands.find(b => b.id === selectedBrand);

  // 모달에 들어갈 활성 제품 데이터 가공
  const modalBrand = modalProduct ? brands.find(b => b.id === modalProduct.brandId) : null;
  const modalFeatures = modalProduct ? (
    isEn
      ? (modalProduct.featuresEn || modalProduct.features || [])
      : (modalProduct.features || [])
  ) : [];
  const modalFeaturesList = Array.isArray(modalFeatures) ? modalFeatures : (typeof modalFeatures === 'string' ? modalFeatures.split('\n') : []);
  const modalNutritionEntries = modalProduct ? Object.entries(modalProduct.nutrition || {}).filter(([, v]) => v && String(v).trim()) : [];

  return (
    <div className="bm-catalog-page">
      {/* ====== 1. 서브 히어로 (Sub Hero) ====== */}
      <section
        className="bm-sub-hero header-extended-hero"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=2560&q=80')"
        }}
      >
        <div className="bm-sub-hero-overlay" />
        <div className="bm-sub-hero-content animate-on-scroll fade-up is-visible">
          <span className="bm-sub-hero-tag">ALL PRODUCT PORTFOLIO</span>
          <h1 className="bm-sub-hero-title">
            {isEn ? 'Product Catalog' : '제품 카다로그'}
          </h1>
          <p className="bm-sub-hero-desc">
            {isEn
              ? 'Explore our comprehensive range of specialized pet nutrition, hygienic cat litters, and professional supplies.'
              : '자체 생산 프리미엄 펫푸드부터 엄선된 글로벌 수입 브랜드까지, 부명이 보증하는 고품질 제품들을 카테고리별로 만나보세요.'}
          </p>
        </div>
      </section>

      <div className="bm-container" id="catalog-content-start">
        {/* ====== 2. 상단 컨트롤 바 (검색 + 정렬 + 통계) ====== */}
        <div className="bm-catalog-ctrl-bar">
          <div className="bm-catalog-search-wrap">
            <span className="bm-catalog-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="bm-catalog-search-input"
              placeholder={isEn ? "Search by product name, brand, or code..." : "제품명, 브랜드, 규격, 바코드 검색..."}
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button
                className="bm-catalog-search-clear"
                onClick={() => handleSearchChange({ target: { value: '' } })}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="bm-catalog-stats-wrap">
            <span className="bm-catalog-total-badge">
              {isEn ? 'Total' : '검색 결과'} <strong>{sortedProducts.length}</strong>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', marginLeft: '4px' }}>
                / {products.length} {isEn ? 'Items' : '개'}
              </span>
            </span>

            <select
              className="bm-catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="nameAsc">{isEn ? 'Name: A to Z' : '제품명 가나다순'}</option>
              <option value="nameDesc">{isEn ? 'Name: Z to A' : '제품명 역순'}</option>
              <option value="code">{isEn ? 'Barcode' : '제품 코드순'}</option>
            </select>
          </div>
        </div>

        {/* ====== 3. 듀얼 필터 카드 (카테고리 + 브랜드 칩) ====== */}
        <div className="bm-catalog-filter-card">
          {/* 카테고리 필터 행 */}
          <div className="bm-filter-row">
            <div className="bm-filter-row-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>{isEn ? 'Category' : '품목'}</span>
            </div>
            <div className="bm-filter-chips">
              {CATEGORIES.map(cat => {
                const count = categoryCounts[cat.id] || 0;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    className={`bm-filter-chip ${isActive ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat.id)}
                  >
                    <span>{isEn ? cat.en : cat.ko}</span>
                    <span className="bm-filter-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bm-filter-divider" />

          {/* 브랜드 필터 행 */}
          <div className="bm-filter-row">
            <div className="bm-filter-row-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <span>{isEn ? 'Brand' : '브랜드'}</span>
            </div>
            <div className="bm-filter-chips">
              <button
                className={`bm-filter-chip ${selectedBrand === 'all' ? 'active' : ''}`}
                onClick={() => handleBrandChange('all')}
              >
                <span>{isEn ? 'All Brands' : '전체 브랜드'}</span>
                <span className="bm-filter-chip-count">{products.length}</span>
              </button>
              {brands.map(b => {
                const count = brandCounts[b.id] || 0;
                const isActive = selectedBrand === b.id;
                return (
                  <button
                    key={b.id}
                    className={`bm-filter-chip ${isActive ? 'active' : ''}`}
                    onClick={() => handleBrandChange(b.id)}
                  >
                    <span>{isEn ? (b.nameEn || b.nameKo) : b.nameKo}</span>
                    {count > 0 && <span className="bm-filter-chip-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 활성화된 필터 태그 표시 & 초기화 버튼 */}
          {(selectedCategory !== 'all' || selectedBrand !== 'all' || searchQuery) && (
            <>
              <div className="bm-filter-divider" />
              <div className="bm-filter-active-tags">
                <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                  {isEn ? 'Active Filters:' : '적용된 필터:'}
                </span>

                {selectedCategory !== 'all' && (
                  <span className="bm-active-tag-chip">
                    {isEn ? (CATEGORIES.find(c => c.id === selectedCategory)?.en || selectedCategory) : selectedCategory}
                    <button onClick={() => handleCategoryChange('all')}>✕</button>
                  </span>
                )}

                {selectedBrand !== 'all' && activeBrandObj && (
                  <span className="bm-active-tag-chip">
                    {isEn ? (activeBrandObj.nameEn || activeBrandObj.nameKo) : activeBrandObj.nameKo}
                    <button onClick={() => handleBrandChange('all')}>✕</button>
                  </span>
                )}

                {searchQuery && (
                  <span className="bm-active-tag-chip">
                    "{searchQuery}"
                    <button onClick={() => handleSearchChange({ target: { value: '' } })}>✕</button>
                  </span>
                )}

                <button className="bm-filter-reset-btn" onClick={handleResetFilters}>
                  {isEn ? 'Reset All' : '필터 초기화'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ====== 4. 제품 그리드 쇼케이스 ====== */}
        {sortedProducts.length === 0 ? (
          /* 검색/필터 결과 없음 엠티 스테이트 */
          <div className="bm-catalog-empty">
            <div className="bm-catalog-empty-icon">🔍</div>
            <h3 className="bm-catalog-empty-title">
              {isEn ? 'No products match your criteria' : '조건에 맞는 제품을 찾을 수 없습니다'}
            </h3>
            <p className="bm-catalog-empty-desc">
              {isEn
                ? 'Try searching with different keywords or resetting your active filters.'
                : '다른 검색어를 입력하시거나 필터를 변경 또는 초기화해 보세요.'}
            </p>
            <button className="bm-catalog-empty-btn" onClick={handleResetFilters}>
              {isEn ? 'Reset Filters' : '필터 초기화'}
            </button>
          </div>
        ) : (
          <div className="bm-catalog-grid">
            {paginatedProducts.map(p => {
              const b = brands.find(brand => brand.id === p.brandId);
              return (
                <div
                  key={p.id}
                  className="bm-catalog-card"
                  onClick={(e) => handleOpenModal(e, p)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    {/* 이미지 영역 */}
                    <div className="bm-catalog-card-image-wrap">
                      <img
                        src={p.image}
                        alt={p.nameKo}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          if (b?.logo) {
                            e.target.src = b.logo;
                          } else {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                      {p.category && (
                        <span className="bm-catalog-card-cat-badge">
                          {isEn ? (categoryEnMap[p.category] || p.category) : p.category}
                        </span>
                      )}
                    </div>

                    {/* 본문 정보 */}
                    <div className="bm-catalog-card-body">
                      <span className="bm-catalog-card-brand-name">
                        {isEn ? (b?.nameEn || b?.nameKo) : b?.nameKo}
                      </span>
                      <h3 className="bm-catalog-card-title">
                        {isEn ? (p.nameEn || p.nameKo) : p.nameKo}
                      </h3>
                      {p.spec && (
                        <span className="bm-catalog-card-spec">
                          {p.spec}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 카드 하단 푸터 (바코드 코드 + 상세 화살표) */}
                  <div className="bm-catalog-card-footer">
                    <span>CODE: {p.code || '-'}</span>
                    <span className="bm-catalog-view-detail">
                      {isEn ? 'Quick View' : '상세보기'}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ====== 5. 페이지네이션 ====== */}
        {totalPages > 1 && (
          <div className="bm-catalog-pagination">
            <button
              className="bm-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && page - prev > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span style={{ color: '#94A3B8', padding: '0 4px' }}>…</span>}
                    <button
                      className={`bm-page-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              className="bm-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              aria-label="Next Page"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ====== 6. 상품 상세 팝업 모달 ====== */}
      {modalProduct && (
        <div className="bm-modal-overlay" onClick={() => setModalProduct(null)}>
          <div className="bm-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* 닫기 버튼 */}
            <button
              className="bm-modal-close-btn"
              onClick={() => setModalProduct(null)}
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="bm-modal-body">
              {/* 상단 2열: 큰 이미지 + 요약 정보 */}
              <div className="bm-modal-top-grid">
                <div className="bm-modal-image-stage">
                  <img
                    src={modalProduct.image}
                    alt={modalProduct.nameKo}
                    onError={(e) => {
                      e.target.onerror = null;
                      if (modalBrand?.logo) {
                        e.target.src = modalBrand.logo;
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                </div>

                <div className="bm-modal-info">
                  <Link
                    to={`/brands/${modalBrand?.id}`}
                    className="bm-modal-brand-tag"
                    style={{ color: modalBrand?.color || 'var(--bm-primary)' }}
                  >
                    {isEn ? (modalBrand?.nameEn || modalBrand?.nameKo) : modalBrand?.nameKo}
                  </Link>

                  <h2 className="bm-modal-title">
                    {isEn ? (modalProduct.nameEn || modalProduct.nameKo) : modalProduct.nameKo}
                  </h2>

                  <div className="bm-modal-badges">
                    <span className="bm-modal-badge cat">
                      {isEn ? (categoryEnMap[modalProduct.category] || modalProduct.category) : modalProduct.category}
                    </span>
                    {modalProduct.petType && (
                      <span className="bm-modal-badge">
                        {isEn ? (petTypeEnMap[modalProduct.petType] || modalProduct.petType) : (petTypeKoMap[modalProduct.petType] || modalProduct.petType)}
                      </span>
                    )}
                  </div>

                  {/* 상세 규격 메타 정보 그리드 */}
                  <div className="bm-modal-meta-grid">
                    <div className="bm-modal-meta-item">
                      <span className="bm-modal-meta-label">{isEn ? 'BARCODE' : '상품 바코드'}</span>
                      <span className="bm-modal-meta-value">{modalProduct.code || '-'}</span>
                    </div>
                    <div className="bm-modal-meta-item">
                      <span className="bm-modal-meta-label">{isEn ? 'SPECIFICATION' : '규격 / 용량'}</span>
                      <span className="bm-modal-meta-value">{modalProduct.spec || (isEn ? 'Standard' : '표준 규격')}</span>
                    </div>
                    <div className="bm-modal-meta-item">
                      <span className="bm-modal-meta-label">{isEn ? 'SHELF LIFE' : '유통기한'}</span>
                      <span className="bm-modal-meta-value">
                        {isEn ? (modalProduct.shelfLifeEn || '18 months from mfg.') : (modalProduct.shelfLife || '제조일로부터 18개월')}
                      </span>
                    </div>
                    <div className="bm-modal-meta-item">
                      <span className="bm-modal-meta-label">{isEn ? 'ORIGIN' : '원산지 / 제조국'}</span>
                      <span className="bm-modal-meta-value">
                        {isEn ? (modalProduct.originEn || 'Republic of Korea') : (modalProduct.origin || '대한민국')}
                      </span>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="bm-modal-actions">
                    {modalProduct.purchaseUrl ? (
                      <a
                        href={modalProduct.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bm-modal-buy-btn"
                      >
                        {isEn ? 'Buy Now' : '공식몰 바로구매'} ↗
                      </a>
                    ) : (
                      <button
                        disabled
                        className="bm-modal-buy-btn"
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                      >
                        {isEn ? 'Purchase Link Ready' : '구매처 준비중'}
                      </button>
                    )}

                    <Link
                      to={`/catalog/${modalProduct.id}`}
                      className="bm-modal-fullpage-link"
                    >
                      {isEn ? 'Full Page View' : '상세페이지 전체보기'} →
                    </Link>
                  </div>
                </div>
              </div>

              {/* 하단 탭: 제품 특징 / 원료 및 성분 */}
              <div>
                <div className="bm-modal-tabs">
                  {(modalFeaturesList.length > 0 || (Array.isArray(modalProduct.infoImages) && modalProduct.infoImages.length > 0)) && (
                    <button
                      className={`bm-modal-tab-btn ${modalTab === 'info' ? 'active' : ''}`}
                      onClick={() => setModalTab('info')}
                    >
                      {isEn ? 'Features & Details' : '제품 핵심 특징'}
                    </button>
                  )}
                  {(modalNutritionEntries.length > 0 || modalProduct.ingredients) && (
                    <button
                      className={`bm-modal-tab-btn ${modalTab === 'nutrition' ? 'active' : ''}`}
                      onClick={() => setModalTab('nutrition')}
                    >
                      {isEn ? 'Ingredients & Nutrition' : '원료 및 영양성분'}
                    </button>
                  )}
                </div>

                <div className="bm-modal-tab-panel">
                  {modalTab === 'info' && modalFeaturesList.length > 0 && (
                    <div>
                      <ul className="bm-modal-features-list">
                        {modalFeaturesList.map((feat, idx) => (
                          <li key={idx} className="bm-modal-feature-item">
                            <span className="bm-modal-check-icon">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {modalTab === 'info' && Array.isArray(modalProduct.infoImages) && modalProduct.infoImages.length > 0 && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {modalProduct.infoImages.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`${isEn ? modalProduct.nameEn : modalProduct.nameKo} 상세이미지 ${idx + 1}`}
                          style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #EAEAEA' }}
                        />
                      ))}
                    </div>
                  )}

                  {modalTab === 'nutrition' && (
                    <div>
                      {modalProduct.ingredients && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '6px', fontWeight: 700 }}>
                            {isEn ? 'USED INGREDIENTS' : '사용 원료'}
                          </h4>
                          <p style={{ fontSize: '0.9rem', color: '#1E293B', lineHeight: 1.6, background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px' }}>
                            {isEn ? (modalProduct.ingredientsEn || translateIngredients(modalProduct.ingredients)) : modalProduct.ingredients}
                          </p>
                        </div>
                      )}

                      {modalNutritionEntries.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '8px', fontWeight: 700 }}>
                            {isEn ? 'GUARANTEED NUTRITION' : '등록 성분량'}
                          </h4>
                          <div className="bm-modal-nutrition-grid">
                            {modalNutritionEntries.map(([k, v]) => (
                              <div key={k} className="bm-modal-nutrition-card">
                                <span className="bm-modal-nutrition-key">{k.toUpperCase()}</span>
                                <span className="bm-modal-nutrition-val">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
