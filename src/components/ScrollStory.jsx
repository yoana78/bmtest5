import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './ScrollStory.css';

const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const ramp = (a, b, n) => { const p = clamp((n - a) / (b - a)); return p * p * (3 - 2 * p); };
const mix = (a, b, p) => a + (b - a) * p;
const stops = [0, 1.55, 2.6, 3.65, 4.7, 5.65, 6.5, 7.75];
const namesKo = ['함께하는 일상', '한 끼의 영양', '식물성 덴탈케어', '매일의 케어', '제조의 기준', '건강을 위한 연구', '물류의 연결', '더 행복한 내일'];
const namesEn = ['Together', 'Nutrition', 'Plant-based care', 'Daily care', 'Manufacturing', 'Research', 'Logistics', 'A happier tomorrow'];
const products = [
  { id: '데이스포-테라픽-코엔자임q10-라지브리드', image: 'therapic.png', tag: 'DAYSPO · THERAPIC', title: <>한 끼에 담은 진심이<br />매일의 활력이 되도록.</>, titleEn: <>Good food.<br />For a life full of energy.</>, body: '데이스포 테라픽 코엔자임Q10 라지브리드', bodyEn: 'DAYSPO Therapic Coenzyme Q10 Large Breed', detail: '함께하는 긴 하루를 위한 영양', detailEn: 'Thoughtful nutrition for every day', color: '#bca074' },
  { id: '데이스포-비건-덴탈껌', image: 'vegan-dental.png', tag: 'DAYSPO · VEGAN DENTAL', title: <>믿을 수 있는 원료 사용으로<br />더 건강하게.</>, titleEn: <>Trusted ingredients.<br />Healthier lives.</>, body: '데이스포 비건 덴탈껌', bodyEn: 'DAYSPO Vegan Dental', detail: '식물성 원료로 완성한 덴탈케어', detailEn: 'Plant-based ingredients. Everyday dental care.', color: '#8fa956' },
  { id: '데이스포-와이즈-365덴탈브러쉬-피부', image: 'wise-dental.png', tag: 'DAYSPO · WISE 3.6.5', title: <>펫 푸드를 넘어<br />펫 케어를 완성.</>, titleEn: <>Beyond pet food.<br />Complete pet care.</>, body: '와이즈 3.6.5 덴탈브러쉬 스킨&코트', bodyEn: 'WISE 3.6.5 Dental Brush Skin & Coat', detail: '매일 이어가는 반려동물 구강 관리', detailEn: 'Dental care made part of their day.', color: '#69b5b4' },
];

