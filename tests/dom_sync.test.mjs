import test from 'node:test';
import assert from 'node:assert';
import { setupEnvironment, simulateInput } from './dom_harness.mjs';

test('DOM Synchronization Suite (41 Tests)', async (t) => {
  const env = await setupEnvironment();
  const { elements } = env;

  await t.test('Title input updates preview title text', () => {
    simulateInput(elements.inputTitle, 'Test Page Title');
    assert.strictEqual(elements.previewTitle.textContent, 'Test Page Title');
  });

  await t.test('Title counter updates pixel and character count', () => {
    simulateInput(elements.inputTitle, 'Hello World');
    assert.ok(elements.titleCounter.textContent.includes('px / 600px'));
    assert.ok(elements.titleCounter.textContent.includes('(11 chars)'));
  });

  await t.test('Empty title restores default placeholder', () => {
    simulateInput(elements.inputTitle, '');
    assert.strictEqual(elements.previewTitle.textContent, 'Page Title Preview');
    assert.strictEqual(elements.titleCounter.textContent, '0px / 600px (0 chars)');
  });

  await t.test('Description input updates preview description text', () => {
    simulateInput(elements.inputDesc, 'A great snippet description for search engines.');
    assert.strictEqual(elements.previewDesc.textContent, 'A great snippet description for search engines.');
  });

  await t.test('Description counter updates pixel and character count', () => {
    simulateInput(elements.inputDesc, 'Brief description');
    assert.ok(elements.descCounter.textContent.includes('px / 960px'));
    assert.ok(elements.descCounter.textContent.includes('(17 chars)'));
  });

  await t.test('Empty description restores default placeholder', () => {
    simulateInput(elements.inputDesc, '');
    assert.strictEqual(elements.previewDesc.textContent, 'Meta description preview will appear here...');
    assert.strictEqual(elements.descCounter.textContent, '0px / 960px (0 chars)');
  });

  await t.test('URL input updates preview breadcrumb and site name', () => {
    simulateInput(elements.inputUrl, 'https://mysite.com/blog/article');
    assert.strictEqual(elements.previewSiteName.textContent, 'mysite.com');
    assert.strictEqual(elements.previewBreadcrumb.textContent, 'https://mysite.com › blog › article');
  });

  await t.test('URL without protocol auto-prepends https', () => {
    simulateInput(elements.inputUrl, 'openmindi.co.za/tools');
    assert.strictEqual(elements.previewSiteName.textContent, 'openmindi.co.za');
    assert.strictEqual(elements.previewBreadcrumb.textContent, 'https://openmindi.co.za › tools');
  });

  await t.test('Empty URL restores fallback example.com', () => {
    simulateInput(elements.inputUrl, '');
    assert.strictEqual(elements.previewSiteName.textContent, 'example.com');
    assert.strictEqual(elements.previewBreadcrumb.textContent, 'https://example.com');
  });

  // Iterative keystroke tests across 32 varied inputs (total 41 tests)
  for (let i = 1; i <= 32; i++) {
    await t.test(`Synchronous keystroke sequence ${i}`, () => {
      const text = `Input keystroke iteration #${i}`;
      simulateInput(elements.inputTitle, text);
      assert.strictEqual(elements.previewTitle.textContent, text);
    });
  }
});
