import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageContent } from '../content/usePageContent';
import { useSiteList } from '../content/siteLists';
import './About.css';

const facilities = [
  { id:'production', label:['제조','Manufacturing'], title:['한 끼의 품질을 만드는 현장.','Where quality takes shape.'], body:['원료부터 제조, 포장까지. 반려동물 식품을 위한 제조 시설에서 제품의 기준을 지켜갑니다.','From ingredients to production and packaging, care goes into every step.'], tags:['ISO 22000','HACCP','OEM / ODM'], images:['./assets/homad/homad_02.jpg','./assets/homad/homad_01.jpg','./assets/homad/homad_03.jpg','./assets/homad/homad_04.jpg'] },
  { id:'research', label:['연구개발','Research'], title:['더 세심하게 살피고, 더 깊이 연구합니다.','Looking closer. Thinking further.'], body:['반려동물의 건강한 일상을 위한 연구개발. 작은 변화에서 더 나은 케어의 가능성을 찾습니다.','Exploring new possibilities for everyday pet health and care.'], tags:['R&D','PET HEALTHCARE'], images:['./assets/wellzen/wellzen_02.png','./assets/wellzen/wellzen_01.png'] },
  { id:'logistics', label:['물류','Logistics'], title:['좋은 제품이 일상에 닿기까지.','Connecting care with everyday life.'], body:['제품과 유통 파트너를 연결하는 물류 네트워크. 보관부터 출고까지, 다음 일상을 준비합니다.','Our logistics network connects products with retail partners, from storage to dispatch.'], tags:['DISTRIBUTION','PARTNERSHIP'], video:'./assets/renewal/logistics.mp4', images:['./assets/renewal/logistics-poster.jpg'] },
  { id:'global', label:['글로벌 생산','Global production'], title:['더 넓은 가능성을 향한 생산 기반.','A foundation for wider possibilities.'], body:['칭다오 가공 시설과 함께 위생용품 및 OEM/ODM 분야의 글로벌 생산 기반을 이어갑니다.','Extending our global production network for hygiene products and OEM/ODM through the Qingdao facility.'], tags:['QINGDAO','OEM / ODM'], images:['./assets/china/qingdao-factory.jpg','./assets/china/sand_factory_02.jpg'] },
];
const eras=[['all','전체','All'],['recent','2021 — NOW','2021 — NOW'],['growth','2017 — 2020','2017 — 2020'],['foundation','1995 — 2008','1995 — 2008']];

