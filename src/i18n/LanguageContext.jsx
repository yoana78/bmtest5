// 이 파일은 다국어(한국어/영어) 전환 상태를 관리하는 Context입니다.
// main.jsx에서 앱 전체를 감싸며, 각 페이지/컴포넌트는 useLanguage()로 현재 언어를 가져다 씁니다.
// 화면 문구는 각 페이지에서 lang === 'en' 조건으로 직접 분기해 씁니다.
import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('boomyung-language') === 'en' ? 'en' : 'ko' } catch { return 'ko' } });
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem('boomyung-language', lang) } catch { /* Storage may be disabled. */ } }, [lang]);
  const toggleLang = () => setLang(prev => prev === 'ko' ? 'en' : 'ko'); // 헤더의 언어 전환 버튼에서 사용

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

// 다른 컴포넌트/페이지에서 현재 언어를 꺼내 쓰기 위한 훅
export function useLanguage() {
  return useContext(LanguageContext);
}
