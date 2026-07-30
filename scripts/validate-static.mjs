import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /<!doctype html>/i, 'index.html must declare HTML');
assert.match(html, /<meta name="viewport"[^>]*>/i, 'viewport metadata is required');
assert.equal((html.match(/<html\b/gi) || []).length, 1, 'expected one html element');
assert.equal((html.match(/<body\b/gi) || []).length, 1, 'expected one body element');
assert.equal((html.match(/<script\b/gi) || []).length, (html.match(/<\/script>/gi) || []).length, 'script tags must balance');
assert.equal((html.match(/<style\b/gi) || []).length, (html.match(/<\/style>/gi) || []).length, 'style tags must balance');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], `duplicate ids: ${duplicates.join(', ')}`);

for (const [, source = ''] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  new Function(source);
}

assert.doesNotMatch(html, /<(?:script|link)\b[^>]*(?:src|href)="https?:\/\//i, 'external script/style dependencies are not allowed');
console.log(`Static validation passed: ${ids.length} unique ids and valid inline JavaScript.`);
