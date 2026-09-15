import { useCopy } from './useCopy'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import SiteDBrandCarousel from './SiteDBrandCarousel'
import './site-d-brands.css'

const MEDIA = '/assets/boomyung/'
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const range = (value, start, end) => clamp((value - start) / (end - start))

// Native document scrolling drives transforms. No wheel interception or per-frame React renders.
function useScrollScenes(root) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const elements = [...root.current.querySelectorAll('[data-scroll-scene]')]
    let scenes = []
    let frame = 0
    let lastChapter = -1
    let lightStart = Infinity
    let lightEnd = Infinity
    let disposed = false
    const header = document.querySelector('.cinematic-header')
    const paint = () => {
      frame = 0
      const y = window.scrollY
      const rail = scenes.find(scene => scene.type === 'rail')
      const railProgress = rail ? clamp((y - rail.top) / rail.distance) : 0
      const lightRail = rail && y >= rail.top && y <= rail.top + rail.distance + 300 && railProgress >= .31 && railProgress < .68
      if (header) header.dataset.surface = lightRail || (y >= lightStart - 50 && y < lightEnd - 50) ? 'light' : 'dark'
      for (const scene of scenes) {
        const p = clamp((y - scene.top) / scene.distance)
        if (scene.previous === p) continue
        scene.previous = p
        const style = scene.element.style
        if (scene.type === 'intro') {
          const active = Math.min(3, Math.floor(p * 4))
          scene.element.querySelectorAll('.hero-scene').forEach((panel, index) => {
            const start = index / 4
            const enter = index === 0 ? 1 : range(p, start - .025, start + .035)
            const leave = index === 3 ? 0 : range(p, start + .185, start + .235)
            const local = range(p, start, start + .25)
            panel.style.setProperty('--scene-reveal', `${(1 - enter) * 100}%`)
            panel.style.setProperty('--scene-alpha', enter)
            panel.style.setProperty('--scene-zoom', 1.09 - local * .09)
            panel.style.setProperty('--copy-alpha', (index === 0 ? 1 : range(p, start + .02, start + .065)) * (1 - leave))
            panel.style.setProperty('--copy-y', `${(1 - enter) * 60 - leave * 65}px`)
            panel.style.setProperty('--copy-scale', index === 0 ? 1 - local * .25 : 1 - leave * .04)
            panel.inert = !reduced.matches && index !== active
          })
          style.setProperty('--hero-progress', p)
          if (scene.element.dataset.active !== String(active)) {
            scene.element.dataset.active = active
            scene.element.dispatchEvent(new Event('hero-scene-change'))
          }
        } else if (scene.type === 'lens') {
          style.setProperty('--frame-inset', `${(1 - range(p, 0, .55)) * 22}%`)
          style.setProperty('--frame-scale', 1.18 - range(p, 0, .55) * .18)
          style.setProperty('--statement-scale', .72 + range(p, .35, .92) * .95)
          style.setProperty('--statement-alpha', range(p, .28, .48))
          style.setProperty('--frame-shade', range(p, .2, .65) * .54)
          // The original Higgsfield camera move follows scroll position in both directions.
          const video = scene.element.querySelector('video')
          if (!reduced.matches && video?.duration && !video.seeking) {
            const target = p * Math.max(0, video.duration - .05)
            if (Math.abs(video.currentTime - target) > .06) video.currentTime = target
          }
        } else if (scene.type === 'rail') {
          style.setProperty('--rail-x', `${-p * scene.travel}px`)
          style.setProperty('--rail-progress', p)
          const chapter = p < .31 ? 0 : p < .68 ? 1 : 2
          if (chapter !== lastChapter) {
            scene.element.dataset.chapter = chapter
            lastChapter = chapter
          }
        }
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const measure = () => {
      if (disposed) return
      const vh = window.innerHeight
      for (const el of elements) {
        if (el.dataset.scrollScene === 'rail') {
          const track = el.querySelector('.cinema-track')
          const travel = Math.max(0, track.scrollWidth - window.innerWidth + 45)
          el.style.setProperty('--rail-height', `${vh + travel}px`)
        }
      }
      scenes = elements.map(element => ({
        element,
        type: element.dataset.scrollScene,
        top: element.getBoundingClientRect().top + window.scrollY,
        distance: Math.max(1, element.offsetHeight - vh),
        travel: Math.max(0, (element.querySelector('.cinema-track')?.scrollWidth || 0) - window.innerWidth + 45),
        previous: -1,
      }))
      lightStart = root.current.querySelector('.cinema-brands').getBoundingClientRect().top + window.scrollY
      lightEnd = root.current.querySelector('.closing-landscape').getBoundingClientRect().top + window.scrollY
      lastChapter = -1
      schedule()
    }
    measure()
    document.fonts.ready.then(measure)
    const layoutObserver = new ResizeObserver(measure)
    layoutObserver.observe(root.current)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', measure)
    reduced.addEventListener('change', measure)
    const media = root.current.querySelector('.lens-video')
    const syncVideo = () => {
      const lens = scenes.find(scene => scene.type === 'lens')
      if (lens) lens.previous = -1
      schedule()
    }
    media?.addEventListener('loadedmetadata', measure)
    media?.addEventListener('seeked', syncVideo)
    return () => {
      disposed = true
      layoutObserver.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', measure)
      reduced.removeEventListener('change', measure)
      media?.removeEventListener('loadedmetadata', measure)
      media?.removeEventListener('seeked', syncVideo)
      if (header) delete header.dataset.surface
    }
  }, [root])
}

