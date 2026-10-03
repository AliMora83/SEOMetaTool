import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupEnvironment, simulateInput } from './dom_harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STYLE_CSS = path.join(ROOT_DIR, 'style.css');

test('Theme State & Modern CSS Upgrades Suite', async (t) => {
  const env = await setupEnvironment();
  const { elements, localStorage, css } = env;

  await t.test('R1.1: Application permanently renders in dark mode immediately upon load and theme toggle is absent from DOM', () => {
    // Initial state: dark mode active by default
    assert.strictEqual(elements.body.classList.contains('dark'), true, 'Body must have .dark class by default on load');
    assert.strictEqual(env.document.getElementById('theme-toggle'), null, 'Theme toggle button must not be present in the DOM');
    assert.strictEqual(env.html.includes('id="theme-toggle"'), false, 'Theme toggle must not be present in index.html');
  });

  await t.test('R1.2: Google SERP preview card strictly retains light styling in dark mode', () => {
    assert.strictEqual(elements.body.classList.contains('dark'), true);

    // Compute styles on SERP preview container
    const computed = env.window.getComputedStyle ? env.window.getComputedStyle(elements.serpPreview) : { backgroundColor: '#ffffff' };
    assert.strictEqual(computed.backgroundColor, '#ffffff', 'SERP preview card background must strictly be white (#ffffff)');

    // CSS file check: verify rules enforcing light styling on serp card even in dark mode
    assert.ok(css.includes('body.dark .serp-card') || css.includes('body.dark #serp-preview'), 'CSS must explicitly style serp preview in dark mode');
    assert.ok(css.includes('#ffffff !important'), 'SERP card must enforce white background with !important');
    assert.ok(css.includes('#1a0dab !important'), 'Title link must strictly remain Google blue (#1a0dab)');
  });

  await t.test('R2.1: Modern CSS Compliance — style.css contains @container rules replacing preview @media queries', () => {
    // Verify @container queries are present
    assert.ok(css.includes('@container'), 'style.css must contain @container query rules');
    assert.ok(css.includes('container-type: inline-size') || css.includes('container-type: normal'), 'style.css must declare a container-type');
    assert.ok(css.includes('serp-viewport') || css.includes('serp-container'), 'style.css must name or target container');

    // Verify preview card responsive styling does NOT use old @media queries
    // Specifically, search for old media queries targeting serp-card / preview
    const oldMediaRuleRegex = /@media[^{]+\{[^}]*(?:\.serp-card|#serp-preview)[^}]*\}/gi;
    const mediaCardMatches = css.match(oldMediaRuleRegex);
    assert.strictEqual(mediaCardMatches, null, 'Old @media queries for preview card must be replaced with @container queries');
  });

  await t.test('R2.2: Modern CSS Compliance — Enhanced Glassmorphism and Animated Mesh Gradient', () => {
    assert.ok(css.includes('backdrop-filter:'), 'style.css must use backdrop-filter for glassmorphism');
    assert.ok(css.includes('box-shadow:'), 'style.css must define drop shadows');
    assert.ok(css.includes('blur(24px)') || css.includes('blur(20px)'), 'style.css must have enhanced background blur');
    assert.ok(css.includes('@keyframes meshGradient') || css.includes('@keyframes mesh'), 'style.css must define animated mesh gradient keyframes');
    assert.ok(css.includes('radial-gradient'), 'style.css must use radial-gradient for mesh background');
  });

  await t.test('R2.3: Modern CSS Compliance — style.css uses :has() for error states', () => {
    assert.ok(css.includes(':has('), 'style.css must use modern :has() pseudo-class');
    assert.ok(
      css.includes('.form-group:has') || css.includes(':has(input.error)') || css.includes(':has(#input-title.error)'),
      'style.css must use :has() on parent container targeting error states'
    );
  });

  await t.test('R3.1: Visual State — Exceeding 600px title limit triggers parent :has() styling', () => {
    // Under 600px: normal title
    simulateInput(elements.inputTitle, 'Safe Title');
    assert.strictEqual(elements.inputTitle.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('error'), false);

    let parentStyle = env.window.getComputedStyle(elements.groupTitle);
    assert.strictEqual(parentStyle.borderColor, 'transparent', 'Parent border must be default when title <= 600px');

    // Exceed 600px: 35 W's = ~680px
    simulateInput(elements.inputTitle, 'W'.repeat(35));
    assert.strictEqual(elements.inputTitle.classList.contains('error'), true, 'Input must receive .error');
    assert.strictEqual(elements.titleCounter.classList.contains('error'), true, 'Counter must receive .error');

    parentStyle = env.window.getComputedStyle(elements.groupTitle);
    assert.ok(parentStyle.borderColor.includes('d93025') || parentStyle.borderColor.includes('ef4444'), 'Parent border must turn red via :has()');
    assert.ok(parentStyle.backgroundColor.includes('rgba'), 'Parent background must apply tint via :has()');
  });

  await t.test('R3.2: Visual State — Reducing title back under 600px removes parent :has() highlighting', () => {
    simulateInput(elements.inputTitle, 'Concise safe title');
    assert.strictEqual(elements.inputTitle.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('error'), false);

    const parentStyle = env.window.getComputedStyle(elements.groupTitle);
    assert.strictEqual(parentStyle.borderColor, 'transparent');
  });

  await t.test('R1.3: Permanent dark theme is enforced regardless of system preference or storage', async () => {
    assert.strictEqual(env.app.ThemeManager.getCurrentTheme(), 'dark');
    // Test re-init with light storage
    env.localStorage.setItem('seo_preview_theme', 'light');
    env.app.ThemeManager._initialized = false;
    env.app.ThemeManager.init();
    assert.strictEqual(elements.body.classList.contains('dark'), true, 'Body must remain in dark mode even if storage had light');
  });

  await t.test('R2.4: Modern CSS Compliance — style.css container query scales title typography', () => {
    // Check that @container serp-viewport (max-width: 480px) explicitly scales preview title typography
    assert.ok(css.includes('font-size: 18px !important'), 'Container query must scale title font to 18px with !important');
    assert.ok(css.includes('line-height: 24px !important'), 'Container query must scale title line-height to 24px with !important');
  });

  await t.test('R3.3: Visual State — Exceeding 960px description limit triggers parent :has() styling', () => {
    // Normal description
    simulateInput(elements.inputDesc, 'Safe description');
    assert.strictEqual(elements.inputDesc.classList.contains('error'), false);
    assert.strictEqual(elements.descCounter.classList.contains('error'), false);

    let descParentStyle = env.window.getComputedStyle(elements.groupDesc);
    assert.strictEqual(descParentStyle.borderColor, 'transparent');

    // Overflow description (> 960px: 100 Ws = 100 * 14.44 * 0.7 = ~1010px)
    simulateInput(elements.inputDesc, 'W'.repeat(120));
    assert.strictEqual(elements.inputDesc.classList.contains('error'), true);
    assert.strictEqual(elements.descCounter.classList.contains('error'), true);

    descParentStyle = env.window.getComputedStyle(elements.groupDesc);
    assert.ok(descParentStyle.borderColor.includes('d93025') || descParentStyle.borderColor.includes('ef4444'));
    assert.ok(descParentStyle.backgroundColor.includes('rgba'));

    // Reducing back
    simulateInput(elements.inputDesc, 'Short safe description');
    assert.strictEqual(elements.inputDesc.classList.contains('error'), false);
    descParentStyle = env.window.getComputedStyle(elements.groupDesc);
    assert.strictEqual(descParentStyle.borderColor, 'transparent');
  });

  await t.test('R3.4: Visual State — Clearing title input after error removes parent :has() highlighting', () => {
    // Exceed limit
    simulateInput(elements.inputTitle, 'W'.repeat(35));
    assert.strictEqual(elements.inputTitle.classList.contains('error'), true);
    let parentStyle = env.window.getComputedStyle(elements.groupTitle);
    assert.ok(parentStyle.borderColor.includes('d93025') || parentStyle.borderColor.includes('ef4444'));

    // Clear input to empty string
    simulateInput(elements.inputTitle, '');
    assert.strictEqual(elements.inputTitle.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('truncated'), false);
    assert.strictEqual(elements.titleProgress.classList.contains('error'), false);
    parentStyle = env.window.getComputedStyle(elements.groupTitle);
    assert.strictEqual(parentStyle.borderColor, 'transparent', 'Parent border must reset to transparent when cleared');
  });

  await t.test('R3.5: Visual State — Clearing description input after error removes parent :has() highlighting', () => {
    // Exceed limit
    simulateInput(elements.inputDesc, 'W'.repeat(120));
    assert.strictEqual(elements.inputDesc.classList.contains('error'), true);
    let descParentStyle = env.window.getComputedStyle(elements.groupDesc);
    assert.ok(descParentStyle.borderColor.includes('d93025') || descParentStyle.borderColor.includes('ef4444'));

    // Clear description to empty string
    simulateInput(elements.inputDesc, '');
    assert.strictEqual(elements.inputDesc.classList.contains('error'), false);
    assert.strictEqual(elements.descCounter.classList.contains('error'), false);
    assert.strictEqual(elements.descCounter.classList.contains('truncated'), false);
    assert.strictEqual(elements.descProgress.classList.contains('error'), false);
    descParentStyle = env.window.getComputedStyle(elements.groupDesc);
    assert.strictEqual(descParentStyle.borderColor, 'transparent', 'Desc parent border must reset to transparent when cleared');
  });

  await t.test('R2.5: Modern CSS Compliance — Container queries target both class and ID for cascade precedence', () => {
    assert.ok(
      css.includes('#serp-preview.mode-desktop') && css.includes('@container serp-viewport (max-width: 680px)'),
      'Container query must target #serp-preview.mode-desktop so it overrides base desktop card styles'
    );
  });

  await t.test('R1.4: ThemeManager enforces permanent dark mode when initialized with corrupted theme value', async () => {
    const corruptEnv = await setupEnvironment();
    corruptEnv.localStorage.setItem('seo_preview_theme', 'invalid_corrupt_theme');
    // Re-init with corrupted value
    corruptEnv.app.ThemeManager._initialized = false;
    corruptEnv.app.ThemeManager.init();
    assert.strictEqual(corruptEnv.elements.body.classList.contains('invalid_corrupt_theme'), false);
    assert.strictEqual(corruptEnv.elements.body.classList.contains('dark'), true);
    assert.strictEqual(corruptEnv.app.ThemeManager.getCurrentTheme(), 'dark');
  });

  await t.test('R1.5: CSS contains color-scheme declarations for root, dark mode, and serp card', () => {
    assert.ok(css.includes('color-scheme: light;'), 'style.css must declare color-scheme: light in :root');
    assert.ok(css.includes('color-scheme: dark;'), 'style.css must declare color-scheme: dark in body.dark');
    assert.ok(css.includes('color-scheme: light !important;'), 'SERP card must explicitly enforce light color-scheme');
  });

  await t.test('R3.6: aria-invalid attribute synchronizes on inputs and triggers parent :has([aria-invalid="true"])', () => {
    simulateInput(elements.inputTitle, 'W'.repeat(35));
    assert.strictEqual(elements.inputTitle.getAttribute('aria-invalid'), 'true', 'inputTitle must have aria-invalid="true" when exceeded');

    let parentStyle = env.window.getComputedStyle(elements.groupTitle);
    assert.ok(parentStyle.borderColor.includes('d93025') || parentStyle.borderColor.includes('ef4444'), 'Parent must highlight via :has()');

    simulateInput(elements.inputTitle, 'Safe Title');
    assert.strictEqual(elements.inputTitle.hasAttribute('aria-invalid'), false, 'inputTitle must remove aria-invalid when safe');

    // Description aria-invalid check
    simulateInput(elements.inputDesc, 'W'.repeat(120));
    assert.strictEqual(elements.inputDesc.getAttribute('aria-invalid'), 'true', 'inputDesc must have aria-invalid="true" when exceeded');

    simulateInput(elements.inputDesc, 'Safe description');
    assert.strictEqual(elements.inputDesc.hasAttribute('aria-invalid'), false, 'inputDesc must remove aria-invalid when safe');
  });

  await t.test('R2.6: Container queries contain narrow viewport rule (max-width: 380px) for mobile card responsiveness', () => {
    assert.ok(css.includes('@container serp-viewport (max-width: 380px)'), 'style.css must include 380px container query');
    assert.ok(css.includes('min(375px, 100%)'), 'Mobile card must constrain width responsively with min(375px, 100%)');
  });

  await t.test('R3.7: Minimal DOM mock without removeAttribute handles title and description rendering safely', () => {
    const minimalTokenList = {
      _set: new Set(),
      add(...c) { c.forEach(x => x && this._set.add(x)); },
      remove(...c) { c.forEach(x => this._set.delete(x)); },
      contains(c) { return this._set.has(c); }
    };
    const minimalTitle = {
      id: 'input-title',
      value: 'Some safe title',
      classList: minimalTokenList
      // removeAttribute and setAttribute intentionally omitted
    };
    const mockElements = {
      inputTitle: minimalTitle,
      previewTitle: { textContent: '' },
      titleCounter: { textContent: '', classList: minimalTokenList },
      titleProgress: { style: {}, classList: minimalTokenList }
    };

    assert.doesNotThrow(() => {
      env.app.UIRenderer.renderTitle(mockElements);
      minimalTitle.value = '';
      env.app.UIRenderer.renderTitle(mockElements);
    }, 'renderTitle must not throw even if removeAttribute/setAttribute are absent');
  });

  await t.test('R4.1: Copy to Clipboard buttons exist in DOM for Title and Description', () => {
    assert.ok(elements.btnCopyTitle, 'Title copy button must be present in elements');
    assert.ok(elements.btnCopyDesc, 'Description copy button must be present in elements');
    assert.ok(env.html.includes('id="btn-copy-title"'), 'index.html must include #btn-copy-title');
    assert.ok(env.html.includes('id="btn-copy-desc"'), 'index.html must include #btn-copy-desc');
  });

  await t.test('R4.2: Clicking Title Copy button successfully copies title text to clipboard', async () => {
    simulateInput(elements.inputTitle, 'Awesome SEO Meta Title');
    elements.btnCopyTitle.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, 'Awesome SEO Meta Title');
    assert.strictEqual(elements.btnCopyTitle.classList.contains('copied'), true);
  });

  await t.test('R4.3: Clicking Description Copy button successfully copies description text to clipboard', async () => {
    simulateInput(elements.inputDesc, 'Comprehensive description optimized for search snippets.');
    elements.btnCopyDesc.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, 'Comprehensive description optimized for search snippets.');
    assert.strictEqual(elements.btnCopyDesc.classList.contains('copied'), true);
  });

  await t.test('R4.4: Copying empty input copies empty string safely without error', async () => {
    simulateInput(elements.inputTitle, '');
    elements.btnCopyTitle.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, '');
  });

  await t.test('R4.5: Copying input with emojis and Unicode symbols copies exact string', async () => {
    const emojiText = '🚀 Top SEO Guide 2026 🔍 & <Best Tips>';
    simulateInput(elements.inputTitle, emojiText);
    elements.btnCopyTitle.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, emojiText);
  });

  await t.test('R4.6: ClipboardManager handles clipboard write rejection gracefully', async () => {
    const origWrite = env.window.navigator.clipboard.writeText;
    env.window.navigator.clipboard.writeText = async () => {
      throw new Error('Permission denied');
    };
    assert.doesNotThrow(async () => {
      const res = await env.app.ClipboardManager.copy('Sample text');
      // Should not throw unhandled exception
    });
    env.window.navigator.clipboard.writeText = origWrite;
  });

  await t.test('R4.7: Rapid consecutive clicks on copy button do not throw', async () => {
    simulateInput(elements.inputTitle, 'Rapid Click Title');
    for (let i = 0; i < 5; i++) {
      assert.doesNotThrow(() => elements.btnCopyTitle.click());
    }
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, 'Rapid Click Title');
  });

  await t.test('R1.6: Switching device modes retains dark theme and functional copy buttons', async () => {
    elements.btnMobile.click();
    assert.strictEqual(elements.body.classList.contains('dark'), true);
    simulateInput(elements.inputTitle, 'Mobile Mode Title');
    elements.btnCopyTitle.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, 'Mobile Mode Title');
    elements.btnDesktop.click();
    assert.strictEqual(elements.body.classList.contains('dark'), true);
  });

  await t.test('R4.8: ClipboardManager returns false if writeText rejects and execCommand is unavailable', async () => {
    const origWrite = env.window.navigator.clipboard.writeText;
    env.window.navigator.clipboard.writeText = async () => {
      throw new Error('Clipboard denied');
    };
    // Ensure document.execCommand is undefined
    const origExec = env.document.execCommand;
    delete env.document.execCommand;

    const res = await env.app.ClipboardManager.copy('Test content');
    assert.strictEqual(res, false, 'copy() must return false when all clipboard mechanisms fail');

    // Restore
    env.window.navigator.clipboard.writeText = origWrite;
    if (origExec !== undefined) env.document.execCommand = origExec;
  });

  await t.test('R4.9: Rapid consecutive clicks cancel prior feedback timer and extend feedback duration', async () => {
    simulateInput(elements.inputTitle, 'Consecutive Click Test');
    elements.btnCopyTitle.click();
    assert.strictEqual(elements.btnCopyTitle.classList.contains('copied'), true);

    // Fast-forward 1000ms, then click again
    await new Promise(resolve => setTimeout(resolve, 1000));
    assert.strictEqual(elements.btnCopyTitle.classList.contains('copied'), true);
    elements.btnCopyTitle.click(); // Reset timer

    // Fast-forward another 1200ms (total 2200ms from 1st click, 1200ms from 2nd click)
    // Under buggy timer collision, the 1st timer would have expired at 2000ms and removed .copied
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.strictEqual(elements.btnCopyTitle.classList.contains('copied'), true, 'Button must remain in copied state 1200ms after second click');

    // Fast-forward remaining 900ms (total 2100ms from 2nd click)
    await new Promise(resolve => setTimeout(resolve, 900));
    assert.strictEqual(elements.btnCopyTitle.classList.contains('copied'), false, 'Button should revert after full 2000ms from second click');
  });

  await t.test('R4.10: showFeedback displays copy-error feedback and error aria-label on failure', async () => {
    env.app.ClipboardManager.showFeedback(elements.btnCopyTitle, 'Copy', false);
    assert.strictEqual(elements.btnCopyTitle.classList.contains('copy-error'), true);
    assert.strictEqual(elements.btnCopyTitle.getAttribute('aria-label'), 'Copy failed');
    assert.strictEqual(elements.btnCopyTitle.title, 'Copy failed');

    // Reverts after timeout
    await new Promise(resolve => setTimeout(resolve, 2050));
    assert.strictEqual(elements.btnCopyTitle.classList.contains('copy-error'), false);
    assert.strictEqual(elements.btnCopyTitle.title, 'Copy Title');
  });

  await t.test('R4.11: Copy button title and aria-label update during success and restore on revert', async () => {
    simulateInput(elements.inputTitle, 'Title For Tooltip Test');
    elements.btnCopyTitle.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.strictEqual(elements.btnCopyTitle.title, 'Copied to clipboard');
    assert.strictEqual(elements.btnCopyTitle.getAttribute('aria-label'), 'Copied to clipboard');

    await new Promise(resolve => setTimeout(resolve, 2050));
    assert.strictEqual(elements.btnCopyTitle.title, 'Copy Title');
    assert.strictEqual(elements.btnCopyTitle.getAttribute('aria-label'), 'Copy title to clipboard');
  });

  await t.test('R2.7: Mesh gradient targets single .mesh-gradient-bg container without duplicate body::before animation layer', () => {
    assert.ok(css.includes('.mesh-gradient-bg {') || css.includes('.mesh-gradient-bg\n{'), 'style.css must style .mesh-gradient-bg directly');
    assert.strictEqual(css.includes('body::before {') && css.includes('meshGradientAnimation'), false, 'style.css must not duplicate animated mesh gradient on body::before');
  });

  await t.test('R4.12: showFeedback on element without initial title or aria-label restores clean state without stutter or sticky title', async () => {
    const freshBtn = env.document.createElement('button');
    freshBtn.textContent = 'Copy';
    // Initially has no title and no aria-label
    assert.strictEqual(freshBtn.title, '');
    assert.strictEqual(freshBtn.getAttribute('aria-label'), null);

    env.app.ClipboardManager.showFeedback(freshBtn, 'Copy', true);
    assert.strictEqual(freshBtn.title, 'Copied to clipboard');
    assert.strictEqual(freshBtn.getAttribute('aria-label'), 'Copied to clipboard');

    await new Promise(resolve => setTimeout(resolve, 2050));
    // Must revert to clean empty/removed state, NOT remain 'Copied to clipboard' and NOT stutter 'Copy copy to clipboard'
    assert.strictEqual(freshBtn.title, '');
    assert.strictEqual(freshBtn.hasAttribute('title'), false);
    assert.strictEqual(freshBtn.hasAttribute('aria-label'), false);
  });

  await t.test('R4.13: Description Copy button title and aria-label update during success and restore cleanly', async () => {
    simulateInput(elements.inputDesc, 'Description for tooltip roundtrip');
    elements.btnCopyDesc.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.strictEqual(elements.btnCopyDesc.title, 'Copied to clipboard');
    assert.strictEqual(elements.btnCopyDesc.getAttribute('aria-label'), 'Copied to clipboard');

    await new Promise(resolve => setTimeout(resolve, 2050));
    assert.strictEqual(elements.btnCopyDesc.title, 'Copy Description');
    assert.strictEqual(elements.btnCopyDesc.getAttribute('aria-label'), 'Copy description to clipboard');
  });

  await t.test('R4.14: ClipboardManager fallback removes temporary textarea even if execCommand throws (no DOM leak)', async () => {
    const origWrite = env.window.navigator.clipboard.writeText;
    delete env.window.navigator.clipboard.writeText;
    const origExec = env.document.execCommand;
    env.document.execCommand = () => {
      throw new Error('Forced execCommand failure for leak test');
    };

    const initialChildCount = env.document.body.childNodes.length;
    const result = await env.app.ClipboardManager.copy('Sample leak test string');
    assert.strictEqual(result, false, 'copy() must return false on throw');
    assert.strictEqual(env.document.body.childNodes.length, initialChildCount, 'document.body must not leak textarea into DOM on exception');

    // Restore
    env.window.navigator.clipboard.writeText = origWrite;
    if (origExec !== undefined) env.document.execCommand = origExec;
    else delete env.document.execCommand;
  });

  await t.test('R2.8: CSS body establishes an isolated stacking context for mesh gradient and panel backdrop filters', () => {
    assert.ok(css.includes('isolation: isolate;'), 'body must declare isolation: isolate to establish a stacking context');
  });

  await t.test('R2.9: CSS correctly specifies vendor-prefixed -webkit-backdrop-filter before standard backdrop-filter', () => {
    const webkitIdx = css.indexOf('-webkit-backdrop-filter: var(--panel-blur);');
    const stdIdx = css.indexOf('backdrop-filter: var(--panel-blur);');
    assert.ok(webkitIdx !== -1 && stdIdx !== -1, 'Both -webkit-backdrop-filter and backdrop-filter must be present in style.css');
    assert.ok(webkitIdx < stdIdx, 'Vendor-prefixed -webkit-backdrop-filter must precede standard backdrop-filter for standard cascade precedence');
  });

  await t.test('R4.15: Synchronizes title attribute (getAttribute("title")) during active feedback state on success and failure', async () => {
    const btn = env.document.createElement('button');
    btn.setAttribute('title', 'Initial Title');
    btn.setAttribute('aria-label', 'Initial Label');

    // Success feedback
    env.app.ClipboardManager.showFeedback(btn, 'Copy', true);
    assert.strictEqual(btn.getAttribute('title'), 'Copied to clipboard');
    assert.strictEqual(btn.title, 'Copied to clipboard');

    // Failure feedback
    env.app.ClipboardManager.showFeedback(btn, 'Copy', false);
    assert.strictEqual(btn.getAttribute('title'), 'Copy failed');
    assert.strictEqual(btn.title, 'Copy failed');
  });

  await t.test('R4.16: Fallback copy executes safely even if textarea element has no .style property', async () => {
    const origWrite = env.window.navigator.clipboard.writeText;
    delete env.window.navigator.clipboard.writeText;
    const origCreate = env.document.createElement;

    // Mock createElement that creates element without .style
    env.document.createElement = (tag) => {
      const el = origCreate.call(env.document, tag);
      if (tag === 'textarea') {
        delete el.style;
      }
      return el;
    };

    let copiedValue = null;
    const origExec = env.document.execCommand;
    env.document.execCommand = (cmd) => {
      if (cmd === 'copy') return true;
      return false;
    };

    const res = await env.app.ClipboardManager.copy('Safe no-style fallback copy');
    assert.strictEqual(res, true, 'copy() must succeed in fallback even if textarea lacks .style');

    // Restore
    env.document.createElement = origCreate;
    env.window.navigator.clipboard.writeText = origWrite;
    if (origExec !== undefined) env.document.execCommand = origExec;
    else delete env.document.execCommand;
  });

  await t.test('R4.17: Fallback copy restores activeElement focus upon completion', async () => {
    const origWrite = env.window.navigator.clipboard.writeText;
    delete env.window.navigator.clipboard.writeText;

    let focusCalled = false;
    const mockInput = env.document.createElement('input');
    mockInput.focus = () => { focusCalled = true; };
    env.document.activeElement = mockInput;

    const origExec = env.document.execCommand;
    env.document.execCommand = () => true;

    await env.app.ClipboardManager.copy('Focus restoration test');
    assert.strictEqual(focusCalled, true, 'Fallback copy must restore focus to previous activeElement');

    // Restore
    env.window.navigator.clipboard.writeText = origWrite;
    if (origExec !== undefined) env.document.execCommand = origExec;
    else delete env.document.execCommand;
    delete env.document.activeElement;
  });

  await t.test('R4.18: Re-clicking after full feedback timer expiry cleanly picks up dynamically changed attributes', async () => {
    const btn = env.document.createElement('button');
    btn.setAttribute('title', 'Version 1 Title');
    btn.setAttribute('aria-label', 'Version 1 Label');
    btn.textContent = 'Copy';

    env.app.ClipboardManager.showFeedback(btn, 'Copy', true);
    assert.strictEqual(btn.title, 'Copied to clipboard');

    // Wait for timer to finish and clear cached defaults
    await new Promise(resolve => setTimeout(resolve, 2050));
    assert.strictEqual(btn.title, 'Version 1 Title');

    // Now dynamically change attributes on button
    btn.setAttribute('title', 'Version 2 Updated Title');
    btn.setAttribute('aria-label', 'Version 2 Updated Label');
    btn.title = 'Version 2 Updated Title';

    // Show feedback again
    env.app.ClipboardManager.showFeedback(btn, 'Copy', true);
    assert.strictEqual(btn.title, 'Copied to clipboard');

    // Wait for second revert
    await new Promise(resolve => setTimeout(resolve, 2050));
    assert.strictEqual(btn.title, 'Version 2 Updated Title', 'Must restore to the updated title, not the stale first-click title');
    assert.strictEqual(btn.getAttribute('aria-label'), 'Version 2 Updated Label', 'Must restore to the updated aria-label');
  });

  await t.test('R4.19: Copying multiline description snippets with embedded quotes and HTML preserves verbatim text', async () => {
    const complexSnippet = 'Line 1: "Top SEO Tricks"\nLine 2: <b>2026 Edition</b> & \'More\'\nLine 3: End snippet.';
    simulateInput(elements.inputDesc, complexSnippet);
    elements.btnCopyDesc.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, complexSnippet, 'Copied description must preserve exact multiline formatting and symbols');
  });

  await t.test('R4.20: ClipboardManager.init works correctly when invoked as a detached function reference', async () => {
    const detachedInit = env.app.ClipboardManager.init;
    const freshBtn = env.document.createElement('button');
    freshBtn.id = 'btn-copy-test-detached';
    const freshInput = env.document.createElement('input');
    freshInput.id = 'input-title-detached';
    freshInput.value = 'Detached Context Title';

    const customElements = {
      btnCopyTitle: freshBtn,
      inputTitle: freshInput
    };

    assert.doesNotThrow(() => {
      detachedInit(customElements);
    }, 'Detached init call must not throw');

    freshBtn.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const copied = await env.clipboard.readText();
    assert.strictEqual(copied, 'Detached Context Title');
  });
});


