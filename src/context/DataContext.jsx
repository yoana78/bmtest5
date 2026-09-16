// 이 파일은 브랜드/제품/사이트설정 데이터를 관리하는 Context입니다.
// 예전에는 브라우저 localStorage에만 저장했지만, 이제는 Cloudflare Pages Functions + D1 데이터베이스를
// 통해 서버에 저장합니다 — 그래서 관리자가 한 번 수정하면 그 내용이 "모든 방문자"에게 똑같이 보입니다.
// 관리자 페이지(Admin.jsx)에서 로그인에 성공하면 서버가 HttpOnly 쿠키로 세션을 내려주고,
// 이후 쓰기(추가/수정/삭제) 요청은 브라우저가 그 쿠키를 자동으로 실어 보내 인증됩니다
// (비밀번호 자체는 브라우저 어디에도 저장되지 않습니다).
// Brands.jsx, Catalog.jsx, BrandDetail.jsx, ProductDetail.jsx 등 여러 페이지가 useData()로 이 데이터를 읽어갑니다.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { brands as initialBrands } from '../data/brands';
import { products as initialProducts } from '../data/products';

const DataContext = createContext();

const defaultSiteSettings = {
  contactEmail: 'help@petsb2b.co.kr',
  heroImages: [],
  visionImage: ''
};

// 세션 쿠키는 same-origin 요청에 브라우저가 알아서 실어 보내므로 별도 토큰이 필요 없다.
function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

