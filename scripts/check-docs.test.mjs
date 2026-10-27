import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'scripts/check-docs.mjs'),'utf8').replace(/^import .*;\n/gm,'');
// Inject a changed read result, never edit the working tree to test a regression.
function validate(file,transform){
 const errors=[];const process={cwd:()=>root,exitCode:0};
 const original=fs.readFileSync.bind(fs);
 const mocked={...fs,readFileSync:(p,...args)=>{
  const value=original(p,...args);
  return file&&path.resolve(String(p))===path.join(root,file)?transform(value):value;
 }};
 vm.runInNewContext(source,{fs:mocked,path,process,console:{log(){},error:m=>errors.push(m)}},{timeout:5000});
 return {exitCode:process.exitCode,errors:errors.join('\n')};
}
test('current documentation passes',()=>assert.equal(validate().exitCode,0));
test('rejects an empty translated section',()=>{
 const r=validate('fr/index.mdx',s=>s+'\n## Empty section\n\n');
 assert.equal(r.exitCode,1);assert.match(r.errors,/empty section/);
});
test('rejects a translated Markdown image path with spaces',()=>{
 const r=validate('vi/billing/models-pricing.mdx',s=>s.replace('/model-marketplace-vi.png','/mô hình-marketplace-vi.png'));
 assert.equal(r.exitCode,1);assert.match(r.errors,/malformed local Markdown URL/);
});
test('rejects Chinese punctuation in Western-language prose',()=>{
 const r=validate('en/index.mdx',s=>s+'\nExample： check this.\n');
 assert.equal(r.exitCode,1);assert.match(r.errors,/locale's punctuation/);
});
test('rejects missing localized FAQ questions',()=>{
 const r=validate('en/faq/index.mdx',s=>s.replace(/^- \*\*Why does a new API key fail\?\*\*.*\n/m,''));
 assert.equal(r.exitCode,1);assert.match(r.errors,/FAQ answers are missing/);
});
test('customer help keeps protocol debugging out of the basic steps',()=>{
 for(const locale of ['', 'zh-TW/', 'en/', 'fr/', 'ja/', 'ru/', 'vi/']){
  for(const topic of ['faq/index.mdx','faq/self-check.mdx']){
   const text=fs.readFileSync(path.join(root,locale+topic),'utf8');
   assert.doesNotMatch(text,/supported_endpoint_types|Authorization: Bearer|指数退避|最小复现/);
  }
  const detailed=fs.readFileSync(path.join(root,locale+'faq/common-errors.mdx'),'utf8');
  assert.equal((detailed.match(/<Accordion title=/g)||[]).length,9);
  const visible=detailed.replace(/<Accordion[^>]*>[\s\S]*?<\/Accordion>/g,'');
  assert.doesNotMatch(visible,/supported_endpoint_types|Authorization: Bearer/);
 }
});
test('discount examples keep all four multipliers and visible calculation conditions',()=>{
 for(const locale of ['', 'zh-TW/', 'en/', 'fr/', 'ja/', 'ru/', 'vi/']){
  const text=fs.readFileSync(path.join(root,locale+'billing/multipliers-and-discounts.mdx'),'utf8');
  for(const multiplier of ['0.7x','1.2x','1.3x','5.6x'])assert.ok(text.includes('`'+multiplier+'`'));
  const beforeTable=text.slice(0,text.indexOf('| ---'));
  assert.match(beforeTable,/\$100/);
  assert.match(beforeTable,/7[.,]3/);
  assert.match(beforeTable,/`1x`/);
  assert.match(text,/<div className="nexusapi-discount-example">/);
 }
});
