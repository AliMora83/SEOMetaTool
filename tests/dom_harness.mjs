/**
 * In-Memory DOM Harness for SEO Meta Previewer Offline Testing
 * Simulates DOM events, HTML5 Canvas 2D text measurement, and CSS selector matching.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

export class MockDOMTokenList {
  constructor(initialTokens = []) {
    this._tokens = new Set(initialTokens.filter(Boolean));
  }
  add(...tokens) {
    for (const t of tokens) if (t) this._tokens.add(t);
  }
  remove(...tokens) {
    for (const t of tokens) if (t) this._tokens.delete(t);
  }
  toggle(token, force) {
    if (force === true) {
      this.add(token);
      return true;
    }
    if (force === false) {
      this.remove(token);
      return false;
    }
    if (this._tokens.has(token)) {
      this._tokens.delete(token);
      return false;
    }
    this._tokens.add(token);
    return true;
  }
  contains(token) {
    return this._tokens.has(token);
  }
  get length() {
    return this._tokens.size;
  }
  get value() {
    return Array.from(this._tokens).join(' ');
  }
  toString() {
    return this.value;
  }
}

export class MockElement {
  constructor(tagName = 'div', id = '', classNames = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this._classList = new MockDOMTokenList(classNames.split(' '));
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.childNodes = [];
    this.parentElement = null;
    this.value = '';
    this._textContent = '';
  }

  get classList() {
    return this._classList;
  }

  get className() {
    return this._classList.value;
  }

  set className(val) {
    this._classList = new MockDOMTokenList(String(val).split(' '));
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val);
  }

  get innerText() {
    return this.textContent;
  }

  set innerText(val) {
    this.textContent = val;
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    child.parentElement = this;
    this.childNodes.push(child);
    return child;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    if (!this.listeners.has(type)) return;
    const list = this.listeners.get(type).filter(h => h !== handler);
    this.listeners.set(type, list);
  }

  dispatchEvent(event) {
    const list = this.listeners.get(event.type) || [];
    for (const h of list) {
      h.call(this, event);
    }
    return true;
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  querySelector(sel) {
    // Basic search in children
    for (const child of this.childNodes) {
      if (matchesSimpleSelector(child, sel)) return child;
      const found = child.querySelector ? child.querySelector(sel) : null;
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(sel) {
    const results = [];
    for (const child of this.childNodes) {
      if (matchesSimpleSelector(child, sel)) results.push(child);
      if (child.querySelectorAll) results.push(...child.querySelectorAll(sel));
    }
    return results;
  }
}

function matchesSimpleSelector(el, sel) {
  if (!sel) return false;
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList && el.classList.contains(sel.slice(1));
  if (sel.toUpperCase() === el.tagName) return true;
  return false;
}

export function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, val) {
      store.set(key, String(val));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get length() {
      return store.size;
    }
  };
}

export async function setupEnvironment() {
  const htmlPath = path.join(ROOT_DIR, 'index.html');
  const cssPath = path.join(ROOT_DIR, 'style.css');
  const appPath = path.join(ROOT_DIR, 'app.js');

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  const localStorage = createMockLocalStorage();

  // Create Element Registry
  const body = new MockElement('body', '', '');
  const groupTitle = new MockElement('div', 'group-title', 'form-group form-group-title');
  const groupUrl = new MockElement('div', 'group-url', 'form-group');
  const groupDesc = new MockElement('div', 'group-description', 'form-group');

  const inputTitle = new MockElement('input', 'input-title');
  const titleCounter = new MockElement('span', 'title-counter', 'counter-badge safe');
  const titleProgress = new MockElement('div', 'title-progress', 'progress-bar safe');

  const inputUrl = new MockElement('input', 'input-url');
  const inputDesc = new MockElement('textarea', 'input-description');
  const descCounter = new MockElement('span', 'desc-counter', 'counter-badge safe');
  const descProgress = new MockElement('div', 'desc-progress', 'progress-bar safe');

  const themeToggle = new MockElement('button', 'theme-toggle', 'theme-toggle-btn');
  const btnDesktop = new MockElement('button', 'btn-desktop', 'toggle-btn active');
  btnDesktop.setAttribute('data-mode', 'desktop');
  const btnMobile = new MockElement('button', 'btn-mobile', 'toggle-btn');
  btnMobile.setAttribute('data-mode', 'mobile');

  const serpViewport = new MockElement('div', 'serp-viewport', 'serp-viewport');
  const serpPreview = new MockElement('article', 'serp-preview', 'serp-card mode-desktop');
  const previewFavicon = new MockElement('div', 'preview-favicon', 'serp-favicon');
  const previewSiteName = new MockElement('span', 'preview-site-name', 'serp-site-name');
  const previewBreadcrumb = new MockElement('span', 'preview-breadcrumb', 'serp-breadcrumb');
  const previewTitle = new MockElement('a', 'preview-title');
  const previewDesc = new MockElement('p', 'preview-description', 'serp-snippet');

  // Build tree
  groupTitle.appendChild(titleCounter);
  groupTitle.appendChild(inputTitle);
  groupTitle.appendChild(titleProgress);

  groupUrl.appendChild(inputUrl);

  groupDesc.appendChild(descCounter);
  groupDesc.appendChild(inputDesc);
  groupDesc.appendChild(descProgress);

  serpPreview.appendChild(previewFavicon);
  serpPreview.appendChild(previewSiteName);
  serpPreview.appendChild(previewBreadcrumb);
  serpPreview.appendChild(previewTitle);
  serpPreview.appendChild(previewDesc);
  serpViewport.appendChild(serpPreview);

  body.appendChild(themeToggle);
  body.appendChild(groupTitle);
  body.appendChild(groupUrl);
  body.appendChild(groupDesc);
  body.appendChild(btnDesktop);
  body.appendChild(btnMobile);
  body.appendChild(serpViewport);

  const registry = new Map([
    ['input-title', inputTitle],
    ['title-counter', titleCounter],
    ['title-progress', titleProgress],
    ['input-url', inputUrl],
    ['input-description', inputDesc],
    ['desc-counter', descCounter],
    ['desc-progress', descProgress],
    ['theme-toggle', themeToggle],
    ['btn-desktop', btnDesktop],
    ['btn-mobile', btnMobile],
    ['serp-viewport', serpViewport],
    ['serp-preview', serpPreview],
    ['preview-favicon', previewFavicon],
    ['preview-site-name', previewSiteName],
    ['preview-breadcrumb', previewBreadcrumb],
    ['preview-title', previewTitle],
    ['preview-description', previewDesc],
    ['group-title', groupTitle],
    ['group-url', groupUrl],
    ['group-description', groupDesc]
  ]);

  const mockDocument = {
    body,
    getElementById(id) {
      return registry.get(id) || null;
    },
    querySelector(sel) {
      if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
      if (sel === 'body') return body;
      return body.querySelector(sel);
    },
    querySelectorAll(sel) {
      return body.querySelectorAll(sel);
    },
    createElement(tag) {
      if (tag.toLowerCase() === 'canvas') {
        let currentFont = '20px Arial, sans-serif';
        return {
          getContext: () => ({
            get font() {
              return currentFont;
            },
            set font(val) {
              currentFont = val;
            },
            measureText: (text) => {
              if (!text) return { width: 0 };
              let fontSize = 20;
              const match = typeof currentFont === 'string' ? currentFont.match(/(\d+)px/) : null;
              if (match) fontSize = parseInt(match[1], 10);
              const scale = fontSize / 20;

              let width = 0;
              for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const code = ch.charCodeAt(0);
                if (code >= 0xd800 && code <= 0xdbff) {
                  width += 22 * scale;
                  i++;
                  continue;
                }
                if (Object.prototype.hasOwnProperty.call(ARIAL_20PX_WIDTHS, ch)) {
                  width += ARIAL_20PX_WIDTHS[ch] * scale;
                } else if (code > 255) {
                  width += 20 * scale;
                } else {
                  width += 11.12 * scale;
                }
              }
              return { width: Math.round(width * 10) / 10 };
            }
          })
        };
      }
      return new MockElement(tag);
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    readyState: 'complete'
  };

  // Real CSS rule parser to evaluate actual style.css contents with nested at-rule support
  const parsedRules = [];
  const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');

  function parseCSSBlock(cssText, atRule = null) {
    let pos = 0;
    while (pos < cssText.length) {
      const openBrace = cssText.indexOf('{', pos);
      if (openBrace === -1) break;
      const selectorText = cssText.slice(pos, openBrace).trim();

      let depth = 1;
      let endBrace = openBrace + 1;
      while (endBrace < cssText.length && depth > 0) {
        if (cssText[endBrace] === '{') depth++;
        else if (cssText[endBrace] === '}') depth--;
        endBrace++;
      }
      const blockBody = cssText.slice(openBrace + 1, endBrace - 1).trim();
      pos = endBrace;

      if (!selectorText) continue;

      if (selectorText.startsWith('@')) {
        // Recursively parse nested rules inside @container / @media
        parseCSSBlock(blockBody, selectorText);
      } else {
        const selectors = selectorText.split(',').map(s => s.trim()).filter(Boolean);
        const declarations = {};
        blockBody.split(';').forEach(d => {
          const parts = d.split(':');
          if (parts.length >= 2) {
            const prop = parts[0].trim().toLowerCase();
            let val = parts.slice(1).join(':').trim().replace(/\s*!important/i, '');
            declarations[prop] = val;
          }
        });
        parsedRules.push({ selectors, declarations, atRule });
      }
    }
  }

  parseCSSBlock(cleanCss);

  function matchesCompoundSelector(element, selector) {
    if (!selector) return false;
    // Attribute selector [attr="val"] or [attr]
    const attrMatch = selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const attrVal = attrMatch[2];
      if (attrVal !== undefined) {
        return element.getAttribute && element.getAttribute(attrName) === attrVal;
      }
      return element.hasAttribute && element.hasAttribute(attrName);
    }
    const parts = selector.split(/(?=[.#])/);
    for (const part of parts) {
      if (part.startsWith('#')) {
        if (element.id !== part.slice(1)) return false;
      } else if (part.startsWith('.')) {
        if (!element.classList || !element.classList.contains(part.slice(1))) return false;
      } else if (part) {
        if (element.tagName !== part.toUpperCase()) return false;
      }
    }
    return true;
  }

  function elementHasDescendant(element, selector) {
    for (const child of element.childNodes) {
      if (matchesCompoundSelector(child, selector)) return true;
      if (elementHasDescendant(child, selector)) return true;
    }
    return false;
  }

  function matchesSelector(element, selector, isDark) {
    let sel = selector.trim();
    if (sel.startsWith('body.dark ')) {
      if (!isDark) return false;
      sel = sel.replace(/^body\.dark\s+/, '').trim();
    } else if (sel.startsWith('body.dark')) {
      if (!isDark) return false;
      sel = sel.replace(/^body\.dark/, '').trim();
    }

    // Check for :has(...)
    const hasMatch = sel.match(/^([^:]+):has\((.+)\)$/);
    if (hasMatch) {
      const baseSelector = hasMatch[1].trim();
      const innerSelector = hasMatch[2].trim();
      if (!matchesCompoundSelector(element, baseSelector)) return false;
      return elementHasDescendant(element, innerSelector);
    }

    return matchesCompoundSelector(element, sel);
  }

  const mediaListeners = [];
  const mockWindow = {
    document: mockDocument,
    localStorage,
    matchMedia: (query) => ({
      matches: false,
      media: query,
      addEventListener: (evt, handler) => {
        if (evt === 'change') mediaListeners.push(handler);
      },
      removeEventListener: (evt, handler) => {
        const idx = mediaListeners.indexOf(handler);
        if (idx !== -1) mediaListeners.splice(idx, 1);
      },
      dispatchChange: (matches) => {
        mediaListeners.forEach(fn => fn({ matches, media: query }));
      }
    }),
    getComputedStyle: (el) => {
      const isDark = body.classList.contains('dark');
      const computed = {
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        color: '#202124'
      };

      // Evaluate actual parsed CSS rules from style.css (base styles)
      for (const rule of parsedRules) {
        if (rule.atRule) continue;
        for (const selector of rule.selectors) {
          if (matchesSelector(el, selector, isDark)) {
            if (rule.declarations['border-color']) {
              let bc = rule.declarations['border-color'];
              if (bc.includes('var(--google-red')) bc = '#d93025';
              computed.borderColor = bc;
            }
            if (rule.declarations['background-color']) {
              let bg = rule.declarations['background-color'];
              if (bg.includes('var(--google-red-bg)')) bg = 'rgba(217, 48, 37, 0.06)';
              computed.backgroundColor = bg;
            }
            if (rule.declarations['box-shadow']) {
              computed.boxShadow = rule.declarations['box-shadow'];
            }
            if (rule.declarations['color']) {
              computed.color = rule.declarations['color'];
            }
          }
        }
      }

      return computed;
    }
  };

  const sandbox = {
    document: mockDocument,
    window: mockWindow,
    globalThis: mockWindow,
    localStorage,
    module: { exports: {} },
    URL: globalThis.URL
  };
  // Execute app.js
  vm.runInNewContext(appContent, sandbox);

  Object.assign(mockWindow, sandbox.module.exports || {});
  mockWindow.SEOMetaApp = sandbox.module.exports;

  return {
    window: mockWindow,
    app: sandbox.module.exports,
    document: mockDocument,
    localStorage,
    html: htmlContent,
    css: cssContent,
    elements: {
      body,
      themeToggle,
      groupTitle,
      groupUrl,
      groupDesc,
      inputTitle,
      titleCounter,
      titleProgress,
      inputUrl,
      inputDesc,
      descCounter,
      descProgress,
      btnDesktop,
      btnMobile,
      serpViewport,
      serpPreview,
      previewTitle,
      previewDesc,
      previewSiteName,
      previewBreadcrumb
    }
  };
}

export function simulateInput(element, value) {
  element.value = value;
  element.dispatchEvent({ type: 'input' });
}
