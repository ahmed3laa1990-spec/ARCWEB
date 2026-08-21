/**
 * Addresses every bilingual text on the page so the panel can edit it.
 *
 * The markup pairs them consistently:
 *   <span data-en>English</span><span data-ar>عربي</span>
 * sometimes wrapping inner markup (<span class="gold">…</span>), which is
 * preserved verbatim — only the pair's innerHTML is treated as content.
 *
 * Keys are positional: "<section>.<n>". Nothing is injected into the HTML,
 * so the page stays exactly as authored; drift is caught by build --check.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ARCTexts = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const OPEN = /<(span|tspan|div)((?:\s+[^>]*?)?)\sdata-(en|ar)>/g;

  /** Finds the index just past the element's closing tag, balancing nesting. */
  function endOf(html, tag, from) {
    const open = new RegExp('<' + tag + '\\b', 'g');
    const close = new RegExp('</' + tag + '>', 'g');
    let depth = 1, i = from;
    while (depth > 0) {
      open.lastIndex = i; close.lastIndex = i;
      const o = open.exec(html);
      const c = close.exec(html);
      if (!c) return -1;
      if (o && o.index < c.index) { depth++; i = o.index + 1; }
      else { depth--; i = c.index + ('</' + tag + '>').length; }
    }
    return i;
  }

  /** Section id (or tag name) that encloses a character offset. */
  function sectionIndex(html) {
    const re = /<(section|footer|main|head)\b([^>]*)>/g;
    const marks = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const idm = /\bid="([^"]+)"/.exec(m[2] || '');
      marks.push({ pos: m.index, name: idm ? idm[1] : m[1] });
    }
    return function (pos) {
      let name = 'head';
      for (let i = 0; i < marks.length; i++) {
        if (marks[i].pos < pos) name = marks[i].name; else break;
      }
      return name;
    };
  }

  /** Every en/ar pair, in document order. */
  function scan(html) {
    const sectionAt = sectionIndex(html);
    const out = [];
    const counters = {};
    OPEN.lastIndex = 0;
    let m;
    while ((m = OPEN.exec(html)) !== null) {
      if (m[3] !== 'en') continue;                       // anchor on the English half
      const tag = m[1];
      const enStart = m.index + m[0].length;
      const enEnd = endOf(html, tag, enStart);
      if (enEnd < 0) continue;
      const enClose = ('</' + tag + '>').length;
      const en = html.slice(enStart, enEnd - enClose);

      // the Arabic twin follows, possibly after whitespace
      const rest = html.slice(enEnd);
      const arM = /^(\s*)<(span|tspan|div)((?:\s+[^>]*?)?)\sdata-ar>/.exec(rest);
      if (!arM) continue;
      const arTag = arM[2];
      const arStart = enEnd + arM[0].length;
      const arEnd = endOf(html, arTag, arStart);
      if (arEnd < 0) continue;
      const ar = html.slice(arStart, arEnd - ('</' + arTag + '>').length);

      const sec = sectionAt(m.index);
      counters[sec] = (counters[sec] || 0) + 1;
      out.push({
        key: sec + '.' + counters[sec],
        section: sec,
        en: en,
        ar: ar,
        enStart: enStart, enEnd: enEnd - enClose,
        arStart: arStart, arEnd: arEnd - ('</' + arTag + '>').length
      });
      OPEN.lastIndex = arEnd;
    }
    return out;
  }

  /** Extracts a plain { key: {en, ar} } map. */
  function extract(html) {
    const map = {};
    scan(html).forEach((t) => { map[t.key] = { section: t.section, en: t.en, ar: t.ar }; });
    return map;
  }

  /** Writes the map back, replacing from the end so offsets stay valid. */
  function apply(html, map) {
    if (!map) return html;
    const items = scan(html);
    let out = html;
    for (let i = items.length - 1; i >= 0; i--) {
      const t = items[i];
      const v = map[t.key];
      if (!v) continue;
      if (typeof v.ar === 'string' && v.ar !== t.ar) out = out.slice(0, t.arStart) + v.ar + out.slice(t.arEnd);
      if (typeof v.en === 'string' && v.en !== t.en) out = out.slice(0, t.enStart) + v.en + out.slice(t.enEnd);
    }
    return out;
  }

  return { scan: scan, extract: extract, apply: apply };
}));
