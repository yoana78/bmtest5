// 관리자 페이지에서 고칠 수 있는 "페이지 문구/이미지" 목록입니다.
//
// 이 파일 하나가 두 가지 역할을 합니다.
//   1) 각 페이지가 화면에 뿌릴 기본 문구(= 지금 사이트에 나가고 있는 값)
//   2) 관리자 페이지 입력 폼을 자동으로 만들어주는 설계도
// 그래서 여기에 항목을 추가하면 화면과 관리자 입력칸이 같이 생깁니다.
//
// 필드 옵션
//   type: 'text'(한 줄) | 'textarea'(여러 줄, 엔터 줄바꿈 그대로 반영) | 'image'
//   size: 화면에 나가는 글자 크기 — 입력칸 옆에 표시해서, 크기가 다른 문구를
//         같은 칸에 섞어 넣지 않도록 안내하는 용도
//   koOnly: true면 영문 입력칸을 만들지 않음
//   width/height: 이미지 권장 해상도. 업로드 시 이 비율로 자동 크롭됨

export const PAGE_SCHEMA = {
  home: {
    label: '홈',
    sections: [
      {
        label: '메인 상단 (풀화면 비디오 히어로)',
        note: '배경 영상은 코드에 고정된 파일을 사용합니다. 문구만 여기서 바꿀 수 있습니다.',
        fields: [
          { key: 'heroSub', label: '작은 영문 라벨', type: 'text', size: '0.85rem', koOnly: true, ko: 'Respect for Pet Life' },
          { key: 'heroTitle', label: '메인 제목', type: 'textarea', size: '4.6rem', ko: '함께하는 일상에,\n건강한 행복을.', en: 'Better food.\nHappier life, together.' },
          { key: 'heroBody', label: '본문', type: 'textarea', size: '1.05rem', ko: '반려동물을 향한 진심을 담아\n좋은 먹거리와 더 나은 내일을 만듭니다.', en: 'Thoughtful nutrition and everyday care,\nfor a healthier life by your side.' },
          { key: 'heroButton', label: '버튼 문구', type: 'text', size: '0.85rem', ko: '브랜드 포트폴리오', en: 'Explore Brands' },
        ],
      },
      {
        label: '생산 및 R&D 인프라 섹션 제목',
        fields: [
          { key: 'infraEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'INFRASTRUCTURE & R&D' },
          { key: 'infraTitle', label: '섹션 제목', type: 'text', size: '1.8rem', ko: '생산 및 R&D 인프라', en: 'Production & R&D Infrastructure' },
          { key: 'infraBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '엄격한 품질 인증을 획득한 제조시설과 전문 연구소, 첨단 물류 시스템으로 안전하고 신뢰할 수 있는 제품을 공급합니다.', en: 'Certified manufacturing facilities, specialized research, and nationwide logistics supporting premium quality.' },
        ],
      },
      {
        label: '브랜드 & 대표 상품 섹션 제목',
        fields: [
          { key: 'coreEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'Core Brands & Products' },
          { key: 'coreTitle', label: '섹션 제목', type: 'textarea', size: '3.2rem', ko: '매일의 한 끼부터,\n기분 좋은 작은 보상까지.', en: 'From everyday meals\nto little moments of joy.' },
          { key: 'coreBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '과학과 신뢰로 만든 부명의 대표 펫 케어 브랜드와 엄선된 베스트셀러 제품 라인업입니다.', en: 'Specialized pet care brands and verified bestseller lineup built on science and trust.' },
        ],
      },
      {
        label: '수입 브랜드 하이라이트 섹션 제목',
        fields: [
          { key: 'importedEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'Imported Brands' },
          { key: 'importedTitle', label: '섹션 제목', type: 'text', size: '1.8rem', ko: '세계에서 엄선한 수입 브랜드', en: 'Global Brand Partners' },
          { key: 'importedBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '전 세계에서 엄선한 프리미엄 펫 브랜드를 국내에 소개합니다.', en: 'Carefully selected premium brands from around the world.' },
        ],
      },
      {
        label: '국내 대형 유통 파트너 섹션 제목',
        fields: [
          { key: 'retailTitle', label: '섹션 제목', type: 'text', size: '1.8rem', ko: '부명과 함께하는 국내 대형 유통 파트너', en: 'Major Retail Partners with BOOMYUNG' },
          { key: 'retailBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '이마트, 홈플러스, 코스트코, 쿠팡, 편의점 4사 등 국내 13개 이상 유통 채널에 검증된 제품을 공급합니다.', en: 'Supplying verified products to major retail networks including E-Mart, Homeplus, Costco, Coupang, and convenience stores.' },
        ],
      },
      {
        label: '펫 전문 유통사 섹션 제목',
        fields: [
          { key: 'petRetailTitle', label: '섹션 제목', type: 'text', size: '1.8rem', ko: '부명과 함께 하는 국내 펫 전문 유통사', en: 'Pet Specialty Distributors' },
          { key: 'petRetailBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '선진펫, 꼬기오, 야옹아멍멍해봐, 더 키코 등 국내 대형 펫 유통 채널에 검증된 제품을 공급합니다.', en: 'Supplying premium pet products to leading pet specialty distributors including Seonjin Pet, Kkio, Dog & Cat Paradise, and THE KICO.' },
        ],
      },
      {
        label: 'B2B 파트너십 배너',
        fields: [
          { key: 'b2bTag', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'BUSINESS PARTNERSHIP' },
          { key: 'b2bTitle', label: '큰 제목', type: 'textarea', size: '1.8rem', ko: '부명과 함께하는\n비즈니스 파트너십', en: 'Partner with BOOMYUNG for Premium Pet Products' },
          { key: 'b2bBody', label: '본문', type: 'textarea', size: '0.92rem', ko: '국내 대형 유통망부터 글로벌 수출까지, 검증된 펫 케어 제품으로 파트너십을 확장합니다.', en: 'From domestic retail to global exports, we expand reliable partnerships with proven pet care products.' },
          { key: 'b2bBottomText', label: '하단 안내 문구', type: 'textarea', size: '1.05rem', ko: '대형 할인마트, 이커머스, 글로벌 바이어와 OEM/ODM 및 수출 파트너십을 진행합니다. 필요한 내용을 알려주세요.', en: 'We partner with major discount hypermarkets, e-commerce, global buyers, OEM/ODM, and overseas export. Let us know your requirements.' },
          { key: 'b2bButton', label: '버튼 문구', type: 'text', size: '0.85rem', ko: 'B2B 문의하기', en: 'B2B Inquiries' },
        ],
      },
    ],
  },

  about: {
    label: '회사소개',
    sections: [
      {
        label: '상단 배너',
        fields: [
          { key: 'heroImage', label: '배경 사진', type: 'image', width: 2560, height: 1440, src: './assets/renewal/about-hero.jpg' },
          { key: 'heroEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.82rem', koOnly: true, ko: 'ABOUT BOOMYUNG' },
          { key: 'heroTitle', label: '페이지 제목', type: 'textarea', size: '2.5rem', ko: '더 좋은 일상은,\n존중에서 시작됩니다.', en: 'A better everyday\nbegins with respect.' },
          { key: 'heroBody', label: '본문', type: 'textarea', size: '1.05rem', ko: '30년 이상 축적된 정직한 기술과 원칙 있는 품질, 견고한 신뢰를 바탕으로 펫 헬스케어의 미래를 창조합니다.', en: 'Built upon 30 years of honest technology, uncompromising safety protocols, and enduring customer trust.' },
        ],
      },
      {
        label: 'CEO 메시지',
        fields: [
          { key: 'ceoEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'CEO Message' },
          { key: 'ceoSectionTitle', label: '섹션 제목', type: 'textarea', size: '1.8rem', ko: '생명을 존중하는 마음에서\n기술이 시작됩니다', en: 'Dreaming of a World Where Pets Thrive' },
          { key: 'ceoSectionBody', label: '섹션 소개', type: 'textarea', size: '0.95rem', ko: '(주)부명이 추구하는 진정한 가치와 정직한 약속을 전합니다.', en: "A warm message of dedication and integrity from CEO Seong-hoon Jeong." },
          { key: 'ceoHighlight', label: '왼쪽 카드 인용구', type: 'textarea', size: '1.4rem', ko: '존중은 아주 작고 사소한 배려에서부터 시작됩니다.', en: 'Respect begins with small and thoughtful care.' },
          { key: 'ceoName', label: '대표 이름', type: 'text', size: '0.95rem', ko: '정 성 훈', en: 'Seong-hoon Jeong' },
          { key: 'ceoTitleText', label: '대표 직함', type: 'text', size: '0.85rem', ko: '(주)부명 대표이사', en: 'CEO, BOOMYUNG CO., LTD.' },
          { key: 'ceoLead', label: '인사말 첫 문장', type: 'textarea', size: '1.2rem', ko: '안녕하십니까. (주)부명 대표이사 정성훈입니다.', en: 'Hello, I am Seong-hoon Jeong, CEO of BOOMYUNG CO., LTD.' },
          { key: 'ceoBody', label: '인사말 본문 — 빈 줄로 문단을 나눕니다', type: 'textarea', size: '0.96rem', ko: '부명은 반려동물과 반려인 모두에게 최상의 품질과 신뢰를 전한다는 확고한 신념 아래, 상품 기획부터 과학적인 R&D, 전문 제조 시설, 그리고 전국 물류 네트워크에 이르기까지 펫 라이프의 전 과정을 아우르는 종합 펫 헬스케어 기업으로 성장해 왔습니다.\n\n급변하는 반려동물 시장의 트렌드와 반려 가족의 목소리를 면밀히 분석하여 안심하고 선택할 수 있는 정직한 제품을 선보이고 있으며, 이마트, GS, 농협 등 국내 최고의 유통 파트너사들과의 두터운 신뢰를 바탕으로 지속 가능한 혁신을 이어가고 있습니다.\n\n앞으로도 협력 매장과 소비자 모두가 깊이 공감하고 신뢰할 수 있는 상생 경영을 지향하며, 엄격한 품질 관리와 차별화된 제조 역량으로 반려동물의 건강하고 행복한 삶을 지키는 든든한 동반자가 되겠습니다. 감사합니다.', en: 'Under the conviction of providing the highest quality products and heartfelt services to both companion animals and their guardians, BOOMYUNG has grown into a comprehensive enterprise covering product planning, scientific R&D, advanced manufacturing, and nationwide logistics.\n\nWe continuously examine fast-evolving market trends and guardians’ genuine needs to introduce nutritious, reliable products. Through enduring partnerships with leading domestic retail channels such as E-mart, GS, and NongHyup, we have built sustainable momentum.\n\nWe pledge to uphold management that satisfies both retail partners and end consumers, fortifying market leadership through relentless innovation and unwavering respect for pet life. Thank you.' },
        ],
      },
      {
        label: '기업 연혁 섹션 제목',
        fields: [
          { key: 'historyEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'History' },
          { key: 'historyTitle', label: '섹션 제목', type: 'text', size: '1.8rem', ko: '도전과 신뢰의 30년 발자취', en: 'Our 30-Year Journey' },
          { key: 'historyBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '1995년 창립 이래 오늘날 대한민국 펫 산업의 중심으로 성장하기까지의 여정입니다.', en: 'Tracing the milestones of growth, manufacturing excellence, and distribution dominance since 1995.' },
        ],
      },
      {
        label: 'CI 소개 섹션',
        fields: [
          { key: 'ciEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'Corporate Identity' },
          { key: 'ciTitle', label: '섹션 제목', type: 'text', size: '1.8rem', ko: '신뢰와 비전을 담은 CI 시스템', en: 'Identity of Trust & Global Vision' },
          { key: 'ciBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '고객과의 깊은 신뢰와 생명 존중의 철학을 담아낸 (주)부명의 시각적 정체성입니다.', en: 'The official corporate symbol representing 30 years of integrity, safety, and respect for pet life.' },
        ],
      },
    ],
  },

  trust: {
    label: '신뢰와 인증',
    sections: [
      {
        label: '상단 배너',
        fields: [
          { key: 'heroImage', label: '배경 사진', type: 'image', width: 2560, height: 1440, src: './assets/trust_hero.png' },
          { key: 'heroEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.82rem', koOnly: true, ko: 'GLOBAL STANDARDS & VERIFIED QUALITY' },
          { key: 'heroTitle', label: '페이지 제목', type: 'text', size: '2.5rem', ko: '신뢰와 인증', en: 'Trust & Certification' },
          { key: 'heroBody', label: '본문', type: 'textarea', size: '1.05rem', ko: '국제 표준 품질 인증 시스템과 독자적 특허 기술력, 세계 유수 박람회 출품을 통해 부명의 정직한 신뢰를 입증합니다.', en: 'International safety standards, proprietary patented technologies, and proven global exhibitions.' },
        ],
      },
      {
        label: '품질 인증 섹션 제목',
        fields: [
          { key: 'certEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'GLOBAL STANDARDS' },
          { key: 'certTitle', label: '섹션 제목', type: 'text', size: '1.65rem', ko: '국제 공인 품질 및 안전 인증', en: 'Quality Management Systems' },
          { key: 'certBody', label: '본문', type: 'textarea', size: '0.9rem', ko: '식품 안전, 위생, 환경 기준을 준수하며 철저한 품질 관리 시스템을 바탕으로 생산합니다.', en: 'Certified management systems ensuring uncompromising food safety, hygiene, and eco-friendly standards.' },
        ],
      },
      {
        label: '보유 특허 섹션 제목',
        fields: [
          { key: 'patentEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'INTELLECTUAL PROPERTY' },
          { key: 'patentTitle', label: '섹션 제목', type: 'text', size: '1.65rem', ko: '독자적 특허 및 지식재산권', en: 'Patents & Registrations' },
          { key: 'patentBody', label: '본문', type: 'textarea', size: '0.9rem', ko: '특허청(KIPO)에 정식 등록된 원료 코팅 배합, 벤토나이트·두부모래 제조, 반려용품 디자인 특허를 보유하고 있습니다.', en: 'Proprietary manufacturing formulations, cat litter processing, and pet ergonomic design patents registered with KIPO.' },
        ],
      },
      {
        label: '글로벌 박람회 섹션 제목',
        fields: [
          { key: 'expoEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'GLOBAL EXHIBITION' },
          { key: 'expoTitle', label: '섹션 제목', type: 'text', size: '1.65rem', ko: '세계 펫 박람회 출품 현장', en: 'Global Exhibitions & Fairs' },
          { key: 'expoBody', label: '본문', type: 'textarea', size: '0.9rem', ko: '미국 올랜도, 방콕 등 전 세계 주요 펫 엑스포에 지속 참가하여 글로벌 바이어와 파트너십을 확장해 나가고 있습니다.', en: "Showcasing Boomyung's premium pet healthcare products on international stages and building global buyer trust." },
        ],
      },
      {
        label: '유통 네트워크 섹션 제목',
        fields: [
          { key: 'networkEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.78rem', koOnly: true, ko: 'DISTRIBUTION NETWORK' },
          { key: 'networkTitle', label: '섹션 제목', type: 'text', size: '1.65rem', ko: '국내 대형 유통 네트워크 & 파트너사', en: 'Major Retail & Pet Specialty Partners' },
          { key: 'networkBody', label: '본문', type: 'textarea', size: '0.9rem', ko: '이마트, 홈플러스, 롯데마트, 주요 편의점 및 펫 전문 유통망을 통해 대한민국 어디서나 부명의 제품을 만나실 수 있습니다.', en: 'Supplying premium verified pet products to nationwide hypermarkets, convenience stores, and specialized pet networks.' },
        ],
      },
    ],
  },

  contact: {
    label: '문의하기',
    sections: [
      {
        label: '상단 배너',
        fields: [
          { key: 'heroEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.82rem', koOnly: true, ko: 'PARTNERSHIP & GLOBAL SALES' },
          { key: 'heroTitle', label: '페이지 제목', type: 'text', size: '2.5rem', ko: 'B2B 입점 및 영업 제휴 문의', en: 'Contact Us & Sales Routing' },
          { key: 'heroBody', label: '본문', type: 'textarea', size: '1.05rem', ko: '(주)부명과 함께 성장할 국내 대형마트·이커머스 입점, 글로벌 수출 및 독자 특허 기반 OEM/ODM 맞춤 제조 상담을 환영합니다.', en: 'Connect directly with BOOMYUNG for domestic retail distribution, global export licensing, and proprietary OEM/ODM partnerships.' },
        ],
      },
      {
        label: '영업팀 & 본사 안내 섹션 제목',
        fields: [
          { key: 'teamEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.82rem', koOnly: true, ko: 'SALES TEAM & HEADQUARTERS' },
          { key: 'teamTitle', label: '섹션 제목', type: 'text', size: '1.85rem', ko: '부명 전담 영업팀', en: 'Sales Team & Headquarters' },
          { key: 'teamBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '부명 본사 안내 및 국내 유통·해외 수출 전담 영업팀을 소개합니다. 명함에 마우스를 올리시면 화면 중앙에 크게 확대되어 보여집니다.', en: 'Check our headquarters location and specialized sales teams for domestic distribution and global export licensing. Hover over a business card to view it enlarged in the center.' },
        ],
      },
      {
        label: '본사 안내',
        fields: [
          { key: 'hqAddress', label: '본사 소재지', type: 'textarea', size: '0.9rem', ko: '경기도 구리시 건원대로34번길 19, 306호 (주)부명', en: '306, 19, Geonwon-daero 34beon-gil, Guri-si, Gyeonggi-do, Korea' },
          { key: 'hqTel', label: '대표 전화', type: 'text', size: '0.9rem', koOnly: true, ko: '031-553-8003' },
          { key: 'hqFax', label: '팩스 번호', type: 'text', size: '0.9rem', koOnly: true, ko: '031-592-2460' },
          { key: 'hqBizNo', label: '사업자등록번호', type: 'text', size: '0.9rem', koOnly: true, ko: '132-81-49973' },
        ],
      },
      {
        label: '스마트 B2B 문의 접수 폼 섹션 제목',
        fields: [
          { key: 'formEyebrow', label: '작은 영문 라벨', type: 'text', size: '0.82rem', koOnly: true, ko: 'BUSINESS INQUIRY' },
          { key: 'formTitle', label: '섹션 제목', type: 'text', size: '1.85rem', ko: '스마트 B2B 문의 접수', en: 'Submit Business Inquiry' },
          { key: 'formBody', label: '본문', type: 'textarea', size: '0.95rem', ko: '희망하시는 협력 분야를 선택하신 후 세부 내용을 남겨주시면, 담당 영업팀이 검토 후 신속히 맞춤 제안을 드립니다.', en: 'Please fill out the form below with your requirements. We assign a dedicated manager and respond promptly.' },
        ],
      },
    ],
  },
};