function FilmDialog({ onClose }) {
  const { tr } = useCopy()

  const dialog = useRef(null)
  const [scene, setScene] = useState(0)
  const films = ['hero-beginning', 'research', 'hero-making', 'hero-together']
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    const element = dialog.current
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  return <dialog className="cinema-dialog" ref={dialog} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }} aria-label={tr("부명 브랜드 필름")}>
    <button onClick={onClose} className="film-close" aria-label={tr("영상 닫기")}>{tr("닫기 ×")}</button>
    <video key={scene} src={`${MEDIA}${films[scene]}-web.mp4`} poster={`${MEDIA}${films[scene]}.webp`} autoPlay muted playsInline controls onEnded={()=>{if(scene < films.length-1)setScene(scene+1)}} aria-label={`부명 브랜드 필름 ${scene+1}장`}/>
    <div className="film-chapters">{['1995','슬로건','부명','함께하는 내일'].map((label,index)=><button key={label} aria-pressed={scene===index} onClick={()=>setScene(index)}>{String(index+1).padStart(2,'0')} {tr(label)}</button>)}</div>
  </dialog>
}

function Opening({ onFilm }) {
  const { tr } = useCopy()

  const ref = useRef(null)
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const section = ref.current
    const videos = [...section.querySelectorAll('video')]
    let visible = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      const active = Number(section.dataset.active || 0)
      videos.forEach((video, index) => {
        if (paused || reduced.matches || document.hidden || !visible || index !== active) video.pause()
        else video.play().catch(() => {})
      })
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    section.addEventListener('hero-scene-change', sync)
    reduced.addEventListener('change', sync)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .01 })
    observer.observe(section)
    return () => { document.removeEventListener('visibilitychange', sync); section.removeEventListener('hero-scene-change', sync); reduced.removeEventListener('change', sync); observer.disconnect(); videos.forEach(video => video.pause()) }
  }, [paused])
  const scenes = [
    { file:'hero-beginning', label:'SINCE 1995', content:<><p className="hero-year">1995</p><p className="hero-year-note">{tr("반려의 일상을 생각하는 마음,")}<br/>{tr("부명의 시작.")}</p></> },
    { file:'research', label:'RESPECT FOR PET LIFE', content:<p className="hero-slogan">{tr("함께하는 일상에,")}<br/>{tr("건강한 행복을.")}</p> },
    { file:'hero-making', label:'PET FOOD & SUPPLIES · OEM / ODM', content:<><p className="hero-company">{tr("부명")}</p><p className="hero-company-en">BOOMYUNG</p></> },
    { file:'hero-together', label:'BETTER EVERYDAY, TOGETHER', content:<><p className="hero-sub-slogan">{tr("반려동물을 향한 진심을 담아")}<br/>{tr("좋은 먹거리와")}<br className="mobile-break"/> {tr("더 나은 내일을 만듭니다.")}</p><div className="intro-actions"><button onClick={onFilm}>{tr("브랜드 필름 보기")} <span>↗</span></button><Link to="/#business">{tr("부명의 비즈니스")} <span>↓</span></Link></div></> },
  ]
  return <section ref={ref} className="cinema-opening" data-scroll-scene="intro" data-active="0" aria-label={tr("1995, 슬로건, 부명, 서브슬로건으로 이어지는 브랜드 이야기")}>
    <h1 className="visually-hidden">{tr("1995년부터 함께한 반려생활, 부명 BOOMYUNG")}</h1>
    <div className="cinema-sticky opening-stage">
      {scenes.map((scene,index) => <div key={scene.file} className={`hero-scene hero-scene-${index}`} style={{'--scene-reveal':index ? '100%' : '0%','--scene-alpha':index ? 0 : 1,'--copy-alpha':index ? 0 : 1}}>
        <div className="hero-scene-media" aria-hidden="true"><img src={`${MEDIA}${scene.file}.webp`} alt="" fetchPriority={index === 0 ? 'high' : undefined}/><video src={`${MEDIA}${scene.file}-web.mp4`} poster={`${MEDIA}${scene.file}.webp`} muted loop playsInline preload={index === 0 ? 'auto' : 'metadata'}/></div>
        <div className="hero-scene-copy"><span className="hero-scene-label">{scene.label}</span>{scene.content}</div>
      </div>)}
      <div className="opening-caption"><div className="hero-step-labels">{['1995','RESPECT','BOOMYUNG','TOGETHER'].map((text,index)=><span key={text} className={`hero-step-${index}`}>{text}</span>)}</div><span className="opening-scroll">SCROLL TO EXPLORE <b>↓</b></span></div>
      <div className="hero-timeline" aria-hidden="true"><span/></div>
      <button className="cinema-pause" onClick={() => setPaused(!paused)} aria-label={tr(paused ? '배경 영상 재생' : '배경 영상 일시정지')}>{paused ? '▶' : 'Ⅱ'}</button>
    </div>
  </section>
}

