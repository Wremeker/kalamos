import { translate } from '../i18n/runtime';

export type TFunction = (key: string, opts?: Record<string, unknown>) => string;

export interface I18nLike {
  language: string;
  t: TFunction;
  changeLanguage: (lng: string) => Promise<void>;
}

const i18nLike: I18nLike = {
  language: typeof navigator !== 'undefined' ? navigator.language : 'en',
  t: translate,
  async changeLanguage(lng: string) {
    this.language = lng;
  },
};

/**
 * Drop-in replacement for `react-i18next`'s `useTranslation`. The editor is
 * built to call `const { t } = useTranslation()`; this keeps every call site
 * unchanged while sourcing copy from the editor string table instead of a
 * global i18next instance. The package's bundler aliases `react-i18next` here.
 */
export function useTranslation(): { t: TFunction; i18n: I18nLike } {
  return { t: translate, i18n: i18nLike };
}

export default { useTranslation };