export function DataProvider({ children }) {
  // 서버에서 데이터를 불러오기 전까지는 원본 데이터(data/brands.js, data/products.js)로 화면을 채워
  // 첫 로딩이 빈 화면으로 보이지 않게 함. 불러오기가 끝나면 서버 데이터로 교체됨.
  const [brands, setBrands] = useState(initialBrands);
  const [products, setProducts] = useState(initialProducts);
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);

  // 페이지가 처음 열릴 때 서버(D1)에서 실제 데이터를 불러옴 — 모든 방문자가 이 API로 같은 데이터를 봄
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.brands) && data.brands.length > 0) setBrands(data.brands);
        if (Array.isArray(data.products) && data.products.length > 0) setProducts(data.products);
        if (data.siteSettings) setSiteSettings(prev => ({ ...prev, ...data.siteSettings }));
      })
      .catch(err => console.error('사이트 데이터를 불러오지 못했습니다:', err));
  }, []);

  // 관리자 페이지에서 사용하는 데이터 조작 함수들 — 전부 서버 API를 호출하고, 성공하면 화면 상태도 갱신함
  const addBrand = async (newBrand) => {
    const res = await fetch('/api/brands', { method: 'POST', headers: authHeaders(), body: JSON.stringify(newBrand) });
    if (!res.ok) throw new Error((await res.json()).error || '브랜드 등록 실패');
    // 서버는 새 브랜드에 가장 큰 position(맨 마지막 노출 순서)을 매기므로, 로컬 상태도
    // 맨 뒤에 붙여야 새로고침 전후로 순서가 달라지지 않는다.
    setBrands(prev => [...prev, newBrand]);
  };

  const deleteBrand = async (id) => {
    const res = await fetch(`/api/brands/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error('브랜드 삭제 실패');
    setBrands(prev => prev.filter(b => b.id !== id));
  };

  const updateBrand = async (id, updates) => {
    const res = await fetch(`/api/brands/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates) });
    if (!res.ok) throw new Error('브랜드 수정 실패');
    const { brand } = await res.json();
    setBrands(prev => prev.map(b => b.id === id ? brand : b));
  };

  // 관리자 페이지에서 브랜드를 한 칸 위/아래로 옮길 때 사용 — 인접한 두 브랜드의 노출 순서(position)를 맞바꾼다
  const moveBrand = async (id, direction) => {
    const idx = brands.findIndex(b => b.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= brands.length) return;

    const next = [...brands];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setBrands(next);

    await Promise.all([
      fetch(`/api/brands/${encodeURIComponent(next[idx].id)}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ position: idx }) }),
      fetch(`/api/brands/${encodeURIComponent(next[swapIdx].id)}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ position: swapIdx }) })
    ]);
  };

  const addProduct = async (newProduct) => {
    const res = await fetch('/api/products', { method: 'POST', headers: authHeaders(), body: JSON.stringify(newProduct) });
    if (!res.ok) throw new Error((await res.json()).error || '제품 등록 실패');
    setProducts(prev => [...prev, newProduct]);
  };

  const deleteProduct = async (id) => {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error('제품 삭제 실패');
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateProduct = async (id, updates) => {
    const res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates) });
    if (!res.ok) throw new Error('제품 수정 실패');
    const { product } = await res.json();
    setProducts(prev => prev.map(p => p.id === id ? product : p));
  };

  // 관리자 페이지의 "초기화" 버튼에서 사용 — 서버 데이터를 원본 기본값으로 되돌림
  const resetData = async () => {
    const res = await fetch('/api/reset', { method: 'POST', headers: authHeaders() });
    if (!res.ok) throw new Error('초기화 실패');
    const data = await fetch('/api/data').then(r => r.json());
    setBrands(data.brands);
    setProducts(data.products);
    setSiteSettings(data.siteSettings);
  };

  // 관리자 페이지의 "초기화 되돌리기" 버튼에서 사용 — 가장 최근 초기화 직전 상태로 복원
  const undoReset = async () => {
    const res = await fetch('/api/reset/undo', { method: 'POST', headers: authHeaders() });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '되돌리기 실패');
    const data = await fetch('/api/data').then(r => r.json());
    setBrands(data.brands);
    setProducts(data.products);
    setSiteSettings(data.siteSettings);
  };

  // 문의 수신 이메일 등 일반 설정값을 부분적으로 덮어씀
  const updateSiteSettings = async (updates) => {
    const res = await fetch('/api/settings', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates) });
    if (!res.ok) throw new Error('설정 저장 실패');
    const { siteSettings: saved } = await res.json();
    setSiteSettings(saved);
  };

  // 이미지 파일을 서버에 업로드하고, 모든 방문자에게 보이는 공개 URL(/api/images/:id)을 돌려받음
  const uploadImage = async (dataUrl) => {
    const res = await fetch('/api/upload', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ dataUrl }) });
    if (!res.ok) throw new Error((await res.json()).error || '이미지 업로드 실패');
    const { url } = await res.json();
    return url;
  };

  // 히어로 슬라이더에 이미지 한 장 추가 (관리자 페이지 - 사이트 설정)
  const addHeroImage = async (image) => {
    await updateSiteSettings({ heroImages: [...siteSettings.heroImages, image] });
  };

  // 히어로 슬라이더에서 이미지 한 장 삭제 (index 기준)
  const removeHeroImage = async (index) => {
    await updateSiteSettings({ heroImages: siteSettings.heroImages.filter((_, i) => i !== index) });
  };

  // 히어로 이미지 순서 변경 - direction은 -1(왼쪽/앞으로) 또는 1(오른쪽/뒤로)
  const moveHeroImage = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= siteSettings.heroImages.length) return; // 맨 앞/맨 뒤에서는 더 이동하지 않음
    const next = [...siteSettings.heroImages];
    [next[index], next[target]] = [next[target], next[index]];
    await updateSiteSettings({ heroImages: next });
  };

  return (
    <DataContext.Provider value={{
      brands, products, addBrand, deleteBrand, updateBrand, moveBrand, addProduct, deleteProduct, updateProduct, resetData, undoReset,
      siteSettings, updateSiteSettings, addHeroImage, removeHeroImage, moveHeroImage, uploadImage
    }}>
      {children}
    </DataContext.Provider>
  );
}

// 다른 컴포넌트/페이지에서 브랜드·제품 데이터와 조작 함수를 꺼내 쓰기 위한 훅
export function useData() {
  return useContext(DataContext);
}
