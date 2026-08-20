#!/usr/bin/env node
/**
 * Regenerates the parts of index.html that are driven by data/content.json.
 *
 *   node tools/build.js          rewrite index.html in place
 *   node tools/build.js --check  fail if index.html is out of date (for CI)
 *
 * Everything between the ARC:*:START and ARC:*:END markers is generated.
 * Edit data/content.json, never the generated blocks.
 */
const fs = require('fs');
const path = require('path');
const render = require('./render.js');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const dataPath = path.join(root, 'data', 'content.json');

const content = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const before = fs.readFileSync(htmlPath, 'utf8');
const after = render.applyAll(before, content);

if (process.argv.includes('--check')) {
  if (after !== before) {
    console.error('✗ index.html is out of date — run: node tools/build.js');
    process.exit(1);
  }
  console.log('✓ index.html matches data/content.json');
  process.exit(0);
}

fs.writeFileSync(htmlPath, after);
const n = render.livingProjects(content.projects).length;
console.log(`✓ regenerated ${n} projects` + (after === before ? ' (no change)' : ''));
