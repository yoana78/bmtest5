import { useState } from 'react';
import './ExpoGallery.css';
export default function ExpoGallery({groups,en,onOpen,title}){
 const [year,setYear]=useState(null);
 const sorted=[...groups].sort((a,b)=>Number(a.year)-Number(b.year));
 const current=sorted.find(g=>g.year===year)||sorted.at(-1);
 if(!current)return null;
 return <section id="expos" className="expo-timeline-section"><h2>{title}</h2><div className="expo-year-line" role="group" aria-label={en?'Exhibition year':'박람회 연도'}>{sorted.map(g=><button key={g.year} aria-pressed={current.year===g.year} onClick={()=>setYear(g.year)}><span className="expo-year-dot"/>{g.year}</button>)}</div><div className="bm-expo-year-card" key={current.year}><div className="bm-expo-year-header"><div className="bm-expo-year-badge">{current.year}<span>{en?current.labelEn:current.labelKo}</span></div></div><div className="bm-expo-grid">{current.items.map(({photo,index})=><button type="button" className="bm-expo-card" key={photo.id} onClick={()=>onOpen(index)} aria-label={`${en?photo.titleEn:photo.titleKo} ${en?'Enlarge':'확대'}`}><img src={photo.image} alt={en?photo.titleEn:photo.titleKo} loading="lazy"/><span className="bm-expo-card-overlay"><span className="bm-expo-card-loc">{en?photo.locationEn:photo.locationKo}</span><span className="bm-expo-card-title">{en?photo.titleEn:photo.titleKo}</span></span></button>)}</div></div></section>;
}
