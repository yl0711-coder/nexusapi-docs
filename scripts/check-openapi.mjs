import fs from 'node:fs';
import path from 'node:path';

const specificationPath = path.join(process.cwd(), 'openapi/nexusapi-public.openapi.json');
const requiredPaths = [
  '/v1/models',
  '/v1/chat/completions',
  '/v1/messages',
  '/v1/responses',
  '/v1/images/generations',
  '/v1/logs',
];

let specification;
try {
  specification = JSON.parse(fs.readFileSync(specificationPath, 'utf8'));
} catch (error) {
  console.error('OpenAPI validation failed: cannot parse ' + specificationPath + '.');
  console.error(error.message);
  process.exit(1);
}

const failures = [];

if (specification.openapi !== '3.1.0') {
  failures.push('openapi must be 3.1.0.');
}
if (!specification.info?.title || !specification.info?.version) {
  failures.push('info.title and info.version are required.');
}
if (!Array.isArray(specification.servers) || specification.servers.length < 2) {
  failures.push('both model and usage-log servers must be declared.');
}
for (const route of requiredPaths) {
  if (!specification.paths?.[route]) {
    failures.push('missing required route ' + route + '.');
  }
}
for (const [route, definition] of Object.entries(specification.paths || {})) {
  for (const [method, operation] of Object.entries(definition)) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
    const prefix = method.toUpperCase() + ' ' + route;
    if (!operation.summary) failures.push(prefix + ' is missing a summary.');
    if (!operation.operationId) failures.push(prefix + ' is missing an operationId.');
    if (!operation['x-apifox-folder']) failures.push(prefix + ' is missing x-apifox-folder.');
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      failures.push(prefix + ' has no responses.');
    }
  }
}

if (failures.length) {
  console.error('OpenAPI validation failed with ' + failures.length + ' issue(s):');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log(
  'OpenAPI validation passed: ' +
    Object.keys(specification.paths).length +
    ' routes, ' +
    Object.keys(specification.components?.schemas || {}).length +
    ' schemas.',
);
