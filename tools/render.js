/**
 * Turns content records into the markup that lives in index.html.
 * Loaded both by tools/build.js (Node) and by /admin (browser), so the
 * panel and the build step can never drift apart.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ARCRender = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const js = (s) => JSON.stringify(String(s == null ? '' : s));
  const bi = (v) => `<span data-en>${esc(v.en)}</span><span data-ar>${esc(v.ar)}</span>`;

  function livingProjects(projects) {
    return (projects || [])
      .filter((p) => p.published !== false)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function projectCards(projects) {
    return livingProjects(projects).map((p) => `
      <article class="project-card reveal" data-category="${esc(p.category)}" data-project="${esc(p.slug)}" tabindex="0" role="button" aria-label="${esc(p.ariaLabel || p.title.en)}">
        <img src="assets/projects/${esc(p.images[0])}" loading="lazy" width="${p.heroWidth}" height="${p.heroHeight}" alt="${esc(p.alt)}">
        <div class="project-info">
          <span class="project-tag">${bi(p.scope)}</span>
          <h3>${bi(p.cardTitle || p.title)}</h3>
          <p>${bi(p.cardSubtitle)}</p>
        </div>
      </article>`).join('\n');
  }

  function projectData(projects) {
    const entries = livingProjects(projects).map((p) => `    ${js(p.slug)}: {
      scopeEn: ${js(p.scope.en)}, scopeAr: ${js(p.scope.ar)},
      titleEn: ${js(p.title.en)}, titleAr: ${js(p.title.ar)},
      partnerEn: ${js(p.partner.en)}, partnerAr: ${js(p.partner.ar)},
      descEn: ${js(p.description.en)},
      descAr: ${js(p.description.ar)},
      imgs: ${JSON.stringify(p.images)}
    }`).join(',\n');
    return `  const projectData = {\n${entries}\n  };`;
  }

  /** Replaces one generated block, leaving the markers in place. */
  function replaceBlock(html, name, body) {
    const isJs = name === 'PROJECTDATA';
    const startTag = isJs ? `/* ARC:${name}:START */` : `<!-- ARC:${name}:START -->`;
    const endTag = isJs ? `/* ARC:${name}:END */` : `<!-- ARC:${name}:END -->`;
    const i = html.indexOf(startTag);
    const j = html.indexOf(endTag);
    if (i < 0 || j < 0) throw new Error('markers for ' + name + ' not found in index.html');
    return html.slice(0, i + startTag.length) + '\n' + body + '\n' + html.slice(j);
  }

  /** Applies every generated block to a full index.html string. */
  function applyAll(html, content) {
    let out = replaceBlock(html, 'PROJECTS', projectCards(content.projects));
    out = replaceBlock(out, 'PROJECTDATA', projectData(content.projects));
    return out;
  }

  return { esc, bi, livingProjects, projectCards, projectData, replaceBlock, applyAll };
}));
