import test from 'node:test';
import assert from 'node:assert';
import { setupEnvironment } from './dom_harness.mjs';

test('Mobile Toggle Suite (20 Tests)', async (t) => {
  const env = await setupEnvironment();
  const { elements } = env;

  await t.test('Initial mode is desktop', () => {
    assert.strictEqual(elements.serpPreview.classList.contains('mode-desktop'), true);
    assert.strictEqual(elements.serpPreview.classList.contains('mode-mobile'), false);
    assert.strictEqual(elements.btnDesktop.classList.contains('active'), true);
    assert.strictEqual(elements.btnMobile.classList.contains('active'), false);
  });

  await t.test('Clicking Mobile button switches to mode-mobile', () => {
    elements.btnMobile.click();
    assert.strictEqual(elements.serpPreview.classList.contains('mode-mobile'), true);
    assert.strictEqual(elements.serpPreview.classList.contains('mode-desktop'), false);
    assert.strictEqual(elements.btnMobile.classList.contains('active'), true);
    assert.strictEqual(elements.btnDesktop.classList.contains('active'), false);
  });

  await t.test('Clicking Desktop button switches back to mode-desktop', () => {
    elements.btnDesktop.click();
    assert.strictEqual(elements.serpPreview.classList.contains('mode-desktop'), true);
    assert.strictEqual(elements.serpPreview.classList.contains('mode-mobile'), false);
    assert.strictEqual(elements.btnDesktop.classList.contains('active'), true);
    assert.strictEqual(elements.btnMobile.classList.contains('active'), false);
  });

  // Rapid switching tests (17 cycles = total 20 tests)
  for (let cycle = 1; cycle <= 17; cycle++) {
    await t.test(`Mode toggle cycling pass ${cycle}`, () => {
      elements.btnMobile.click();
      assert.strictEqual(elements.serpPreview.classList.contains('mode-mobile'), true);
      elements.btnDesktop.click();
      assert.strictEqual(elements.serpPreview.classList.contains('mode-desktop'), true);
    });
  }
});
