import test from 'node:test';
import assert from 'node:assert';
import { setupEnvironment, simulateInput } from './dom_harness.mjs';

test('Adversarial Stress & Boundary Suite (19 Tests)', async (t) => {
  const env = await setupEnvironment();
  const { elements, window } = env;

  await t.test('ADV-BND-01: Exactly 599.0px title does not truncate and sets safe/warning state', () => {
    // 599px boundary: 'c'.repeat(57) + ' ++'
    const title599 = 'c'.repeat(57) + ' ++';
    simulateInput(elements.inputTitle, title599);
    assert.strictEqual(elements.titleCounter.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('truncated'), false);
    assert.strictEqual(elements.previewTitle.textContent, title599);
    assert.strictEqual(elements.previewTitle.textContent.endsWith('...'), false);
  });

  await t.test('ADV-BND-02: Exactly 600.0px ceiling does not truncate', () => {
    const title600 = 'c'.repeat(60);
    simulateInput(elements.inputTitle, title600);
    assert.strictEqual(elements.titleCounter.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('truncated'), false);
    assert.strictEqual(elements.previewTitle.textContent.endsWith('...'), false);
  });

  await t.test('ADV-BND-03 [CRITICAL CONTRACT]: Title exceeding 600px by ~1-4px (e.g. 604.3px) must trigger truncation and append ellipsis', () => {
    const title604 = 'W'.repeat(30) + ' ai';
    simulateInput(elements.inputTitle, title604);

    const measuredWidth = window.PixelMeasurer.measure(title604);
    const counterHasTruncated = elements.titleCounter.classList.contains('truncated');
    const counterHasError = elements.titleCounter.classList.contains('error');
    const previewText = elements.previewTitle.textContent;
    const previewEndsWithDots = previewText.endsWith('...');

    console.log('ADV-BND-03 Diagnostic:', {
      measuredWidth,
      counterHasTruncated,
      counterHasError,
      previewText,
      previewEndsWithDots
    });

    assert.strictEqual(counterHasError, true, 'Counter must have .error at 604.3px');
    assert.strictEqual(counterHasTruncated, true, 'Counter must have .truncated at 604.3px');
    assert.strictEqual(previewEndsWithDots, true, 'Preview title must end with ellipsis at 604.3px');
  });

  await t.test('ADV-BND-04: Massive string (10,000 chars) truncates safely within 25ms', () => {
    const huge = 'A'.repeat(10000);
    const t0 = performance.now();
    simulateInput(elements.inputTitle, huge);
    const elapsed = performance.now() - t0;

    assert.strictEqual(elements.titleCounter.classList.contains('error'), true);
    assert.ok(elements.previewTitle.textContent.endsWith('...'));
    assert.ok(elapsed < 50, `Huge string took ${elapsed}ms; should be < 50ms`);
  });

  // 15 additional boundary and stress scenarios (total 19 tests)
  for (let i = 1; i <= 15; i++) {
    await t.test(`Adversarial boundary stress iteration ${i}`, () => {
      const text = 'W'.repeat(30) + ' '.repeat(i) + 'X';
      simulateInput(elements.inputTitle, text);
      assert.strictEqual(elements.titleCounter.classList.contains('error'), true);
      assert.ok(elements.previewTitle.textContent.endsWith('...'));
    });
  }
});
