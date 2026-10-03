/**
 * SEO Meta Previewer — Interactive Logic & Canvas Pixel Engine
 * Features:
 * - HTML5 Canvas 2D Subpixel Measurement Engine with Calibrated Fallback
 * - O(log N) Binary Search Truncation Engine (600px Desktop Title Boundary)
 * - Real-Time DOM Preview Synchronization
 * - Dark / Light Mode Theme Manager with localStorage Persistence
 * - Responsive Desktop & Mobile SERP Viewport Switcher
 */

(function (global) {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Constants & Metric Limits
  // ---------------------------------------------------------------------------
  const LIMITS = {
    desktopTitle: 600,      // Google desktop title width ceiling in px
    titleWarning: 510,      // Warning threshold (85% of 600px)
    mobileTitle: 680,       // Mobile cumulative wrapped title limit
    description: 960,       // Desktop snippet 2-line width ceiling in px
    descWarning: 816        // 85% of description limit
  };

  const FONTS = {
    titleDesktop: '20px Arial, sans-serif',
    titleMobile: '20px Arial, sans-serif',
    description: '14px Arial, sans-serif',
    breadcrumb: '12px Arial, sans-serif'
  };

  // Calibrated Arial 20px glyph widths lookup table for headless Node/JSDOM environments
  const ARIAL_20PX_WIDTHS = {
    ' ': 5.56, '!': 5.56, '"': 7.1, '#': 11.12, '$': 11.12, '%': 17.8, '&': 13.34, "'": 3.86,
    '(': 6.66, ')': 6.66, '*': 7.76, '+': 11.66, ',': 5.56, '-': 6.66, '.': 5.56, '/': 5.56,
    '0': 11.12, '1': 11.12, '2': 11.12, '3': 11.12, '4': 11.12, '5': 11.12, '6': 11.12, '7': 11.12,
    '8': 11.12, '9': 11.12, ':': 5.56, ';': 5.56, '<': 11.66, '=': 11.66, '>': 11.66, '?': 11.12,
    '@': 20.32, 'A': 13.34, 'B': 13.34, 'C': 14.44, 'D': 14.44, 'E': 13.34, 'F': 12.22, 'G': 15.56,
    'H': 14.44, 'I': 5.56, 'J': 10.0, 'K': 13.34, 'L': 11.12, 'M': 16.66, 'N': 14.44, 'O': 15.56,
    'P': 13.34, 'Q': 15.56, 'R': 14.44, 'S': 13.34, 'T': 12.22, 'U': 14.44, 'V': 13.34, 'W': 19.44,
    'X': 13.34, 'Y': 13.34, 'Z': 12.22, '[': 5.56, '\\': 5.56, ']': 5.56, '^': 9.38, '_': 11.12,
    '`': 6.66, 'a': 11.12, 'b': 11.12, 'c': 10.0, 'd': 11.12, 'e': 11.12, 'f': 5.56, 'g': 11.12,
    'h': 11.12, 'i': 4.44, 'j': 4.44, 'k': 10.0, 'l': 4.44, 'm': 16.66, 'n': 11.12, 'o': 11.12,
    'p': 11.12, 'q': 11.12, 'r': 6.66, 's': 10.0, 't': 5.56, 'u': 11.12, 'v': 10.0, 'w': 14.44,
    'x': 10.0, 'y': 10.0, 'z': 10.0, '{': 6.66, '|': 5.16, '}': 6.66, '~': 11.66
  };

  // Safe DOM attribute manipulation helpers for mock/minimal DOM resilience
  function safeSetAttribute(element, name, value) {
    if (!element) return;
    if (typeof element.setAttribute === 'function') {
      element.setAttribute(name, String(value));
    } else if (element.attributes) {
      if (typeof element.attributes.set === 'function') {
        element.attributes.set(name, String(value));
      } else {
        element.attributes[name] = String(value);
      }
    }
  }

  function safeRemoveAttribute(element, name) {
    if (!element) return;
    if (typeof element.removeAttribute === 'function') {
      element.removeAttribute(name);
    } else if (element.attributes) {
      if (typeof element.attributes.delete === 'function') {
        element.attributes.delete(name);
      } else if (typeof element.attributes.removeNamedItem === 'function') {
        try { element.attributes.removeNamedItem(name); } catch (e) {}
      } else {
        delete element.attributes[name];
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Pixel Measurement Engine (`PixelMeasurer`)
  // ---------------------------------------------------------------------------
  const PixelMeasurer = (function () {
    let canvas = null;
    let context = null;

    function getContext() {
      if (context) return context;
      try {
        if (typeof document !== 'undefined' && document.createElement) {
          canvas = document.createElement('canvas');
          context = canvas.getContext('2d');
        }
      } catch (e) {
        context = null;
      }
      return context;
    }

    function measure(text, font = FONTS.titleDesktop) {
      if (!text || text.length === 0) return 0;

      const ctx = getContext();
      if (ctx && typeof ctx.measureText === 'function') {
        try {
          ctx.font = font;
          const metrics = ctx.measureText(text);
          if (metrics && typeof metrics.width === 'number') {
            return Math.round(metrics.width * 10) / 10;
          }
        } catch (e) {
          // Fallback to table if measureText throws
        }
      }

      // Proportional font fallback calculation
      let fontSize = 20;
      const sizeMatch = typeof font === 'string' ? font.match(/(\d+)px/) : null;
      if (sizeMatch) {
        fontSize = parseInt(sizeMatch[1], 10);
      }
      const scale = fontSize / 20;
      let totalWidth = 0;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0);

        // High surrogate pair handling (e.g. emojis ~20-22px)
        if (code >= 0xd800 && code <= 0xdbff) {
          totalWidth += 22 * scale;
          i++; // skip low surrogate
          continue;
        }

        if (Object.prototype.hasOwnProperty.call(ARIAL_20PX_WIDTHS, char)) {
          totalWidth += ARIAL_20PX_WIDTHS[char] * scale;
        } else if (code > 255) {
          totalWidth += 20 * scale; // CJK / wide unicode
        } else {
          totalWidth += 11.12 * scale; // Average Latin char
        }
      }

      return Math.round(totalWidth * 10) / 10;
    }

    return {
      measure,
      FONTS,
      LIMITS
    };
  })();

  // ---------------------------------------------------------------------------
  // 3. Truncation Engine (`TruncationEngine`)
  // ---------------------------------------------------------------------------
  const TruncationEngine = {
    truncate(text, maxPx = LIMITS.desktopTitle, font = FONTS.titleDesktop, ellipsis = '...') {
      if (!text || text.trim() === '') {
        return {
          displayText: '',
          pixelWidth: 0,
          isTruncated: false,
          overflowPx: 0
        };
      }

      const fullWidth = PixelMeasurer.measure(text, font);

      // Strict zero tolerance boundary check: If <= maxPx, return verbatim
      if (fullWidth <= maxPx) {
        return {
          displayText: text,
          pixelWidth: fullWidth,
          isTruncated: false,
          overflowPx: 0
        };
      }

      // String exceeds maxPx: binary search for cutoff prefix + ellipsis
      let fontSize = 20;
      const sizeMatch = typeof font === 'string' ? font.match(/(\d+)px/) : null;
      if (sizeMatch) {
        fontSize = parseInt(sizeMatch[1], 10);
      }
      const minGlyphPx = Math.max(1, 2.5 * (fontSize / 20));
      const maxPossibleChars = Math.ceil(maxPx / minGlyphPx) + 20;

      let low = 0;
      let high = Math.min(text.length, maxPossibleChars);
      let bestIndex = 0;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        let candidate = text.slice(0, mid).trimEnd();

        // Avoid breaking high surrogate pair at cutoff
        if (/[\uD800-\uDBFF]$/.test(candidate)) {
          candidate = candidate.slice(0, -1).trimEnd();
        }

        const candidateWithDots = candidate + ellipsis;
        const candidateWidth = PixelMeasurer.measure(candidateWithDots, font);

        if (candidateWidth <= maxPx) {
          bestIndex = mid;
          low = mid + 1; // Try longer prefix
        } else {
          high = mid - 1; // Exceeded, narrow down
        }
      }

      let truncatedPrefix = text.slice(0, bestIndex).trimEnd();
      if (/[\uD800-\uDBFF]$/.test(truncatedPrefix)) {
        truncatedPrefix = truncatedPrefix.slice(0, -1).trimEnd();
      }

      const finalDisplayText = truncatedPrefix + ellipsis;
      const finalWidth = PixelMeasurer.measure(finalDisplayText, font);

      return {
        displayText: finalDisplayText,
        pixelWidth: fullWidth,
        truncatedWidth: finalWidth,
        isTruncated: true,
        overflowPx: Math.max(0, Math.round((fullWidth - maxPx) * 10) / 10)
      };
    }
  };

  // ---------------------------------------------------------------------------
  // 4. URL & Breadcrumb Parser (`URLParser`)
  // ---------------------------------------------------------------------------
  const URLParser = {
    parse(rawUrl) {
      if (!rawUrl || !rawUrl.trim()) {
        return {
          domain: 'example.com',
          breadcrumb: 'https://example.com',
          path: ''
        };
      }

      let urlToParse = rawUrl.trim();
      if (!/^https?:\/\//i.test(urlToParse)) {
        urlToParse = 'https://' + urlToParse;
      }

      try {
        const parsed = new (global.URL || URL)(urlToParse);
        const domain = parsed.hostname.replace(/^www\./i, '') || 'example.com';
        const segments = parsed.pathname.split('/').filter(Boolean);

        const breadcrumb = segments.length > 0
          ? `${parsed.protocol}//${domain} › ${segments.join(' › ')}`
          : `${parsed.protocol}//${domain}`;

        return {
          domain,
          breadcrumb,
          path: parsed.pathname
        };
      } catch (e) {
        const clean = rawUrl.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
        return {
          domain: clean || 'example.com',
          breadcrumb: clean || 'https://example.com',
          path: ''
        };
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Dark / Light Mode Theme Manager (`ThemeManager`)
  // ---------------------------------------------------------------------------
  const ThemeManager = {
    STORAGE_KEY: 'seo_preview_theme',
    _initialized: false,

    init() {
      if (typeof document === 'undefined') return;
      if (this._initialized) return;
      this._initialized = true;

      const saved = this.getSavedTheme();
      let theme = 'light';
      let persist = false;

      if (saved === 'dark' || saved === 'light') {
        theme = saved;
      } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
      }

      this.applyTheme(theme, persist);

      // Listen for system color scheme changes when no explicit stored preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery) {
          const colorChangeHandler = (e) => {
            if (!this.getSavedTheme()) {
              this.applyTheme(e.matches ? 'dark' : 'light', false);
            }
          };
          if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', colorChangeHandler);
          } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(colorChangeHandler);
          }
        }
      }

      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn && typeof toggleBtn.addEventListener === 'function') {
        toggleBtn.addEventListener('click', () => {
          this.toggleTheme();
        });
      }
    },

    getSavedTheme() {
      try {
        if (typeof localStorage !== 'undefined') {
          const val = localStorage.getItem(this.STORAGE_KEY);
          if (val === 'dark' || val === 'light') return val;
        }
      } catch (e) {
        // Storage restricted
      }
      return null;
    },

    getCurrentTheme() {
      if (typeof document === 'undefined' || !document.body) return 'light';
      return document.body.classList.contains('dark') ? 'dark' : 'light';
    },

    applyTheme(theme, persist = true) {
      if (typeof document === 'undefined') return;

      if (document.body) {
        if (theme === 'dark') {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }
      }

      if (persist) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.STORAGE_KEY, theme);
          }
        } catch (e) {
          // Storage restricted
        }
      }

      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn) {
        safeSetAttribute(toggleBtn, 'data-theme', theme);
        safeSetAttribute(toggleBtn, 'aria-pressed', theme === 'dark' ? 'true' : 'false');
        const nextModeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        safeSetAttribute(toggleBtn, 'aria-label', nextModeLabel);
        toggleBtn.title = nextModeLabel;
      }
    },

    toggleTheme() {
      const current = this.getCurrentTheme();
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      this.applyTheme(nextTheme, true);
      return nextTheme;
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Reactive UI Synchronization (`UIRenderer`)
  // ---------------------------------------------------------------------------
  const UIRenderer = {
    elements: null,

    getElements() {
      if (typeof document === 'undefined') return {};
      return {
        inputTitle: document.getElementById('input-title'),
        titleCounter: document.getElementById('title-counter'),
        titleProgress: document.getElementById('title-progress'),
        inputUrl: document.getElementById('input-url'),
        inputDesc: document.getElementById('input-description'),
        descCounter: document.getElementById('desc-counter'),
        descProgress: document.getElementById('desc-progress'),
        btnDesktop: document.getElementById('btn-desktop'),
        btnMobile: document.getElementById('btn-mobile'),
        serpPreview: document.getElementById('serp-preview'),
        previewTitle: document.getElementById('preview-title'),
        previewDesc: document.getElementById('preview-description'),
        previewSiteName: document.getElementById('preview-site-name'),
        previewBreadcrumb: document.getElementById('preview-breadcrumb')
      };
    },

    setAriaInvalid(element, isInvalid) {
      if (!element) return;
      if (isInvalid) {
        safeSetAttribute(element, 'aria-invalid', 'true');
      } else {
        safeRemoveAttribute(element, 'aria-invalid');
      }
    },

    renderTitle(el) {
      if (!el.inputTitle) return;
      const rawValue = el.inputTitle.value || '';
      const charCount = rawValue.length;

      if (!rawValue || rawValue.trim() === '') {
        if (el.previewTitle) el.previewTitle.textContent = 'Page Title Preview';
        if (el.titleCounter) {
          el.titleCounter.textContent = `0px / ${LIMITS.desktopTitle}px (0 chars)`;
          el.titleCounter.classList.remove('error', 'truncated', 'warning');
          el.titleCounter.classList.add('safe');
          el.titleCounter.className = 'counter-badge safe';
        }
        if (el.titleProgress) {
          el.titleProgress.style.width = '0%';
          el.titleProgress.classList.remove('error', 'truncated', 'warning');
          el.titleProgress.classList.add('safe');
          el.titleProgress.className = 'progress-bar safe';
        }
        if (el.inputTitle) {
          el.inputTitle.classList.remove('error');
          this.setAriaInvalid(el.inputTitle, false);
        }
        return;
      }

      const trunc = TruncationEngine.truncate(rawValue, LIMITS.desktopTitle, FONTS.titleDesktop, '...');
      const pixelWidth = trunc.pixelWidth;

      if (el.previewTitle) {
        el.previewTitle.textContent = trunc.displayText;
      }

      if (el.titleCounter) {
        el.titleCounter.textContent = `${Math.round(pixelWidth)}px / ${LIMITS.desktopTitle}px (${charCount} chars)`;
      }

      const progressPct = Math.min(100, Math.round((pixelWidth / LIMITS.desktopTitle) * 100));
      if (el.titleProgress) {
        el.titleProgress.style.width = `${progressPct}%`;
      }

      // Manage state classes: Single source of truth is trunc.isTruncated
      if (trunc.isTruncated) {
        if (el.titleCounter) {
          el.titleCounter.classList.add('error', 'truncated');
          el.titleCounter.classList.remove('safe', 'warning');
        }
        el.inputTitle.classList.add('error');
        this.setAriaInvalid(el.inputTitle, true);
        if (el.titleProgress) {
          el.titleProgress.classList.add('error', 'truncated');
          el.titleProgress.classList.remove('safe', 'warning');
        }
      } else if (pixelWidth >= LIMITS.titleWarning) {
        if (el.titleCounter) {
          el.titleCounter.classList.remove('error', 'truncated', 'safe');
          el.titleCounter.classList.add('warning');
        }
        el.inputTitle.classList.remove('error');
        this.setAriaInvalid(el.inputTitle, false);
        if (el.titleProgress) {
          el.titleProgress.classList.remove('error', 'truncated', 'safe');
          el.titleProgress.classList.add('warning');
        }
      } else {
        if (el.titleCounter) {
          el.titleCounter.classList.remove('error', 'truncated', 'warning');
          el.titleCounter.classList.add('safe');
        }
        el.inputTitle.classList.remove('error');
        this.setAriaInvalid(el.inputTitle, false);
        if (el.titleProgress) {
          el.titleProgress.classList.remove('error', 'truncated', 'warning');
          el.titleProgress.classList.add('safe');
        }
      }
    },

    renderDescription(el) {
      if (!el.inputDesc) return;
      const rawValue = el.inputDesc.value || '';
      const charCount = rawValue.length;

      if (!rawValue || rawValue.trim() === '') {
        if (el.previewDesc) el.previewDesc.textContent = 'Meta description preview will appear here...';
        if (el.descCounter) {
          el.descCounter.textContent = `0px / ${LIMITS.description}px (0 chars)`;
          el.descCounter.classList.remove('error', 'truncated', 'warning');
          el.descCounter.classList.add('safe');
          el.descCounter.className = 'counter-badge safe';
        }
        if (el.descProgress) {
          el.descProgress.style.width = '0%';
          el.descProgress.classList.remove('error', 'truncated', 'warning');
          el.descProgress.classList.add('safe');
          el.descProgress.className = 'progress-bar safe';
        }
        if (el.inputDesc) {
          el.inputDesc.classList.remove('error');
          this.setAriaInvalid(el.inputDesc, false);
        }
        return;
      }

      const pixelWidth = PixelMeasurer.measure(rawValue, FONTS.description);
      if (el.previewDesc) {
        el.previewDesc.textContent = rawValue;
      }

      if (el.descCounter) {
        el.descCounter.textContent = `${Math.round(pixelWidth)}px / ${LIMITS.description}px (${charCount} chars)`;
      }

      const progressPct = Math.min(100, Math.round((pixelWidth / LIMITS.description) * 100));
      if (el.descProgress) {
        el.descProgress.style.width = `${progressPct}%`;
      }

      if (pixelWidth > LIMITS.description) {
        if (el.descCounter) {
          el.descCounter.classList.add('error', 'truncated');
          el.descCounter.classList.remove('safe', 'warning');
        }
        el.inputDesc.classList.add('error');
        this.setAriaInvalid(el.inputDesc, true);
        if (el.descProgress) {
          el.descProgress.classList.add('error', 'truncated');
          el.descProgress.classList.remove('safe', 'warning');
        }
      } else if (pixelWidth >= LIMITS.descWarning) {
        if (el.descCounter) {
          el.descCounter.classList.remove('error', 'truncated', 'safe');
          el.descCounter.classList.add('warning');
        }
        el.inputDesc.classList.remove('error');
        this.setAriaInvalid(el.inputDesc, false);
        if (el.descProgress) {
          el.descProgress.classList.remove('error', 'truncated', 'safe');
          el.descProgress.classList.add('warning');
        }
      } else {
        if (el.descCounter) {
          el.descCounter.classList.remove('error', 'truncated', 'warning');
          el.descCounter.classList.add('safe');
        }
        el.inputDesc.classList.remove('error');
        this.setAriaInvalid(el.inputDesc, false);
        if (el.descProgress) {
          el.descProgress.classList.remove('error', 'truncated', 'warning');
          el.descProgress.classList.add('safe');
        }
      }
    },

    renderUrl(el) {
      if (!el.inputUrl) return;
      const rawValue = el.inputUrl.value || '';
      const parsed = URLParser.parse(rawValue);

      if (el.previewSiteName) el.previewSiteName.textContent = parsed.domain;
      if (el.previewBreadcrumb) el.previewBreadcrumb.textContent = parsed.breadcrumb;
    },

    setMode(mode, el) {
      if (!el.serpPreview) return;
      if (mode === 'desktop') {
        el.serpPreview.classList.add('mode-desktop');
        el.serpPreview.classList.remove('mode-mobile');
        if (el.btnDesktop) {
          el.btnDesktop.classList.add('active');
          safeSetAttribute(el.btnDesktop, 'aria-selected', 'true');
        }
        if (el.btnMobile) {
          el.btnMobile.classList.remove('active');
          safeSetAttribute(el.btnMobile, 'aria-selected', 'false');
        }
      } else if (mode === 'mobile') {
        el.serpPreview.classList.add('mode-mobile');
        el.serpPreview.classList.remove('mode-desktop');
        if (el.btnMobile) {
          el.btnMobile.classList.add('active');
          safeSetAttribute(el.btnMobile, 'aria-selected', 'true');
        }
        if (el.btnDesktop) {
          el.btnDesktop.classList.remove('active');
          safeSetAttribute(el.btnDesktop, 'aria-selected', 'false');
        }
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Application Controller (`AppController`)
  // ---------------------------------------------------------------------------
  const AppController = {
    _initialized: false,

    init() {
      if (typeof document === 'undefined') return;
      if (this._initialized) return;
      this._initialized = true;

      const el = UIRenderer.getElements();

      // Initialize Theme Manager
      ThemeManager.init();

      // Bind input events for live synchronization
      if (el.inputTitle && typeof el.inputTitle.addEventListener === 'function') {
        el.inputTitle.addEventListener('input', () => UIRenderer.renderTitle(el));
      }
      if (el.inputDesc && typeof el.inputDesc.addEventListener === 'function') {
        el.inputDesc.addEventListener('input', () => UIRenderer.renderDescription(el));
      }
      if (el.inputUrl && typeof el.inputUrl.addEventListener === 'function') {
        el.inputUrl.addEventListener('input', () => UIRenderer.renderUrl(el));
      }

      // Bind device toggles
      if (el.btnDesktop && typeof el.btnDesktop.addEventListener === 'function') {
        el.btnDesktop.addEventListener('click', () => UIRenderer.setMode('desktop', el));
      }
      if (el.btnMobile && typeof el.btnMobile.addEventListener === 'function') {
        el.btnMobile.addEventListener('click', () => UIRenderer.setMode('mobile', el));
      }

      // Initial render pass
      UIRenderer.renderTitle(el);
      UIRenderer.renderDescription(el);
      UIRenderer.renderUrl(el);
      UIRenderer.setMode('desktop', el);
    }
  };

  // Auto-init on DOMContentLoaded if in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', () => AppController.init());
    } else {
      AppController.init();
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Public Exports
  // ---------------------------------------------------------------------------
  const SEOMetaApp = {
    PixelMeasurer,
    TruncationEngine,
    URLParser,
    ThemeManager,
    UIRenderer,
    AppController,
    LIMITS,
    FONTS,
    init: () => AppController.init()
  };

  if (typeof window !== 'undefined') {
    window.SEOMetaApp = SEOMetaApp;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOMetaApp;
  }

  return SEOMetaApp;
})(typeof globalThis !== 'undefined' ? globalThis : this);
