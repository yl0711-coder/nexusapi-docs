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

test('IP whitelist guides preserve exact examples and safety boundaries in every locale', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
  const mixedExample = '```text\n203.0.113.0/24\n198.51.100.20/32\n```';
  for (const locale of locales) {
    const page = read(locale, 'guide/ip-whitelist');
    assert.equal(page.split('id="cidr"').length - 1, 1, locale.dir);
    assert.equal((page.match(/^## /gm) || []).length, 6, locale.dir);
    assert.equal((page.match(/^### /gm) || []).length, 3, locale.dir);
    for (const text of [mixedExample, '203.0.113.10/32', '203.0.113.0/28', '203.0.113.15', '203.0.113.255', '2001:db8::10/128', '0.0.0.0/0', '::/0', '203.0.113.*', '203.0.113.10-203.0.113.20', 'curl.exe -4 https://api.ipify.org', 'curl -4 https://api.ipify.org']) {
      assert.ok(page.includes(text), `${locale.dir}: missing ${text}`);
    }
    const route = `${locale.dir ? `${locale.dir}/` : ''}guide/ip-whitelist`;
    for (const sourcePage of ['guide/api-key', 'faq/common-errors']) {
      assert.ok(read(locale, sourcePage).includes(`](/${route})`), `${locale.dir}/${sourcePage}: whitelist entry point`);
    }
    const matchingNavigation = config.navigation.languages.find(language =>
      language.groups.some(group => group.pages?.includes(route))
    );
    assert.ok(matchingNavigation, `${locale.dir}: missing navigation`);
  }
});

test('published customer pages do not link to administrator-only website screens', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
  const adminScreen = /(?:href=["']|\]\()(?:https:\/\/nexusapi\.link)?\/(?:channels|users|models|subscriptions|system-settings|system-info|redemption-codes|task-plugins|dashboard\/users|console\/(?:channel|user|setting))(?:[/?#)"'])/;
  for (const language of config.navigation.languages) {
    for (const page of language.groups.flatMap(group => group.pages || [])) {
      const text = fs.readFileSync(path.join(root, `${page}.mdx`), 'utf8');
      assert.doesNotMatch(text, adminScreen, `${page}: administrator-only website link`);
    }
  }
});

test('website handbook has customer tasks and stable deep links in every locale', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
  const targets = [
    ['guide/api-key', 'key-limits'],
    ['guide/api-key', 'key-status'],
    ['billing/usage-and-billing', 'find-key-usage'],
    ['guide/account-security', 'personal-settings'],
    ['guide/account-security', 'balance-reminders'],
    ['guide/account-security', 'audit-records'],
    ['guide/api-key', 'key-troubleshooting'],
    ['guide/recharge', 'orders'],
    ['tools/cc-switch', 'import-from-website'],
  ];
  for (const locale of locales) {
    const prefix = locale.dir ? `${locale.dir}/` : '';
    const entry = `${prefix}guide/console-overview`;
    const nav = config.navigation.languages.find(l => l.groups.some(g => g.pages?.includes(entry)));
    assert.ok(nav, `${locale.dir}: missing website guide`);
    assert.ok(nav.groups[0].pages.includes(entry), `${locale.dir}: website guide is not in the primary group`);
    assert.ok(read(locale, 'index').includes(`](/${entry})`), `${locale.dir}: missing home entry`);
    const overview = read(locale, 'guide/console-overview');
    for (const route of ['/dashboard/overview', '/dashboard/models', '/keys', '/wallet', '/pricing', '/profile', '/security']) {
      assert.ok(overview.includes(`https://nexusapi.link${route}`), `${locale.dir}: missing customer route ${route}`);
    }
    for (const [page, anchor] of targets) {
      assert.equal(read(locale, page).split(`id="${anchor}"`).length - 1, 1, `${locale.dir}/${page}: ${anchor}`);
    }
    const logs = read(locale, 'billing/usage-and-billing');
    assert.ok(logs.includes('sk-...'), `${locale.dir}: keep the warning not to search with the secret key`);
    const importGuide = read(locale, 'tools/cc-switch');
    assert.ok(importGuide.includes('CC Switch'), locale.dir);
    assert.doesNotMatch(importGuide, /ccswitch:\/\/[^\s]*apiKey=/, `${locale.dir}: do not publish credential-bearing import links`);
  }
});

test('customer handbook audit keeps actionable filters and credential warnings in every locale', () => {
  // These text guards prevent omissions; they do not replace checking rc48
  // components, backend behavior or the deployed UI.
  const labels = {
    '': ['复制连接信息', '应用筛选器', '按订单号搜索...', '上游请求 ID', '已禁用'],
    'zh-TW': ['複製連接資訊', '套用篩選器', '按訂單號搜尋...', '上游請求 ID', '已停用'],
    en: ['Copy Connection Info', 'Apply Filters', 'Search by order number...', 'Upstream Request ID', 'Disabled'],
    fr: ['Copier les infos de connexion', 'Appliquer les filtres', 'Rechercher par numéro de commande...', 'ID de requête en amont', 'Désactivé'],
    ja: ['接続情報をコピー', 'フィルターを適用', '注文番号で検索...', '上流リクエストID', '無効'],
    ru: ['Копировать данные подключения', 'Применить фильтры', 'Поиск по номеру заказа...', 'ID вышестоящего запроса', 'Отключено'],
    vi: ['Sao chép thông tin kết nối', 'Áp dụng bộ lọc', 'Tìm kiếm theo số đơn hàng...', 'ID yêu cầu thượng nguồn', 'Đã tắt'],
  };
  for (const locale of locales) {
    const [copyInfo, apply, orderSearch, upstreamId, disabled] = labels[locale.dir];
    const keys = read(locale, 'guide/api-key');
    for (const text of [copyInfo, disabled, '`auto`', 'Claude Code']) {
      assert.ok(keys.includes(text), `${locale.dir}: ${text}`);
    }
    assert.ok(read(locale, 'guide/console-overview').includes(apply), locale.dir);
    assert.ok(read(locale, 'guide/recharge').includes(orderSearch), locale.dir);
    assert.ok(read(locale, 'billing/usage-and-billing').includes(upstreamId), locale.dir);
    const importer = read(locale, 'tools/cc-switch');
    for (const text of ['Haiku', 'Sonnet', 'Opus']) {
      assert.ok(importer.includes(text), `${locale.dir}: auxiliary model ${text}`);
    }
  }
});

test('customer self-service steps stay discoverable and order states do not imply refunds', () => {
  const orderLabels = {
    '': ['成功', '待确认', '已过期'],
    'zh-TW': ['成功', '待確認', '已過期'],
    en: ['Success', 'Pending', 'Expired'],
    fr: ['Succès', 'En attente', 'Expiré'],
    ja: ['成功', '保留中', '有効期限切れ'],
    ru: ['Успешно', 'Ожидает', 'Просрочено'],
    vi: ['Thành công', 'Đang chờ', 'Hết hạn'],
  };
  const refundBoundary = {
    '': '不代表款项已经退回',
    'zh-TW': '不代表款項已退回',
    en: 'does not mean the payment was refunded',
    fr: 'ne signifie pas un remboursement',
    ja: '返金済みを意味しません',
    ru: 'не означает возврат денег',
    vi: 'không có nghĩa đã hoàn tiền',
  };
  for (const locale of locales) {
    const prefix = locale.dir ? `${locale.dir}/` : '';
    const overview = read(locale, 'guide/console-overview');
    assert.ok(overview.includes(`](/${prefix}guide/account-security#balance-reminders)`), locale.dir);
    const security = read(locale, 'guide/account-security');
    const audit = security.split('<span id="audit-records"></span>')[1]?.split(/^## /m)[0];
    assert.ok(audit?.includes('https://nexusapi.link/usage-logs/audit'), locale.dir);
    assert.equal((audit.match(/^\d\. /gm) || []).length, 3, `${locale.dir}: audit steps`);
    const keyHelp = read(locale, 'guide/api-key').split('<span id="key-troubleshooting"></span>')[1];
    assert.ok(keyHelp?.includes(`](/${prefix}faq/self-check)`), locale.dir);
    assert.ok(keyHelp.includes(`](/${prefix}guide/ip-whitelist)`), locale.dir);
    const orders = read(locale, 'guide/recharge');
    for (const label of orderLabels[locale.dir]) {
      assert.ok(orders.includes(`| ${label} |`), `${locale.dir}: order ${label}`);
    }
    assert.ok(orders.includes(refundBoundary[locale.dir]), `${locale.dir}: expiration is not proof of refund`);
  }
});

test('translated sidebar steps retain the actual rc48 control names', () => {
  // Names checked against v1.0.0-rc.48 web/src/i18n/locales/* in this audit.
  const controls = {
    '': ['左侧边栏个人设置', '保存更改', '重置为默认'],
    'zh-TW': ['左側邊欄個人設定', '儲存變更', '重置為預設'],
    en: ['Sidebar Personal Settings', 'Save Changes', 'Reset to Default'],
    fr: ['Paramètres personnels de la barre latérale', 'Enregistrer les modifications', 'Réinitialiser par défaut'],
    ja: ['サイドバー個人設定', '変更を保存', 'デフォルトにリセット'],
    ru: ['Личные настройки боковой панели', 'Сохранить изменения', 'Сбросить по умолчанию'],
    vi: ['Cài đặt cá nhân thanh bên', 'Lưu Thay đổi', 'Đặt lại mặc định'],
  };
  for (const locale of locales) {
    for (const page of ['guide/console-overview', 'guide/account-security']) {
      for (const label of controls[locale.dir]) {
        assert.ok(read(locale, page).includes(label), `${locale.dir}/${page}: ${label}`);
      }
    }
  }
});

test('setup confirmation checks usage logs and troubleshooting separates not-implemented from 400', () => {
  for (const locale of locales) {
    assert.ok(read(locale, 'guide/integration-overview').includes('https://nexusapi.link/usage-logs/common'), locale.dir);
    const selfCheck = read(locale, 'faq/self-check');
    assert.ok(selfCheck.includes('`status_code=500, not implemented`'), locale.dir);
    assert.doesNotMatch(selfCheck, /\| 400 \/ not implemented \|/, locale.dir);
  }
});

test('localized executable examples preserve the Chinese technical configuration', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
  const sourcePages = config.navigation.languages[0].groups.flatMap(group => group.pages || []);
  const codeBlocks = (source) => [...source.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)]
    // Support-message templates are intentionally translated prose.
    .filter(match => match[1].trim() !== 'text')
    .map(match => [match[1].trim(), match[2]
      // Request greeting strings may be localized; technical fields must not.
      .replace(/("(?:content|input)"\s*:\s*")[^"\n]*(")/g, '$1<message>$2')
      .replace(/\s+/g, '')]);
  for (const page of sourcePages) {
    const expected = codeBlocks(read(locales[0], page));
    for (const locale of locales.slice(1)) {
      assert.deepEqual(codeBlocks(read(locale, page)), expected, `${locale.dir}/${page}`);
    }
  }
});
