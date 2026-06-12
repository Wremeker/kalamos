import { translate } from './i18n/runtime';

/**
 * Default i18n-instance shim for modules that import the app's global i18n
 * singleton (e.g. `import i18n from '../../i18n'`). Only the `t` accessor and
 * `language` are used inside the editor.
 */
const i18n = {
  get language(): string {
    return typeof navigator !== 'undefined' ? navigator.language : 'en';
  },
  t: translate,
};

export default i18n;
