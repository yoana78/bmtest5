import { useLanguage } from '../i18n/LanguageContext'
import { useCopy } from './useCopy'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { privacyPolicyKo, privacyPolicyEn } from '../data/privacyPolicy'
// vite-plugin-singlefile inlines every asset into one index.html, so no separate
// index.css file actually exists in the production build -- a `?url` import used to
// resolve to a URL that 404s (and Cloudflare's SPA fallback silently serves index.html
// for it instead of a real 404, so the browser gets HTML with a .css extension and
// discards the whole stylesheet as invalid). `?raw` inlines the CSS text at build time
// instead, so it works the same in dev and in the production build.
import legacyStyles from '../index.css?raw'
import ImmersiveHome from './ImmersiveHome'
import './immersive.css'

const Admin = lazy(() => import('../pages/Admin'))
const Arrow = () => <span aria-hidden="true">↗</span>
function Logo() {
  const { tr } = useCopy()
 return <Link to="/" className="logo" aria-label={tr("부명 홈")} onClick={()=>window.scrollTo({top:0,behavior:"instant"})}><img className="official-ci" src="/assets/boomyung_ci_logo.png" alt={tr("BOOMYUNG CO., LTD. 부명 공식 CI")}/></Link> }
function Header() {
  const { tr, en } = useCopy()
  const { toggleLang } = useLanguage()

  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  return <header className={`header ${pathname === '/' ? 'cinematic-header' : ''}`} ><Logo/><nav aria-label={tr("주 메뉴")} className={open ? 'is-open' : ''}><Link to="/#story" onClick={() => setOpen(false)}>{tr("부명 이야기")}</Link><Link to="/#business" onClick={() => setOpen(false)}>{tr("우리가 하는 일")}</Link><Link className={pathname === '/products' ? 'active' : ''} to="/products">{tr("제품 카테고리")}</Link><Link className="nav-contact" to="/contact">{tr("파트너십 문의")} <Arrow/></Link></nav><div className="language-switch" role="group" aria-label="Language / 언어"><button type="button" aria-pressed={!en} onClick={()=>{if(en)toggleLang()}}>KR</button><span>/</span><button type="button" aria-pressed={en} onClick={()=>{if(!en)toggleLang()}}>EN</button></div><button className="menu-toggle" aria-label={tr(open ? '메뉴 닫기' : '메뉴 열기')} aria-expanded={open} onClick={() => setOpen(!open)}>{tr(open ? '닫기 −' : '메뉴 ＋')}</button></header>
}
function PageMotion() {
  const { tr } = useCopy()

  const location = useLocation()
  const pageTitle = tr(location.pathname === '/products' ? '제품 카테고리' : location.pathname === '/contact' ? '문의하기' : '더 나은 반려생활의 시작')
  useEffect(() => { document.title = `${pageTitle} | BOOMYUNG` }, [pageTitle])
  const mounted = useRef(false)
  useEffect(() => {

    const target = location.hash && document.getElementById(location.hash.slice(1))
    const smooth = mounted.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: smooth ? 'smooth' : 'instant' }); else window.scrollTo({ top: 0, behavior: 'instant' })
    mounted.current = true
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target) } }), { threshold: 0.1 })
    document.querySelectorAll('[data-reveal]').forEach(el => { el.classList.add('reveal-ready'); observer.observe(el) })
    return () => observer.disconnect()
  }, [location.pathname, location.hash])
  return null
}
function Footer() {
  const { tr, en } = useCopy()

  const [privacy, setPrivacy] = useState(false)
  return <footer className="footer"><div className="footer-top"><Logo/><div className="footer-links"><Link to="/products">{tr("제품 카테고리")} <Arrow/></Link><Link to="/contact">{tr("문의하기")} <Arrow/></Link></div></div><div className="footer-bottom"><div><strong>{tr("(주)부명")}</strong><p>{tr("경기도 구리시 건원대로34번길 19, 306호")}<br/>{tr("사업자등록번호 132-81-49973")}</p></div><div><a href="tel:0315538003">031.553.8003</a><br/><a href="mailto:help@petsb2b.co.kr">help@petsb2b.co.kr</a></div><div><button onClick={() => setPrivacy(true)}>{tr("개인정보처리방침")}</button><p>© {new Date().getFullYear()} BOOMYUNG. All rights reserved.</p></div></div>{privacy && <Modal title={tr("개인정보처리방침")} onClose={() => setPrivacy(false)}><div className="privacy-text">{en ? privacyPolicyEn : privacyPolicyKo}</div></Modal>}</footer>
}
function Modal({ title, onClose, children }) {
  const { tr } = useCopy()

  const ref = useRef(null)
  useEffect(() => { const el = ref.current; const previous = document.activeElement; el.showModal(); return () => { el.close(); previous?.focus() } }, [])
  return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }}><button className="modal-close" onClick={onClose} aria-label={tr("닫기")}>×</button><h2>{title}</h2>{children}</dialog>
}
function ContactBanner() {
  const { tr } = useCopy()
 return <section className="contact-banner"><div><span className="eyebrow">LET’S GROW TOGETHER</span><h2>{tr("우리의 다음 이야기,")}<br/>{tr("함께 만들어갈까요?")}</h2></div><Link to="/contact" className="contact-circle" aria-label={tr("파트너십 문의하기")}><Arrow/><span>{tr("파트너십 문의")}</span></Link></section> }
