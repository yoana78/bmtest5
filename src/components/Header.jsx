import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
const links = [ ['/', '홈', 'Home'], ['/about', '회사소개', 'Company'], ['/brands', '브랜드', 'Brands'], ['/catalog', '제품', 'Products'], ['/trust', '신뢰와 인증', 'Quality'] ];
export default function Header() {
  const { lang, toggleLang } = useLanguage();
  const en = lang === 'en';
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggle = useRef(null);
  const nav = useRef(null);
  const headerRef = useRef(null);
  const [previousPath, setPreviousPath] = useState(location.pathname);
  if (previousPath !== location.pathname) {
    setPreviousPath(location.pathname);
    if (open) setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = event => {
      if (event.key === 'Escape') { setOpen(false); toggle.current.focus(); }
      if (event.key === 'Tab') {
        const items = [toggle.current, ...nav.current.querySelectorAll('a')];
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => {
    let frame=0;
    const update=()=>{
      frame=0;
      const hero=document.querySelector('.scroll-story:not(.story-simple), .about-hero, .brand-detail-hero, .header-extended-hero');
      const bounds=hero?.getBoundingClientRect();
      headerRef.current.dataset.overlay=String(!!bounds && bounds.top<=1 && bounds.bottom>(innerWidth<=760?72:88));
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    const observer=new MutationObserver(schedule);
    const hero=document.querySelector('.scroll-story');
    if(hero)observer.observe(hero,{attributes:true,attributeFilter:['class']});
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);update();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',schedule);};
  },[location.pathname]);
  return <>
    <a className="renew-skip" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content').focus(); document.getElementById('main-content').scrollIntoView(); }}>{en ? 'Skip to content' : '본문으로 바로가기'}</a>
    <header ref={headerRef} className="renew-header"><div className="renew-header-inner">
      <Link to="/" className="renew-logo" onClick={()=>window.scrollTo({top:0,behavior:"instant"})} aria-label={en ? 'BOOMYUNG Home' : '부명 홈'}><img src="./assets/boomyung_ci_logo.png" alt="" /><span className={en?'logo-english':''}>{en?'BOOMYUNG':'(주)부명'}<small>BOOMYUNG CO., LTD.</small></span></Link>
      <nav className="renew-desktop-nav" aria-label={en ? 'Main navigation' : '주 메뉴'}>{links.map(([url, ko, eng]) => <NavLink key={url} to={url} end={url === "/"} onClick={()=>{if(url==="/")window.scrollTo({top:0,behavior:"instant"});}}>{en ? eng : ko}</NavLink>)}</nav>
      <div className="renew-header-actions"><button className="renew-language" onClick={toggleLang} aria-label={en ? '한국어로 전환' : 'Switch to English'}>{en ? 'ENG' : 'KOR'} <span aria-hidden="true">⌄</span></button><Link to="/contact" className="renew-nav-contact">{en ? 'Contact' : '비즈니스 문의'} <span aria-hidden="true">↗</span></Link><button ref={toggle} className="renew-menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? '메뉴 닫기' : '메뉴 열기'} onClick={() => setOpen(v => !v)}>{open ? '×' : '☰'}</button></div>
    </div><nav ref={nav} id="mobile-navigation" className="renew-mobile-nav" hidden={!open} aria-label={en ? 'Mobile navigation' : '모바일 메뉴'}>{[...links, ['/imported-brands', '글로벌 브랜드', 'Global brands'], ['/contact', '비즈니스 문의', 'Contact']].map(([url, ko, eng]) => <NavLink key={url} to={url} onClick={() => {setOpen(false);if(url==="/")window.scrollTo({top:0,behavior:"instant"});}}>{en ? eng : ko}<span aria-hidden="true">↗</span></NavLink>)}</nav></header>
    {open && <button className="renew-menu-backdrop" tabIndex={-1} aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
  </>;
}


