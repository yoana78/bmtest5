import { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useData } from '../context/DataContext';
import { useSiteList } from '../content/siteLists';
import './Home.css';
import ScrollStory from '../components/ScrollStory';
import BrandCarousel from '../components/BrandCarousel';
import ExportStory from '../components/ExportStory';

export default function Home() {
  const { lang } = useLanguage();
  const en = lang === 'en';
  const { brands } = useData();
  const partners = useSiteList('partners');
  const petPartners = useSiteList('petRetailPartners');
  const root = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.08 });
    root.current.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="renew-home">
    <ScrollStory en={en} />
    <BrandCarousel brands={brands} en={en} />
    <section className="renew-partners renew-container" data-reveal><span className="renew-eyebrow blue">CONNECTED FOR BETTER</span><h2>{en ? <>Closer to you.<br />Together with our partners.</> : <>어디서든 만날 수 있도록.<br />믿음직한 파트너와 함께.</>}</h2><p>{en?'We supply verified products to over 13 major retail channels, including Costco, E-Mart, Coupang, Homeplus and convenience stores, as well as specialist pet retail channels.':<>코스트코,이마트,쿠팡,홈플러스 및 편의점 등 13개 이상 대형 유통 채널 및<br/>펫 전문 유통 채널에 검증된 제품을 공급합니다,</>}</p><div className="renew-partner-grid">{[...partners,...petPartners].filter(p=>p.logo).map((p,i)=><div className="partner-logo-card" key={`${p.id}-${i}`}><img src={p.logo.includes('/partners/')?`./assets/renewal/partner-${p.logo.split('/').pop().split('.')[0]}.png`:p.logo} alt={en?p.nameEn:p.nameKo} loading="lazy"/></div>)}</div></section>
    <ExportStory en={en} />
  </div>;
}