function LensScene() {
  const { tr } = useCopy()

  return <section className="cinema-lens" id="story" data-scroll-scene="lens" aria-label={tr("제품에서 일상으로")}>
    <div className="cinema-sticky lens-stage">
      <div className="lens-caption"><span>FROM A SMALL DETAIL</span><span>TO A BETTER EVERYDAY</span></div>
      <div className="lens-frame"><img src={`${MEDIA}research.webp`} alt={tr("원료와 사료 샘플을 살피는 반려동물 먹거리 연구 콘셉트 이미지")} loading="lazy"/><video className="lens-video" src={`${MEDIA}research-web.mp4`} poster={`${MEDIA}research.webp`} muted playsInline preload="metadata" aria-hidden="true"/><div className="lens-shade"/></div>
      <h2 className="lens-statement">{tr("좋은 일상을")}<br/>{tr("만드는 연결.")}</h2>
      <span className="lens-footnote">{tr("작은 디테일에서 시작해, 반려의 일상에 닿기까지.")}</span>
    </div>
  </section>
}

const getChapters = tr => [
  {
    key:'MAKE', number:'01', theme:'dark', title:<>{tr("좋은 제품은")}<br/>{tr("좋은 질문에서.")}</>,
    description:'무엇을 먹고, 어떻게 생활할까요? 반려동물의 일상을 이해하는 것에서 부명의 제품 개발은 시작됩니다.',
    image:`${MEDIA}intro-make.webp`,
    cards:[
      { label:'OEM / ODM', title:'아이디어를 제품으로', body:'제품 기획과 개발부터 제조, 패키지까지. 브랜드에 맞는 제품을 함께 완성합니다.', image:`${MEDIA}research.webp`, video:`${MEDIA}research-card-web.mp4`, to:'/contact?type=oem', cta:'제조 상담' },
      { label:'PET FOOD & SUPPLIES', title:'매일을 위한 선택', body:'사료와 간식, 생활용품까지. 함께하는 하루에 필요한 제품을 만듭니다.', image:'/assets/renewal/brand-dayspo.jpg', to:'/products', cta:'제품 보기' },
    ],
  },
  {
    key:'CONNECT', number:'02', theme:'light', title:<>{tr("브랜드에서")}<br/>{tr("우리의 일상으로.")}</>,
    description:'좋은 제품이 필요한 곳에 닿을 수 있도록. 브랜드와 국내의 다양한 유통 채널을 연결합니다.',
    image:`${MEDIA}intro-connect.webp`,
    cards:[
      { label:'DOMESTIC DISTRIBUTION', title:'더 가까이 만나는 가치', body:'온라인과 오프라인을 잇는 유통. 파트너와 함께 브랜드의 접점을 넓혀갑니다.', image:'/assets/renewal/logistics-poster.jpg', video:'/assets/renewal/logistics.mp4', to:'/contact?type=domestic', cta:'유통 상담' },
      { label:'OUR BRANDS', title:'각자의 개성, 같은 마음', body:'데이스포, 벨버드, 에버그로, 하우펫. 더 좋은 반려생활을 향한 다양한 답을 만납니다.', image:'/assets/renewal/brand-bellbird.jpg', to:'/products', cta:'브랜드 제품 보기' },
    ],
  },
  {
    key:'BEYOND', number:'03', theme:'blue', title:<>{tr("가능성에는")}<br/>{tr("국경이 없으니까.")}</>,
    description:'국내의 좋은 제품을 해외로, 세계의 다양한 브랜드를 국내로. 더 넓은 세상의 반려생활을 이어갑니다.',
    image:`${MEDIA}intro-beyond.webp`,
    cards:[
      { label:'GLOBAL BUSINESS', title:'세상을 향한 연결', body:'해외 수출과 브랜드 수입을 통해 새로운 시장의 기회를 함께 찾습니다.', image:`${MEDIA}port-motion.webp`, video:`${MEDIA}port-motion-web.mp4`, to:'/contact?type=export', cta:'해외 사업 문의' },
      { label:'GROW TOGETHER', title:'다음 이야기는, 함께', body:'당신의 브랜드와 부명의 경험이 만나 더 큰 가능성이 됩니다.', image:`${MEDIA}hero.webp`, to:'/contact', cta:'파트너십 시작하기' },
    ],
  },
]

