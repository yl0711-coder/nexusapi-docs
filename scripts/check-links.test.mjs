import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTargets, withoutCode, routeFile } from './check-links.mjs';

test('extracts Markdown, image, MDX props and autolinks', () => {
  const refs = extractTargets('[Guide](/guide/api-key#copy)\n![Image](/images/a.png)\n<Card href="/tools" />\n<https://example.com>');
  assert.deepEqual(refs.map(r => r.target), ['/guide/api-key#copy', '/images/a.png', '/tools', 'https://example.com']);
  assert.equal(refs[1].line, 2);
});
test('does not interpret code examples as clickable links', () => {
  const text = '```js\nconst x = "<Card href=\"/bad\" />";\n```\n`[not a link](/bad)`\n[real](/guide/api-key)';
  assert.deepEqual(extractTargets(text).map(x => x.target), ['/guide/api-key']);
  assert.equal(withoutCode(text).split('\n').length, text.split('\n').length);
});
test('handles HTML entities and explicit link titles', () => {
  assert.deepEqual(extractTargets('[x](https://example.com?a=1&amp;b=2 "title")').map(x => x.target), ['https://example.com?a=1&b=2']);
});
test('also checks known installer URLs without executing them', () => {
  assert.equal(extractTargets('```sh\ncurl -fsSL https://claude.ai/install.sh | bash\n```')[0].kind, 'installer');
});
test('resolves real page aliases but not paths outside the docs root', () => {
  assert.ok(routeFile(process.cwd(), '/tools'));
  assert.ok(routeFile(process.cwd(), '/tools/'));
  assert.ok(routeFile(process.cwd(), '/tools/index'));
  assert.ok(routeFile(process.cwd(), '/'));
  assert.equal(routeFile(process.cwd(), '/../README'), undefined);
});
