// 리뉴얼 문의하기 페이지 (Contact Us Renewal 2026)
// 1. 시네마틱 서브 히어로 (투명 헤더 연동 + 다크 틴트 + KPI 배지)
// 2. 영업 전담팀 다이렉트 명함 쇼케이스 (영업1팀 국내 / 영업2팀 해외)
//    - 실물 명함 3D 호버 + 확대 라이트박스 + 원클릭 전화/이메일 버튼
// 3. 2열 비대칭 본사 정보 & 스마트 B2B 문의 접수 폼 (Web3Forms API 연동)
// 4. B2B 파트너십 FAQ (자주 묻는 질문 아코디언)
// 5. 국내외 유통 파트너사 신뢰 바

import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useData } from '../context/DataContext';
import { usePageContent } from '../content/usePageContent';
import { useSiteList } from '../content/siteLists';
import b2bBuildingImg from '../assets/b2b_building.jpg';

const WEB3FORMS_ACCESS_KEY = '8207939c-fd68-4c59-ae20-62ea022b6952';

export default function Contact() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { brands, siteSettings } = useData();
  const { txt } = usePageContent('contact');
  const businessCards = useSiteList('businessCards');

  // 폼 입력값 상태
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    position: '',
    email: '',
    phone: '',
    country: '',
    category: 'export', // export, domestic, oem, other
    brand: brands[0]?.id || '',
    message: '',
    privacyAgreed: true
  });
  const [submitting, setSubmitting] = useState(false);

  // 마우스 오버 시 화면 정중앙 명함 확대 프리뷰 상태
  const [hoveredCard, setHoveredCard] = useState(null);

  // FAQ 아코디언 상태 (기본 0번 열림)
  const [openFaq, setOpenFaq] = useState(0);

  // 폼 입력 핸들러
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 폼 제출 핸들러 (Web3Forms API)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.privacyAgreed) {
      alert(isEn ? 'Please agree to the privacy policy.' : '개인정보 수집 및 이용에 동의해 주세요.');
      return;
    }

    const categoryLabels = {
      export: isEn ? 'Global Export' : '해외 수출',
      domestic: isEn ? 'Domestic Retail' : '국내 유통/입점',
      oem: isEn ? 'OEM / ODM Manufacturing' : 'OEM / ODM 제조 위탁',
      other: isEn ? 'General Partnership' : '기타 사업 제휴'
    };
    const typeLabel = categoryLabels[formData.category] || formData.category;

    const selectedBrand = brands.find(b => b.id === formData.brand);
    const brandLabel = selectedBrand ? (isEn ? (selectedBrand.nameEn || selectedBrand.nameKo) : selectedBrand.nameKo) : '-';

    setSubmitting(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `[BOOMYUNG B2B 문의 - ${typeLabel}] ${formData.company || '(회사명 미입력)'}`,
          from_name: formData.company || formData.name,
          '문의 유형': typeLabel,
          '회사명': formData.company,
          '담당자명': `${formData.name} ${formData.position ? `(${formData.position})` : ''}`,
          email: formData.email,
          '연락처': formData.phone,
          '국가/지역': formData.country || '대한민국',
          '관심 브랜드': brandLabel,
          '상세 문의 내용': formData.message
        })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'submit failed');

      alert(isEn
        ? `[${typeLabel}] Thank you. Our dedicated B2B team will review your inquiry and contact you within 24 hours.`
        : `[${typeLabel}] 문의가 성공적으로 접수되었습니다. 영업 담당자가 검토 후 24시간 이내에 신속히 회신드리겠습니다.`);
      setFormData({
        company: '',
        name: '',
        position: '',
        email: '',
        phone: '',
        country: '',
        category: 'export',
        brand: brands[0]?.id || '',
        message: '',
        privacyAgreed: true
      });
    } catch (err) {
      alert(isEn
        ? 'Failed to send your inquiry. Please try again or contact our sales team directly by phone/email.'
        : '문의 전송에 실패했습니다. 잠시 후 다시 시도하시거나 상단의 담당자 직통 전화/이메일로 직접 문의해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 영업 담당자 명함 데이터는 관리자 페이지에서 추가/수정 가능한 목록(siteLists.js)에서 가져온다 (위의 useSiteList('businessCards'))

  // FAQ 목록 데이터
  const faqs = [
    {
      qKo: '제품 발주 시 최소 주문 수량(MOQ) 기준은 어떻게 되나요?',
      qEn: 'What are the Minimum Order Quantity (MOQ) requirements for wholesale orders?',
      aKo: '부명의 자체 완제품 브랜드(DAYSPO, Bell bird, HOWPET 등)는 규격 카톤 박스 단위로 소량 발주 및 복합 발주가 가능합니다. 자체 브랜드(PB) 개발 및 OEM/ODM 전용 맞춤 배합 주문의 경우 원료 규격과 패키징 형태에 따라 상호 협의된 최소 배치 단위를 적용합니다.',
      aEn: 'For BOOMYUNG proprietary brands (DAYSPO, Bell bird, HOWPET, etc.), wholesale orders can be placed by standard carton box quantities. For custom OEM/ODM formulation and PB packaging, tailored MOQ requirements apply depending on ingredient sourcing and batch specifications.'
    },
    {
      qKo: 'PB 및 OEM/ODM 맞춤형 제조 개발이 가능한가요?',
      qEn: 'Do you provide private label (PB) and custom OEM/ODM manufacturing?',
      aKo: '네, 가능합니다. (주)부명은 벤토나이트/두부모래 특허 기술 및 기능성 반려동물 간식 코팅 배합 특허를 보유하고 있습니다. 바이어가 희망하는 스펙, 원료 배합비, 패키지 디자인에 맞춘 전담 원스톱 R&D 및 위탁 제조 솔루션을 제공합니다.',
      aEn: 'Yes. BOOMYUNG holds registered patents for proprietary bentonite and tofu cat litter manufacturing as well as functional pet treat formulations. We offer comprehensive, one-stop OEM/ODM solutions from custom R&D to final retail packaging.'
    },
    {
      qKo: '해외 수출 시 통관 및 검역 서류 지원이 되나요?',
      qEn: 'Do you provide export certification documents for overseas customs clearance?',
      aKo: '국제 품질 및 식품안전 규격인 ISO 14001, ISO 22000, HACCP 공인 인증을 보유하고 있으며, 수입국 요건에 맞춘 성분분석표(COA), 자유판매증명서(CFS), 원산지증명서(COO), 검역증명서 등 필수 통관 서류를 완벽히 지원합니다.',
      aEn: 'We hold accredited ISO 14001, ISO 22000, and HACCP certifications. We prepare all required export documentation including Certificate of Analysis (COA), Certificate of Free Sale (CFS), Certificate of Origin (COO), and sanitary veterinary certificates according to your country regulations.'
    },
    {
      qKo: '제품 샘플 신청 및 배송 절차는 어떻게 진행되나요?',
      qEn: 'How can we request product samples and evaluation kits?',
      aKo: '본 페이지의 문의 접수 폼을 통해 관심 브랜드와 제품군, 사업자 정보를 입력해 주시면 담당 영업팀이 1영업일 이내에 연락드려 샘플 발송 일정과 상세 카탈로그를 지원해 드립니다.',
      aEn: 'Please submit your company details and interested product lines through our inquiry form. Our sales executive will contact you within 1 business day to arrange sample kits and wholesale pricing sheets.'
    }
  ];

  return (
    <div className="bm-contact-page">
      {/* ====== 1. 시네마틱 서브 히어로 ====== */}
      <section
        className="bm-sub-hero header-extended-hero"
        style={{
          backgroundImage: `url(${b2bBuildingImg})`
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

      {/* ====== 상단 핵심 지표 KPI 바 ====== */}
      <div className="bm-container">
        <div className="bm-contact-kpi-bar">
          <div className="bm-contact-kpi-pill">
            <span>{isEn ? 'Prompt Response within 24 Hours' : '평균 24시간 이내 신속 회신'}</span>
          </div>
          <div className="bm-contact-kpi-pill">
            <span>{isEn ? '1:1 Dedicated Account Manager' : '1:1 전담 영업팀 직접 배정'}</span>
          </div>
          <div className="bm-contact-kpi-pill">
            <span>{isEn ? 'Export Network in 15+ Countries' : '글로벌 15개국 수출 파트너십'}</span>
          </div>
        </div>

        {/* ====== 2. 부명 전담 영업팀 & 본사 안내 (좌: 본사 안내 / 우: 영업팀 명함 위아래) ====== */}
        <section style={{ marginBottom: '90px' }}>
          <div className="bm-contact-section-head">
            <span className="bm-contact-tag">{txt('teamEyebrow')}</span>
            <h2 className="bm-contact-title">
              {txt('teamTitle')}
            </h2>
            <p className="bm-contact-desc" style={{ whiteSpace: 'pre-line' }}>
              {txt('teamBody')}
            </p>
          </div>

          <div className="bm-contact-team-split">
            {/* 좌측 : 부명본사 안내 */}
            <div className="bm-hq-card">
              <div className="bm-hq-title-wrap">
                <div className="bm-hq-logo-wrap">
                  <img src="./assets/boomyung_ci_logo.png" alt="BOOMYUNG" className="bm-hq-logo-img" />
                </div>
                <span className="bm-contact-tag">HEADQUARTERS</span>
              </div>

              <div className="bm-hq-info-list">

                <div className="bm-hq-info-item">
                  <div className="bm-hq-info-text">
                    <span className="bm-hq-info-label">{isEn ? 'Office Address' : '본사 소재지'}</span>
                    <span className="bm-hq-info-val" style={{ whiteSpace: 'pre-line' }}>
                      {txt('hqAddress')}
                    </span>
                  </div>
                </div>

                <div className="bm-hq-info-item">
                  <div className="bm-hq-info-text">
                    <span className="bm-hq-info-label">{isEn ? 'Telephone' : '대표 전화'}</span>
                    <span className="bm-hq-info-val">{txt('hqTel')}</span>
                  </div>
                </div>

                <div className="bm-hq-info-item">
                  <div className="bm-hq-info-text">
                    <span className="bm-hq-info-label">{isEn ? 'Fax' : '팩스 번호'}</span>
                    <span className="bm-hq-info-val">{txt('hqFax')}</span>
                  </div>
                </div>

                <div className="bm-hq-info-item">
                  <div className="bm-hq-info-text">
                    <span className="bm-hq-info-label">{isEn ? 'Official Email' : '공식 이메일'}</span>
                    <span className="bm-hq-info-val">{siteSettings.contactEmail || 'help@petsb2b.co.kr'}</span>
                  </div>
                </div>

                <div className="bm-hq-info-item">
                  <div className="bm-hq-info-text">
                    <span className="bm-hq-info-label">{isEn ? 'Business Registration' : '사업자등록번호'}</span>
                    <span className="bm-hq-info-val">{txt('hqBizNo')}</span>
                  </div>
                </div>

                <div className="bm-hq-info-item">
                  <div className="bm-hq-info-text">
                    <span className="bm-hq-info-label">{isEn ? 'Operating Hours' : '업무 시간'}</span>
                    <span className="bm-hq-info-val">
                      {isEn ? 'Mon - Fri 09:00 - 18:00 (Lunch 12:00 - 13:00, Closed on Weekends)' : '평일 09:00 ~ 18:00 (점심시간 12:00 ~ 13:00 / 주말 및 공휴일 휴무)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 생산 및 물류 거점 콜아웃 */}
              <div className="bm-hq-factory-box">
                <div className="bm-hq-factory-head">
                  <span>{isEn ? 'Production & Logistics Facilities' : '생산 기지 및 물류 거점'}</span>
                </div>
                <p className="bm-hq-factory-desc">
                  {isEn
                    ? 'Proprietary bentonite processing plants, automated packaging centers, and integrated domestic/overseas distribution hubs.'
                    : '경기도 남양주시 소재 자체 모래 제조공장 및 원료 배합시설, 제1·제2 자동화 물류센터를 통해 전국 및 글로벌 수출 납품을 안정적으로 운영합니다.'}
                </p>
              </div>
            </div>

            {/* 우측 : 명함을 위아래 카드섹션으로 */}
            <div className="bm-sales-stack">
              {businessCards.map(team => {
                const currentImg = isEn ? (team.imgEn || team.imgKr) : (team.imgKr || team.imgEn);
                return (
                  <div key={team.id} className="bm-sales-card">
                    <div className="bm-sales-card-body">
                      <div className="bm-sales-card-head">
                        <span className="bm-sales-team-badge">
                          {isEn ? team.titleEn : team.titleKo}
                        </span>
                        <span className="bm-sales-scope-pill">
                          {isEn ? team.scopeEn : team.scopeKo}
                        </span>
                      </div>

                      <div className="bm-sales-person-info">
                        <div className="bm-sales-person-name">
                          {isEn ? team.personNameEn : team.personNameKo}
                          <span className="bm-sales-person-title">
                            {isEn ? team.personTitleEn : team.personTitleKo}
                          </span>
                        </div>
                        <p className="bm-sales-scope-desc">
                          {isEn ? team.descEn : team.descKo}
                        </p>
                      </div>

                      {/* 실물 명함 카드 프리뷰 (마우스 오버 시 화면 정중앙 확대) */}
                      <div
                        className="bm-sales-card-preview"
                        onMouseEnter={() => setHoveredCard({
                          img: currentImg,
                          name: isEn ? team.personNameEn : team.personNameKo,
                          title: isEn
                            ? `${team.titleEn} · ${team.personNameEn} ${team.personTitleEn}`
                            : `${team.titleKo} · ${team.personNameKo} ${team.personTitleKo}`
                        })}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img src={currentImg} alt={isEn ? team.personNameEn : team.personNameKo} />
                        <div className="bm-sales-card-zoom-hint">
                          <span>{isEn ? 'Hover to Zoom Card' : '마우스 오버 시 중앙 확대'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====== 3. 스마트 B2B 문의 접수 폼 ====== */}
        <section style={{ marginBottom: '90px' }}>
          <div className="bm-contact-section-head">
            <span className="bm-contact-tag">{txt('formEyebrow')}</span>
            <h2 className="bm-contact-title">
              {txt('formTitle')}
            </h2>
            <p className="bm-contact-desc" style={{ whiteSpace: 'pre-line' }}>
              {txt('formBody')}
            </p>
          </div>

          <div className="bm-form-card bm-form-card-full">
            <div className="bm-form-head">
              <span className="bm-contact-tag">SMART INQUIRY FORM</span>
              <h3 className="bm-form-title">{isEn ? 'B2B Partnership Application' : '맞춤형 B2B 제휴 접수'}</h3>
              <p className="bm-form-subtitle">
                {isEn
                  ? 'All inquiries are routed directly to the specialized department.'
                  : '접수된 문의는 해당 분야 전문 영업팀으로 즉시 배정되어 신속하게 회신드립니다.'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* 문의 유형 선택 칩 */}
              <div style={{ marginBottom: '20px' }}>
                <label className="bm-inquiry-chips-label">
                  {isEn ? 'Select Inquiry Category *' : '문의 유형을 선택해 주세요 *'}
                </label>
                <div className="bm-inquiry-chips">
                  <button
                    type="button"
                    className={`bm-inquiry-chip ${formData.category === 'export' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, category: 'export' })}
                  >
                    <span>{isEn ? 'Global Export' : '해외 수출 문의'}</span>
                  </button>
                  <button
                    type="button"
                    className={`bm-inquiry-chip ${formData.category === 'domestic' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, category: 'domestic' })}
                  >
                    <span>{isEn ? 'Domestic Retail' : '국내 유통 / 입점'}</span>
                  </button>
                  <button
                    type="button"
                    className={`bm-inquiry-chip ${formData.category === 'oem' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, category: 'oem' })}
                  >
                    <span>{isEn ? 'OEM / ODM Manufacturing' : 'OEM / ODM 제조 위탁'}</span>
                  </button>
                  <button
                    type="button"
                    className={`bm-inquiry-chip ${formData.category === 'other' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, category: 'other' })}
                  >
                    <span>{isEn ? 'General Partnership' : '기타 사업 제휴'}</span>
                  </button>
                </div>
              </div>

              <div className="bm-form-row">
                <div className="bm-form-group">
                  <label>
                    {isEn ? 'Company Name' : '회사명 (업체명)'} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    placeholder={isEn ? "e.g. Boomyung International" : "예: (주)부명유통"}
                  />
                </div>
                <div className="bm-form-group">
                  <label>
                    {isEn ? 'Contact Person & Title' : '담당자 성함 및 직급'} <span className="required">*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={isEn ? "Name" : "성함"}
                    />
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      placeholder={isEn ? "Title (Optional)" : "직급 (선택)"}
                    />
                  </div>
                </div>
              </div>

              <div className="bm-form-row">
                <div className="bm-form-group">
                  <label>
                    {isEn ? 'Email Address' : '이메일 주소'} <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="business@company.com"
                  />
                </div>
                <div className="bm-form-group">
                  <label>
                    {isEn ? 'Phone / Contact' : '연락처 (휴대전화)'} <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>

              <div className="bm-form-row">
                <div className="bm-form-group">
                  <label>{isEn ? 'Country / Region' : '국가 / 지역'}</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder={isEn ? "e.g. South Korea, USA, Thailand" : "예: 대한민국, 태국, 미국 등"}
                  />
                </div>
                <div className="bm-form-group">
                  <label>{isEn ? 'Interested Brand' : '관심 브랜드 / 품목'}</label>
                  <select name="brand" value={formData.brand} onChange={handleChange}>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>
                        {isEn ? (b.nameEn || b.nameKo) : b.nameKo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bm-form-group">
                <label>
                  {isEn ? 'Detailed Inquiry' : '상세 문의 내용'} <span className="required">*</span>
                </label>
                <textarea
                  name="message"
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={
                    isEn
                      ? "Please describe your business inquiry, target retail channels, estimated volume, or target launch date..."
                      : "희망 품목, 예상 발주 수량, 타겟 유통 채널, 납기 일정 등 원하시는 상담 내용을 자유롭게 적어주세요."
                  }
                />
              </div>

              {/* 개인정보 수집 및 이용 동의 */}
              <label className="bm-privacy-check">
                <input
                  type="checkbox"
                  name="privacyAgreed"
                  checked={formData.privacyAgreed}
                  onChange={handleChange}
                />
                <span>
                  {isEn
                    ? 'I agree to the collection and use of my contact information solely for responding to this B2B inquiry.'
                    : '입점 및 영업 상담 목적의 개인정보(회사명, 담당자명, 연락처, 이메일) 수집 및 이용에 동의합니다.'}
                </span>
              </label>

              <button
                type="submit"
                className="bm-form-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <span>{isEn ? 'Submitting...' : '문의 접수 중...'}</span>
                ) : (
                  <>
                    <span>{isEn ? 'SUBMIT B2B INQUIRY' : '문의 접수하기'}</span>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
        
        {/* ====== 4. B2B 파트너십 자주 묻는 질문 (FAQ) ====== */}
        <section className="bm-faq-section">
          <div className="bm-contact-section-head">
            <span className="bm-contact-tag">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="bm-contact-title">
              {isEn ? 'B2B Partnership FAQ' : '자주 묻는 질문 (FAQ)'}
            </h2>
            <p className="bm-contact-desc">
              {isEn
                ? 'Check common questions regarding MOQ, OEM manufacturing, export certification, and product samples.'
                : '입점 및 수출 파트너사에서 가장 자주 문의하시는 발주 기준, 특허 OEM 제조, 통관 서류 지원 등을 안내합니다.'}
            </p>
          </div>

          <div className="bm-faq-list">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`bm-faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="bm-faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                  >
                    <span>Q. {isEn ? item.qEn : item.qKo}</span>
                    <span className="bm-faq-arrow">▼</span>
                  </button>
                  {isOpen && (
                    <div className="bm-faq-answer">
                      {isEn ? item.aEn : item.aKo}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ====== 마우스 오버 시 화면 정중앙 명함 확대 팝업 (Overlay & Card) ====== */}
      <div className={`bm-card-hover-overlay ${hoveredCard ? 'active' : ''}`}>
        {hoveredCard && (
          <div className="bm-card-hover-center-box">
            <div className="bm-card-hover-img-wrap">
              <img src={hoveredCard.img} alt={hoveredCard.name} />
            </div>
            <div className="bm-card-hover-caption">
              <span className="bm-card-hover-badge">BUSINESS CARD</span>
              <h4 className="bm-card-hover-title">{hoveredCard.title}</h4>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