function CardMedia({ image, video, label }) {
  const { tr } = useCopy()

  const ref = useRef(null)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (!video) return
    const element = ref.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => { if (!visible || paused || reduced.matches || document.hidden) element.pause(); else element.play().catch(() => {}) }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio > .25; sync() }, {threshold:[0,.25,.5]})
    observer.observe(element)
    element.addEventListener('canplay',sync)
    document.addEventListener('visibilitychange',sync)
    reduced.addEventListener('change',sync)
    return () => {observer.disconnect();element.removeEventListener('canplay',sync);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);element.pause()}
  },[video,paused])
  return <div className="business-card-media"><img src={image} alt="" loading="lazy"/>{video && <><video ref={ref} src={video} poster={image} muted loop playsInline preload="metadata" aria-label={label}/><button className="card-video-toggle" aria-label={tr(paused ? '영상 재생' : '영상 일시정지')} onClick={e=>{e.preventDefault();e.stopPropagation();setPaused(value=>!value)}}>{paused ? '▶' : 'Ⅱ'}</button></>}</div>
}

function BusinessRail() {
  const { tr } = useCopy()
  const chapters = getChapters(tr)

  const section = useRef(null)
  const moveTo = (index, smooth = true) => {
    const el = section.current
    const group = el.querySelectorAll('.cinema-chapter')[index]
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { group.scrollIntoView({behavior:'instant'}); return }
    const offset = el.getBoundingClientRect().top + window.scrollY
    const firstOffset = el.querySelector('.cinema-chapter').offsetLeft
    window.scrollTo({top:offset + group.offsetLeft - firstOffset, behavior:smooth ? 'smooth' : 'instant'})
  }
  const focusPanel = e => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const panel = e.target.closest('.cinema-card')
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    if (rect.left < 45 || rect.right > window.innerWidth) {
      const root = section.current
      const track = root.querySelector('.cinema-track')
      const x = panel.getBoundingClientRect().left - track.getBoundingClientRect().left - 70
      window.scrollTo({top:root.getBoundingClientRect().top + window.scrollY + x, behavior:'instant'})
    }
  }
  return <section id="business" ref={section} className="cinema-rail" data-scroll-scene="rail" data-chapter="0" aria-label={tr("부명의 제조, 유통, 해외 사업")}>
    <div className="cinema-sticky rail-window">
      <div className="rail-ribbon" aria-hidden="true">{chapters.map((c,i)=><span key={c.key} className={`ribbon-${i}`}><b>{c.number} / 03</b><span>{tr(['제품 개발 · 제조','국내 유통 · 브랜드','글로벌 비즈니스'][i])}</span><small>BOOMYUNG</small></span>)}</div>
      <nav className="rail-nav" aria-label={tr("사업 챕터 바로가기")}>{chapters.map((c,i)=><button className={`rail-tab-${i}`} onClick={()=>moveTo(i)} key={c.key}><small>{c.number}</small> {c.key}</button>)}<span>SCROLL ↓</span></nav>
      <div className="cinema-track" onFocusCapture={focusPanel}>
        {chapters.map(c=><div className={`cinema-chapter chapter-${c.theme}`} key={c.key}>
          <article className="chapter-intro"><span className="chapter-en">{c.key}</span><h2>{c.title}</h2><p>{tr(c.description)}</p><img className="chapter-intro-image" src={c.image} alt="" loading="lazy"/></article>
          {c.cards.map(card=><article className="cinema-card" key={card.title}><CardMedia image={card.image} video={card.video} label={card.label}/><Link className="business-card-link" to={card.to}><span className="card-arrow" aria-hidden="true">↗</span><div className="cinema-card-copy"><span>{card.label}</span><h3>{tr(card.title)}</h3><p>{tr(card.body)}</p><b>{tr(card.cta)} <span>→</span></b></div></Link></article>)}
        </div>)}
      </div>
      <div className="rail-progress"><span/></div>
    </div>
  </section>
}

