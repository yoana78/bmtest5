// 관리자 페이지의 "페이지 문구·이미지" 탭입니다.
// 입력 폼은 src/content/pageDefaults.js(설계도)를 읽어서 자동으로 만들어집니다 —
// 설계도에 항목을 추가하면 여기 입력칸도 같이 생깁니다.
import React, { useState } from 'react';
import { PAGE_SCHEMA } from '../content/pageDefaults';
import ExpoYearEditor from './ExpoYearEditor';
import ListEditor from './ListEditor';
import { LIST_SCHEMA } from '../content/siteLists';

export default function PageContentEditor({
  isEn,
  pageContent,          // 현재 저장돼 있는 값 { 페이지: { 항목: {ko,en} | {src,kind} } }
  onSave,               // (전체 pageContent) => Promise
  uploadMedia,          // (file, field) => Promise<{src, kind}>
  translateText,        // (한글) => Promise<영문>
  expoYears,            // 관리자가 추가한 박람회 연도 목록
  onSaveExpoYears,      // (연도 목록) => Promise
  uploadExpoPhoto,      // (file) => Promise<이미지 주소>
  siteLists,            // 목록형 데이터(연혁/로고/명함)의 현재 값
  onSaveList,           // (목록이름, 목록) => Promise
  uploadListImage       // (file, width, height) => Promise<이미지 주소>
}) {
  const pageKeys = Object.keys(PAGE_SCHEMA);
  const [activePage, setActivePage] = useState(pageKeys[0]);
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(pageContent || {})));
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');

  const page = PAGE_SCHEMA[activePage];

  // 저장된 값이 없으면 설계도의 기본값(=지금 사이트에 나가는 문구)을 보여준다
  const valueOf = (field, lang) => {
    const saved = draft[activePage]?.[field.key];
    if (saved && typeof saved === 'object' && saved[lang] !== undefined) return saved[lang];
    return field[lang] || '';
  };

  const srcOf = (field) => {
    const saved = draft[activePage]?.[field.key];
    if (saved && typeof saved === 'object' && saved.src) return saved.src;
    return field.src || '';
  };

  const kindOf = (field) => {
    const saved = draft[activePage]?.[field.key];
    if (saved && typeof saved === 'object' && saved.kind) return saved.kind;
    return /\.mp4($|\?)/i.test(srcOf(field)) ? 'video' : 'image';
  };

  const setField = (key, patch) => {
    setDraft(prev => ({
      ...prev,
      [activePage]: { ...(prev[activePage] || {}), [key]: { ...(prev[activePage]?.[key] || {}), ...patch } }
    }));
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    setBusyKey(field.key);
    setMessage('');
    try {
      const uploaded = await uploadMedia(file, field);
      setField(field.key, uploaded);
    } catch (err) {
      setMessage((isEn ? 'Upload failed: ' : '업로드 실패: ') + (err?.message || ''));
    } finally {
      setBusyKey('');
    }
  };

  // 되돌리기 — 저장된 값을 지워 원래 문구/사진으로 돌아간다
  const handleReset = (key) => {
    setDraft(prev => {
      const next = { ...(prev[activePage] || {}) };
      delete next[key];
      return { ...prev, [activePage]: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // 영문칸을 비워둔 항목은 저장할 때 한글을 자동 번역해서 채운다
      const filled = JSON.parse(JSON.stringify(draft));
      for (const pKey of Object.keys(PAGE_SCHEMA)) {
        const fields = PAGE_SCHEMA[pKey].sections.flatMap(s => s.fields);
        for (const field of fields) {
          if (field.type === 'image' || field.koOnly) continue;
          const entry = filled[pKey]?.[field.key];
          if (!entry || typeof entry !== 'object') continue;
          if (entry.ko && !entry.en) {
            entry.en = (await translateText(entry.ko)) || entry.ko;
          }
        }
      }
      await onSave(filled);
      setDraft(filled);
      setMessage(isEn ? 'Saved.' : '저장되었습니다. 사이트에 바로 반영됩니다.');
    } catch (err) {
      setMessage((isEn ? 'Save failed: ' : '저장 실패: ') + (err?.message || ''));
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 6000);
    }
  };

  const labelStyle = { display: 'block', fontWeight: 600, marginBottom: '6px', color: '#374151', fontSize: '0.9rem' };
  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.95rem', fontFamily: 'inherit' };
  const hintStyle = { fontSize: '0.78rem', color: '#6B7280', marginLeft: '6px', fontWeight: 500 };

  return (
    <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', lineHeight: 1.4, color: '#111827' }}>
        📝 {isEn ? 'Page Text / Images' : '페이지 문구 · 이미지 수정'}
      </h2>
      <p style={{ color: '#6B7280', fontSize: '0.88rem', margin: 0 }}>
        {isEn
          ? 'Type Korean only — the English version is auto-translated when you leave it blank.'
          : '한글만 입력하시면 됩니다. 영문칸을 비워두고 저장하면 자동으로 번역되어 채워집니다. 엔터로 줄을 바꾸면 화면에도 그대로 줄이 바뀝니다.'}
      </p>

      {/* 페이지 선택 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '18px 0 24px' }}>
        {pageKeys.map(key => (
          <button
            key={key}
            onClick={() => setActivePage(key)}
            style={{
              padding: '9px 16px',
              borderRadius: '999px',
              border: '1px solid ' + (activePage === key ? '#0066B3' : '#D1D5DB'),
              background: activePage === key ? '#0066B3' : '#FFFFFF',
              color: activePage === key ? '#FFFFFF' : '#4B5563',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            {PAGE_SCHEMA[key].label}
          </button>
        ))}
      </div>

      {/* 박람회는 매년 새로 참가하므로 "신뢰와 인증" 페이지에서만 연도 추가 편집기를 함께 보여준다 */}
      {activePage === 'trust' && (
        <ExpoYearEditor
          expoYears={expoYears}
          onSave={onSaveExpoYears}
          uploadPhoto={uploadExpoPhoto}
          translateText={translateText}
        />
      )}

      {/* 이 페이지에 속한 목록형 데이터(연혁 / 로고 / 명함) 편집기 */}
      {Object.entries(LIST_SCHEMA)
        .filter(([, listSchema]) => listSchema.page === activePage)
        .map(([listKey, listSchema]) => (
          <ListEditor
            key={listKey}
            schema={listSchema}
            items={siteLists[listKey]}
            onSave={(items) => onSaveList(listKey, items)}
            uploadImage={uploadListImage}
            translateText={translateText}
          />
        ))}

      {page.sections.map(section => (
        <div key={section.label} style={{ marginBottom: '30px', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#F9FAFB', padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
            <strong style={{ fontSize: '0.98rem', color: '#111827' }}>{section.label}</strong>
            {section.note && (
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>{section.note}</div>
            )}
          </div>

          <div style={{ padding: '18px 16px', display: 'grid', gap: '22px' }}>
            {section.fields.map(field => {
              const isImage = field.type === 'image';
              const modified = !!draft[activePage]?.[field.key];

              return (
                <div key={field.key}>
                  <label style={labelStyle}>
                    {field.label}
                    {isImage
                      ? <span style={hintStyle}>권장 해상도 {field.width}×{field.height} · 다른 비율은 가운데 기준으로 자동 크롭 (사진 또는 mp4 영상)</span>
                      : <span style={hintStyle}>화면 글자크기 {field.size}</span>}
                    {modified && (
                      <button
                        onClick={() => handleReset(field.key)}
                        style={{ marginLeft: '10px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '5px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#6B7280', cursor: 'pointer', fontWeight: 600 }}
                      >
                        되돌리기
                      </button>
                    )}
                  </label>

                  {isImage ? (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ width: '260px', aspectRatio: `${field.width} / ${field.height}`, border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', background: '#F3F4F6', flexShrink: 0 }}>
                        {kindOf(field) === 'video'
                          ? <video src={srcOf(field)} muted loop autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <img src={srcOf(field)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <input
                          type="file"
                          accept="image/*,video/mp4"
                          onChange={e => handleUpload(field, e.target.files[0])}
                          style={{ fontSize: '0.85rem' }}
                        />
                        {busyKey === field.key && (
                          <div style={{ fontSize: '0.82rem', color: '#0066B3', marginTop: '8px' }}>업로드 중입니다…</div>
                        )}
                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '8px', lineHeight: 1.5 }}>
                          영상(mp4)은 현재 용량 제한(약 600KB)이 있어 짧은 영상만 올라갑니다.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: field.koOnly ? '1fr' : '1fr 1fr', gap: '14px' }}>
                      <div>
                        {!field.koOnly && <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '4px' }}>한글</div>}
                        {field.type === 'textarea' ? (
                          <textarea
                            rows={field.size === '1.35rem' ? 8 : 3}
                            value={valueOf(field, 'ko')}
                            onChange={e => setField(field.key, { ko: e.target.value })}
                            style={{ ...inputStyle, resize: 'vertical' }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={valueOf(field, 'ko')}
                            onChange={e => setField(field.key, { ko: e.target.value })}
                            style={inputStyle}
                          />
                        )}
                      </div>

                      {!field.koOnly && (
                        <div>
                          <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '4px' }}>영문 (비워두면 자동 번역)</div>
                          {field.type === 'textarea' ? (
                            <textarea
                              rows={field.size === '1.35rem' ? 8 : 3}
                              value={valueOf(field, 'en')}
                              onChange={e => setField(field.key, { en: e.target.value })}
                              style={{ ...inputStyle, resize: 'vertical', background: '#FCFCFD' }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={valueOf(field, 'en')}
                              onChange={e => setField(field.key, { en: e.target.value })}
                              style={{ ...inputStyle, background: '#FCFCFD' }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'sticky', bottom: 0, background: '#FFFFFF', paddingTop: '14px', borderTop: '1px solid #E5E7EB' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '14px 32px',
            fontSize: '1rem',
            fontWeight: 700,
            border: 'none',
            borderRadius: '8px',
            background: saving ? '#9CA3AF' : '#0066B3',
            color: '#FFFFFF',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? (isEn ? 'Saving…' : '저장 중… (영문 자동 번역 포함)') : (isEn ? 'Save all pages' : '전체 저장')}
        </button>
        {message && <span style={{ fontSize: '0.9rem', color: message.includes('실패') || message.includes('failed') ? '#DC2626' : '#059669', fontWeight: 600 }}>{message}</span>}
      </div>
    </div>
  );
}
