// 이 파일은 "관리자" 페이지입니다 (주소: /admin, 푸터의 "관리자" 링크로 접근).
// 비밀번호 입력 화면을 통과하면 브랜드/제품을 추가·수정·삭제할 수 있는 관리자 콘솔이 나타납니다.
// 여기서 저장한 내용은 DataContext를 통해 서버(Cloudflare D1)에 저장되며, 모든 방문자에게 똑같이 보입니다.
// Brands/Catalog 등 다른 페이지에 바로 반영됩니다.
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import PageContentEditor from './PageContentEditor';
import { LIST_DEFAULTS } from '../content/siteLists';
import { EXPO_PHOTO_SIZE } from '../content/expoData';

// 이미지를 캔버스로 다시 그려서 축소/압축한 dataURL을 만듦.
// R2(전용 이미지 저장소) 없이 데이터베이스(D1)에 이미지를 직접 저장하기 때문에 한 장당 용량 제한(약 900KB)이 있음 —
// 원본을 그대로 올리면 이 제한에 걸리기 쉬워서, 웹에 보여주기에 충분한 해상도로 줄이고 화질을 낮춰가며 제한 안에 맞춘다.
function compressImage(file, { maxDimension = 1600, startQuality = 0.85, maxBase64Length = 850000 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      // "긴 쪽" 기준이 아니라 가로 폭 기준으로만 1차 축소한다 — 세로로 아주 긴 상세페이지
      // 인포그래픽(예: 800x6563)을 긴 쪽(세로) 기준으로 줄이면 가로 폭이 200px 밑으로 떨어져
      // 글자를 알아볼 수 없게 된다.
      if (width > maxDimension) {
        const scale = maxDimension / width;
        width = maxDimension;
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // PNG(투명 배경)를 쓴 파일은 투명도를 지키기 위해 PNG로, 그 외는 용량이 훨씬 작은 JPEG로 인코딩
      let keepPng = file.type === 'image/png';
      let quality = startQuality;
      let dataUrl = canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', quality);

      // PNG는 품질 옵션이 없어서, 크면 아래 루프가 가로세로를 계속 줄여 글자가 뭉개진다
      // (예: 1116x2000 상세 인포그래픽 -> 419x750). 용량 초과인 PNG는 흰 배경을 깔고
      // 원래 해상도 그대로 JPEG로 바꿔 품질만 조절한다.
      if (keepPng && dataUrl.length > maxBase64Length) {
        keepPng = false;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      // 여전히 너무 크면 품질을 낮추고, 품질을 최대로 낮췄는데도(또는 PNG라 품질 옵션이 없어서)
      // 여전히 크면 캔버스 크기 자체를 반복해서 줄인다 (가로로 긴 세로 인포그래픽처럼
      // 픽셀 수 자체가 많아 품질만으로는 용량이 안 줄어드는 경우 대비).
      // 세로로 아주 긴 상세페이지 인포그래픽은 품질을 많이 낮춰도(0.15까지) 텍스트가 알아볼 수
      // 있는 수준으로 남지만, 해상도(가로 폭)를 줄이면 글자가 급격히 흐려지므로 품질 하한을
      // 훨씬 낮게 잡아 해상도를 최대한 오래 유지한다.
      while (dataUrl.length > maxBase64Length && (quality > 0.15 || canvas.width > 300)) {
        if (quality > 0.15) quality -= 0.05;
        if (keepPng || quality <= 0.15) {
          canvas.width = Math.round(canvas.width * 0.85);
          canvas.height = Math.round(canvas.height * 0.85);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', keepPng ? undefined : quality);
        } else {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
      }
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

// 테두리(모서리)에서부터 흰색 계열 픽셀을 안쪽으로 연결해서(flood fill) 투명 처리한다.
// 이미지 전체에서 흰 픽셀을 다 지우는 게 아니라 "테두리와 연결된" 흰 배경만 지우기 때문에,
// 로고 글자처럼 피사체 안에 있는 흰색은 지워지지 않는다.
// 반환하는 bgFraction이 아주 작으면(예: 박스 사진처럼 프레임을 꽉 채운 경우) 지울 배경이
// 사실상 없다는 뜻이므로, 호출부에서 투명 PNG 대신 원래의 JPEG 압축으로 되돌린다.
function floodFillWhiteBackground(canvas, ctx, { threshold = 235 } = {}) {
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const isBg = (idx) => data[idx] >= threshold && data[idx + 1] >= threshold && data[idx + 2] >= threshold;
  const visited = new Uint8Array(width * height);
  const stack = [];

  const pushIfBg = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    if (!isBg(p * 4)) return;
    visited[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < width; x++) { pushIfBg(x, 0); pushIfBg(x, height - 1); }
  for (let y = 0; y < height; y++) { pushIfBg(0, y); pushIfBg(width - 1, y); }

  let removedCount = 0;
  while (stack.length) {
    const p = stack.pop();
    const x = p % width, y = (p / width) | 0;
    data[p * 4 + 3] = 0;
    removedCount++;
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
  return removedCount / (width * height);
}

// 제품 "대표 이미지"는 항상 흰 배경을 투명으로 지운 PNG로 저장한다 (JPEG로 올려도 자동 변환).
// PNG는 화질(quality) 옵션이 없어서 용량 제한에 걸리면 해상도 자체를 줄여야 하므로,
// 압축 JPEG보다 이 경로의 최종 해상도가 더 낮아질 수 있다.
function compressProductImage(file, { maxDimension = 1600, maxBase64Length = 850000, minBgFraction = 0.03 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const longSide = Math.max(width, height);
      if (longSide > maxDimension) {
        const scale = maxDimension / longSide;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const bgFraction = floodFillWhiteBackground(canvas, ctx);
      if (bgFraction < minBgFraction) {
        // 지울 배경이 사실상 없음 (예: 프레임을 꽉 채운 박스 사진) - 일반 JPEG 압축으로 되돌아간다.
        resolve(compressImage(file, { maxDimension, maxBase64Length }));
        return;
      }

      let dataUrl = canvas.toDataURL('image/png');
      while (dataUrl.length > maxBase64Length && canvas.width > 200) {
        canvas.width = Math.round(canvas.width * 0.85);
        canvas.height = Math.round(canvas.height * 0.85);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        floodFillWhiteBackground(canvas, ctx);
        dataUrl = canvas.toDataURL('image/png');
      }
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

// 페이지에 들어가는 이미지는 자리마다 노출 규격(가로:세로 비율)이 정해져 있다.
// 다른 비율의 사진을 올리면 레이아웃이 깨지므로, 가운데를 기준으로 잘라내(center crop)
// 규격 비율에 맞춘 뒤 권장 해상도까지만 줄여서 저장한다.
function cropImageToBox(file, targetWidth, targetHeight, { maxBase64Length = 850000, mode = 'cover' } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const targetRatio = targetWidth / targetHeight;
      const sourceRatio = img.width / img.height;

      // cover: 비율이 남는 쪽(가로가 넓으면 좌우, 세로가 길면 위아래)을 잘라내 규격을 꽉 채운다.
      // contain: 로고처럼 잘리면 안 되는 이미지는 자르지 않고 전체를 넣고 남는 부분을 여백으로 둔다.
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (mode === 'cover') {
        if (sourceRatio > targetRatio) {
          sw = Math.round(img.height * targetRatio);
          sx = Math.round((img.width - sw) / 2);
        } else if (sourceRatio < targetRatio) {
          sh = Math.round(img.width / targetRatio);
          sy = Math.round((img.height - sh) / 2);
        }
      }

      // 원본이 권장 해상도보다 작으면 억지로 늘리지 않는다 (확대하면 흐려지기만 함)
      let outW = mode === 'cover' ? Math.min(targetWidth, sw) : targetWidth;
      let outH = Math.round(outW / targetRatio);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let keepPng = file.type === 'image/png';

      const draw = () => {
        canvas.width = outW;
        canvas.height = outH;
        if (!keepPng) {
          // JPEG는 투명도가 없어 검게 깔리므로 흰 배경을 먼저 채운다
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, outW, outH);
        }
        if (mode === 'cover') {
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        } else {
          const scale = Math.min(outW / sw, outH / sh);
          const dw = Math.round(sw * scale);
          const dh = Math.round(sh * scale);
          ctx.drawImage(img, sx, sy, sw, sh, Math.round((outW - dw) / 2), Math.round((outH - dh) / 2), dw, dh);
        }
      };

      draw();
      let quality = 0.88;
      let dataUrl = canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', quality);
      // Same PNG issue as compressImage: switch an oversized PNG to JPEG instead of shrinking it.
      if (keepPng && dataUrl.length > maxBase64Length) {
        keepPng = false;
        draw();
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      while (dataUrl.length > maxBase64Length && (quality > 0.35 || outW > 400)) {
        if (quality > 0.35) {
          quality -= 0.08;
        } else {
          outW = Math.round(outW * 0.85);
          outH = Math.round(outW / targetRatio);
          draw();
        }
        dataUrl = canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', keepPng ? undefined : quality);
      }
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export default function Admin() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const {
    brands, products, addBrand, deleteBrand, updateBrand, moveBrand, addProduct, deleteProduct, updateProduct, resetData, undoReset,
    siteSettings, updateSiteSettings, addHeroImage, removeHeroImage, moveHeroImage, uploadImage
  } = useData();
  const [settingsEmail, setSettingsEmail] = useState(siteSettings.contactEmail);
  const [productFilterBrand, setProductFilterBrand] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProductOriginal, setEditingProductOriginal] = useState(null); // 기존 영문 번역값을 덮어쓰지 않기 위해 원본을 보관
  const [editForm, setEditForm] = useState({
    nameKo: '',
    nameEn: '',
    brandId: '',
    category: '사료',
    petType: 'dog',
    code: '',
    spec: '',
    shelfLife: '',
    origin: '',
    features: '',
    ingredients: '',
    protein: '',
    fat: '',
    fiber: '',
    moisture: '',
    image: '',
    purchaseUrl: '',
    infoImages: []
  });

  // 비밀번호 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 이전에 로그인한 세션 쿠키가 아직 유효하면(4시간 이내) 비밀번호를 다시 묻지 않는다.
  useEffect(() => {
    fetch('/api/session')
      .then(res => res.json())
      .then(data => { if (data.authenticated) setIsAuthenticated(true); })
      .catch(() => {});
  }, []);

  // 은행 앱처럼, 15분 동안 마우스/키보드 조작이 없으면 자동으로 로그아웃한다.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const IDLE_LIMIT_MS = 15 * 60 * 1000;
    let idleTimer = setTimeout(autoLogout, IDLE_LIMIT_MS);
    function autoLogout() {
      fetch('/api/logout', { method: 'POST' }).finally(() => setIsAuthenticated(false));
    }
    function resetTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(autoLogout, IDLE_LIMIT_MS);
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetTimer));
    return () => {
      clearTimeout(idleTimer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [isAuthenticated]);

  // [보안 탭] 비밀번호 변경 폼 상태
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  // [보안 탭] 최근 로그인/비밀번호 변경/초기화 이력 (IP 포함)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAuditLogs = () => {
    setAuditLoading(true);
    fetch('/api/audit-log')
      .then(res => res.json())
      .then(data => setAuditLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setAuditLoading(false));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (pwForm.next.length < 4) {
      setPwError(isEn ? 'New password must be at least 4 characters.' : '새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError(isEn ? 'New passwords do not match.' : '새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(data.error || (isEn ? 'Failed to change password.' : '비밀번호 변경에 실패했습니다.'));
        return;
      }
      setPwMsg(isEn ? 'Password changed.' : '비밀번호가 변경되었습니다.');
      setPwForm({ current: '', next: '', confirm: '' });
      loadAuditLogs();
    } catch {
      setPwError(isEn ? 'Failed to change password.' : '비밀번호 변경에 실패했습니다.');
    }
  };


  // "문구·이미지 초기화" — 되돌아가는 범위를 정확히 알려주고, 실수로 누르는 일이 없도록
  // "초기화"를 직접 입력해야 진행된다. 브랜드·제품은 이 버튼으로 절대 지워지지 않는다.
  const handleResetPageContent = () => {
    const warn = isEn
      ? [
          'Reset page text and images to their defaults?',
          '',
          '[Will be reset]',
          '  - Every text and photo edited under "Page Text / Images"',
          '  - Home hero images, vision background, inquiry email',
          '',
          '[Not touched]',
          '  - ' + brands.length + ' brands and ' + products.length + ' products (never deleted)',
          '  - Uploaded image files, admin password',
          '',
          'Type RESET to continue.',
        ].join(String.fromCharCode(10))
      : [
          '페이지 문구와 이미지를 기본값으로 되돌립니다.',
          '',
          '[되돌아가는 것]',
          '  · "페이지 문구·이미지"에서 수정한 모든 문구와 사진',
          '  · 홈 히어로 이미지, 비전 배경 사진, 문의 수신 이메일',
          '',
          '[영향 없는 것]',
          '  · 브랜드 ' + brands.length + '개, 제품 ' + products.length + '개 (삭제되지 않습니다)',
          '  · 업로드한 이미지 파일, 관리자 비밀번호',
          '',
          '계속하려면 아래에 "초기화" 라고 입력하세요.',
        ].join(String.fromCharCode(10));
    const answer = window.prompt(warn, '');
    if (answer === null) return;
    if (answer.trim() !== (isEn ? 'RESET' : '초기화')) {
      alert(isEn ? 'Cancelled - the text did not match.' : '입력한 내용이 달라서 취소되었습니다.');
      return;
    }
    resetData()
      .then(() => alert(isEn ? 'Page text and images were reset.' : '페이지 문구·이미지가 기본값으로 되돌아갔습니다.'))
      .catch(() => alert(isEn ? 'Failed to reset.' : '초기화에 실패했습니다.'));
  };

  const handleUndoResetPageContent = () => {
    const msg = isEn
      ? 'Restore the page text and images from just before the last reset? Brands and products are not affected.'
      : '가장 최근 초기화 직전의 문구·이미지 설정으로 되돌리시겠습니까? (브랜드·제품에는 영향이 없습니다.)';
    if (!window.confirm(msg)) return;
    undoReset()
      .then(() => alert(isEn ? 'Restored.' : '이전 문구·이미지 설정으로 복원되었습니다.'))
      .catch((err) => alert(err.message || (isEn ? 'Undo failed.' : '되돌리기에 실패했습니다.')));
  };

  const [activeTab, setActiveTab] = useState('brand');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (activeTab === 'security') loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 1. 브랜드 등록 폼 입력값
  const [brandForm, setBrandForm] = useState({
    nameKo: '',
    nameEn: '',
    type: 'own', // 'own' = 브랜드(자사) 페이지, 'imported' = 수입브랜드 페이지에 노출
    tagline: '',
    taglineEn: '',
    descriptionKo: '',
    descriptionEn: '',
    color: '#0066B3',
    logo: '',
    logoScale: 1,
    bgImage: ''
  });

  // 기존 브랜드 수정 팝업 상태
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editBrandForm, setEditBrandForm] = useState({
    nameKo: '',
    nameEn: '',
    type: 'own',
    tagline: '',
    taglineEn: '',
    descriptionKo: '',
    descriptionEn: '',
    color: '#0066B3',
    logo: '',
    logoScale: 1,
    bgImage: ''
  });

  // 2. 제품 등록 폼 입력값
  const [productForm, setProductForm] = useState({
    nameKo: '',
    nameEn: '',
    brandId: '',
    category: '사료',
    petType: 'dog',
    code: '',
    spec: '',
    shelfLife: '제조일로부터 18개월까지',
    origin: '대한민국',
    features: '',
    ingredients: '',
    protein: '',
    fat: '',
    fiber: '',
    moisture: '',
    image: '',
    purchaseUrl: '',
    infoImages: []
  });

  // 브랜드 삭제 처리
  const handleDeleteBrand = (brand) => {
    const usedByProducts = products.some(p => p.brandId === brand.id);
    const confirmMsg = usedByProducts
      ? (isEn
          ? `"${brand.nameKo}" has products linked to it. Delete the brand anyway? (linked products will remain but show no brand)`
          : `"${brand.nameKo}" 브랜드에 연결된 제품이 있습니다. 그래도 브랜드를 삭제하시겠습니까? (연결된 제품은 남지만 브랜드 정보가 사라집니다)`)
      : (isEn ? `Delete brand "${brand.nameKo}"?` : `"${brand.nameKo}" 브랜드를 삭제하시겠습니까?`);
    if (window.confirm(confirmMsg)) {
      deleteBrand(brand.id)
        .then(() => {
          setSuccessMsg(isEn ? `Brand "${brand.nameKo}" deleted.` : `브랜드 "${brand.nameKo}"이(가) 삭제되었습니다.`);
          setTimeout(() => setSuccessMsg(''), 4000);
        })
        .catch(() => alert(isEn ? 'Failed to delete.' : '삭제에 실패했습니다.'));
    }
  };

  // 제품 삭제 처리
  const handleDeleteProduct = (product) => {
    if (window.confirm(isEn ? `Delete product "${product.nameKo}"?` : `"${product.nameKo}" 제품을 삭제하시겠습니까?`)) {
      deleteProduct(product.id)
        .then(() => {
          setSuccessMsg(isEn ? `Product "${product.nameKo}" deleted.` : `제품 "${product.nameKo}"이(가) 삭제되었습니다.`);
          setTimeout(() => setSuccessMsg(''), 4000);
        })
        .catch(() => alert(isEn ? 'Failed to delete.' : '삭제에 실패했습니다.'));
    }
  };

  // 파일을 압축한 뒤 서버(/api/upload)에 업로드하고, 모든 방문자에게 보이는 공개 URL을 돌려받는 공용 헬퍼
  const readAndUpload = async (file) => {
    const dataUrl = await compressImage(file);
    return uploadImage(dataUrl);
  };

  // 제품 "대표 이미지" 전용: 흰 배경을 투명으로 지운 PNG로 변환한 뒤 업로드한다.
  const readAndUploadProductImage = async (file) => {
    const dataUrl = await compressProductImage(file);
    return uploadImage(dataUrl);
  };

  // 페이지 문구·이미지 탭 전용 업로드.
  // 사진은 그 자리의 노출 규격(가로:세로)에 맞춰 가운데를 기준으로 자동 크롭하고,
  // 동영상은 잘라낼 수 없으므로 파일을 그대로 올린다.
  const handleUploadPageMedia = async (file, field) => {
    if (file.type.startsWith('video/')) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (dataUrl.length > 900000) {
        throw new Error('영상 용량이 너무 큽니다 (약 600KB 이하만 가능). 더 짧거나 더 압축된 영상을 올려주세요.');
      }
      return { src: await uploadImage(dataUrl), kind: 'video' };
    }
    const dataUrl = await cropImageToBox(file, field.width, field.height);
    return { src: await uploadImage(dataUrl), kind: 'image' };
  };

  // 목록형 데이터(로고·명함)의 이미지 업로드 — 자리별 규격에 맞춰 자동 크롭
  const handleUploadListImage = async (file, width, height, mode = 'cover') => {
    const dataUrl = await cropImageToBox(file, width, height, { mode });
    return uploadImage(dataUrl);
  };

  // 박람회 갤러리 사진 업로드 — 타일 규격에 맞춰 가운데를 기준으로 잘라낸다
  const handleUploadExpoPhoto = async (file) => {
    const dataUrl = await cropImageToBox(file, EXPO_PHOTO_SIZE.width, EXPO_PHOTO_SIZE.height);
    return uploadImage(dataUrl);
  };

  // 영문 항목을 비워두면 한글 값을 자동 번역해서 채워주는 헬퍼 (실패 시 조용히 빈 값 유지)
  const translateText = async (text) => {
    if (!text || !text.trim()) return '';
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) return '';
      const { translated } = await res.json();
      return translated || '';
    } catch {
      return '';
    }
  };

  // 제품 등록/수정 시 비어있는 영문 항목들(제품명, 원산지, 유통기한, 원료, 특징)을 한 번에 번역
  const translateProductFields = async ({ nameKo, nameEn, origin, originEn, shelfLife, shelfLifeEn, ingredients, ingredientsEn, features, featuresEn }) => {
    const [tNameEn, tOriginEn, tShelfLifeEn, tIngredientsEn, tFeaturesEn] = await Promise.all([
      nameEn || translateText(nameKo),
      originEn || translateText(origin),
      shelfLifeEn || translateText(shelfLife),
      ingredientsEn || translateText(ingredients),
      featuresEn && featuresEn.length ? featuresEn : Promise.all((features || []).map(translateText))
    ]);
    return { nameEn: tNameEn, originEn: tOriginEn, shelfLifeEn: tShelfLifeEn, ingredientsEn: tIngredientsEn, featuresEn: tFeaturesEn };
  };

  // 등록 성분량은 사료/간식에만 의미가 있고, 값을 하나도 안 채웠으면 빈 표가 뜨지 않도록
  // nutrition 필드 자체를 아예 생략한다 (undefined로 반환).
  // 일부만 채운 경우에도 빈 항목이 표에 줄로 남지 않도록, 값이 있는 항목만 남긴다.
  const CATEGORIES_WITH_NUTRITION = ['사료', '간식'];
  const buildNutrition = (category, { protein, fat, fiber, moisture }) => {
    if (!CATEGORIES_WITH_NUTRITION.includes(category)) return undefined;
    const filled = Object.entries({ protein, fat, fiber, moisture }).filter(([, v]) => v && v.trim());
    if (filled.length === 0) return undefined;
    return Object.fromEntries(filled);
  };

  // 비밀번호 확인 — 서버(/api/login)가 실제 값을 검증하고, 맞으면 HttpOnly 세션 쿠키를 내려준다.
  // 비밀번호는 프론트엔드 코드 어디에도 남지 않는다.
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setPasswordError('');
      } else {
        setPasswordError(isEn ? 'Incorrect password.' : '비밀번호가 일치하지 않습니다.');
      }
    } catch {
      setPasswordError(isEn ? 'Login failed. Please try again.' : '로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  // 문의 수신 이메일 저장
  const handleSaveContactEmail = async (e) => {
    e.preventDefault();
    try {
      await updateSiteSettings({ contactEmail: settingsEmail.trim() });
      setSuccessMsg(isEn ? 'Contact email updated!' : '문의 수신 이메일이 저장되었습니다!');
    } catch (err) {
      alert(isEn ? 'Failed to save. Please try again.' : '저장에 실패했습니다. 다시 시도해 주세요.');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 히어로 슬라이더에 이미지 파일 추가 업로드
  const handleHeroImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // 같은 파일을 연속으로 다시 선택할 수 있도록 초기화
    try {
      const url = await readAndUpload(file);
      await addHeroImage(url);
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  // 히어로 바로 아래 섹션(비전 문구) 배경 이미지 교체 업로드
  const handleVisionImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await readAndUpload(file);
      await updateSiteSettings({ visionImage: url });
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  // 브랜드 로고 이미지 업로드 처리 (서버에 업로드 후 반환된 URL을 폼에 저장)
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await readAndUpload(file);
      setBrandForm(prev => ({ ...prev, logo: url }));
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  // 브랜드 카드 배경 이미지 업로드 처리 (예: 반려동물 라이프스타일 사진 — 로고 뒤에 깔리는 배경)
  const handleBgImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await readAndUpload(file);
      setBrandForm(prev => ({ ...prev, bgImage: url }));
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  // 기존 브랜드의 "수정" 버튼 클릭 시 - 수정 폼에 해당 브랜드 정보를 채워 넣고 팝업을 염
  const handleOpenEditBrand = (brand) => {
    setEditingBrandId(brand.id);
    setEditBrandForm({
      nameKo: brand.nameKo || '',
      nameEn: brand.nameEn || '',
      type: brand.type === 'imported' ? 'imported' : 'own',
      tagline: brand.tagline || '',
      taglineEn: brand.taglineEn || '',
      descriptionKo: brand.descriptionKo || '',
      descriptionEn: brand.descriptionEn || '',
      color: brand.color || '#0066B3',
      logo: brand.logo || '',
      logoScale: brand.logoScale || 1,
      bgImage: brand.bgImage || ''
    });
  };

  const handleCloseEditBrand = () => {
    setEditingBrandId(null);
  };

  // 수정 폼에서 브랜드 로고를 다시 업로드할 때 처리
  const handleEditBrandLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await readAndUpload(file);
      setEditBrandForm(prev => ({ ...prev, logo: url }));
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  // 수정 폼에서 브랜드 카드 배경 이미지를 다시 업로드할 때 처리
  const handleEditBgImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await readAndUpload(file);
      setEditBrandForm(prev => ({ ...prev, bgImage: url }));
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  const handleSaveBrandEdit = async (e) => {
    e.preventDefault();
    try {
      const descriptionEn = editBrandForm.descriptionEn || await translateText(editBrandForm.descriptionKo);
      const taglineEn = editBrandForm.taglineEn || await translateText(editBrandForm.tagline);
      await updateBrand(editingBrandId, {
        nameKo: editBrandForm.nameKo,
        nameEn: editBrandForm.nameEn || editBrandForm.nameKo,
        type: editBrandForm.type,
        tagline: editBrandForm.tagline,
        taglineEn,
        descriptionKo: editBrandForm.descriptionKo,
        descriptionEn,
        color: editBrandForm.color,
        logo: editBrandForm.logo,
        hasLogo: !!editBrandForm.logo,
        logoScale: Number(editBrandForm.logoScale) || 1,
        bgImage: editBrandForm.bgImage || ''
      });
      setSuccessMsg(isEn ? 'Brand updated successfully!' : '브랜드 정보가 수정되었습니다!');
      handleCloseEditBrand();
    } catch (err) {
      alert(isEn ? 'Failed to save. Please try again.' : '저장에 실패했습니다. 다시 시도해 주세요.');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 제품 대표 이미지 업로드 처리
  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await readAndUploadProductImage(file);
      setProductForm(prev => ({ ...prev, image: url }));
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  // 기존 제품의 "수정" 버튼 클릭 시 - 수정 폼에 해당 제품 정보를 채워 넣고 팝업을 염
  const handleOpenEdit = (product) => {
    setEditingProductId(product.id);
    setEditingProductOriginal(product);
    const rawFeatures = Array.isArray(product.features) ? product.features.join('\n') : (product.features || '');
    setEditForm({
      nameKo: product.nameKo || '',
      nameEn: product.nameEn || '',
      brandId: product.brandId || '',
      category: product.category || '사료',
      petType: product.petType || 'dog',
      code: product.code || '',
      spec: product.spec || '',
      shelfLife: product.shelfLife || '',
      origin: product.origin || '',
      features: rawFeatures,
      ingredients: product.ingredients || '',
      protein: product.nutrition?.protein || '',
      fat: product.nutrition?.fat || '',
      fiber: product.nutrition?.fiber || '',
      moisture: product.nutrition?.moisture || '',
      image: product.image || '',
      purchaseUrl: product.purchaseUrl || '',
      infoImages: Array.isArray(product.infoImages) ? product.infoImages : []
    });
  };

  const handleCloseEdit = () => {
    setEditingProductId(null);
  };

  // 수정 폼에서 제품 대표 이미지를 다시 업로드할 때 처리
  const handleEditImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await readAndUploadProductImage(file);
      setEditForm(prev => ({ ...prev, image: url }));
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  // 상세 이미지 여러 장 업로드 - 기존 목록 뒤에 이어붙임 (등록/수정 폼 양쪽에서 setter만 바꿔 재사용)
  const handleInfoImagesUpload = async (e, setter) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const urls = await Promise.all(files.map(readAndUpload));
      setter(prev => ({ ...prev, infoImages: [...prev.infoImages, ...urls] }));
    } catch (err) {
      alert(isEn ? 'Image upload failed.' : '이미지 업로드에 실패했습니다.');
    }
  };

  const handleRemoveInfoImage = (idx, setter) => {
    setter(prev => ({ ...prev, infoImages: prev.infoImages.filter((_, i) => i !== idx) }));
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    const featuresArray = editForm.features
      ? editForm.features.split('\n').filter(f => f.trim())
      : [];
    const original = editingProductOriginal || {};

    // 기존에 이미 저장돼있던 영문 번역은 덮어쓰지 않고, 비어있는 것만 새로 번역해서 채운다
    const translated = await translateProductFields({
      nameKo: editForm.nameKo, nameEn: editForm.nameEn || original.nameEn,
      origin: editForm.origin, originEn: original.originEn,
      shelfLife: editForm.shelfLife, shelfLifeEn: original.shelfLifeEn,
      ingredients: editForm.ingredients, ingredientsEn: original.ingredientsEn,
      features: featuresArray, featuresEn: original.featuresEn
    });

    try {
      await updateProduct(editingProductId, {
        nameKo: editForm.nameKo,
        nameEn: translated.nameEn || editForm.nameKo,
        brandId: editForm.brandId,
        category: editForm.category,
        petType: editForm.petType,
        code: editForm.code,
        spec: editForm.spec,
        shelfLife: editForm.shelfLife,
        shelfLifeEn: translated.shelfLifeEn,
        origin: editForm.origin,
        originEn: translated.originEn,
        features: featuresArray,
        featuresEn: translated.featuresEn,
        ingredients: editForm.ingredients,
        ingredientsEn: translated.ingredientsEn,
        nutrition: buildNutrition(editForm.category, editForm) || null,
        image: editForm.image,
        purchaseUrl: editForm.purchaseUrl.trim(),
        infoImages: editForm.infoImages
      });
      setSuccessMsg(isEn ? 'Product updated successfully!' : '제품 정보가 수정되었습니다!');
      handleCloseEdit();
    } catch (err) {
      alert(isEn ? 'Failed to save. Please try again.' : '저장에 실패했습니다. 다시 시도해 주세요.');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 신규 브랜드 등록 폼 제출 처리
  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    if (!brandForm.nameKo) {
      alert(isEn ? 'Please enter brand name.' : '브랜드 이름을 입력해 주세요.');
      return;
    }

    const id = brandForm.nameEn
      ? brandForm.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '')
      : `brand_${Date.now()}`;

    const descriptionKo = brandForm.descriptionKo || '프리미엄 펫케어 브랜드';
    const descriptionEn = brandForm.descriptionEn || await translateText(descriptionKo) || 'Premium Pet Care Brand';
    const tagline = brandForm.tagline || 'Total Care for Pet Life';
    const taglineEn = brandForm.taglineEn || (brandForm.tagline ? await translateText(tagline) : '') || 'Total Care for Pet Life';

    const newBrand = {
      id,
      nameKo: brandForm.nameKo,
      nameEn: brandForm.nameEn || brandForm.nameKo,
      type: brandForm.type, // 'own' → 브랜드 페이지, 'imported' → 수입브랜드 페이지
      tagline,
      taglineEn,
      logo: brandForm.logo || '',
      hasLogo: !!brandForm.logo,
      descriptionKo,
      descriptionEn,
      categories: [],
      color: brandForm.color || '#0066B3',
      logoScale: Number(brandForm.logoScale) || 1,
      bgImage: brandForm.bgImage || ''
    };

    try {
      await addBrand(newBrand);
      setSuccessMsg(isEn ? `Brand "${newBrand.nameKo}" added successfully!` : `브랜드 "${newBrand.nameKo}" 등록이 완료되었습니다!`);
      setBrandForm({
        nameKo: '',
        nameEn: '',
        type: 'own',
        tagline: '',
        taglineEn: '',
        descriptionKo: '',
        descriptionEn: '',
        color: '#0066B3',
        logo: '',
        logoScale: 1,
        bgImage: ''
      });
    } catch (err) {
      alert(isEn ? 'Failed to register brand. Please try again.' : '브랜드 등록에 실패했습니다. 다시 시도해 주세요.');
    }

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 신규 제품 등록 폼 제출 처리
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.nameKo) {
      alert(isEn ? 'Please enter product name.' : '제품명을 입력해 주세요.');
      return;
    }
    if (!productForm.brandId) {
      alert(isEn ? 'Please select a brand.' : '브랜드를 선택해 주세요.');
      return;
    }

    const id = `product-${Date.now()}`;
    const featuresArray = productForm.features
      ? productForm.features.split('\n').filter(f => f.trim())
      : [];
    const shelfLife = productForm.shelfLife;
    const ingredients = productForm.ingredients || '';
    const origin = productForm.origin;

    const translated = await translateProductFields({
      nameKo: productForm.nameKo, nameEn: productForm.nameEn,
      origin, originEn: '',
      shelfLife, shelfLifeEn: '',
      ingredients, ingredientsEn: '',
      features: featuresArray, featuresEn: null
    });

    const newProduct = {
      id,
      nameKo: productForm.nameKo,
      nameEn: translated.nameEn || productForm.nameKo,
      brandId: productForm.brandId,
      code: productForm.code || '',
      spec: productForm.spec || '',
      shelfLife,
      shelfLifeEn: translated.shelfLifeEn,
      features: featuresArray,
      featuresEn: translated.featuresEn,
      ingredients,
      ingredientsEn: translated.ingredientsEn,
      origin,
      originEn: translated.originEn,
      category: productForm.category,
      petType: productForm.petType,
      nutrition: buildNutrition(productForm.category, productForm) || null,
      image: productForm.image || '',
      purchaseUrl: productForm.purchaseUrl.trim(),
      infoImages: productForm.infoImages
    };

    try {
      await addProduct(newProduct);
      setSuccessMsg(isEn ? `Product "${newProduct.nameKo}" added successfully!` : `제품 "${newProduct.nameKo}" 등록이 완료되었습니다!`);
      setProductForm({
        nameKo: '',
        nameEn: '',
        brandId: brands[0]?.id || '',
        category: '사료',
        petType: 'dog',
        code: '',
        spec: '',
        shelfLife: '제조일로부터 18개월까지',
        origin: '대한민국',
        features: '',
        ingredients: '',
        protein: '',
        fat: '',
        fiber: '',
        moisture: '',
        image: '',
        purchaseUrl: '',
        infoImages: []
      });
    } catch (err) {
      alert(isEn ? 'Failed to register product. Please try again.' : '제품 등록에 실패했습니다. 다시 시도해 주세요.');
    }

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 아직 인증되지 않았다면 비밀번호 입력 화면만 보여주고 이후 내용은 렌더링하지 않음
  if (!isAuthenticated) {
    return (
      <div className="daesang-sub-page">
        {/* SECTION: 관리자 로그인 화면 - 비밀번호 입력 */}
        <section className="daesang-sub-hero" style={{ backgroundImage: "url('./assets/stock/unsplash-1454165804606-c3d57bc86b40.jpg')" }}>
          <div className="daesang-section-overlay"></div>
          <div className="daesang-sub-hero-content">
            <span className="daesang-poetic-sub">ADMINISTRATION</span>
            <h1>{isEn ? 'Boomyoung Admin Console' : '(주)부명 관리자 로그인'}</h1>
            <p>{isEn ? 'Please enter the passcode to access.' : '관리자 전용 페이지입니다. 비밀번호를 입력해 주세요.'}</p>
          </div>
        </section>

        <section className="daesang-white-section" style={{ padding: '80px 0 120px' }}>
          <div className="daesang-container" style={{ maxWidth: '440px', margin: '0 auto', padding: '0 20px' }}>
            <form onSubmit={handlePasswordSubmit} style={{ background: '#FFFFFF', padding: '40px 32px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ fontSize: '1.4rem', color: '#0A2540', marginBottom: '8px', fontWeight: '700' }}>
                {isEn ? 'Admin Authentication' : '관리자 비밀번호 확인'}
              </h2>
              <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '24px' }}>
                {isEn ? 'Enter 4-digit passcode' : '접속 비밀번호 4자리를 입력해 주세요.'}
              </p>

              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="비밀번호 입력"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '1.2rem',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  marginBottom: '16px',
                  outline: 'none'
                }}
              />

              {passwordError && (
                <div style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '600' }}>
                  ⚠️ {passwordError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#0066B3',
                  color: '#FFFFFF',
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 102, 179, 0.25)'
                }}
              >
                {isEn ? 'Unlock Console' : '관리자 인증'}
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  // 인증 완료 후 보여지는 실제 관리자 화면
  return (
    <div className="daesang-sub-page">
      {/* SECTION: 관리자 페이지 상단 히어로 배너 */}
      <section className="daesang-sub-hero" style={{ backgroundImage: "url('./assets/stock/unsplash-1454165804606-c3d57bc86b40.jpg')" }}>
        <div className="daesang-section-overlay"></div>
        <div className="daesang-sub-hero-content">
          <span className="daesang-poetic-sub">ADMINISTRATION</span>
          <h1>{isEn ? 'Boomyoung Management Console' : '(주)부명 통합 관리자 시스템'}</h1>
          <p>{isEn ? 'Manage brand portfolio, catalog items, and specifications.' : '신규 브랜드 등록 및 신제품 추가 관리 콘솔입니다.'}</p>
        </div>
      </section>

      <section className="daesang-white-section" style={{ padding: '60px 0 100px' }}>
        <div className="daesang-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* SECTION: 로그아웃 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button
              onClick={() => {
                fetch('/api/logout', { method: 'POST' }).finally(() => setIsAuthenticated(false));
              }}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isEn ? 'Log out' : '로그아웃'}
            </button>
          </div>

          {/* SECTION: 작업 완료(추가/삭제/수정) 알림 배너 */}
          {successMsg && (
            <div style={{ padding: '16px 24px', backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '8px', border: '1px solid #BAE6FD', marginBottom: '30px', fontWeight: '600', fontSize: '1rem' }}>
              ✓ {successMsg}
            </div>
          )}

          {/* SECTION: "브랜드 관리" / "제품 관리" 탭 전환 버튼 */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '36px', borderBottom: '2px solid #E5E7EB', paddingBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setActiveTab('brand')}
              style={{
                padding: '6px 10px',
                fontSize: '0.76rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'brand' ? '#0066B3' : '#F3F4F6',
                color: activeTab === 'brand' ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.2s ease'
              }}
            >
              1. {isEn ? 'Add New Brand' : '브랜드 추가 등록'}
            </button>
            <button
              onClick={() => setActiveTab('product')}
              style={{
                padding: '6px 10px',
                fontSize: '0.76rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'product' ? '#0066B3' : '#F3F4F6',
                color: activeTab === 'product' ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.2s ease'
              }}
            >
              2. {isEn ? 'Add New Product' : '신규 제품 추가'}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '6px 10px',
                fontSize: '0.76rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'settings' ? '#0066B3' : '#F3F4F6',
                color: activeTab === 'settings' ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.2s ease'
              }}
            >
              3. {isEn ? 'Site Settings' : '사이트 설정'}
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              style={{
                padding: '6px 10px',
                fontSize: '0.76rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'pages' ? '#0066B3' : '#F3F4F6',
                color: activeTab === 'pages' ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.2s ease'
              }}
            >
              4. {isEn ? 'Page Text / Images' : '페이지 문구·이미지'}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              style={{
                padding: '6px 10px',
                fontSize: '0.76rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'security' ? '#0066B3' : '#F3F4F6',
                color: activeTab === 'security' ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.2s ease'
              }}
            >
              5. {isEn ? 'Security' : '보안'}
            </button>
            <button
              onClick={handleResetPageContent}
              style={{
                marginLeft: 'auto',
                padding: '6px 8px',
                fontSize: '0.7rem',
                fontWeight: '600',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#FEF2F2',
                color: '#DC2626'
              }}
            >
              🔄 {isEn ? 'Reset Text & Images' : '문구·이미지 초기화'}
            </button>
            <button
              onClick={handleUndoResetPageContent}
              style={{
                padding: '6px 8px',
                fontSize: '0.7rem',
                fontWeight: '600',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8'
              }}
            >
              ↩️ {isEn ? 'Undo Reset' : '초기화 되돌리기'}
            </button>
          </div>

          {/* SECTION: [브랜드 탭] 신규 브랜드 등록 폼 */}
          {activeTab === 'brand' && (
            <form onSubmit={handleBrandSubmit} style={{ display: 'grid', gap: '24px', background: '#FFFFFF', padding: '36px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#0A2540', marginBottom: '8px' }}>
                🏷️ {isEn ? 'Brand Registration' : '브랜드 정보 입력'}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    * {isEn ? 'Brand Name (Korean)' : '브랜드명 (한글)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 웰젠, 부명케어"
                    value={brandForm.nameKo}
                    onChange={e => setBrandForm({ ...brandForm, nameKo: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Brand Name (English)' : '브랜드명 (영문)'}
                  </label>
                  <input
                    type="text"
                    placeholder="예: WELLZEN"
                    value={brandForm.nameEn}
                    onChange={e => setBrandForm({ ...brandForm, nameEn: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  * {isEn ? 'Brand Type — decides which menu/page this brand appears on' : '브랜드 유형 (노출될 메뉴/페이지 결정)'}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                    borderRadius: '6px', border: `2px solid ${brandForm.type === 'own' ? '#0066B3' : '#D1D5DB'}`,
                    background: brandForm.type === 'own' ? '#EFF6FF' : '#FFFFFF', cursor: 'pointer', fontWeight: 600
                  }}>
                    <input
                      type="radio"
                      name="brandType"
                      checked={brandForm.type === 'own'}
                      onChange={() => setBrandForm({ ...brandForm, type: 'own' })}
                    />
                    {isEn ? 'Own Brand → "브랜드" menu' : '자사 브랜드 → "브랜드" 메뉴에 노출'}
                  </label>
                  <label style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                    borderRadius: '6px', border: `2px solid ${brandForm.type === 'imported' ? '#0066B3' : '#D1D5DB'}`,
                    background: brandForm.type === 'imported' ? '#EFF6FF' : '#FFFFFF', cursor: 'pointer', fontWeight: 600
                  }}>
                    <input
                      type="radio"
                      name="brandType"
                      checked={brandForm.type === 'imported'}
                      onChange={() => setBrandForm({ ...brandForm, type: 'imported' })}
                    />
                    {isEn ? 'Imported Brand → "수입브랜드" menu' : '수입 브랜드 → "수입브랜드" 메뉴에 노출'}
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Tagline (Korean)' : '브랜드 슬로건 (한글)'}
                  </label>
                  <input
                    type="text"
                    placeholder="예: 건강하고 행복한 반려동물 케어"
                    value={brandForm.tagline}
                    onChange={e => setBrandForm({ ...brandForm, tagline: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Tagline (English)' : '브랜드 슬로건 (영문, 비워두면 자동 번역)'}
                  </label>
                  <input
                    type="text"
                    placeholder="예: Healthy & Happy Pet Care"
                    value={brandForm.taglineEn}
                    onChange={e => setBrandForm({ ...brandForm, taglineEn: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Description (Korean)' : '브랜드 설명 (한글)'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="브랜드에 대한 간단한 소개를 입력하세요."
                    value={brandForm.descriptionKo}
                    onChange={e => setBrandForm({ ...brandForm, descriptionKo: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Description (English)' : '브랜드 설명 (영문)'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter brand description in English."
                    value={brandForm.descriptionEn}
                    onChange={e => setBrandForm({ ...brandForm, descriptionEn: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    🎨 {isEn ? 'Brand Key Color' : '브랜드 대표 테마 색상'}
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={brandForm.color}
                      onChange={e => setBrandForm({ ...brandForm, color: e.target.value })}
                      style={{ width: '48px', height: '44px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={brandForm.color}
                      onChange={e => setBrandForm({ ...brandForm, color: e.target.value })}
                      style={{ width: '120px', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    🖼️ {isEn ? 'Brand Logo File Attach' : '브랜드 로고 이미지 첨부'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {brandForm.logo && (
                <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '8px', border: '1px dashed #D1D5DB', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: '#6B7280', marginBottom: '8px' }}>로고 이미지 미리보기</span>
                  <img src={brandForm.logo} alt="Brand Logo Preview" style={{ maxHeight: `${80 * (Number(brandForm.logoScale) || 1)}px`, maxWidth: '200px', objectFit: 'contain' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  🔍 {isEn ? 'Logo Display Size' : '로고 표시 크기'} ({Number(brandForm.logoScale || 1).toFixed(1)}x)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={brandForm.logoScale || 1}
                  onChange={e => setBrandForm({ ...brandForm, logoScale: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  🖼️ {isEn ? 'Brand Card Background Photo' : '브랜드 카드 배경 이미지'}
                </label>
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#6B7280' }}>
                  {isEn
                    ? "The lifestyle photo shown behind the logo on the Brands page card. Leave empty to use the plain color background."
                    : '브랜드 목록 페이지 카드에서 로고 뒤에 깔리는 사진입니다. 비워두면 단색 배경으로 표시됩니다.'}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBgImageUpload}
                  style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
                {brandForm.bgImage && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#FAFAFA', borderRadius: '8px', border: '1px dashed #D1D5DB' }}>
                    <img src={brandForm.bgImage} alt="Brand Background Preview" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px' }} />
                  </div>
                )}
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '12px',
                  padding: '16px',
                  backgroundColor: '#0066B3',
                  color: '#FFFFFF',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0, 102, 179, 0.2)'
                }}
              >
                ➕ {isEn ? 'Register Brand' : '신규 브랜드 등록 완료'}
              </button>
            </form>
          )}

          {/* SECTION: [브랜드 탭] 등록된 브랜드 목록 (삭제 버튼 포함) */}
          {activeTab === 'brand' && (
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0A2540', marginBottom: '16px' }}>
                📋 {isEn ? `Registered Brands (${brands.length})` : `등록된 브랜드 목록 (${brands.length}개)`}
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {brands.map((b, idx) => (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                      <button
                        onClick={() => moveBrand(b.id, 'up')}
                        disabled={idx === 0}
                        title={isEn ? 'Move up' : '위로 이동'}
                        style={{
                          width: '24px', height: '20px', fontSize: '0.7rem', lineHeight: 1,
                          border: '1px solid #D1D5DB', borderRadius: '4px', cursor: idx === 0 ? 'default' : 'pointer',
                          backgroundColor: '#FFFFFF', color: idx === 0 ? '#D1D5DB' : '#374151'
                        }}
                      >▲</button>
                      <button
                        onClick={() => moveBrand(b.id, 'down')}
                        disabled={idx === brands.length - 1}
                        title={isEn ? 'Move down' : '아래로 이동'}
                        style={{
                          width: '24px', height: '20px', fontSize: '0.7rem', lineHeight: 1,
                          border: '1px solid #D1D5DB', borderRadius: '4px', cursor: idx === brands.length - 1 ? 'default' : 'pointer',
                          backgroundColor: '#FFFFFF', color: idx === brands.length - 1 ? '#D1D5DB' : '#374151'
                        }}
                      >▼</button>
                    </div>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '6px', flexShrink: 0,
                      background: b.hasLogo && b.logo ? `url(${b.logo}) center/contain no-repeat` : b.color,
                      border: '1px solid #E5E7EB'
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {b.nameKo} <span style={{ color: '#9CA3AF', fontWeight: '400' }}>({b.nameEn})</span>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                          background: b.type === 'imported' ? '#FEF3C7' : '#DBEAFE',
                          color: b.type === 'imported' ? '#92400E' : '#1E40AF'
                        }}>
                          {b.type === 'imported' ? (isEn ? 'IMPORTED' : '수입브랜드') : (isEn ? 'OWN' : '자사브랜드')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>{b.tagline}</div>
                    </div>
                    <button
                      onClick={() => handleOpenEditBrand(b)}
                      style={{
                        padding: '8px 14px', fontSize: '0.85rem', fontWeight: '600',
                        border: '1px solid #93C5FD', borderRadius: '6px', cursor: 'pointer',
                        backgroundColor: '#EFF6FF', color: '#0066B3', flexShrink: 0
                      }}
                    >
                      ✏️ {isEn ? 'Edit' : '수정'}
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(b)}
                      style={{
                        padding: '8px 14px', fontSize: '0.85rem', fontWeight: '600',
                        border: '1px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer',
                        backgroundColor: '#FEF2F2', color: '#DC2626', flexShrink: 0
                      }}
                    >
                      🗑️ {isEn ? 'Delete' : '삭제'}
                    </button>
                  </div>
                ))}
                {brands.length === 0 && (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px' }}>
                    {isEn ? 'No brands registered.' : '등록된 브랜드가 없습니다.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SECTION: [제품 탭] 신규 제품 등록 폼 */}
          {activeTab === 'product' && (
            <form onSubmit={handleProductSubmit} style={{ display: 'grid', gap: '24px', background: '#FFFFFF', padding: '36px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#0A2540', marginBottom: '8px' }}>
                📦 {isEn ? 'Product Registration' : '신제품 정보 입력'}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    * {isEn ? 'Select Brand' : '소속 브랜드 선택'}
                  </label>
                  <select
                    required
                    value={productForm.brandId}
                    onChange={e => setProductForm({ ...productForm, brandId: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">{isEn ? '-- Select Brand --' : '-- 브랜드 선택 --'}</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nameKo} ({b.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    * {isEn ? 'Product Category' : '제품 카테고리'}
                  </label>
                  <select
                    value={productForm.category}
                    onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="사료">사료 (Feed / Food)</option>
                    <option value="간식">간식 (Treats / Snacks)</option>
                    <option value="모래">모래 (Cat Litter)</option>
                    <option value="용품">용품 (Supplies / Care)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    * {isEn ? 'Product Name (Korean)' : '제품명 (한글)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 데이스포 프레시 츄르 연어"
                    value={productForm.nameKo}
                    onChange={e => setProductForm({ ...productForm, nameKo: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Product Name (English)' : '제품명 (영문)'}
                  </label>
                  <input
                    type="text"
                    placeholder="예: Dayspo Fresh Churu Salmon"
                    value={productForm.nameEn}
                    onChange={e => setProductForm({ ...productForm, nameEn: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Target Pet' : '반려동물 구분'}
                  </label>
                  <select
                    value={productForm.petType}
                    onChange={e => setProductForm({ ...productForm, petType: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                  >
                    <option value="dog">강아지 (Dog)</option>
                    <option value="cat">고양이 (Cat)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Specification / Weight' : '제품 규격 / 용량'}
                  </label>
                  <input
                    type="text"
                    placeholder="예: 1.2kg (200g * 6)"
                    value={productForm.spec}
                    onChange={e => setProductForm({ ...productForm, spec: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Barcode / Item Code' : '상품 바코드 / 코드'}
                  </label>
                  <input
                    type="text"
                    placeholder="예: 8809565905407"
                    value={productForm.code}
                    onChange={e => setProductForm({ ...productForm, code: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  🖼️ {isEn ? 'Product Main Representative Image' : '제품 대표 이미지 첨부'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
              </div>

              {productForm.image && (
                <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '8px', border: '1px dashed #D1D5DB', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: '#6B7280', marginBottom: '8px' }}>제품 이미지 미리보기</span>
                  <img src={productForm.image} alt="Product Preview" style={{ maxHeight: '140px', maxWidth: '200px', objectFit: 'contain' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  🖼️ {isEn ? 'Detail Page Images (JPG, multiple allowed)' : '상세정보 페이지 이미지 첨부 (JPG, 여러 장 가능)'}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  multiple
                  onChange={e => handleInfoImagesUpload(e, setProductForm)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
              </div>

              {productForm.infoImages.length > 0 && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {productForm.infoImages.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', border: '1px solid #EAEAEA', borderRadius: '8px', padding: '8px' }}>
                      <img src={src} alt={`상세이미지 ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }} />
                      <button
                        type="button"
                        onClick={() => handleRemoveInfoImage(idx, setProductForm)}
                        style={{
                          position: 'absolute', top: '14px', right: '14px',
                          background: '#DC2626', color: '#FFFFFF', border: 'none',
                          borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  🔗 {isEn ? 'Purchase Link (URL)' : '바로 구매하기 링크 (URL)'}
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={productForm.purchaseUrl}
                  onChange={e => setProductForm({ ...productForm, purchaseUrl: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Product Key Features (One per line)' : '제품 주요 특징 (줄바꿈으로 구분)'}
                </label>
                <textarea
                  rows={4}
                  placeholder="예:&#10;· 생후 2개월 이상 전연령 반려견 사료&#10;· 가수분해 오리 원료 사용&#10;· 관절 건강에 도움을 주는 초유 첨가"
                  value={productForm.features}
                  onChange={e => setProductForm({ ...productForm, features: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Ingredients & Details' : '원료 및 원산지/유통기한 정보'}
                </label>
                <textarea
                  rows={3}
                  placeholder="사용된 상세 원료와 성분 정보를 작성해 주세요."
                  value={productForm.ingredients}
                  onChange={e => setProductForm({ ...productForm, ingredients: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>

              {(productForm.category === '사료' || productForm.category === '간식') && (
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Guaranteed Analysis (Protein / Fat / Fiber / Moisture)' : '등록 성분량 (조단백 / 조지방 / 조섬유 / 수분)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <input type="text" placeholder="예: 24.0% (Min)" value={productForm.protein} onChange={e => setProductForm({ ...productForm, protein: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
                  <input type="text" placeholder="예: 10.0% (Min)" value={productForm.fat} onChange={e => setProductForm({ ...productForm, fat: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
                  <input type="text" placeholder="예: 5.0% (Max)" value={productForm.fiber} onChange={e => setProductForm({ ...productForm, fiber: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
                  <input type="text" placeholder="예: 12.0% (Max)" value={productForm.moisture} onChange={e => setProductForm({ ...productForm, moisture: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
                </div>
              </div>
              )}

              <button
                type="submit"
                style={{
                  marginTop: '12px',
                  padding: '16px',
                  backgroundColor: '#0066B3',
                  color: '#FFFFFF',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0, 102, 179, 0.2)'
                }}
              >
                📦 {isEn ? 'Register Product' : '신규 제품 등록 완료'}
              </button>
            </form>
          )}

          {/* SECTION: [제품 탭] 등록된 제품 목록 (검색/필터, 수정·삭제 버튼 포함) */}
          {activeTab === 'product' && (
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0A2540', marginBottom: '16px' }}>
                📋 {isEn ? `Registered Products (${products.length})` : `등록된 제품 목록 (${products.length}개)`}
              </h3>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <select
                  value={productFilterBrand}
                  onChange={e => setProductFilterBrand(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }}
                >
                  <option value="">{isEn ? 'All Brands' : '전체 브랜드'}</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.nameKo}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={isEn ? 'Search product name...' : '제품명 검색...'}
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  style={{ flex: 1, minWidth: '180px', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gap: '8px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                {products
                  .filter(p => !productFilterBrand || p.brandId === productFilterBrand)
                  .filter(p => !productSearch || p.nameKo.includes(productSearch) || (p.nameEn || '').toLowerCase().includes(productSearch.toLowerCase()))
                  .map(p => {
                    const brand = brands.find(b => b.id === p.brandId);
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '10px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '6px', flexShrink: 0,
                          background: p.image ? `url(${p.image}) center/cover no-repeat` : '#F3F4F6',
                          border: '1px solid #E5E7EB'
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.nameKo}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                            {brand ? brand.nameKo : (isEn ? 'Unlinked brand' : '브랜드 없음')} · {p.category} {p.code ? `· ${p.code}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          style={{
                            padding: '7px 12px', fontSize: '0.82rem', fontWeight: '600',
                            border: '1px solid #93C5FD', borderRadius: '6px', cursor: 'pointer',
                            backgroundColor: '#EFF6FF', color: '#0066B3', flexShrink: 0
                          }}
                        >
                          ✏️ {isEn ? 'Edit Product' : '제품 정보 수정'}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          style={{
                            padding: '7px 12px', fontSize: '0.82rem', fontWeight: '600',
                            border: '1px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer',
                            backgroundColor: '#FEF2F2', color: '#DC2626', flexShrink: 0
                          }}
                        >
                          🗑️ {isEn ? 'Delete' : '삭제'}
                        </button>
                      </div>
                    );
                  })}
                {products.length === 0 && (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px' }}>
                    {isEn ? 'No products registered.' : '등록된 제품이 없습니다.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SECTION: [페이지 문구·이미지 탭] 각 페이지의 섹션 문구와 배너 사진/영상 수정 */}
          {activeTab === 'pages' && (
            <PageContentEditor
              isEn={isEn}
              pageContent={siteSettings.pageContent || {}}
              onSave={(pageContent) => updateSiteSettings({ pageContent })}
              uploadMedia={handleUploadPageMedia}
              translateText={translateText}
              expoYears={siteSettings.expoYears || []}
              onSaveExpoYears={(expoYears) => updateSiteSettings({ expoYears })}
              uploadExpoPhoto={handleUploadExpoPhoto}
              siteLists={{ ...LIST_DEFAULTS, ...(siteSettings.siteLists || {}) }}
              onSaveList={(key, items) => updateSiteSettings({ siteLists: { ...(siteSettings.siteLists || {}), [key]: items } })}
              uploadListImage={handleUploadListImage}
            />
          )}

          {/* SECTION: [사이트 설정 탭] 문의 수신 이메일 + 홈 히어로 이미지 + 비전 섹션 배경 이미지 관리 */}
          {activeTab === 'settings' && (
            <div style={{ display: 'grid', gap: '24px' }}>

              {/* 문의 수신 이메일 설정 */}
              <form onSubmit={handleSaveContactEmail} style={{ background: '#FFFFFF', padding: '36px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'grid', gap: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#0A2540', marginBottom: '4px' }}>
                  📧 {isEn ? 'Inquiry Recipient Email' : '문의 수신 이메일 주소'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
                  {isEn
                    ? 'This site has no backend server, so the Contact form cannot send email by itself. Clicking "Submit Inquiry" opens the visitor\'s own email app with this address pre-filled as the recipient — they must press Send there to actually deliver it.'
                    : '이 사이트는 서버가 없는 정적 사이트라 문의 폼이 스스로 메일을 보낼 수는 없습니다. "문의 접수하기"를 누르면 방문자의 메일 앱이 이 주소를 수신자로 하여 자동으로 열리고, 방문자가 그 메일 앱에서 "보내기"를 눌러야 실제로 전달됩니다.'}
                </p>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Recipient Email Address' : '수신 이메일 주소'}
                  </label>
                  <input
                    type="email"
                    required
                    value={settingsEmail}
                    onChange={e => setSettingsEmail(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    justifySelf: 'start', padding: '12px 24px', backgroundColor: '#0066B3', color: '#FFFFFF',
                    fontSize: '1rem', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer'
                  }}
                >
                  💾 {isEn ? 'Save' : '저장하기'}
                </button>
              </form>

              {/* 홈 히어로 슬라이더 이미지 관리 */}
              <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'grid', gap: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#0A2540', marginBottom: '4px' }}>
                  🖼️ {isEn ? 'Home Hero Slider Images' : '메인페이지 히어로 이미지 관리'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
                  {isEn
                    ? 'These images auto-rotate at the very top of the Home page, in the order shown below. Add, remove, or reorder them (order = slide play order).'
                    : '홈페이지 최상단에서 자동으로 넘어가는 배경 이미지 목록이며, 아래 순서대로 재생됩니다. 추가/삭제와 함께 순서(◀ ▶)도 바꿀 수 있습니다.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                  {siteSettings.heroImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                      <span style={{
                        position: 'absolute', top: '6px', left: '6px', zIndex: 1,
                        background: 'rgba(0,0,0,0.6)', color: '#FFFFFF', fontSize: '0.72rem', fontWeight: 700,
                        borderRadius: '10px', padding: '2px 8px'
                      }}>
                        {idx + 1}
                      </span>
                      {/* 실제 홈페이지 히어로 배너와 비슷한 와이드 비율로 미리보기 - CSS background-size:cover와 동일하게 가운데 기준으로 잘려서 보임 */}
                      <img src={img} alt={`히어로 이미지 ${idx + 1}`} style={{ width: '100%', aspectRatio: '2.3 / 1', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                      <button
                        type="button"
                        onClick={() => removeHeroImage(idx)}
                        title={isEn ? 'Remove this image' : '이 이미지 삭제'}
                        style={{
                          position: 'absolute', top: '6px', right: '6px',
                          background: '#DC2626', color: '#FFFFFF', border: 'none',
                          borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontWeight: '700'
                        }}
                      >
                        ✕
                      </button>
                      <div style={{ display: 'flex', borderTop: '1px solid #E5E7EB' }}>
                        <button
                          type="button"
                          onClick={() => moveHeroImage(idx, -1)}
                          disabled={idx === 0}
                          title={isEn ? 'Move earlier' : '앞으로 이동'}
                          style={{
                            flex: 1, padding: '6px 0', border: 'none', borderRight: '1px solid #E5E7EB',
                            background: '#F9FAFB', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            color: idx === 0 ? '#D1D5DB' : '#374151', fontWeight: 700
                          }}
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={() => moveHeroImage(idx, 1)}
                          disabled={idx === siteSettings.heroImages.length - 1}
                          title={isEn ? 'Move later' : '뒤로 이동'}
                          style={{
                            flex: 1, padding: '6px 0', border: 'none',
                            background: '#F9FAFB', cursor: idx === siteSettings.heroImages.length - 1 ? 'not-allowed' : 'pointer',
                            color: idx === siteSettings.heroImages.length - 1 ? '#D1D5DB' : '#374151', fontWeight: 700
                          }}
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                  {siteSettings.heroImages.length === 0 && (
                    <p style={{ color: '#9CA3AF', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
                      {isEn ? 'No hero images — the slider will stay hidden until you add one.' : '등록된 히어로 이미지가 없습니다 — 하나 이상 추가해야 슬라이더가 표시됩니다.'}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Add New Hero Image' : '새 히어로 이미지 추가'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroImageUpload}
                    style={{ width: '100%', maxWidth: '400px', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* 히어로 바로 아래 비전 섹션 배경 이미지 관리 */}
              <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'grid', gap: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#0A2540', marginBottom: '4px' }}>
                  🖼️ {isEn ? 'Vision Section Background Image' : '히어로 아래 비전 섹션 배경 이미지'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
                  {isEn
                    ? 'This is the full-screen background image right below the hero slider ("Crafted with precision..." section).'
                    : '히어로 슬라이더 바로 아래에 나오는 전체화면 배경 사진입니다 ("영양과 기술, 그리고 신뢰로 빚어낸 품질" 문구가 겹쳐지는 부분).'}
                </p>
                <img src={siteSettings.visionImage} alt="비전 섹션 배경 미리보기" style={{ width: '100%', maxWidth: '400px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Replace Image' : '이미지 교체'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVisionImageUpload}
                    style={{ width: '100%', maxWidth: '400px', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* SECTION: [보안 탭] 비밀번호 변경 + 로그인/변경 이력(IP 포함) */}
          {activeTab === 'security' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              <form onSubmit={handleChangePassword} style={{ background: '#FFFFFF', padding: '36px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'grid', gap: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#0A2540', marginBottom: '4px' }}>
                  🔑 {isEn ? 'Change Admin Password' : '관리자 비밀번호 변경'}
                </h2>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Current Password' : '현재 비밀번호'}
                  </label>
                  <input
                    type="password"
                    required
                    value={pwForm.current}
                    onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'New Password' : '새 비밀번호'}
                  </label>
                  <input
                    type="password"
                    required
                    value={pwForm.next}
                    onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {isEn ? 'Confirm New Password' : '새 비밀번호 확인'}
                  </label>
                  <input
                    type="password"
                    required
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                  />
                </div>
                {pwError && <div style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: '600' }}>⚠️ {pwError}</div>}
                {pwMsg && <div style={{ color: '#059669', fontSize: '0.85rem', fontWeight: '600' }}>✓ {pwMsg}</div>}
                <button
                  type="submit"
                  style={{ justifySelf: 'start', padding: '12px 24px', backgroundColor: '#0066B3', color: '#FFFFFF', fontSize: '1rem', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  💾 {isEn ? 'Change Password' : '비밀번호 변경'}
                </button>
              </form>

              <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.4rem', color: '#0A2540', margin: 0 }}>
                    🕵️ {isEn ? 'Login & Change History' : '로그인·변경 이력'}
                  </h2>
                  <button
                    type="button"
                    onClick={loadAuditLogs}
                    style={{ padding: '8px 14px', fontSize: '0.85rem', fontWeight: '600', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#F9FAFB', color: '#374151' }}
                  >
                    🔄 {isEn ? 'Refresh' : '새로고침'}
                  </button>
                </div>
                {auditLoading ? (
                  <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>{isEn ? 'Loading...' : '불러오는 중...'}</p>
                ) : auditLogs.length === 0 ? (
                  <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>{isEn ? 'No history yet.' : '아직 기록이 없습니다.'}</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>{isEn ? 'Time' : '시각'}</th>
                          <th style={{ padding: '8px 12px' }}>{isEn ? 'IP Address' : 'IP 주소'}</th>
                          <th style={{ padding: '8px 12px' }}>{isEn ? 'Action' : '동작'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '8px 12px', color: '#374151', whiteSpace: 'nowrap' }}>{log.created_at}</td>
                            <td style={{ padding: '8px 12px', color: '#374151', fontFamily: 'monospace' }}>{log.ip}</td>
                            <td style={{ padding: '8px 12px', color: '#374151' }}>
                              {{ login_success: isEn ? 'Login success' : '로그인 성공',
                                 login_fail: isEn ? 'Login failed' : '로그인 실패',
                                 password_change: isEn ? 'Password changed' : '비밀번호 변경',
                                 reset: isEn ? 'Data reset' : '데이터 초기화',
                                 reset_undo: isEn ? 'Reset undone' : '초기화 되돌림' }[log.action] || log.action}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* SECTION: 제품 수정 팝업 - 신규 등록 폼과 동일한 필드 구성으로 기존 제품 정보를 편집 */}
      {editingProductId && (
        <div
          onClick={handleCloseEdit}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <form
            onSubmit={handleSaveProductEdit}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '12px', padding: '32px',
              maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
              display: 'grid', gap: '20px'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', color: '#0A2540', margin: 0 }}>
              ✏️ {isEn ? 'Edit Product' : '제품 정보 전체 수정'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  * {isEn ? 'Select Brand' : '소속 브랜드 선택'}
                </label>
                <select
                  required
                  value={editForm.brandId}
                  onChange={e => setEditForm({ ...editForm, brandId: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">{isEn ? '-- Select Brand --' : '-- 브랜드 선택 --'}</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.nameKo} ({b.nameEn})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  * {isEn ? 'Product Category' : '제품 카테고리'}
                </label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem', backgroundColor: '#FFFFFF' }}
                >
                  <option value="사료">사료 (Feed / Food)</option>
                  <option value="간식">간식 (Treats / Snacks)</option>
                  <option value="모래">모래 (Cat Litter)</option>
                  <option value="용품">용품 (Supplies / Care)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  * {isEn ? 'Product Name (Korean)' : '제품명 (한글)'}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nameKo}
                  onChange={e => setEditForm({ ...editForm, nameKo: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Product Name (English)' : '제품명 (영문)'}
                </label>
                <input
                  type="text"
                  value={editForm.nameEn}
                  onChange={e => setEditForm({ ...editForm, nameEn: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Target Pet' : '반려동물 구분'}
                </label>
                <select
                  value={editForm.petType}
                  onChange={e => setEditForm({ ...editForm, petType: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                >
                  <option value="dog">강아지 (Dog)</option>
                  <option value="cat">고양이 (Cat)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Specification / Weight' : '제품 규격 / 용량'}
                </label>
                <input
                  type="text"
                  value={editForm.spec}
                  onChange={e => setEditForm({ ...editForm, spec: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Barcode / Item Code' : '상품 바코드 / 코드'}
                </label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Shelf Life' : '유통기한'}
                </label>
                <input
                  type="text"
                  value={editForm.shelfLife}
                  onChange={e => setEditForm({ ...editForm, shelfLife: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Country of Origin' : '제조국 / 원산지'}
                </label>
                <input
                  type="text"
                  value={editForm.origin}
                  onChange={e => setEditForm({ ...editForm, origin: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                🖼️ {isEn ? 'Product Main Representative Image' : '제품 대표 이미지 첨부'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleEditImageUpload}
                style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
              />
            </div>

            {editForm.image && (
              <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '8px', border: '1px dashed #D1D5DB', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#6B7280', marginBottom: '8px' }}>제품 이미지 미리보기</span>
                <img src={editForm.image} alt="Product Preview" style={{ maxHeight: '140px', maxWidth: '200px', objectFit: 'contain' }} />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                🖼️ {isEn ? 'Detail Page Images (JPG, multiple allowed)' : '상세정보 페이지 이미지 첨부 (JPG, 여러 장 가능)'}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={e => handleInfoImagesUpload(e, setEditForm)}
                style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
              />
            </div>

            {editForm.infoImages.length > 0 && (
              <div style={{ display: 'grid', gap: '10px' }}>
                {editForm.infoImages.map((src, idx) => (
                  <div key={idx} style={{ position: 'relative', border: '1px solid #EAEAEA', borderRadius: '8px', padding: '8px' }}>
                    <img src={src} alt={`상세이미지 ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveInfoImage(idx, setEditForm)}
                      style={{
                        position: 'absolute', top: '14px', right: '14px',
                        background: '#DC2626', color: '#FFFFFF', border: 'none',
                        borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                        fontWeight: '700'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                🔗 {isEn ? 'Purchase Link (URL)' : '바로 구매하기 링크 (URL)'}
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={editForm.purchaseUrl}
                onChange={e => setEditForm({ ...editForm, purchaseUrl: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                {isEn ? 'Product Key Features (One per line)' : '제품 주요 특징 (줄바꿈으로 구분)'}
              </label>
              <textarea
                rows={4}
                value={editForm.features}
                onChange={e => setEditForm({ ...editForm, features: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                {isEn ? 'Ingredients & Details' : '원료 및 원산지/유통기한 정보'}
              </label>
              <textarea
                rows={3}
                value={editForm.ingredients}
                onChange={e => setEditForm({ ...editForm, ingredients: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
              />
            </div>

            {(editForm.category === '사료' || editForm.category === '간식') && (
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                {isEn ? 'Guaranteed Analysis (Protein / Fat / Fiber / Moisture)' : '등록 성분량 (조단백 / 조지방 / 조섬유 / 수분)'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <input type="text" placeholder="예: 24.0% (Min)" value={editForm.protein} onChange={e => setEditForm({ ...editForm, protein: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
                <input type="text" placeholder="예: 10.0% (Min)" value={editForm.fat} onChange={e => setEditForm({ ...editForm, fat: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
                <input type="text" placeholder="예: 5.0% (Max)" value={editForm.fiber} onChange={e => setEditForm({ ...editForm, fiber: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
                <input type="text" placeholder="예: 12.0% (Max)" value={editForm.moisture} onChange={e => setEditForm({ ...editForm, moisture: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }} />
              </div>
            </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleCloseEdit}
                style={{ padding: '12px 20px', fontWeight: '600', border: '1px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#F9FAFB', color: '#374151' }}
              >
                {isEn ? 'Cancel' : '취소'}
              </button>
              <button
                type="submit"
                style={{ padding: '12px 24px', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#0066B3', color: '#FFFFFF' }}
              >
                💾 {isEn ? 'Save' : '저장하기'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION: 브랜드 수정 팝업 - 브랜드 유형(자사/수입) 포함 전체 정보 편집 */}
      {editingBrandId && (
        <div
          onClick={handleCloseEditBrand}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <form
            onSubmit={handleSaveBrandEdit}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '12px', padding: '32px',
              maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
              display: 'grid', gap: '20px'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', color: '#0A2540', margin: 0 }}>
              ✏️ {isEn ? 'Edit Brand' : '브랜드 정보 수정'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  * {isEn ? 'Brand Name (Korean)' : '브랜드명 (한글)'}
                </label>
                <input
                  type="text"
                  required
                  value={editBrandForm.nameKo}
                  onChange={e => setEditBrandForm({ ...editBrandForm, nameKo: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Brand Name (English)' : '브랜드명 (영문)'}
                </label>
                <input
                  type="text"
                  value={editBrandForm.nameEn}
                  onChange={e => setEditBrandForm({ ...editBrandForm, nameEn: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                * {isEn ? 'Brand Type — decides which menu/page this brand appears on' : '브랜드 유형 (노출될 메뉴/페이지 결정)'}
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                  borderRadius: '6px', border: `2px solid ${editBrandForm.type === 'own' ? '#0066B3' : '#D1D5DB'}`,
                  background: editBrandForm.type === 'own' ? '#EFF6FF' : '#FFFFFF', cursor: 'pointer', fontWeight: 600
                }}>
                  <input
                    type="radio"
                    name="editBrandType"
                    checked={editBrandForm.type === 'own'}
                    onChange={() => setEditBrandForm({ ...editBrandForm, type: 'own' })}
                  />
                  {isEn ? 'Own Brand → "브랜드" menu' : '자사 브랜드 → "브랜드" 메뉴에 노출'}
                </label>
                <label style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                  borderRadius: '6px', border: `2px solid ${editBrandForm.type === 'imported' ? '#0066B3' : '#D1D5DB'}`,
                  background: editBrandForm.type === 'imported' ? '#EFF6FF' : '#FFFFFF', cursor: 'pointer', fontWeight: 600
                }}>
                  <input
                    type="radio"
                    name="editBrandType"
                    checked={editBrandForm.type === 'imported'}
                    onChange={() => setEditBrandForm({ ...editBrandForm, type: 'imported' })}
                  />
                  {isEn ? 'Imported Brand → "수입브랜드" menu' : '수입 브랜드 → "수입브랜드" 메뉴에 노출'}
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Tagline (Korean)' : '브랜드 슬로건 (한글)'}
                </label>
                <input
                  type="text"
                  value={editBrandForm.tagline}
                  onChange={e => setEditBrandForm({ ...editBrandForm, tagline: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Tagline (English)' : '브랜드 슬로건 (영문, 비워두면 자동 번역)'}
                </label>
                <input
                  type="text"
                  value={editBrandForm.taglineEn}
                  onChange={e => setEditBrandForm({ ...editBrandForm, taglineEn: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Description (Korean)' : '브랜드 설명 (한글)'}
                </label>
                <textarea
                  rows={3}
                  value={editBrandForm.descriptionKo}
                  onChange={e => setEditBrandForm({ ...editBrandForm, descriptionKo: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {isEn ? 'Description (English)' : '브랜드 설명 (영문)'}
                </label>
                <textarea
                  rows={3}
                  value={editBrandForm.descriptionEn}
                  onChange={e => setEditBrandForm({ ...editBrandForm, descriptionEn: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  🎨 {isEn ? 'Brand Key Color' : '브랜드 대표 테마 색상'}
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={editBrandForm.color}
                    onChange={e => setEditBrandForm({ ...editBrandForm, color: e.target.value })}
                    style={{ width: '48px', height: '44px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={editBrandForm.color}
                    onChange={e => setEditBrandForm({ ...editBrandForm, color: e.target.value })}
                    style={{ width: '120px', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  🖼️ {isEn ? 'Brand Logo File Attach' : '브랜드 로고 이미지 첨부'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditBrandLogoUpload}
                  style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
              </div>
            </div>

            {editBrandForm.logo && (
              <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '8px', border: '1px dashed #D1D5DB', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#6B7280', marginBottom: '8px' }}>로고 이미지 미리보기</span>
                <img src={editBrandForm.logo} alt="Brand Logo Preview" style={{ maxHeight: `${80 * (Number(editBrandForm.logoScale) || 1)}px`, maxWidth: '200px', objectFit: 'contain' }} />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                🔍 {isEn ? 'Logo Display Size' : '로고 표시 크기'} ({Number(editBrandForm.logoScale || 1).toFixed(1)}x)
              </label>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={editBrandForm.logoScale || 1}
                onChange={e => setEditBrandForm({ ...editBrandForm, logoScale: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                🖼️ {isEn ? 'Brand Card Background Photo' : '브랜드 카드 배경 이미지'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleEditBgImageUpload}
                style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
              />
              {editBrandForm.bgImage && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#FAFAFA', borderRadius: '8px', border: '1px dashed #D1D5DB' }}>
                  <img src={editBrandForm.bgImage} alt="Brand Background Preview" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleCloseEditBrand}
                style={{ padding: '12px 20px', fontWeight: '600', border: '1px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#F9FAFB', color: '#374151' }}
              >
                {isEn ? 'Cancel' : '취소'}
              </button>
              <button
                type="submit"
                style={{ padding: '12px 24px', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#0066B3', color: '#FFFFFF' }}
              >
                💾 {isEn ? 'Save' : '저장하기'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
