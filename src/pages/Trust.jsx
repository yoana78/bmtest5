import ExpoGallery from '../components/ExpoGallery';
// 리뉴얼 신뢰와 인증 페이지 (Trust & Certification Renewal 2026)
// 1. 역동적 서브 히어로 (투명 헤더 연동 + 시네마틱 다크 틴트)
// 2. 신뢰 지표 KPI 카드 바 (국제 인증, 특허/디자인, 글로벌 박람회, 대형 유통망)
// 3. 서브 앵커 네비게이션 (품질 인증 | 보유 특허 | 글로벌 박람회 | 파트너사)
// 4. 국제 품질/안전 인증 시스템 4열 카드 (ISO 14001, ISO 22000, HACCP, AAFCO)
// 5. 특허 및 지식재산권 5열 쇼케이스 카드 (클릭 시 고해상도 증서 팝업)
// 6. 연도별 글로벌 엑스포 전시 갤러리 (2019~2025, 라이트박스 팝업 및 이전/다음 탐색)
// 7. 대형 유통 네트워크 및 펫 전문 유통사 파트너 로고 쇼케이스

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useData } from '../context/DataContext';
import { useSiteList } from '../content/siteLists';
import { usePageContent } from '../content/usePageContent';
import { buildExpoData } from '../content/expoData';
import iso14001Logo from '../assets/cert_logos/iso14001.png';
import iso22000Logo from '../assets/cert_logos/iso22000.png';
import haccpLogo from '../assets/cert_logos/haccp.png';
import aafcoLogo from '../assets/cert_logos/aafco_black.png';

const certLogoMap = {
  'ISO 14001': iso14001Logo,
  'ISO 22000': iso22000Logo,
  'HACCP': haccpLogo,
  'AAFCO': aafcoLogo,
};

