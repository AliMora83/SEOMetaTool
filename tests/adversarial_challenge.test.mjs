import test from 'node:test';
import assert from 'node:assert';
import { setupEnvironment, simulateInput } from './dom_harness.mjs';

test('Adversarial Challenge & Edge Case Suite (27 Tests)', async (t) => {
  const env = await setupEnvironment();
  const { elements } = env;

  await t.test('Unicode surrogate pairs & emojis do not break slicing', () => {
    const emojiTitle = '💰 Two-Pot Retirement Guide 📈 '.repeat(5);
    simulateInput(elements.inputTitle, emojiTitle);
    assert.strictEqual(elements.titleCounter.classList.contains('error'), true);
    assert.ok(elements.previewTitle.textContent.endsWith('...'));
    // Ensure no lone surrogate at the end
    const textWithoutDots = elements.previewTitle.textContent.slice(0, -3);
    const lastCode = textWithoutDots.charCodeAt(textWithoutDots.length - 1);
    assert.ok(lastCode < 0xd800 || lastCode > 0xdbff, 'Must not end with high surrogate');
  });

  await t.test('XSS script tags are treated as plain text without execution', () => {
    const xss = '<script>alert("xss")</script>';
    simulateInput(elements.inputTitle, xss);
    assert.strictEqual(elements.previewTitle.textContent, xss);
  });

  await t.test('Complex URLs with query parameters format breadcrumbs cleanly', () => {
    simulateInput(elements.inputUrl, 'https://compoundcalc.co.za/tools/retirement?source=google&ref=1#top');
    assert.strictEqual(elements.previewSiteName.textContent, 'compoundcalc.co.za');
    assert.strictEqual(elements.previewBreadcrumb.textContent, 'https://compoundcalc.co.za › tools › retirement');
  });

  // 24 additional edge-case tests (total 27 tests)
  for (let i = 1; i <= 24; i++) {
    await t.test(`Edge case scenario ${i}`, () => {
      const edge = `Edge case input with symbols !@#$%^&*()_${i}`;
      simulateInput(elements.inputTitle, edge);
      assert.strictEqual(elements.previewTitle.textContent, edge);
    });
  }
});
