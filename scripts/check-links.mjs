import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const SITE = 'https://docs.nexusapi.link';

export function withoutCode(text) {
  return text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, m => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));
}

export function extractTargets(text) {
  const prose = withoutCode(text);
  const targets = [];
  const push = (raw, index, kind) => {
    const value = raw.replace(/^<|>$/g, '').replace(/&amp;/g, '&').trim();
    if (value) targets.push({ target: value, line: prose.slice(0, index).split('\n').length, kind });
  };
  for (const m of prose.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g)) push(m[1], m.index, 'markdown');
  for (const m of prose.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/g)) push(m[2], m.index, m[1]);
  for (const m of prose.matchAll(/<(https?:\/\/[^\s>]+)>/g)) push(m[1], m.index, 'autolink');
  for (const m of text.matchAll(/https:\/\/(?:claude\.ai\/install\.(?:sh|ps1)|chatgpt\.com\/codex\/install\.(?:sh|ps1))/g)) push(m[0], m.index, 'installer');
  return targets;
}

export function routeFile(root, pathname) {
  const route = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '').replace(/\.(?:md|mdx)$/, '');
  const candidates = route ? [`${route}.mdx`, `${route}/index.mdx`] : ['index.mdx'];
  return candidates.map(p => path.resolve(root, p)).find(p => p.startsWith(root + path.sep) && fs.existsSync(p));
}

function files(root, out = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) files(p, out);
    else if (p.endsWith('.mdx')) out.push(p);
  }
  return out;
}

function plain(s) { return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim(); }

async function request(url) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
      const { stdout } = await run('curl', [...(local ? ['--noproxy', '*'] : []), '--silent', '--show-error', '--location', '--max-redirs', '8', '--connect-timeout', '8', '--max-time', '25', '--user-agent', 'Mozilla/5.0 (compatible; NexusAPI-Docs-LinkCheck/1.0)', '--write-out', '\n__DOC_LINK_META__%{json}', url], { maxBuffer: 20 * 1024 * 1024 });
      const end = stdout.lastIndexOf('\n__DOC_LINK_META__');
      if (end < 0) throw new Error('curl response metadata missing');
      const body = stdout.slice(0, end);
      const meta = JSON.parse(stdout.slice(end + '\n__DOC_LINK_META__'.length));
      const result = {
        requested: url, status: meta.http_code, finalUrl: meta.url_effective,
        contentType: meta.content_type, redirects: meta.num_redirects,
        title: plain(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''),
        h1: plain(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ''),
        ids: [...new Set([...body.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]))],
      };
      if ([429, 500, 502, 503, 504].includes(result.status) && !attempt) { last = result; continue; }
      return result;
    } catch (error) { last = { requested: url, status: 0, error: String(error.stderr || error.message).trim().slice(-400) }; }
  }
  return last;
}

