/**
 * @file Bilingual (EN/FR) and dark-mode controls for the TSSRCT pitch deck.
 *
 * Two toggles are injected into every `.meta-bar`, just to the left of
 * the existing "↓ Download" link:
 *   - A pill switch FR | EN
 *   - A round sun/moon button for light/dark theme
 *
 * State persists in localStorage (keys `tssrct-lang`, `tssrct-theme`).
 */
(function() {
  var I18N_KEY  = 'tssrct-lang';
  var THEME_KEY = 'tssrct-theme';

  var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  var SUPPORTED   = ['fr', 'en'];
  var saved       = localStorage.getItem(I18N_KEY);
  var currentLang = (SUPPORTED.indexOf(saved) >= 0) ? saved : 'en';

  var STRINGS = {
    en: {
      navPrev:        'Previous (↑ / ←)',
      navNext:        'Next (↓ / → / Space)',
      navPrevLabel:   'Previous slide',
      navNextLabel:   'Next slide',
      pdfTitle:       'The PDF is downloading',
      pdfLoadingEng:  'Loading PDF engine',
      pdfPreparing:   'Preparing assets',
      pdfNetErr:      'Network error',
      pdfNetErrDesc:  'Could not load PDF engine',
      pdfNetErrHint:  'Check your connection and retry.',
      pdfRendering:   'Rendering slide {n} of {total}',
      pdfSaveDialog:  'Opening save dialog',
      pdfReady:       'Your PDF is ready',
      pdfReadyDesc:   'Choose where to save it',
      pdfReadyHint:   "Once saved (or cancelled), close this window with × or ESC.",
      pdfErr:         'Something went wrong',
      pdfErrDesc:     'Please try again',
      pdfErrHint:     'Unknown error. Close this window and retry.',
      cfSending:      'Sending…',
      cfSendBtn:      'Send inquiry →',
      cfSent:         "✓ Sent. We'll reply within 48 hours.",
      cfFailed:       '⚠ Could not send. Email us directly: contact@example.com',
      langAria:       'Switch language',
      themeAria:      'Switch theme'
    },
    fr: {
      navPrev:        'Précédent (↑ / ←)',
      navNext:        'Suivant (↓ / → / Espace)',
      navPrevLabel:   'Slide précédente',
      navNextLabel:   'Slide suivante',
      pdfTitle:       'Téléchargement du PDF en cours',
      pdfLoadingEng:  'Chargement du moteur PDF',
      pdfPreparing:   'Préparation des éléments',
      pdfNetErr:      'Erreur réseau',
      pdfNetErrDesc:  'Impossible de charger le moteur PDF',
      pdfNetErrHint:  'Vérifiez votre connexion puis réessayez.',
      pdfRendering:   'Rendu de la slide {n} sur {total}',
      pdfSaveDialog:  'Ouverture de la fenêtre d’enregistrement',
      pdfReady:       'Votre PDF est prêt',
      pdfReadyDesc:   'Choisissez où l’enregistrer',
      pdfReadyHint:   'Une fois enregistré (ou annulé), fermez cette fenêtre avec × ou Échap.',
      pdfErr:         'Une erreur est survenue',
      pdfErrDesc:     'Merci de réessayer',
      pdfErrHint:     'Erreur inconnue. Fermez cette fenêtre puis réessayez.',
      cfSending:      'Envoi…',
      cfSendBtn:      'Envoyer la demande →',
      cfSent:         '✓ Envoyé. Réponse sous 48 heures.',
      cfFailed:       '⚠ Échec. Écrivez-nous : contact@example.com',
      langAria:       'Changer la langue',
      themeAria:      'Changer de thème'
    }
  };

  window.__i18n = function(key, vars) {
    var bundle = STRINGS[currentLang] || STRINGS.en;
    var s = (bundle[key] != null) ? bundle[key] : (STRINGS.en[key] != null ? STRINGS.en[key] : key);
    if (vars) for (var k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  };
  window.__getLang = function() { return currentLang; };

  function ensureSavedEN(el, attr) {
    var saveAttr = 'data-en' + (attr ? ('-' + attr) : '');
    if (!el.hasAttribute(saveAttr)) {
      var v = (attr == null) ? el.textContent : el.getAttribute(attr);
      el.setAttribute(saveAttr, v == null ? '' : v);
    }
    return el.getAttribute(saveAttr);
  }
  function pickText(el, lang) {
    var en = ensureSavedEN(el, null);
    return (lang === 'fr') ? (el.getAttribute('data-fr') || en) : en;
  }
  function pickAttr(el, lang, realAttr) {
    var en = ensureSavedEN(el, realAttr);
    return (lang === 'fr') ? (el.getAttribute('data-fr-' + realAttr) || en) : en;
  }

  function applyLangToDOM(lang) {
    var nodes = document.querySelectorAll('[data-fr]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children && el.children.length > 0) {
        var firstText = null;
        for (var n = 0; n < el.childNodes.length; n++) {
          var nd = el.childNodes[n];
          if (nd.nodeType === 3 && nd.textContent.length > 0) { firstText = nd; break; }
        }
        if (firstText) {
          if (!el.hasAttribute('data-en')) el.setAttribute('data-en', firstText.textContent);
          var en = el.getAttribute('data-en');
          firstText.textContent = (lang === 'fr') ? (el.getAttribute('data-fr') || en) : en;
        }
      } else {
        el.textContent = pickText(el, lang);
      }
    }
    var attrNames = ['title', 'aria-label', 'placeholder', 'alt'];
    for (var p = 0; p < attrNames.length; p++) {
      var realAttr = attrNames[p];
      var matches = document.querySelectorAll('[data-fr-' + realAttr + ']');
      for (var j = 0; j < matches.length; j++) {
        matches[j].setAttribute(realAttr, pickAttr(matches[j], lang, realAttr));
      }
    }
    document.documentElement.setAttribute('lang', lang);
    var toggles = document.querySelectorAll('.lang-toggle');
    for (var t = 0; t < toggles.length; t++) toggles[t].setAttribute('data-active', lang);
    var langTitle  = window.__i18n('langAria');
    var themeTitle = window.__i18n('themeAria');
    for (var t2 = 0; t2 < toggles.length; t2++) {
      toggles[t2].setAttribute('aria-label', langTitle);
      toggles[t2].setAttribute('title',      langTitle);
    }
    var themeBtns = document.querySelectorAll('.theme-toggle');
    for (var b = 0; b < themeBtns.length; b++) {
      themeBtns[b].setAttribute('aria-label', themeTitle);
      themeBtns[b].setAttribute('title',      themeTitle);
    }
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    currentLang = lang;
    try { localStorage.setItem(I18N_KEY, lang); } catch (_) {}
    applyLangToDOM(lang);
    try { window.dispatchEvent(new Event('langchange')); } catch (_) {}
  }
  function nextLang(cur) {
    var idx = SUPPORTED.indexOf(cur);
    return SUPPORTED[(idx + 1) % SUPPORTED.length];
  }
  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    currentTheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
    document.documentElement.setAttribute('data-theme', theme);
    var btns = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('data-theme', theme);
  }

  var SUN_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"></circle>' +
    '<line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line>' +
    '<line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line>' +
    '<line x1="4.93" y1="4.93" x2="6.34" y2="6.34"></line><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"></line>' +
    '<line x1="4.93" y1="19.07" x2="6.34" y2="17.66"></line><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"></line></svg>';
  var MOON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  function createLangToggle() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-toggle';
    btn.setAttribute('data-active', currentLang);
    btn.innerHTML =
      '<span class="lt-thumb" aria-hidden="true"></span>' +
      '<span class="lt-lbl lt-fr">FR</span>' +
      '<span class="lt-lbl lt-en">EN</span>';
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      setLang(nextLang(currentLang));
    });
    return btn;
  }
  function createThemeToggle() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.setAttribute('data-theme', currentTheme);
    btn.innerHTML =
      '<span class="tt-icon tt-sun" aria-hidden="true">' + SUN_SVG + '</span>' +
      '<span class="tt-icon tt-moon" aria-hidden="true">' + MOON_SVG + '</span>';
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
    return btn;
  }
  function injectToggles() {
    var bars = document.querySelectorAll('.meta-bar');
    for (var i = 0; i < bars.length; i++) {
      var right = bars[i].lastElementChild;
      if (!right || !right.querySelector) continue;
      var dl = right.querySelector('.dl-link');
      if (!dl) continue;
      var langBtn  = createLangToggle();
      var themeBtn = createThemeToggle();
      right.insertBefore(langBtn,  dl);
      right.insertBefore(themeBtn, langBtn);
    }
  }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function() {
    injectToggles();
    applyLangToDOM(currentLang);
  });
})();