export default function About(){
  const {lang}=useLanguage();const en=lang==='en';const l=en?1:0;
  const {txt,img}=usePageContent('about');const history=useSiteList('history');
  const root=useRef(null);const hero=useRef(null);const dialog=useRef(null);const returnFocus=useRef(null);
  const [era,setEra]=useState('all');const [facility,setFacility]=useState(0);const [photo,setPhoto]=useState(0);const [expanded,setExpanded]=useState(false);
  const current=facilities[facility];
  useEffect(()=>{
    if(current.video || expanded) return;
    const timer=setInterval(()=>setPhoto(v=>(v+1)%current.images.length),4500);
    return()=>clearInterval(timer);
  },[current,expanded]);
  useEffect(()=>{
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
    const draw=()=>{frame=0;const p=Math.max(0,Math.min(1,-hero.current.getBoundingClientRect().top/(hero.current.offsetHeight-innerHeight)));root.current.style.setProperty('--about-p',reduced.matches?0:p);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});
    root.current.querySelectorAll('[data-about-reveal]').forEach(el=>observer.observe(el));
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduced.addEventListener('change',schedule);draw();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',schedule);reduced.removeEventListener('change',schedule);};
  },[]);
  useEffect(()=>{if(expanded){returnFocus.current=document.activeElement;dialog.current.showModal();}else if(dialog.current.open){dialog.current.close();returnFocus.current?.focus();}},[expanded]);
  const movePhoto=step=>setPhoto(v=>(v+step+current.images.length)%current.images.length);
  const jump=id=>document.getElementById(id).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  return <><div ref={root} className="about-renewal">
    <section ref={hero} className="about-hero" aria-labelledby="about-title"><div className="about-hero-stage"><img className="about-hero-image" src={img('heroImage')} alt={en?'Two dogs running together in warm sunlight':'따뜻한 햇살 아래 함께 달리는 두 강아지'}/><div className="about-hero-shade"/><div className="about-hero-copy"><span className="about-label">ABOUT BOOMYUNG</span><h1 id="about-title">{txt('heroTitle')}</h1><p>{en?'For pets. For people. For a better everyday.':'반려동물과 반려인, 함께하는 더 나은 일상을 위해.'}</p></div><div className="about-hero-bottom"><span>SINCE 1995</span><button onClick={()=>jump('about-ceo')}>{en?'Discover our story':'부명의 이야기'} <span>↓</span></button></div></div></section>
    <nav className="about-chapters" aria-label={en?'Company sections':'회사소개 목차'}>{[['about-ceo','대표 인사말','CEO message'],['about-history','걸어온 길','Our history'],['about-facilities','사업 기반','Our capabilities'],['about-identity','CI 소개','Our identity']].map(([id,ko,eng])=><button key={id} onClick={()=>jump(id)}>{en?eng:ko}</button>)}</nav>
    <section className="about-ceo" id="about-ceo"><div className="about-shell about-ceo-grid"><div className="about-ceo-visual" data-about-reveal><img src="./assets/renewal/brand-sulfodene.jpg" alt={en?'A dog and cat resting together':'함께 쉬고 있는 강아지와 고양이'} loading="lazy"/><div><span className="about-label">OUR PROMISE</span><blockquote>{txt('ceoHighlight')}</blockquote></div></div><div className="about-ceo-letter" data-about-reveal><span className="about-label">CEO MESSAGE</span><h2>{txt('ceoSectionTitle')}</h2><p className="about-letter-lead">{txt('ceoLead')}</p>{txt('ceoBody').split('\n\n').map((p,i)=><p key={i}>{p}</p>)}<div className="about-signature"><div><span>{txt('ceoTitleText')}</span><strong>{txt('ceoName')}</strong></div><img src="./assets/ceo_signature.png" alt={en?'CEO signature':'대표이사 서명'} loading="lazy"/></div></div></div></section>
    <section className="about-history" id="about-history"><div className="about-shell about-history-grid"><div className="about-history-intro"><span className="about-label">OUR JOURNEY</span><h2>{en?<>Built over time.<br/>Moving forward.</>:<>쌓아온 신뢰 위에,<br/>새로운 내일을.</>}</h2><p>{txt('historyBody')}</p><span className="about-history-year" aria-hidden="true">1995<span>— TODAY</span></span><div className="about-era-filter" role="group" aria-label={en?'History period':'연혁 기간'}>{eras.map(([id,ko,eng])=><button key={id} aria-pressed={era===id} onClick={()=>setEra(id)}>{en?eng:ko}</button>)}</div></div><div className="about-timeline" aria-live="polite">{history.filter(item=>era==='all'||item.era===era).map((item,i)=><article key={`${item.year}-${i}`}><span className="about-timeline-dot"/><div className="about-timeline-year">{item.year.replace('Present',en?'Present':'현재')}</div><span className="about-label">{en?item.eraBadgeEn:item.eraBadgeKo}</span><h3>{en?item.titleEn:item.titleKo}</h3><ul>{(en?item.itemsEn:item.itemsKo).map((line,j)=><li key={j}>{line}</li>)}</ul></article>)}</div></div></section>
    <section className="about-facilities" id="about-facilities"><div className="about-shell about-facility-heading" data-about-reveal><div><span className="about-label">FROM IDEA TO EVERYDAY</span><h2>{en?<>Care, at every step.</>:<>좋은 일상을 만드는 모든 과정.</>}</h2></div><p>{en?'Research. Manufacturing. Distribution.\nConnected by care.':'연구에서 제조, 그리고 유통까지.\n각자의 전문성을 하나의 기준으로.'}</p></div><div className="about-shell"><div className="about-facility-tabs" role="group" aria-label={en?'Select a facility':'시설 선택'}>{facilities.map((f,i)=><button key={f.id} aria-pressed={facility===i} onClick={()=>{setFacility(i);setPhoto(0);}}><span>0{i+1}</span>{f.label[l]}</button>)}</div><div className={`about-facility-stage ${current.id}`} key={current.id}><div className="about-facility-media">{current.video?<video src={current.video} poster={current.images[0]} autoPlay muted loop playsInline preload="auto" aria-label={en?'Logistics facility video':'물류센터 소개 영상'}/>:<>{current.images.map((src,i)=><img key={src} className={`about-facility-slide ${photo===i?'active':''}`} src={src} alt={photo===i?`${current.label[l]} ${en?'facility':'시설'} ${i+1}`:''} aria-hidden={photo!==i} loading="lazy"/>)}<button className="about-expand" onClick={()=>setExpanded(true)} aria-label={en?'Enlarge facility photo':'시설 사진 확대'}>↗</button></>}</div><div className="about-facility-copy"><span className="about-label">0{facility+1} / OUR CAPABILITIES</span><h3>{current.title[l]}</h3><p>{current.body[l]}</p><div className="about-facility-tags">{current.tags.map(tag=><span key={tag}>{tag}</span>)}</div>{!current.video&&<div className="about-photo-controls"><span>{String(photo+1).padStart(2,'0')} / {String(current.images.length).padStart(2,'0')}</span><button onClick={()=>movePhoto(-1)} aria-label={en?'Previous facility photo':'이전 시설 사진'}>←</button><button onClick={()=>movePhoto(1)} aria-label={en?'Next facility photo':'다음 시설 사진'}>→</button></div>}</div></div></div></section>
