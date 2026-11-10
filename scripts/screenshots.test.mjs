// File/locale guards only. Pixel-level privacy and legibility require visual
// review; passing these tests does not certify screenshots as free of secrets.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const locales = ['', 'zh-TW', 'en', 'fr', 'ja', 'ru', 'vi'];
const images = [
  'console-token-management', 'console-create-token', 'console-wallet-topup',
  'model-marketplace', 'console-usage-logs', 'console-security-access',
  'console-notification-settings', 'key-copy', 'model-selection',
  'account-sessions', 'usage-export',
];

test('obsolete profile-security screenshots are excluded from published assets', () => {
  for (const locale of locales) {
    const file = `console-profile-security${locale ? `-${locale}` : ''}.png`;
    assert.equal(fs.existsSync(path.join(root, 'images/nexusapi', file)), false, file);
  }
});

test('rc48 teaching screenshots exist as valid, reasonably sized PNGs in all seven languages', () => {
  for (const locale of locales) {
    for (const name of images) {
      const file = `${name}${locale ? `-${locale}` : ''}.png`;
      const data = fs.readFileSync(path.join(root, 'images/nexusapi', file));
      assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a', file);
      assert.ok(data.length > 1000 && data.length < 2 * 1024 * 1024, file);
      const width = data.readUInt32BE(16);
      const height = data.readUInt32BE(20);
      assert.ok(width >= 320 && width <= 1920 && height >= 100 && height <= 1200, `${file}: ${width}x${height}`);
    }
  }
});

test('new security, reminder and export pictures are embedded in matching-language instructions', () => {
  for (const locale of locales) {
    const prefix = locale ? `${locale}/` : '';
    const suffix = locale ? `-${locale}` : '';
    const security = fs.readFileSync(path.join(root, prefix, 'guide/account-security.mdx'), 'utf8');
    for (const name of ['console-security-access', 'console-notification-settings', 'account-sessions']) {
      assert.ok(security.includes(`](/images/nexusapi/${name}${suffix}.png)`), `${locale}: ${name}`);
    }
    assert.ok(!security.includes('/images/nexusapi/console-profile-security'), locale);
    const usage = fs.readFileSync(path.join(root, prefix, 'billing/usage-and-billing.mdx'), 'utf8');
    assert.ok(usage.includes(`](/images/nexusapi/usage-export${suffix}.png)`), locale);
  }
});
