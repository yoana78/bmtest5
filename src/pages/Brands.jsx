import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useData } from '../context/DataContext';
import './Brands.css';

const backgrounds = new Set(['dayspo','bellbird','evergrow','howpet','ninaottosson','dono','reflex','sulfodene','petstage']);

export default function Brands({ initialFilter = 'all' }) {
  const { lang } = useLanguage();
  const en = lang === 'en';
  const { brands } = useData();
  const [filter, setFilter] = useState(initialFilter);
  const visible = brands.filter(brand => filter === 'all' || brand.type === filter);
  return <div className="brand-directory">
    <header className="brand-directory-heading">
      <h1>OUR BRAND</h1>
      <p>{en ? 'Discover the brands of BOOMYUNG.' : '부명이 함께하는 브랜드를 만나보세요.'}</p>
    </header>
    <nav className="brand-directory-filter" aria-label={en ? 'Brand category' : '브랜드 분류'}>
      <div>{[['all','전체','All'],['own','자사 브랜드','Our brands'],['imported','수입 브랜드','Imported brands']].map(([id,ko,english]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{en ? english : ko}<span>{brands.filter(b => id === 'all' || b.type === id).length}</span></button>)}</div>
      <span className="brand-directory-count">{String(visible.length).padStart(2,'0')} {en ? 'brands' : '개 브랜드'}</span>
    </nav>
    <div className="brand-directory-grid" key={filter}>
      {visible.map(brand => <article className="brand-directory-item" key={brand.id}>
        <Link to={`${brand.type === 'imported' ? '/imported-brands' : '/brands'}/${brand.id}`} aria-label={en ? `Explore ${brand.nameEn}` : `${brand.nameKo} 브랜드 보기`}>
          <div className="brand-directory-image" style={{backgroundColor:brand.color || '#e8ece8'}}>
            {(brand.bgImage || backgrounds.has(brand.id)) && <img className="brand-directory-photo" src={brand.bgImage || `./assets/renewal/brand-${brand.id}.jpg`} alt="" loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden';}}/>}
            <div className="brand-directory-logo">{brand.logo ? <img src={brand.logo} alt={en ? brand.nameEn : brand.nameKo} style={{ transform: `scale(${Number(brand.logoScale) || 1})` }}/> : <strong>{en ? brand.nameEn : brand.nameKo}</strong>}</div>
            <span className="brand-directory-open" aria-hidden="true">↗</span>
          </div>
          
        </Link>
      </article>)}
    </div>
  </div>;
}


