import { useLanguage } from '../i18n/LanguageContext'
import english from './copy-en.json'

export function useCopy() {
  const { lang } = useLanguage()
  return { tr: text => lang === 'en' ? (english[text] ?? text) : text, en: lang === 'en' }
}
