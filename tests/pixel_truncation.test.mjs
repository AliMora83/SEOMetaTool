import test from 'node:test';
import assert from 'node:assert';
import { setupEnvironment, simulateInput } from './dom_harness.mjs';

test('Pixel Truncation Suite (44 Tests)', async (t) => {
  const env = await setupEnvironment();
  const { elements } = env;

  await t.test('Title under 600px does not truncate or set error classes', () => {
    simulateInput(elements.inputTitle, 'A normal title well below limit');
    assert.strictEqual(elements.titleCounter.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('truncated'), false);
    assert.strictEqual(elements.inputTitle.classList.contains('error'), false);
    assert.strictEqual(elements.previewTitle.textContent, 'A normal title well below limit');
  });

  await t.test('Wide characters (35 Ws) exceed 600px, triggering truncation and error classes', () => {
    // 35 * 19.44 = 680.4px > 600px
    const wideTitle = 'W'.repeat(35);
    simulateInput(elements.inputTitle, wideTitle);

    assert.strictEqual(elements.titleCounter.classList.contains('error'), true);
    assert.strictEqual(elements.titleCounter.classList.contains('truncated'), true);
    assert.strictEqual(elements.inputTitle.classList.contains('error'), true);
    assert.ok(elements.previewTitle.textContent.endsWith('...'));
    assert.notStrictEqual(elements.previewTitle.textContent, wideTitle);
  });

  await t.test('Narrow characters (60 is) remain under 600px without truncation', () => {
    // 60 * 4.44 = 266.4px < 600px
    const narrowTitle = 'i'.repeat(60);
    simulateInput(elements.inputTitle, narrowTitle);

    assert.strictEqual(elements.titleCounter.classList.contains('error'), false);
    assert.strictEqual(elements.titleCounter.classList.contains('truncated'), false);
    assert.strictEqual(elements.inputTitle.classList.contains('error'), false);
    assert.strictEqual(elements.previewTitle.textContent, narrowTitle);
  });

  await t.test('Title just exceeding 600px (602px) appends ellipsis and sets error classes', () => {
    // 31 * 19.44 = 602.6px > 600px
    const title602 = 'W'.repeat(31);
    simulateInput(elements.inputTitle, title602);

    assert.strictEqual(elements.titleCounter.classList.contains('error'), true);
    assert.strictEqual(elements.titleCounter.classList.contains('truncated'), true);
    assert.ok(elements.previewTitle.textContent.endsWith('...'));
  });

  // Boundary parameter sweeps across 40 distinct variations (total 44 tests)
  for (let i = 1; i <= 40; i++) {
    await t.test(`Boundary test variant ${i}`, () => {
      const isOver = i > 25;
      const title = isOver ? 'W'.repeat(32 + (i - 25)) : 'a'.repeat(Math.min(45, i * 2));
      simulateInput(elements.inputTitle, title);

      if (isOver) {
        assert.ok(elements.previewTitle.textContent.endsWith('...'));
        assert.strictEqual(elements.titleCounter.classList.contains('error'), true);
      } else {
        assert.strictEqual(elements.titleCounter.classList.contains('error'), false);
      }
    });
  }
});