function Products() {
  const { tr, en } = useCopy()

  const { products, brands } = useData()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const category = params.get('category') || '전체'
  const brand = params.get('brand') || ''
  const pet = params.get('pet') || ''
  const filtered = products.filter(p => (category === '전체' || p.category === category) && (!brand || p.brandId === brand) && (!pet || p.petType === pet) && `${en ? p.nameEn : p.nameKo} ${p.nameEn}`.toLowerCase().includes(search.toLowerCase()))
  const update = (key, value) => { const next = new URLSearchParams(params); if(value) next.set(key,value); else next.delete(key); setParams(next); setPage(1) }
  return <><section className="sub-intro section-pad"><span className="eyebrow">OUR PRODUCTS</span><h1>{tr("더 좋은 일상을 위한")}<br/><em>{tr("작지만 소중한 선택.")}</em></h1><p>{tr("좋은 한 끼부터 매일의 케어까지, 부명의 제품을 만나보세요.")}</p></section><section className="catalog section-pad"><div className="category-tabs" role="group" aria-label={tr("제품 카테고리")}>{['전체','사료','간식','용품'].map(c => <button key={c} className={category === c ? 'selected' : ''} aria-pressed={category === c} onClick={() => update('category',c === '전체' ? '' : c)}>{tr(c)}<sup>{c === '전체' ? products.length : products.filter(p => p.category === c).length}</sup></button>)}</div><div className="filters"><div><select aria-label={tr("브랜드 선택")} value={brand} onChange={e=>update('brand',e.target.value)}><option value="">{tr("모든 브랜드")}</option>{brands.map(b=><option key={b.id} value={b.id}>{en ? b.nameEn : b.nameKo}</option>)}</select><select aria-label={tr("반려동물 선택")} value={pet} onChange={e=>update('pet',e.target.value)}><option value="">{tr("모든 반려동물")}</option><option value="dog">{tr("반려견")}</option><option value="cat">{tr("반려묘")}</option></select></div><label className="search"><span aria-hidden="true">⌕</span><input aria-label={tr("제품 검색")} placeholder={tr("어떤 제품을 찾으세요?")} value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label></div><p className="result-count" aria-live="polite">{tr("총")} <strong>{filtered.length}</strong>{tr("개의 제품")}</p><div className="product-grid">{filtered.slice(0,page*12).map(p=><button key={p.id} className="product-card" onClick={()=>setSelected(p)}><div className="product-image"><img src={p.image} alt={en ? p.nameEn : p.nameKo} loading="lazy"/><span><Arrow/></span></div><small>{brands.find(b=>b.id===p.brandId)?.nameEn} / {tr(p.category)}</small><h3>{en ? p.nameEn : p.nameKo}</h3><p>{p.spec}</p></button>)}</div>{!filtered.length && <div className="empty"><h3>{tr("검색 결과가 없습니다.")}</h3><p>{tr("다른 검색어나 카테고리로 찾아보세요.")}</p><button className="pill dark" onClick={()=>{setParams({});setSearch('');setPage(1)}}>{tr("필터 초기화 ↗")}</button></div>}{filtered.length > page*12 && <button className="load-more" onClick={()=>setPage(page+1)}>{tr("제품 더 보기 ＋")}</button>}</section><ContactBanner/>{selected && <Modal title={en ? selected.nameEn : selected.nameKo} onClose={()=>setSelected(null)}><div className="product-detail"><img src={selected.image} alt={en ? selected.nameEn : selected.nameKo}/><div><span className="eyebrow">{tr(selected.category)} · {tr(selected.petType === 'dog' ? '반려견' : '반려묘')}</span><p>{selected.spec}</p><ul>{(en ? selected.featuresEn : selected.features)?.map((f,i)=><li key={i}>{f}</li>)}</ul><p>{tr("원산지:")} {tr(selected.origin || '별도 문의')}</p><Link className="pill dark" to={`/contact?product=${encodeURIComponent(en ? selected.nameEn : selected.nameKo)}`}>{tr("이 제품 문의하기")} <Arrow/></Link></div></div></Modal>}</>
}
const types = { oem:'OEM / ODM 제조', domestic:'국내 유통 · 입점', export:'해외 수출 · 수입', other:'기타 제휴' }
function Contact() {
  const { tr, en } = useCopy()

  const [params] = useSearchParams()
  const { siteSettings } = useData()
  const [type,setType] = useState(types[params.get('type')] ? params.get('type') : 'oem')
  const [status,setStatus] = useState('')
  const [sending,setSending] = useState(false)
  async function submit(e) {
    e.preventDefault(); if(sending) return
    const form = e.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setSending(true); setStatus('')
    try {
      const response = await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({access_key:'8207939c-fd68-4c59-ae20-62ea022b6952',subject:`[부명 홈페이지 문의] ${types[type]} / ${values.company}`,from_name:values.name,...values,category:types[type]})})
      const result = await response.json()
      if(!response.ok || !result.success) throw new Error('Failed')
      setStatus('문의가 정상적으로 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.'); form.reset()
    } catch { setStatus('전송하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하거나 이메일 또는 전화로 문의해 주세요.') } finally { setSending(false) }
  }
  return <><section className="sub-intro section-pad"><span className="eyebrow">CONTACT US</span><h1>{tr("좋은 파트너십의 시작,")}<br/><em>{tr("당신의 이야기를 들려주세요.")}</em></h1><p>{tr("제품 개발부터 유통, 새로운 사업 제안까지. 부명이 함께 고민하겠습니다.")}</p></section><section className="contact-layout section-pad"><aside><span className="eyebrow">LET’S TALK</span><h2>{tr("함께할 가능성은")}<br/>{tr("언제나 열려 있습니다.")}</h2><a className="contact-email" href={`mailto:${siteSettings.contactEmail || 'help@petsb2b.co.kr'}`}>{siteSettings.contactEmail || 'help@petsb2b.co.kr'} <Arrow/></a><div className="contact-facts"><span>{tr("전화")}</span><a href="tel:0315538003">031.553.8003</a><span>{tr("팩스")}</span><span>031.592.2460</span><span>{tr("주소")}</span><span>{tr("경기도 구리시 건원대로34번길 19, 306호")}</span></div><p className="contact-note">{tr("제품 종류와 예상 수량, 희망 일정 등을")}<br/>{tr("알려주시면 더 구체적인 상담이 가능합니다.")}</p></aside><form onSubmit={submit}><h3>{tr("어떤 이야기를 나누고 싶으신가요?")}</h3><div className="inquiry-types">{Object.entries(types).map(([key,label])=><button type="button" key={key} aria-pressed={type === key} className={type === key ? 'selected' : ''} onClick={()=>setType(key)}>{tr(label)}</button>)}</div><div className="form-grid"><label>{tr("회사명")} <span>*</span><input name="company" required maxLength={150} autoComplete="organization" placeholder={tr("회사명을 입력해 주세요")}/></label><label>{tr("담당자명")} <span>*</span><input name="name" required maxLength={80} autoComplete="name" placeholder={tr("성함을 입력해 주세요")}/></label><label>{tr("이메일")} <span>*</span><input name="email" type="email" required autoComplete="email" placeholder="business@company.com"/></label><label>{tr("연락처")} <span>*</span><input name="phone" type="tel" required autoComplete="tel" placeholder={tr("연락 가능한 번호")}/></label></div><label className="message-label">{tr("문의 내용")} <span>*</span><textarea name="message" required minLength={10} maxLength={5000} defaultValue={params.get('product') ? (en ? `I would like to ask about ${params.get('product')}.\n` : `${params.get('product')} 제품에 대해 문의합니다.\n`) : ''} placeholder={tr("관심 제품, 예상 수량, 희망 일정 등을 자유롭게 적어주세요. (10자 이상)")}/></label><details className="privacy-details"><summary>{tr("개인정보 수집 및 이용 안내")}</summary><p>{tr("수집 항목: 회사명, 담당자명, 이메일, 연락처, 문의 내용. 목적: 문의 접수 및 상담 회신. 동의를 거부할 수 있으나 문의 접수가 제한됩니다. 자세한 보유기간 및 권리 안내는 하단 개인정보처리방침을 확인해 주세요.")}</p></details><label className="consent"><input type="checkbox" name="consent" required value="agreed"/> {tr("개인정보 수집 및 이용에 동의합니다. (필수)")}</label><input type="checkbox" name="botcheck" className="honeypot" tabIndex={-1} aria-hidden="true"/><button disabled={sending} type="submit" className="submit">{tr(sending ? '문의 전송 중…' : '문의 보내기')} <Arrow/></button><p className="form-status" role="status">{tr(status)}</p></form></section><section className="faq section-pad"><span className="eyebrow">FREQUENTLY ASKED QUESTIONS</span><h2>{tr("궁금하신 점이 있나요?")}</h2>{[['OEM과 ODM은 어떻게 다른가요?','OEM은 의뢰한 사양에 맞춰 제품을 제조하는 방식이며, ODM은 제품 기획과 개발부터 함께하는 방식입니다. 준비 상황과 목표에 맞는 협업 방식을 상담해 드립니다.'],['최소 주문 수량과 제작 기간은 어떻게 되나요?','품목, 원료, 패키지 사양 및 주문 수량에 따라 달라집니다. 희망 제품과 예상 수량을 남겨주시면 담당자가 확인 후 안내드립니다.'],['국내 유통과 해외 사업도 상담할 수 있나요?','네. 국내 유통·입점 및 해외 수출·수입 문의를 받고 있습니다. 관심 브랜드, 유통 채널, 대상 국가를 함께 알려주세요.']].map(([q,a])=><details key={q}><summary>{tr(q)}<span>＋</span></summary><p>{tr(a)}</p></details>)}</section></>
}
export default function RenewalApp() {
  const { tr } = useCopy()

  const location = useLocation()
  if(location.pathname === '/admin') return <><style>{legacyStyles}</style><Suspense fallback={<p>{tr("관리자 화면을 불러오는 중입니다.")}</p>}><Admin/></Suspense></>
  return <><a className="skip-link" href="#main-content" onClick={e => {e.preventDefault();document.getElementById('main-content')?.focus()}}>{tr("본문 바로가기")}</a><Header key={location.pathname}/><main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<ImmersiveHome/>}/><Route path="/products" element={<Products/>}/><Route path="/contact" element={<Contact/>}/><Route path="/catalog/*" element={<Navigate to="/products" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></main><Footer/><PageMotion/></>
}


