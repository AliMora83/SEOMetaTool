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

  await t.test('R1.1: Clicking theme toggle applies .dark class to body and updates localStorage', () => {
    // Initial state: light
    assert.strictEqual(elements.body.classList.contains('dark'), false, 'Initial body should not have dark class');
    
    // Toggle to dark
    elements.themeToggle.click();
    assert.strictEqual(elements.body.classList.contains('dark'), true, 'Body must have .dark class after first toggle');
    assert.strictEqual(localStorage.getItem('seo_preview_theme'), 'dark', 'localStorage must be set to "dark"');

    // Toggle back to light
    elements.themeToggle.click();
    assert.strictEqual(elements.body.classList.contains('dark'), false, 'Body must remove .dark class after second toggle');
    assert.strictEqual(localStorage.getItem('seo_preview_theme'), 'light', 'localStorage must be set to "light"');
  });

  await t.test('R1.2: Google SERP preview card strictly retains light styling in dark mode', () => {
    // Enable dark mode
    elements.themeToggle.click();
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

  await t.test('R2.2: Modern CSS Compliance — Glassmorphism and subtle drop shadows present on panels', () => {
    assert.ok(css.includes('backdrop-filter:'), 'style.css must use backdrop-filter for glassmorphism');
    assert.ok(css.includes('box-shadow:'), 'style.css must define drop shadows');
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

  await t.test('R1.3: Accessible aria-label and title update dynamically on theme toggle', () => {
    const wasDark = elements.body.classList.contains('dark');
    elements.themeToggle.click(); // toggle 1
    assert.strictEqual(elements.themeToggle.getAttribute('aria-label'), wasDark ? 'Switch to dark mode' : 'Switch to light mode');
    assert.strictEqual(elements.themeToggle.getAttribute('aria-pressed'), wasDark ? 'false' : 'true');

    elements.themeToggle.click(); // toggle back
    assert.strictEqual(elements.themeToggle.getAttribute('aria-label'), wasDark ? 'Switch to light mode' : 'Switch to dark mode');
    assert.strictEqual(elements.themeToggle.getAttribute('aria-pressed'), wasDark ? 'true' : 'false');
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

  await t.test('R1.4: ThemeManager gracefully ignores corrupted theme values in localStorage', async () => {
    const corruptEnv = await setupEnvironment();
    corruptEnv.localStorage.setItem('seo_preview_theme', 'invalid_corrupt_theme');
    // Re-init with corrupted value
    corruptEnv.app.ThemeManager._initialized = false;
    corruptEnv.app.ThemeManager.init();
    assert.strictEqual(corruptEnv.elements.body.classList.contains('invalid_corrupt_theme'), false);
    assert.ok(corruptEnv.elements.themeToggle.getAttribute('data-theme') === 'light' || corruptEnv.elements.themeToggle.getAttribute('data-theme') === 'dark');
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
});

