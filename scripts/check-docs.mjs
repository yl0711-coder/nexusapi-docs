import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsConfigPath = path.join(root, 'docs.json');
const docsConfig = JSON.parse(fs.readFileSync(docsConfigPath, 'utf8'));
const failures = [];

function addFailure(message) {
  failures.push(message);
}

function pageFile(page) {
  return path.join(root, `${page}.mdx`);
}

function walkMdx(directory, collected = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkMdx(entryPath, collected);
    if (entry.isFile() && entry.name.endsWith('.mdx')) collected.push(entryPath);
  }
  return collected;
}

function getPages(language) {
  return language.groups.flatMap((group) => group.pages || []);
}

function localeDirectory(language) {
  if (language === 'zh-Hans') return '';
  if (language === 'zh-Hant') return 'zh-TW';
  return language;
}

function relativeRoute(page, directory) {
  return directory ? page.replace(new RegExp(`^${directory}/`), '') : page;
}

function structuralMetrics(content) {
  return {
    headings: (content.match(/^#{2,3} /gm) || []).length,
    codeFenceLines: (content.match(/^```/gm) || []).length,
    localImages: (content.match(/\]\(\/images\//g) || []).length,
  };
}

const languages = docsConfig.navigation?.languages || [];
const defaultLanguage = languages.find((language) => language.default);

if (!defaultLanguage) {
  addFailure('docs.json does not declare a default documentation language.');
}

const defaultRoutes = defaultLanguage
  ? new Set(getPages(defaultLanguage).map((page) => relativeRoute(page, localeDirectory(defaultLanguage.language))))
  : new Set();
const documentedPages = new Set();

for (const language of languages) {
  const directory = localeDirectory(language.language);
  const pages = getPages(language);
  const routes = new Set();

  for (const page of pages) {
    documentedPages.add(page);
    const expectedPrefix = directory ? `${directory}/` : '';
    if (!page.startsWith(expectedPrefix)) {
      addFailure(`${language.language}: navigation page "${page}" must start with "${expectedPrefix}".`);
    }
    if (routes.has(relativeRoute(page, directory))) {
      addFailure(`${language.language}: duplicate route "${page}" in navigation.`);
    }
    routes.add(relativeRoute(page, directory));
    if (!fs.existsSync(pageFile(page))) {
      addFailure(`${language.language}: navigation page "${page}" does not exist as ${page}.mdx.`);
    }
  }

  if (defaultLanguage && language !== defaultLanguage) {
    for (const route of defaultRoutes) {
      if (!routes.has(route)) addFailure(`${language.language}: missing localized route "${route}".`);
    }
    for (const route of routes) {
      if (!defaultRoutes.has(route)) addFailure(`${language.language}: extra route "${route}" has no default-language counterpart.`);
    }
  }
}

const mdxFiles = walkMdx(root);
for (const file of mdxFiles) {
  const relativeFile = path.relative(root, file);
  const page = relativeFile.replace(/\.mdx$/, '');
  const content = fs.readFileSync(file, 'utf8');

  if (!documentedPages.has(page)) {
    addFailure(`${relativeFile}: the page is not included in docs.json navigation.`);
  }
  if (!/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(content)) {
    addFailure(`${relativeFile}: missing YAML frontmatter.`);
  } else {
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] || '';
    if (!/^title:\s*.+$/m.test(frontmatter)) addFailure(`${relativeFile}: missing frontmatter title.`);
    if (!/^description:\s*.+$/m.test(frontmatter)) addFailure(`${relativeFile}: missing frontmatter description.`);
  }

  const localLinks = [...content.matchAll(/(?:\]\(|href=["'])(\/[^\s)"'#?]+)(?:[?#][^\s)"']*)?(?:\)|["'])/g)];
  for (const match of localLinks) {
    const link = match[1];
    if (link.startsWith('/images/')) continue;
    const route = link.slice(1);
    const candidates = [path.join(root, `${route}.mdx`), path.join(root, route, 'index.mdx')];
    if (!candidates.some(fs.existsSync)) {
      addFailure(`${relativeFile}: internal link "${link}" has no matching .mdx page.`);
    }
  }

  const localAssets = [...content.matchAll(/(?:!?\]\(|(?:src|href)=["'])(\/images\/[^\s)"'#?]+)(?:[?#][^\s)"']*)?(?:\)|["'])/g)];
  for (const match of localAssets) {
    const asset = match[1];
    const assetPath = path.join(root, asset.replace(/^\//, ''));
    if (!fs.existsSync(assetPath)) {
      addFailure(`${relativeFile}: local image asset "${asset}" does not exist.`);
    }
  }
}

// A localized page must preserve the default-language page's instructional
// structure. This catches accidental summary-only translations while allowing
// natural differences in wording and language length.
if (defaultLanguage) {
  const defaultDirectory = localeDirectory(defaultLanguage.language);
  for (const route of defaultRoutes) {
    const sourcePage = defaultDirectory ? `${defaultDirectory}/${route}` : route;
    const sourcePath = pageFile(sourcePage);
    if (!fs.existsSync(sourcePath)) continue;

    const sourceMetrics = structuralMetrics(fs.readFileSync(sourcePath, 'utf8'));
    for (const language of languages) {
      if (language === defaultLanguage) continue;
      const directory = localeDirectory(language.language);
      const localizedPage = directory ? `${directory}/${route}` : route;
      const localizedPath = pageFile(localizedPage);
      if (!fs.existsSync(localizedPath)) continue;

      const localizedMetrics = structuralMetrics(fs.readFileSync(localizedPath, 'utf8'));
      for (const [metric, sourceValue] of Object.entries(sourceMetrics)) {
        if (localizedMetrics[metric] < sourceValue) {
          addFailure(
            `${language.language}: localized page "${localizedPage}" has ${localizedMetrics[metric]} ${metric}, fewer than the default-language source (${sourceValue}).`,
          );
        }
      }
    }
  }
}

if (failures.length) {
  console.error(`Documentation validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation validation passed: ${mdxFiles.length} pages, ${languages.length} languages.`);
}