function BrandClosing() {
  const { tr, en } = useCopy()

  const { brands } = useData()
  return <><div className="cinema-brands site-d-brand-wrapper"><SiteDBrandCarousel brands={brands} en={en} subtitle={tr("반려동물의 일상을 함께하는 부명의 브랜드를 소개합니다.")}/></div><section className="cinema-contact"><div className="cinema-contact-title"><h2>CONTACT</h2><div><p>{tr("다음 가능성을 함께 이야기해요.")}</p><Link to="/contact">{tr("파트너십 문의하기")} <span>↗</span></Link></div></div><div className="closing-landscape"><img src={`${MEDIA}companionship.webp`} alt={tr("햇살이 드는 테라스에서 반려견과 교감하는 사람")} loading="lazy"/><span>BETTER PET LIFE.<br/>TOGETHER.</span></div></section></>
}

export default function ImmersiveHome() {
  const { tr } = useCopy()

  const root = useRef(null)
  const [film, setFilm] = useState(false)
  useScrollScenes(root)
  return <div className="cinematic-home" ref={root}>
    <Opening onFilm={()=>setFilm(true)}/>
    <LensScene/>
    <section className="cinema-manifesto"><h2>{tr("제품과 브랜드,")}<br/>{tr("그리고 일상을 잇다.")}</h2><div><p>{tr("제조는 유통을 만나고,")}<br/>{tr("브랜드는 더 넓은 세상을 만납니다.")}</p><p>{tr("서로 다른 전문성이 하나로 연결될 때,")}<br/>{tr("반려생활의 새로운 가능성이 시작됩니다.")}<br/>{tr("이것이 부명이 함께 성장하는 방식입니다.")}</p></div><span>OUR BUSINESS — KEEP SCROLLING ↓</span></section>
    <BusinessRail/>
    <BrandClosing/>
    {film && <FilmDialog onClose={()=>setFilm(false)}/>}
  </div>
}
