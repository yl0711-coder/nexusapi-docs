import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/model-protocols.json'), 'utf8'));
const locales = ['', 'zh-TW', 'en', 'fr', 'ja', 'ru', 'vi'];
const protocols = new Set(['openai', 'openai-response', 'anthropic', 'gemini', 'embeddings', 'image-generation']);
const labels = {openai: 'Chat Completions', 'openai-response': 'Responses', anthropic: 'Anthropic Messages', gemini: 'Gemini generateContent', embeddings: 'Embeddings', 'image-generation': 'Images'};

test('the public protocol catalog contains enabled models only', () => {
  assert.equal(catalog.model_count, catalog.models.length);
  assert.equal(new Set(catalog.models.map((row) => row.model_id)).size, catalog.models.length);
  assert.equal(catalog.enabled_count, catalog.models.filter((row) => row.availability === 'enabled').length);
  assert.equal(catalog.enabled_count, catalog.model_count);
  assert.ok(!Object.hasOwn(catalog, 'inactive_count'));
  for (const row of catalog.models) {
    assert.equal(row.availability, 'enabled', row.model_id);
    assert.ok(protocols.has(row.recommended_protocol), row.model_id);
    assert.ok(!Object.hasOwn(row, 'reference_protocol'), row.model_id);
    assert.equal(row.literal_id, !/[*?]/.test(row.model_id), row.model_id);
  }
});

test('every locale lists the same exact model names once in its model tables', () => {
  for (const locale of locales) {
    const prefix = locale ? `${locale}/` : '';
    const source = fs.readFileSync(path.join(root, prefix, 'developer/model-protocols.mdx'), 'utf8');
    const names = [...source.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
    assert.equal(names.length, catalog.model_count, locale || 'zh-Hans');
    assert.deepEqual([...names].sort(), catalog.models.map((row) => row.model_id).sort());
    assert.ok(!source.includes('<Accordion'), `${locale}: remove inactive-model lists rather than collapsing them`);
    assert.ok(!/\b(?:135|92)\b/.test(source), `${locale}: internal inventory counts must not appear`);
    for (const row of catalog.models) {
      const entry = `| \`${row.model_id}\` |`;
      assert.ok(source.includes(entry), `${locale}: ${row.model_id}`);
      const protocol = row.recommended_protocol;
      assert.ok(source.includes(`${entry} ${labels[protocol]}`), `${locale}: protocol differs for ${row.model_id}`);
    }
  }
});

test('model-name lookup is discoverable in every navigation and capability page', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
  for (const locale of locales) {
    const prefix = locale ? `${locale}/` : '';
    const route = `${prefix}developer/model-protocols`;
    assert.ok(config.navigation.languages.some((language) => language.groups.some((group) => group.pages.includes(route))), route);
    const matrix = fs.readFileSync(path.join(root, prefix, 'developer/capability-matrix.mdx'), 'utf8');
    assert.ok(matrix.includes(`](/${route})`), route);
  }
});

test('the public catalog does not contain private routing or credential fields', () => {
  const raw = JSON.stringify(catalog);
  for (const word of ['channel_id', 'api_key', 'upstream_path', 'private_models', 'internal_test', 'monitor_ro']) {
    assert.ok(!raw.includes(word), word);
  }
  assert.ok(!raw.includes('inactive'));
});