export default function Trust() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { txt, img } = usePageContent('trust');
  const partners = useSiteList('partners');
  const petRetailPartners = useSiteList('petRetailPartners');
  const { siteSettings } = useData();
  const { photos: expoPhotos, meta: expoYearMeta } = useMemo(() => buildExpoData(siteSettings?.expoYears), [siteSettings?.expoYears]);

  // 모달 상태 관리
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [selectedPatent, setSelectedPatent] = useState(null);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPhotoIndex(null);
        setSelectedCert(null);
        setSelectedPatent(null);
      }
    };
    if (selectedPhotoIndex !== null || selectedCert !== null || selectedPatent !== null) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhotoIndex, selectedCert, selectedPatent]);

  // 인증서 목록 데이터 (ISO 14001, ISO 22000, HACCP, AAFCO)
  const certifications = [
    {
      code: 'ISO 14001',
      titleKo: '환경경영시스템 인증',
      titleEn: 'Environmental Management System',
      descKo: '생산 전 과정에서 환경 영향을 최소화하고 친환경 제조 기준을 엄격히 준수하는 국제 환경경영 표준을 적용합니다.',
      descEn: 'Certified international environmental management standard minimizing footprint across all production stages.',
      image: null,
      imageEn: null,
      logo: './assets/cert_logos/iso14001_logo.svg'
    },
    {
      code: 'ISO 22000',
      titleKo: '식품안전경영시스템 인증',
      titleEn: 'Food Safety Management System',
      descKo: '원료 입고부터 제조, 멸균, 포장 전 과정에 걸쳐 글로벌 식품 규격에 부합하는 안전 경영 시스템을 구축했습니다.',
      descEn: 'Global food safety standard implemented across entire pipeline from raw sourcing to sterile packaging.',
      image: null,
      imageEn: null,
      logo: './assets/cert_logos/iso22000_logo.svg'
    },
    {
      code: 'HACCP',
      titleKo: 'HACCP 위해요소 중점관리',
      titleEn: 'Hazard Analysis Critical Control Point',
      descKo: '식품 위해요소를 과학적·체계적으로 사전 분석 및 통제하여 반려동물이 안심하고 먹을 수 있는 제품을 생산합니다.',
      descEn: 'Systematic preventive approach to food safety biological, chemical, and physical hazards.',
      image: null,
      imageEn: null,
      logo: './assets/cert_logos/haccp_logo.svg'
    },
    {
      code: 'AAFCO',
      titleKo: '미국사료관리협회 영양기준 준수',
      titleEn: 'AAFCO Nutritional Guidelines',
      descKo: '글로벌 표준인 미국사료관리협회(AAFCO)의 엄격한 반려견·반려묘 필수 영양소 가이드라인을 100% 충족합니다.',
      descEn: 'Formulated in full compliance with rigorous global nutritional requirements of AAFCO.',
      image: null,
      logo: './assets/cert_logos/aafco_logo.svg'
    }
  ];

  // 특허 및 지식재산권 데이터
  const patents = [
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2252390',
      titleKo: '반려 동물용 육포 및 그 제조방법',
      titleEn: 'Pet Jerky and Manufacturing Method Thereof',
      image: './assets/patents/patent_2252390.jpg'
    },
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2042458',
      titleKo: '벤토나이트를 함유한 고양이 모래 및 그 제조방법',
      titleEn: 'Bentonite-Containing Cat Litter and Manufacturing Method Thereof',
      image: './assets/patents/patent_2042458.jpg'
    },
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2042457',
      titleKo: '두부 부산물을 함유한 고양이 모래 및 그 제조방법',
      titleEn: 'Tofu-Byproduct Cat Litter and Manufacturing Method Thereof',
      image: './assets/patents/patent_2042457.jpg'
    },
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2248006',
      titleKo: '노즈워크매트',
      titleEn: 'Nosework Mat',
      image: './assets/patents/patent_2248006.jpg'
    },
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2233264',
      titleKo: '반려 동물용 육포 포장방법',
      titleEn: 'Packaging Method for Pet Jerky',
      image: './assets/patents/patent_2233264.jpg'
    },
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2254626',
      titleKo: '치석제거가 가능한 반려동물용 껌',
      titleEn: 'Tartar-Removing Chew Gum for Pets',
      image: './assets/patents/patent_2254626.jpg'
    },
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2246000',
      titleKo: '원료육이 코팅된 반려동물용 간식 및 이의 제조방법',
      titleEn: 'Meat-Coated Pet Treat and Manufacturing Method Thereof',
      image: './assets/patents/patent_2246000.jpg'
    },
    {
      typeKo: '특허',
      typeEn: 'Patent',
      no: '10-2956733',
      titleKo: '반려동물 안구를 위한 식품 조성물',
      titleEn: 'Food Composition for Pet Eye Health',
      image: './assets/patents/patent_2956733.jpg'
    },
    {
      typeKo: '디자인등록',
      typeEn: 'Design Registration',
      no: '30-0833217',
      titleKo: '애견용 패드',
      titleEn: 'Pet Pad',
      image: './assets/patents/design_0833217.png'
    },
    {
      typeKo: '디자인등록',
      typeEn: 'Design Registration',
      no: '30-0847166',
      titleKo: '애완동물용 목줄',
      titleEn: 'Pet Leash',
      image: './assets/patents/design_0847166.png'
    }
  ];

  const expoYearGroups = [];
  expoPhotos.forEach((photo, index) => {
    const meta = expoYearMeta[photo.year] || { labelKo: photo.year, labelEn: photo.year, descKo: '', descEn: '' };
    let group = expoYearGroups.find(g => g.year === photo.year);
    if (!group) {
      group = { year: photo.year, ...meta, items: [] };
      expoYearGroups.push(group);
    }
    group.items.push({ photo, index });
  });

  // 라이트박스 네비게이션
  const nextPhoto = (e) => {
    e.stopPropagation();
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex + 1) % expoPhotos.length);
    }
  };

  const prevPhoto = (e) => {
    e.stopPropagation();
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex - 1 + expoPhotos.length) % expoPhotos.length);
    }
  };

  return (
    <div className="bm-trust-page">
      {/* ====== 1. 서브 히어로 (Sub Hero) ====== */}
      <section
        className="bm-sub-hero header-extended-hero"
        style={{
          backgroundImage: `url('${img('heroImage')}')`
        }}
      >
        <div className="bm-sub-hero-overlay" />
        <div className="bm-sub-hero-content animate-on-scroll fade-up is-visible">
          <span className="bm-sub-hero-tag">{txt('heroEyebrow')}</span>
          <h1 className="bm-sub-hero-title">
            {txt('heroTitle')}
          </h1>
          <p className="bm-sub-hero-desc" style={{ whiteSpace: 'pre-line' }}>
            {txt('heroBody')}
          </p>
        </div>
      </section>

      <div className="bm-container" style={{ paddingTop: '60px' }}>
        {/* ====== 2. 품질 및 안전 인증 시스템 섹션 ====== */}
        <section id="certs" style={{ marginBottom: '88px' }}>
          <div className="bm-trust-section-head">
            <div>
              <span className="bm-trust-tag">{txt('certEyebrow')}</span>
              <h2 className="bm-trust-title">{txt('certTitle')}</h2>
            </div>
            <p className="bm-trust-desc" style={{ whiteSpace: 'pre-line' }}>
              {txt('certBody')}
            </p>
          </div>

          <div className="bm-cert-grid">
            {certifications.map(cert => {
              const hasImage = !!cert.image;
              return (
                <div
                  key={cert.code}
                  className={`bm-cert-card ${hasImage ? 'clickable' : ''}`}
                  onClick={hasImage ? () => setSelectedCert(cert) : undefined}
                >
                  <div className="bm-cert-badge-wrap">
                    <span className="bm-cert-code">{cert.code}</span>
                    <div className={`bm-cert-logo-badge ${cert.code === 'AAFCO' ? 'aafco' : ''}`}>
                      {certLogoMap[cert.code] && (
                        <img src={certLogoMap[cert.code]} alt={cert.code} />
                      )}
                    </div>
                  </div>
                  <h3 className="bm-cert-card-title">{isEn ? cert.titleEn : cert.titleKo}</h3>
                  <p className="bm-cert-card-desc">{isEn ? cert.descEn : cert.descKo}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ====== 3. 보유 특허 및 지식재산권 섹션 ====== */}
        <section id="patents" style={{ marginBottom: '80px' }}>
          <div className="bm-trust-section-head">
            <div>
              <span className="bm-trust-tag">{txt('patentEyebrow')}</span>
              <h2 className="bm-trust-title">{txt('patentTitle')}</h2>
            </div>
            <p className="bm-trust-desc" style={{ whiteSpace: 'pre-line' }}>
              {txt('patentBody')}
            </p>
          </div>

          <div className="bm-patent-grid">
            {patents.map(p => (
              <div
                key={p.no}
                className="bm-patent-card"
                onClick={() => setSelectedPatent(p)}
                title={isEn ? 'Click to view patent certificate' : '클릭하면 특허증을 크게 볼 수 있습니다'}
              >
                <div className="bm-patent-preview-wrap">
                  <img src={p.image} alt={p.titleKo} loading="lazy" />
                </div>
                <div className="bm-patent-body">
                  <span className="bm-patent-badge">{isEn ? p.typeEn : p.typeKo}</span>
                  <h4 className="bm-patent-title">{isEn ? p.titleEn : p.titleKo}</h4>
                  <span className="bm-patent-no">No. {p.no}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 4. 글로벌 박람회 갤러리 섹션 ====== */}
        <ExpoGallery groups={expoYearGroups} en={isEn} onOpen={setSelectedPhotoIndex} title={txt('expoTitle')}/>

        {/* ====== 7. 유통 네트워크 및 파트너사 로고 벽 ====== */}
        <section id="partners" style={{ marginBottom: '100px' }}>
          <div className="bm-trust-section-head">
            <div>
              <span className="bm-trust-tag">{txt('networkEyebrow')}</span>
              <h2 className="bm-trust-title">{txt('networkTitle')}</h2>
            </div>
            <p className="bm-trust-desc" style={{ whiteSpace: 'pre-line' }}>
              {txt('networkBody')}
            </p>
          </div>

          {/* 대형마트 & 이커머스 파트너 */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--bm-text-dark)', marginBottom: '16px' }}>
              {isEn ? 'Major Retail & E-Commerce' : '대형마트 및 주요 온·오프라인 유통망'}
            </h3>
            <div className="bm-trust-partners-grid">
              {partners.map(p => (
                <div key={p.id} className="bm-trust-partner-box">
                  <div className="bm-trust-partner-img-wrap">
                    <img src={p.logo} alt={p.nameKo} loading="lazy" style={{ transform: `scale(${Number(p.logoScale) || 1})` }} />
                  </div>
                  <span className="bm-trust-partner-name">{isEn ? p.nameEn : p.nameKo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 반려동물 전문 유통사 파트너 */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--bm-text-dark)', marginBottom: '16px' }}>
              {isEn ? 'Pet Specialty Distributors' : '국내 대표 펫 전문 유통 파트너사'}
            </h3>
            <div className="bm-trust-partners-grid">
              {petRetailPartners.map(p => (
                <div key={p.id} className="bm-trust-partner-box">
                  {p.logo ? (
                    <>
                      <div className="bm-trust-partner-img-wrap">
                        <img src={p.logo} alt={p.nameKo} loading="lazy" style={{ transform: `scale(${Number(p.logoScale) || 1})` }} />
                      </div>
                      <span className="bm-trust-partner-name">{isEn ? p.nameEn : p.nameKo}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                      {isEn ? p.nameEn : p.nameKo}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ====== 8. 품질 인증서 모달 팝업 ====== */}
      {selectedCert !== null && (
        <div className="bm-lightbox-overlay" onClick={() => setSelectedCert(null)}>
          <div className="bm-lightbox-box cert-doc-modal" onClick={e => e.stopPropagation()}>
            <button
              className="bm-modal-close-btn"
              onClick={() => setSelectedCert(null)}
              style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10 }}
            >
              ✕
            </button>
            <div className="bm-lightbox-media-stage">
              <img
                src={isEn ? selectedCert.imageEn : selectedCert.image}
                alt={isEn ? selectedCert.titleEn : selectedCert.titleKo}
              />
            </div>
            <div className="bm-lightbox-footer">
              <div>
                <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {selectedCert.code} — {isEn ? selectedCert.titleEn : selectedCert.titleKo}
                </h4>
                <p style={{ color: '#94A3B8', margin: '4px 0 0', fontSize: '0.84rem' }}>
                  {isEn ? selectedCert.descEn : selectedCert.descKo}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== 9. 특허증 모달 팝업 ====== */}
      {selectedPatent !== null && (
        <div className="bm-lightbox-overlay" onClick={() => setSelectedPatent(null)}>
          <div className="bm-lightbox-box cert-doc-modal" onClick={e => e.stopPropagation()}>
            <button
              className="bm-modal-close-btn"
              onClick={() => setSelectedPatent(null)}
              style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10 }}
            >
              ✕
            </button>
            <div className="bm-lightbox-media-stage">
              <img src={selectedPatent.image} alt={selectedPatent.titleKo} />
            </div>
            <div className="bm-lightbox-footer">
              <div>
                <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {isEn ? selectedPatent.typeEn : selectedPatent.typeKo} (No. {selectedPatent.no})
                </h4>
                <p style={{ color: '#67E8F9', margin: '4px 0 0', fontSize: '0.88rem', fontWeight: 600 }}>
                  {isEn ? selectedPatent.titleEn : selectedPatent.titleKo}
                </p>
                {isEn && (
                  <p style={{ color: '#94A3B8', margin: '4px 0 0', fontSize: '0.76rem' }}>
                    Official certificate issued by the Korean Intellectual Property Office (KIPO).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== 10. 박람회 라이트박스 팝업 (이전/다음 탐색) ====== */}
      {selectedPhotoIndex !== null && (
        <div className="bm-lightbox-overlay" onClick={() => setSelectedPhotoIndex(null)}>
          <div className="bm-lightbox-box" onClick={e => e.stopPropagation()}>
            <button
              className="bm-modal-close-btn"
              onClick={() => setSelectedPhotoIndex(null)}
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              ✕
            </button>
            <div className="bm-lightbox-media-stage">
              <img
                src={expoPhotos[selectedPhotoIndex].image}
                alt={expoPhotos[selectedPhotoIndex].titleKo}
              />
            </div>
            <div className="bm-lightbox-footer">
              <div>
                <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {isEn ? expoPhotos[selectedPhotoIndex].titleEn : expoPhotos[selectedPhotoIndex].titleKo}
                </h4>
                <span style={{ color: '#67E8F9', fontSize: '0.84rem', fontWeight: 600 }}>
                  {isEn ? expoPhotos[selectedPhotoIndex].locationEn : expoPhotos[selectedPhotoIndex].locationKo} ({selectedPhotoIndex + 1} / {expoPhotos.length})
                </span>
              </div>
              <div className="bm-lightbox-nav-btns">
                <button className="bm-lightbox-nav-btn" onClick={prevPhoto}>
                  ← {isEn ? 'Prev' : '이전'}
                </button>
                <button className="bm-lightbox-nav-btn" onClick={nextPhoto}>
                  {isEn ? 'Next' : '다음'} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
