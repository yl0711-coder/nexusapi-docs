import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
// Labels checked against the rc48 console's own locale files. These tests guard
// documented behavior and translation coverage, not live UI or model availability.
const locales = [
  { dir: '', address: 'API 地址', query: '允许查询用户额度', security: '安全与访问', performance: '性能', export: '导出', retention: '不代表历史日志保证保留' },
  { dir: 'zh-TW', address: 'API 地址', query: '允許查詢使用者額度', security: '安全與存取', performance: '效能', export: '匯出', retention: '不代表歷史日誌保證保留' },
  { dir: 'en', address: 'API Addresses', query: 'Allow querying user quota', security: 'Security & Access', performance: 'Performance', export: 'Export', retention: 'not a guarantee that logs are retained' },
  { dir: 'fr', address: 'Adresses API', query: 'Autoriser la consultation du quota utilisateur', security: 'Sécurité et accès', performance: 'Performances', export: 'Exporter', retention: 'ne garantit pas la conservation' },
  { dir: 'ja', address: 'APIアドレス', query: 'ユーザーのクォータ照会を許可', security: 'セキュリティとアクセス', performance: 'パフォーマンス', export: 'エクスポート', retention: '保存される保証ではありません' },
  { dir: 'ru', address: 'Адреса API', query: 'Разрешить просмотр квоты пользователя', security: 'Безопасность и доступ', performance: 'Производительность', export: 'Экспорт', retention: 'не гарантия хранения' },
  { dir: 'vi', address: 'Địa chỉ API', query: 'Cho phép tra cứu hạn mức người dùng', security: 'Bảo mật và truy cập', performance: 'Hiệu suất', export: 'Xuất', retention: 'không bảo đảm nhật ký được lưu' },
];

function read(locale, page) {
  return fs.readFileSync(path.join(root, locale.dir, `${page}.mdx`), 'utf8');
}

test('rc48 password and sessions steps use Security & Access in every locale', () => {
  for (const locale of locales) {
    const page = read(locale, 'guide/account-security');
    assert.match(page, /^1\. .*\]\(https:\/\/nexusapi\.link\/security\)/m, locale.dir);
    assert.ok(page.includes(locale.security), locale.dir);
    assert.ok(!page.includes('/images/nexusapi/console-profile-security'), `${locale.dir}: obsolete whole-profile screenshot`);
    assert.ok(page.includes('/images/nexusapi/account-sessions'), `${locale.dir}: keep the useful session close-up`);
    assert.ok(page.includes('https://nexusapi.link/profile'), `${locale.dir}: notification settings remain in Profile`);
  }
});

test('rc48 key instructions cover API addresses and account-quota visibility', () => {
  for (const locale of locales) {
    const page = read(locale, 'guide/api-key');
    for (const text of [locale.address, locale.query, locale.security, '`/v1`']) {
      assert.ok(page.includes(text), `${locale.dir}: missing ${text}`);
    }
  }
});

test('log exports distinguish the current time-span limit from retention', () => {
  for (const locale of locales) {
    const page = read(locale, 'billing/usage-and-billing');
    for (const text of [locale.export, 'CSV', 'Excel', '365', locale.retention]) {
      assert.ok(page.includes(text), `${locale.dir}: missing ${text}`);
    }
    assert.equal((page.match(/^## /gm) || []).length, 4, locale.dir);
  }
});

test('all pricing guides explain historical performance without changing discount examples', () => {
  for (const locale of locales) {
    const pricing = read(locale, 'billing/models-pricing');
    assert.ok(pricing.includes(locale.performance), locale.dir);
    assert.equal((pricing.match(/^## /gm) || []).length, 5, locale.dir);
    assert.ok(pricing.includes('id="change-model"'), locale.dir);
    const discounts = read(locale, 'billing/multipliers-and-discounts');
    for (const multiplier of ['0.7x', '1.2x', '1.3x', '5.6x']) {
      assert.ok(discounts.includes(multiplier), `${locale.dir}: ${multiplier}`);
    }
  }
});
