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

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const dataPath = path.join(root, 'data', 'content.json');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const js = (s) => JSON.stringify(String(s));
const bi = (v) => `<span data-en>${esc(v.en)}</span><span data-ar>${esc(v.ar)}</span>`;

function cards(projects) {
  return projects.map((p) => `
      <article class="project-card reveal" data-category="${esc(p.category)}" data-project="${esc(p.slug)}" tabindex="0" role="button" aria-label="${esc(p.ariaLabel || p.title.en)}">
        <img src="assets/projects/${esc(p.images[0])}" loading="lazy" width="${p.heroWidth}" height="${p.heroHeight}" alt="${esc(p.alt)}">
        <div class="project-info">
          <span class="project-tag">${bi(p.scope)}</span>
          <h3>${bi(p.cardTitle || p.title)}</h3>
          <p>${bi(p.cardSubtitle)}</p>
        </div>
      </article>`).join('\n');
}

function modalData(projects) {
  const entries = projects.map((p) => `    ${js(p.slug)}: {
      scopeEn: ${js(p.scope.en)}, scopeAr: ${js(p.scope.ar)},
      titleEn: ${js(p.title.en)}, titleAr: ${js(p.title.ar)},
      partnerEn: ${js(p.partner.en)}, partnerAr: ${js(p.partner.ar)},
      descEn: ${js(p.description.en)},
      descAr: ${js(p.description.ar)},
      imgs: ${JSON.stringify(p.images)}
    }`).join(',\n');
  return `  const projectData = {\n${entries}\n  };`;
}

function replaceBlock(html, name, body) {
  const startTag = name === 'PROJECTDATA' ? `/* ARC:${name}:START */` : `<!-- ARC:${name}:START -->`;
  const endTag = name === 'PROJECTDATA' ? `/* ARC:${name}:END */` : `<!-- ARC:${name}:END -->`;
  const i = html.indexOf(startTag);
  const j = html.indexOf(endTag);
  if (i < 0 || j < 0) throw new Error(`markers for ${name} not found in index.html`);
  return html.slice(0, i + startTag.length) + '\n' + body + '\n' + html.slice(j);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const projects = data.projects
  .filter((p) => p.published !== false)
  .slice()
  .sort((a, b) => (a.order || 0) - (b.order || 0));

const before = fs.readFileSync(htmlPath, 'utf8');
let after = replaceBlock(before, 'PROJECTS', cards(projects));
after = replaceBlock(after, 'PROJECTDATA', modalData(projects));

if (process.argv.includes('--check')) {
  if (after !== before) {
    console.error('✗ index.html is out of date — run: node tools/build.js');
    process.exit(1);
  }
  console.log('✓ index.html matches data/content.json');
  process.exit(0);
}

fs.writeFileSync(htmlPath, after);
console.log(`✓ regenerated ${projects.length} projects` + (after === before ? ' (no change)' : ''));
