import * as Localization from 'expo-localization';
import { en } from './en';
import { es } from './es';

type SupportedLocale = 'en' | 'es';

const dictionaries: Record<SupportedLocale, typeof en> = { en, es };

function detectLocale(): SupportedLocale {
  const languageCode = Localization.getLocales()[0]?.languageCode;
  return languageCode === 'es' ? 'es' : 'en';
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
