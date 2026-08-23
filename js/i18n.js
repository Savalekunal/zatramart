/* ============================================
   ZatraMart — i18n engine
   4 languages: en (English), hinglish, mr (Marathi), hi (Hindi).
   Locale dictionaries live in /locales/*.json — this file only loads them,
   exposes t(key, vars), applies data-i18n attributes to the DOM, and lets
   page scripts re-render dynamic content (product cards, toasts, etc.)
   whenever the language changes via a 'km:langchange' event.
   ============================================ */
(function () {
  const LOCALES = ['en', 'hinglish', 'mr', 'hi'];
  const DEFAULT_LOCALE = 'en';
  const STORAGE_KEY = 'km_lang';

  // Every page lives at the site root, so a relative path always resolves correctly
  // whether served locally or under a GitHub Pages subpath like /zatramart/.
  const LOCALE_URL = (code) => `locales/${code}.json`;

  const dicts = {};
  let currentLocale = null;
  let readyResolve;
  const ready = new Promise((res) => { readyResolve = res; });

  function getStoredLocale() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return LOCALES.includes(v) ? v : null;
    } catch (e) { return null; }
  }
  function storeLocale(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* ignore */ }
  }

  async function loadDict(code) {
    if (dicts[code]) return dicts[code];
    const res = await fetch(LOCALE_URL(code));
    dicts[code] = await res.json();
    return dicts[code];
  }

  function lookup(dict, key) {
    if (!dict) return undefined;
    return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict);
  }

  // t('cart.checkout') -> translated string.
  // t('cart.itemCount', {n: 3}) -> interpolates {n} etc. from the vars object.
  function t(key, vars) {
    let str = lookup(dicts[currentLocale], key);
    if (str === undefined) str = lookup(dicts[DEFAULT_LOCALE], key);
    if (str === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
      });
    }
    return str;
  }

  function applyToDom(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
  }

  async function setLocale(code) {
    if (!LOCALES.includes(code)) code = DEFAULT_LOCALE;
    await loadDict(code);
    if (code !== DEFAULT_LOCALE) await loadDict(DEFAULT_LOCALE); // fallback dict for missing keys
    currentLocale = code;
    storeLocale(code);
    document.documentElement.setAttribute('lang', code === 'hi' ? 'hi' : code === 'mr' ? 'mr' : 'en');
    applyToDom(document);
    document.dispatchEvent(new CustomEvent('km:langchange', { detail: { locale: code } }));
  }

  async function init() {
    const initial = getStoredLocale() || DEFAULT_LOCALE;
    await setLocale(initial);
    readyResolve();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.KM_I18N = {
    t,
    setLocale,
    applyToDom,
    getLocale: () => currentLocale,
    locales: LOCALES,
    ready,
  };
})();
