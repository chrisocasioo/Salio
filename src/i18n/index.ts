import * as Localization from 'expo-localization';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { pt } from './pt';
import { ja } from './ja';

type SupportedLocale = 'en' | 'es' | 'fr' | 'pt' | 'ja';

const dictionaries: Record<SupportedLocale, typeof en> = { en, es, fr, pt, ja };

function detectLocale(): SupportedLocale {
  const languageCode = Localization.getLocales()[0]?.languageCode;
  return languageCode !== null && languageCode !== undefined && languageCode in dictionaries
    ? (languageCode as SupportedLocale)
    : 'en';
}

export const locale: SupportedLocale = detectLocale();

function lookup(dict: object, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

/**
 * Flat dot-notation lookup against the current device locale's dictionary (see `en.ts` for the
 * full key list), falling back to English for any key a translation hasn't caught up on yet.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(en, key) ?? key;
  let value = typeof raw === 'string' ? raw : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }
  }
  return value;
}
