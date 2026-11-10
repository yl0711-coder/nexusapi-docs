import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const locales = ['', 'zh-TW', 'en', 'fr', 'ja', 'ru', 'vi'];
const destinations = [
  ['billing/models-pricing', 'change-model'],
  ['guide/api-key', 'change-key'],
  ['faq/self-check', 'setup-not-applied'],
  ['tools/index', 'choose-model'],
  ['tools/cc-switch', 'switch-back'],
];
function read(locale, page) {
  return fs.readFileSync(path.join(root, locale, `${page}.mdx`), 'utf8');
}
function route(locale, page) {
  return `/${locale ? `${locale}/` : ''}${page}`;
}

test('customer journeys have unique, stable anchor targets in every language', () => {
  for (const locale of locales) {
    for (const [page, id] of destinations) {
      const source = read(locale, page);
      assert.equal(source.split(`id="${id}"`).length - 1, 1, `${locale}/${page}: ${id}`);
    }
  }
});

test('home and client guides link directly to changing and troubleshooting', () => {
  for (const locale of locales) {
    for (const page of ['index', 'tools/claude-code', 'tools/codex-cli', 'tools/cursor-vscode']) {
      const source = read(locale, page);
      for (const [target, id] of destinations.slice(0, 3)) {
        assert.ok(source.includes(`](${route(locale, target)}#${id})`), `${locale}/${page}: ${target}`);
      }
    }
    assert.ok(read(locale, 'tools/cc-switch').includes(`](${route(locale, 'billing/models-pricing')}#change-model)`));
  }
});

test('model compatibility is reachable from setup without reading developer references first', () => {
  for (const locale of locales) {
    for (const page of ['guide/quick-start', 'tools/index']) {
      assert.ok(read(locale, page).includes(`](${route(locale, 'developer/model-protocols')})`), `${locale}/${page}`);
    }
    assert.ok(read(locale, 'billing/models-pricing').includes(`](${route(locale, 'tools')}#choose-model)`));
    const quickStart = read(locale, 'guide/quick-start');
    assert.equal((quickStart.match(/^## /gm) || []).length, 4, locale);
    assert.ok(quickStart.includes('https://nexusapi.link/usage-logs/common'), locale);
  }
});

test('changing models covers all supported setup methods without inventing credentials', () => {
  for (const locale of locales) {
    const source = read(locale, 'billing/models-pricing');
    for (const text of ['CC Switch', 'Claude Code', 'Codex CLI', '`model`', '`ANTHROPIC_MODEL`']) {
      assert.ok(source.includes(text), `${locale}: ${text}`);
    }
    assert.ok(source.includes(`](${route(locale, 'guide/api-key')}#change-key)`), locale);
    const help = read(locale, 'faq/self-check');
    assert.doesNotMatch(help, /supported_endpoint_types|Authorization: Bearer/);
    // Support contact details have not been supplied. Do not publish fake
    // chat invitations, personal contact IDs or a placeholder mail address.
    for (const page of ['index', 'faq/self-check']) {
      assert.doesNotMatch(read(locale, page), /mailto:support@example\.com|https?:\/\/example\.com\/support|YOUR_WECHAT/);
    }
  }
});