export default function ScrollStory({ en }) {
  const root = useRef(null);
  const stage = useRef(null);
  const [simple, setSimple] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [chapter, setChapter] = useState(0);
  const chapterRef = useRef(0);
  const [videoReady, setVideoReady] = useState({});
  const names = en ? namesEn : namesKo;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = event => setSimple(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (simple) return;
    const host = root.current;
    const screen = stage.current;
    const get = selector => screen.querySelector(selector);
    const intro = get('.story-intro');
    const introFrame = get('.story-intro-frame');
    const introTitle = get('.story-opening-title');
    const productScenes = [...screen.querySelectorAll('.story-product-scene')];
    const manufacturing = get('.story-manufacturing');
    const research = get('.story-research');
    const ending = get('.story-ending');
    const heroVideo = get('.story-intro video');
    const endingVideo = get('.story-ending video');
    const logistics=get('.story-logistics');
    const logisticsVideo=get('.story-logistics video');
    let raf = 0;
    let target = 0;
    let current = 0;
    let alive = true;
    const style = (node, values) => Object.assign(node.style, values);
    const reveal = (node, amount) => {
      node.style.opacity = amount;
      node.style.visibility = amount > .002 ? 'visible' : 'hidden';
      node.inert = amount < .65;
    };
    const seek = (video, value) => {
      if (!video || !Number.isFinite(video.duration)) return;
      video.pause();
      const seconds = clamp(value) * Math.max(0, video.duration - .05);
      if (!video.seeking && Math.abs(video.currentTime - seconds) > .035) video.currentTime = seconds;
    };
    const draw = () => {
      raf = 0;
      current = Math.abs(target - current) < .001 ? target : mix(current, target, .2);
      const raw = current;
      const t = raw<6?raw:raw<7?6:raw-1;
      const mobile = window.innerWidth <= 760;
      const w = screen.clientWidth;
      const h = screen.clientHeight;
      const contraction = ramp(.55, 1.5, t);
      const introOpacity = 1 - ramp(1.55, 2.04, t);
      reveal(intro, introOpacity);
      style(introFrame, {
        transform: `translate3d(${mix(0,-w*.12,contraction)}px,${mix(0,mobile?h*.17:-h*.07,contraction)}px,0) scale(${mix(1,mobile?.52:.67,contraction)}) rotate(${mix(0,-3,contraction)}deg)`,
        borderRadius: `${mix(0,65,contraction)}px`,
      });
      introTitle.style.setProperty('--title-reveal',String(ramp(0,.3,t)));
      style(introTitle, {opacity: 1-ramp(.38,.77,t),transform:`translateY(${-ramp(.3,.8,t)*65}px)`});
      seek(heroVideo, ramp(0,1.5,t));

      const backgrounds = [[255,255,255],[247,244,237],[235,242,222],[223,241,239],[245,246,248],[237,242,248],[255,255,255]];
      const colorStep = clamp(t-.5,0,5.999);
      const ci = Math.floor(colorStep);
      const cp = ramp(0,1,colorStep-ci);
      screen.style.backgroundColor = `rgb(${backgrounds[ci].map((v,i)=>Math.round(mix(v,backgrounds[ci+1][i],cp))).join(',')})`;
      productScenes.forEach((scene,i) => {
        const center = stops[i+1];
        const start = center-.85;
        const entry = ramp(start,center-.12,t);
        const departure = ramp(center+.36,center+.98,t);
        const opacity = ramp(start,start+.23,t)*(1-ramp(center+.7,center+1.02,t));
        reveal(scene,opacity);
        const object = scene.querySelector('.story-product-object');
        const copy = scene.querySelector('.story-product-copy');
        const ring = scene.querySelector('.story-orbits');
        const x = mix(w*.87,mobile? w*.03:w*.225,entry)-departure*w*.87;
        const y = mix(h*.5,mobile?h*.15:0,entry)-departure*h*.16;
        const scale = mix(.35,1,entry)*(1-departure*.36);
        style(object,{transform:`translate(-50%,-50%) translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${mix(i===0?12:-12,0,entry)-departure*8}deg)`});
        style(copy,{opacity:ramp(start+.25,center-.03,t)*(1-ramp(center+.3,center+.65,t)),transform:`translate3d(0,${(1-entry)*60-departure*45}px,0)`});
        if(i===0) {
          const fadeToInk=mobile?1:ramp(1.65,2.02,t);
          const ink=`rgb(${[32,44,38].map(value=>Math.round(mix(255,value,fadeToInk))).join(',')})`;
          copy.style.color=ink;
          copy.querySelector('.story-eyebrow').style.color=ink;
        }
        style(ring,{transform:`translate(-50%,-50%) rotate(${(t-center)*18}deg)`});
        scene.querySelector('.story-product-shadow').style.transform=`translateX(-50%) scale(${scale})`;
      });

      const factoryIn=ramp(4.02,4.58,t),factoryOut=ramp(4.99,5.44,t);
      reveal(manufacturing,ramp(4.05,4.28,t)*(1-ramp(5.15,5.5,t)));
      style(manufacturing.querySelector('.story-factory-frame'),{clipPath:`inset(${mix(28,0,factoryIn)}% ${mix(33,0,factoryIn)}% round ${mix(100,0,factoryIn)}px)`,transform:`scale(${mix(1.2,1,factoryIn)}) translateX(${-factoryOut*w*.2}px)`});
      style(manufacturing.querySelector('.story-media-copy'),{opacity:ramp(4.35,4.63,t)*(1-factoryOut),transform:`translateY(${(1-factoryIn)*60}px)`});
      style(manufacturing.querySelector('.story-factory-detail'),{opacity:ramp(4.4,4.7,t)*(1-factoryOut),transform:`translateY(${mix(90,0,ramp(4.4,4.85,t))}px)`});

      const researchIn=ramp(5.02,5.55,t),researchOut=ramp(5.8,6.05,raw);
      reveal(research,ramp(5.05,5.4,raw)*(1-ramp(5.8,6.05,raw)));
      style(research.querySelector('.story-research-object'),{transform:`translate3d(${mix(w*.65,0,researchIn)-researchOut*w*.35}px,${mix(h*.15,0,researchIn)}px,0) scale(${mix(.65,1,researchIn)})`});
      style(research.querySelector('.story-media-copy'),{opacity:ramp(5.26,5.57,t)*(1-researchOut),transform:`translateY(${(1-researchIn)*70}px)`});

      const endIn=ramp(6.05,6.62,t);
      reveal(ending,ramp(6.06,6.37,t));
      style(ending.querySelector('.story-ending-frame'),{clipPath:`inset(${mix(36,0,endIn)}% ${mix(38,0,endIn)}% round ${mix(180,0,endIn)}px)`});
      style(ending.querySelector('.story-ending-copy'),{opacity:ramp(6.4,6.76,t),transform:`translateY(${mix(50,0,endIn)}px)`});
      if(t>6.06) seek(endingVideo,ramp(6.05,7,t)); else endingVideo?.pause();
      reveal(logistics,ramp(5.95,6.25,raw)*(1-ramp(6.85,7.2,raw)));
      seek(logisticsVideo,ramp(6,7,raw));
      logistics.querySelector('.story-logistics-frame').style.transform=`scale(${mix(1.12,1,ramp(6,7,raw))})`;
      screen.style.setProperty('--story-progress',String(raw/8));
      const active = t<.95?0:t<2.13?1:t<3.17?2:t<4.15?3:t<5.22?4:raw<6.12?5:raw<7.15?6:7;
      screen.dataset.scene=String(active);
      if(chapterRef.current!==active){chapterRef.current=active;setChapter(active);}
      if(alive&&Math.abs(target-current)>.001) raf=requestAnimationFrame(draw);
    };
    const measure = () => {
      const header=0;
      target=clamp((header-host.getBoundingClientRect().top)/(host.offsetHeight-screen.offsetHeight))*8;
      if(!raf) raf=requestAnimationFrame(draw);
    };
    const onSeeked=()=>{if(alive&&!raf)raf=requestAnimationFrame(draw);};
    [heroVideo,endingVideo,logisticsVideo].forEach(video=>video?.addEventListener('seeked',onSeeked));
    window.addEventListener('scroll',measure,{passive:true});
    window.addEventListener('resize',measure);
    measure();
    current=target;
    return()=>{alive=false;cancelAnimationFrame(raf);window.removeEventListener('scroll',measure);window.removeEventListener('resize',measure);screen.querySelectorAll('.story-scene').forEach(scene=>{scene.inert=false;});[heroVideo,endingVideo,logisticsVideo].forEach(video=>{video?.pause();video?.removeEventListener('seeked',onSeeked);});};
  }, [simple]);

  const go = index => {
    if(simple) { root.current.querySelector(`[data-story-chapter="${index}"]`)?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    const top=window.scrollY+root.current.getBoundingClientRect().top;
    window.scrollTo({top:top+(root.current.offsetHeight-stage.current.offsetHeight)*(stops[index]/8),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  const changeMode=()=>{setSimple(v=>!v);requestAnimationFrame(()=>root.current.scrollIntoView({block:'start'}));};
  return <section className={`scroll-story ${simple?'story-simple':''}`} ref={root} aria-label={en?'The BOOMYUNG story':'스크롤로 만나는 부명 이야기'}>
    <div className="story-stage" ref={stage} data-scene="0">
      <article className="story-scene story-intro" data-story-chapter="0">
        <div className="story-intro-frame">
          <img className="story-video-poster" src="./assets/renewal/living-poster.jpg" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src='./assets/hero_slide_2.jpg';}} alt={en?'A dog and cat sharing a sunlit home':'햇살이 드는 집에서 함께 쉬는 강아지와 고양이'} />
          <video muted playsInline preload="auto" className={videoReady.living?'ready':''} onLoadedData={()=>setVideoReady(v=>({...v,living:true}))}><source src="./assets/renewal/living.mp4" type="video/mp4" /></video>
          <div className="story-film-shade" />
        </div>
        <div className="story-opening-title"><span className="story-eyebrow">RESPECT FOR PET LIFE</span><h1 id="home-heading">{en?<><span>Respect begins </span><span>with the smallest things.</span></>:<><span>존중은 아주 작고 사소한 </span><span>것에서부터 시작됩니다.</span></>}</h1><button className="story-scroll-prompt" onClick={()=>go(1)}>{en?'Scroll to discover':'스크롤하며 만나보세요'} <span>↓</span></button></div>
      </article>
      {products.map((product,i)=><article className={`story-scene story-product-scene story-product-${i}`} key={product.id} data-story-chapter={i+1} style={{'--product-color':product.color}}>
        <div className="story-spatial-bg" aria-hidden="true"><i/><i/><i/><div/></div><div className="story-product-copy"><span className="story-eyebrow">{product.tag}</span><h2>{en?product.titleEn:product.title}</h2><Link to={`/catalog/${encodeURIComponent(product.id)}`} className="story-link">{en?'Explore the product':'제품 자세히 보기'} <span>↗</span></Link></div>
        <div className="story-product-object"><div className="story-orbits" aria-hidden="true"><i/><i/><i/></div><img src={`./assets/renewal/${product.image}`} alt={en?product.bodyEn:product.body} /><div className="story-product-shadow" aria-hidden="true"/></div>
        <span className="story-watermark" aria-hidden="true">{['NUTRITION','PLANT BASED','EVERYDAY CARE'][i]}</span>
      </article>)}
      <article className="story-scene story-manufacturing" data-story-chapter="4">
        <div className="story-factory-frame"><img src="./assets/homad/homad_02.jpg" alt={en?'Pet food production and packaging equipment':'반려동물 식품 제조 및 포장 설비'}/><div className="story-film-shade"/></div>
        <div className="story-media-copy"><span className="story-eyebrow">THE STANDARD BEHIND EVERY MEAL</span><h2>{en?<>The care you see.<br/>The standards you don't.</>:<>눈에 보이는 한 끼,<br/>보이지 않는 수많은 원칙.</>}</h2><p>{en?'From manufacturing to packaging, care goes into every step.':'제조부터 포장까지, 모든 과정에 정직한 기준을 담습니다.'}</p><div className="story-cert-tags"><span>HACCP</span><span>ISO 22000</span><span>OEM / ODM</span></div><Link to="/trust" className="story-link">{en?'Our quality standards':'품질 관리 알아보기'} ↗</Link></div>
        <div className="story-factory-detail">{['iso22000','iso14001','haccp'].map(cert=><figure key={cert}><img src={`./assets/renewal/${cert}-private.jpg`} alt={`${cert.toUpperCase()} 인증서 — 회사명 비공개`}/><figcaption>{cert.toUpperCase().replace('ISO','ISO ')}</figcaption></figure>)}</div>
      </article>
      <article className="story-scene story-research" data-story-chapter="5">
        <div className="story-media-copy"><span className="story-eyebrow">RESEARCH FOR A BETTER LIFE</span><h2>{en?<>Looking closer.<br/>Thinking further.</>:<>작은 변화에서 찾는<br/>더 나은 내일의 가능성.</>}</h2><p>{en?'Turning research into thoughtful everyday care.':'반려동물의 일상을 세심하게 살피고,\n건강 관리의 새로운 가능성을 연구합니다.'}</p><Link to="/about" className="story-link">{en?'Discover our story':'부명 이야기'} ↗</Link></div>
        <div className="story-research-object"><div className="story-research-halo"/><img src="./assets/wellzen/wellzen_02.png" alt={en?'A pet health research application':'반려동물 건강 관리 연구개발 적용 사례'}/><div className="story-research-caption"><span>R&D</span><span>{en?'Thoughtful care, through research.':'더 깊이 연구하고, 더 세심하게.'}</span></div></div>
      </article>
      <article className="story-scene story-logistics" data-story-chapter="6"><div className="story-logistics-frame"><video muted playsInline preload="metadata" poster="./assets/renewal/logistics-poster.jpg" className="ready"><source src="./assets/renewal/logistics.mp4" type="video/mp4"/></video><div className="story-film-shade"/></div><div className="story-media-copy"><span className="story-eyebrow">CONNECTED WITH CARE</span><h2>{en?<>From our care,<br/>to your everyday.</>:<>정성을 담은 제품이<br/>일상에 닿기까지.</>}</h2><p>{en?'Connecting products, partners and everyday life.':'제품과 파트너, 그리고 반려동물의 일상을 잇습니다.'}</p></div></article>
      <article className="story-scene story-ending" data-story-chapter="7">
        <div className="story-ending-frame"><img className="story-video-poster" src="./assets/renewal/garden-poster.jpg" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src='./assets/hero_slide_2.jpg';}} alt={en?'A dog enjoying a bright garden':'햇살 가득한 정원에서 걷는 강아지'}/><video muted playsInline preload="metadata" className={videoReady.garden?'ready':''} onLoadedData={()=>setVideoReady(v=>({...v,garden:true}))}><source src="./assets/renewal/garden.mp4" type="video/mp4"/></video><div className="story-film-shade"/></div>
        <div className="story-ending-copy"><span className="story-eyebrow">BETTER FOOD. HAPPIER LIFE.</span><h2>{en?<>So their happiness<br/>lasts a little longer.</>:<>이 행복이,<br/>조금 더 오래 이어지도록.</>}</h2><p>{en?'BOOMYUNG, by your side.':'반려동물의 건강한 일상, 부명이 함께합니다.'}</p><Link to="/brands" className="story-link">{en?'Meet our brands':'우리의 브랜드 만나보기'} ↗</Link></div>
      </article>
      <nav className="story-navigation" aria-label={en?'Story chapters':'이야기 장면 선택'}>{names.map((name,i)=><button key={i} className={chapter===i?'active':''} aria-current={chapter===i?'step':undefined} aria-label={name} onClick={()=>go(i)}><i/><span>{name}</span></button>)}</nav>
      <div className="story-hud"><span className="story-chapter-count">0{chapter+1}<i/>08</span><span className="story-current-name">{names[chapter]}</span><button onClick={changeMode} aria-pressed={simple}>{simple?(en?'Immersive view':'몰입형 보기'):(en?'Reduce motion':'모션 줄이기')}</button><button onClick={()=>document.getElementById('brand-collection').scrollIntoView({behavior:simple?'instant':'smooth'})}>{en?'Brands':'브랜드 바로가기'} ↓</button></div>
      <div className="story-progress" aria-hidden="true"/>
    </div>
  </section>;
}