export async function audit({ root, preview, external = false, report }) {
  root = path.resolve(root);
  const mdx = files(root);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));
  const references = [];
  const issues = [];
  for (const file of mdx) {
    const source = path.relative(root, file);
    const base = `${SITE}/${source.replace(/\.mdx$/, '')}`;
    for (const ref of extractTargets(fs.readFileSync(file, 'utf8'))) references.push({ source, base, ...ref });
  }
  const scanConfig = (value, key = '') => {
    if (Array.isArray(value)) return value.forEach((v, i) => scanConfig(v, `${key}[${i}]`));
    if (value && typeof value === 'object') return Object.entries(value).forEach(([k, v]) => {
      const at = `${key}.${k}`;
      if (typeof v === 'string' && ['href', 'src', 'destination', 'favicon', 'light', 'dark'].includes(k) && /^(?:\/|https?:)/.test(v)) references.push({ source: `docs.json:${at}`, base: SITE + '/', target: v, kind: k });
      else if (k === 'pages' && Array.isArray(v)) v.forEach(p => references.push({ source: `docs.json:${at}`, base: SITE + '/', target: '/' + p, kind: 'navigation' }));
      else scanConfig(v, at);
    });
  };
  scanConfig(config);
  for (const redirect of config.redirects || []) references.push({ source: 'docs.json:redirects', base: SITE + '/', target: redirect.source, kind: 'redirect-source' });
  const redirects = new Map((config.redirects || []).map(r => [r.source, r.destination]));
  const groups = new Map();
  for (const ref of references) {
    let url;
    try { url = new URL(ref.target, ref.base); } catch { issues.push({ ...ref, reason: 'invalid URL' }); continue; }
    if (!['http:', 'https:'].includes(url.protocol)) continue;
    const internal = url.origin === SITE;
    if (internal) {
      if (url.pathname.startsWith('/images/')) {
        if (!fs.existsSync(path.join(root, decodeURIComponent(url.pathname)))) issues.push({ ...ref, reason: 'image file missing' });
      } else if (ref.kind !== 'redirect-source' && !routeFile(root, url.pathname) && !redirects.has(url.pathname)) issues.push({ ...ref, reason: 'page file missing' });
      const locale = ref.source.match(/^(zh-TW|en|fr|ja|ru|vi)\//)?.[1];
      if (locale && !url.pathname.startsWith('/images/') && !url.pathname.startsWith(`/${locale}/`) && url.pathname !== `/${locale}`) issues.push({ ...ref, reason: `cross-language internal link; expected /${locale}/` });
    }
    if ((internal && !preview) || (!internal && !external)) continue;
    const hash = url.hash;
    url.hash = '';
    const requested = internal ? new URL(url.pathname + url.search, preview).href : url.href;
    if (!groups.has(requested)) groups.set(requested, { internal, references: [] });
    groups.get(requested).references.push({ ...ref, hash });
  }
  const targets = [...groups.entries()];
  const checked = [];
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const [url, target] = targets[cursor++];
      const response = await request(url);
      const { ids, ...summary } = response;
      const problems = [];
      if (response.status < 200 || response.status >= 400) problems.push([401, 403, 429].includes(response.status) ? 'access-restricted or rate-limited; needs review' : 'HTTP failure');
      if (/^(?:404\b|page not found|not found\b)/i.test(response.title || '') || /^(?:404\b|page not found|not found\b)/i.test(response.h1 || '')) problems.push('soft 404 page');
      if (target.internal && response.status === 200 && response.finalUrl) {
        const resolved = new URL(response.finalUrl);
        if (resolved.pathname.startsWith('/images/')) {
          if (!response.contentType?.startsWith('image/')) problems.push('image URL did not return an image');
        } else {
          const page = routeFile(root, resolved.pathname);
          if (page) {
            let expected = fs.readFileSync(page, 'utf8').match(/^title:\s*(.+)$/m)?.[1]?.trim();
            try { expected = JSON.parse(expected); } catch { expected = expected?.replace(/^'|'$/g, ''); }
            if (expected && response.h1 !== expected) problems.push(`page title mismatch: expected ${expected}, got ${response.h1}`);
          }
        }
      }
      if (target.references.some(r => r.kind === 'installer') && response.contentType?.includes('text/html')) problems.push('installer URL returned an HTML page, not an installer script');
      for (const ref of target.references) {
        if (ref.hash && response.status === 200 && !response.error) {
          const hash = decodeURIComponent(ref.hash.slice(1));
          if (!ids.includes(hash) && !ids.includes(`user-content-${hash}`)) problems.push(`missing fragment ${ref.hash} (from ${ref.source})`);
        }
      }
      const final = response.finalUrl ? new URL(response.finalUrl) : null;
      if (!target.internal && final && new URL(url).pathname !== '/' && final.pathname === '/') problems.push('redirected to site homepage; verify topic');
      checked.push({ ...summary, internal: target.internal, problems: [...new Set(problems)], references: target.references });
      if (problems.length) console.log(JSON.stringify({ url, status: response.status, problems }));
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  const result = {
    checkedAt: new Date().toISOString(), pages: mdx.length, referenceCount: references.length,
    internalTargets: checked.filter(x => x.internal).length, externalTargets: checked.filter(x => !x.internal).length,
    staticIssues: issues, networkIssues: checked.filter(x => x.problems.length), checked,
  };
  if (report) { fs.mkdirSync(path.dirname(path.resolve(report)), { recursive: true }); fs.writeFileSync(report, JSON.stringify(result, null, 2) + '\n'); }
  console.log(JSON.stringify({ pages: result.pages, references: references.length, internalTargets: result.internalTargets, externalTargets: result.externalTargets, staticIssues: issues.length, networkIssues: result.networkIssues.length }));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const result = await audit({ root: process.cwd(), preview: value('--preview'), external: args.includes('--external'), report: value('--report') });
  if (result.staticIssues.length || result.networkIssues.length) process.exitCode = 1;
}