</div>
      <section id="about-identity" className="bm-section bm-section-light" style={{scrollMarginTop:160}}>
        <div className="bm-container">
          <div className="bm-section-header">
            <span className="bm-section-tag">{txt('ciEyebrow')}</span>
            <h2 className="bm-section-title">
              {txt('ciTitle')}
            </h2>
            <p className="bm-section-desc" style={{ whiteSpace: 'pre-line' }}>
              {txt('ciBody')}
            </p>
          </div>

          <div className="bm-ci-container animate-on-scroll fade-up is-visible" >
            {/* 좌측: 대형 CI 로고 쇼케이스 + 다운로드 */}
            <div className="bm-ci-symbol-stage">
              <img
                src="./assets/boomyung_ci_logo.png"
                alt="BOOMYUNG Corporate Identity"
                className="bm-ci-logo-img"
              />
              <div className="bm-ci-brand-name">
                {en ? 'BOOMYUNG CO., LTD.' : '(주)부명 BOOMYUNG'}
              </div>
              <div className="bm-ci-brand-en">
                Official Corporate Identity System
              </div>
              <a
                href="./assets/boomyung_ci_logo.png"
                download="boomyung_ci_logo.png"
                className="bm-ci-download-btn"
                title={en ? 'Download CI Logo PNG' : 'CI 로고 이미지 다운로드'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {en ? 'Download Logo' : '로고 다운로드 (PNG)'}
              </a>
            </div>

            {/* 우측: 3대 핵심 의미 카드 스택 + 컬러 팔레트 */}
            <div className="bm-ci-cards-stack">
              {/* 카드 1 */}
              <div className="bm-ci-card">
                <div className="bm-ci-card-header">
                  <span className="bm-ci-card-num">01. SYMBOL MARK</span>
                  <h4 className="bm-ci-card-title">
                    {en ? 'Symbol of Trust & Sacred Life' : '신뢰와 생명 존중의 상징'}
                  </h4>
                </div>
                <p className="bm-ci-card-desc">
                  {en
                    ? 'The dynamic mark represents unwavering trust with consumers and partners, rigorous scientific quality inspection, and profound reverence for companion animals.'
                    : '부명의 CI 심볼은 반려 가족 및 파트너사와의 견고한 신뢰, 타협 없는 과학적 품질 검증, 그리고 소중한 반려동물 생명에 대한 깊은 존중과 책임을 상징합니다.'}
                </p>
              </div>

              {/* 카드 2 */}
              <div className="bm-ci-card">
                <div className="bm-ci-card-header">
                  <span className="bm-ci-card-num">02. CORE VALUE</span>
                  <h4 className="bm-ci-card-title">
                    {en ? '30 Years of Honest Technology' : '30년 정직한 기술과 혁신'}
                  </h4>
                </div>
                <p className="bm-ci-card-desc">
                  {en
                    ? 'Synthesizing over 30 years of accumulated manufacturing mastery and forward-looking healthcare R&D to spearhead global pet wellness.'
                    : '30년 이상 축적된 전문 제조 노하우와 선진 헬스케어 가공 기술을 융합하여, 언제나 정직하고 안전한 제품만을 선보이겠다는 약속을 담고 있습니다.'}
                </p>
              </div>

              {/* 카드 3: 컬러 시스템 & 팔레트 칩 */}
              <div className="bm-ci-card">
                <div className="bm-ci-card-header">
                  <span className="bm-ci-card-num">03. COLOR SYSTEM</span>
                  <h4 className="bm-ci-card-title">
                    {en ? 'Boomyung Signature Palette' : '시그니처 컬러 시스템'}
                  </h4>
                </div>
                <p className="bm-ci-card-desc">
                  {en
                    ? 'Boomyung Blue (#0066B3) conveys absolute trust and technological vitality expanding like the ocean. Navy (#0A2540) symbolizes corporate stability and heritage.'
                    : '대표 색상인 부명 블루(#0066B3)는 투명한 신뢰와 혁신적인 생명력을 상징하며, 네이비(#0A2540)는 흔들림 없는 기업 안정성과 30년의 헤리티지를 나타냅니다.'}
                </p>

                {/* 컬러 칩 팔레트 */}
                <div className="bm-ci-palette">
                  <div className="bm-color-chip">
                    <div className="bm-color-swatch" style={{ background: '#0066B3' }} />
                    <div className="bm-color-info">
                      <span className="bm-color-name">Boomyung Blue</span>
                      <span className="bm-color-code">#0066B3 (Primary)</span>
                    </div>
                  </div>
                  <div className="bm-color-chip">
                    <div className="bm-color-swatch" style={{ background: '#0A2540' }} />
                    <div className="bm-color-info">
                      <span className="bm-color-name">Deep Navy</span>
                      <span className="bm-color-code">#0A2540 (Heritage)</span>
                    </div>
                  </div>
                  <div className="bm-color-chip">
                    <div className="bm-color-swatch" style={{ background: '#00A3E0' }} />
                    <div className="bm-color-info">
                      <span className="bm-color-name">Cyan Accent</span>
                      <span className="bm-color-code">#00A3E0 (Innovation)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

<div className="about-renewal">
    <dialog className="about-lightbox" ref={dialog} onClose={()=>setExpanded(false)} onClick={event=>{if(event.target===event.currentTarget)setExpanded(false);}} aria-label={en?'Facility photo gallery':'시설 사진 갤러리'}><div><button className="about-lightbox-close" onClick={()=>setExpanded(false)} aria-label={en?'Close gallery':'갤러리 닫기'}>×</button>{expanded&&<img src={current.images[photo]} alt={`${current.label[l]} ${photo+1}`}/>}<div className="about-photo-controls"><button onClick={()=>movePhoto(-1)} aria-label={en?'Previous enlarged photo':'이전 확대 사진'}>←</button><span>{photo+1} / {current.images.length}</span><button onClick={()=>movePhoto(1)} aria-label={en?'Next enlarged photo':'다음 확대 사진'}>→</button></div></div></dialog>
  </div></>;
}
