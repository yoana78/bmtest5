import { useState } from 'react';
import { Link } from 'react-router-dom';
export default function BrandCarousel({ brands, en }) {
  const [active,setActive]=useState(1);
  const [touch,setTouch]=useState(null);
  const shift=n=>setActive(v=>v+n);
  const normalized=((active%brands.length)+brands.length)%brands.length;
  return <section className="brand-showcase" id="brand-collection" aria-label={en?'Our brands':'브랜드 소개'}>
    <div className="renew-container brand-showcase-heading"><div><h2>OUR BRAND</h2><p>{en?'Discover the brands that care for every pet.':'반려동물의 일상을 함께하는 부명의 브랜드를 소개합니다.'}</p></div><Link to="/brands" className="brand-more">FIND OUT MORE <span>⟶</span></Link></div>
    <div className="brand-slider" onTouchStart={e=>setTouch(e.touches[0].clientX)} onTouchEnd={e=>{if(touch!==null&&Math.abs(e.changedTouches[0].clientX-touch)>40)shift(e.changedTouches[0].clientX<touch?1:-1);setTouch(null);}}>
      {[-2,-1,0,1,2].map(offset=>{const slot=active+offset;const brand=brands[((slot%brands.length)+brands.length)%brands.length];return <Link key={slot} className={`brand-slide ${offset===0?'current':''}`} style={{'--offset':offset}} tabIndex={Math.abs(offset)<=1?0:-1} aria-hidden={Math.abs(offset)>1} to={`${brand.type==='own'?'/brands':'/imported-brands'}/${brand.id}`} aria-label={en?brand.nameEn:brand.nameKo}>
        <img className="brand-scene-image" src={`./assets/renewal/brand-${brand.id}.jpg`} alt="" loading="lazy"/><span className="brand-scene-shade"/><img className="brand-scene-logo" src={brand.logo} alt={en?brand.nameEn:brand.nameKo}/>
      </Link>;})}
      <button className="brand-prev" onClick={()=>shift(-1)} aria-label={en?'Previous brand':'이전 브랜드'}>‹</button><button className="brand-next" onClick={()=>shift(1)} aria-label={en?'Next brand':'다음 브랜드'}>›</button>
    </div><p className="brand-slider-status" aria-live="polite">{String(normalized+1).padStart(2,'0')} <span>/ {String(brands.length).padStart(2,'0')}</span></p>
  </section>;
}
