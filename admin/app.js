/* ARC admin panel — Supabase auth, leads inbox, project editor. */
(function () {
'use strict';

const SB_URL = 'https://cavojuqysdabhnidhhqa.supabase.co';
const SB_KEY = 'sb_publishable_ktAw1dC0J7udqhUR1R7eug_I1GArH91';
const OWNER = 'ahmed3laa1990-spec';
const REPO = 'ARCWEB';
const BRANCH = 'main';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s);

let session = null;      // { access_token, refresh_token, user }
let ghToken = null;      // GitHub PAT, loaded from app_secrets
let content = null;      // data/content.json
let indexHtml = null;
let leads = [];
let dirty = false;
let editingSlug = null;
let tab = 'leads';
let leadFilter = 'all';
let textFilter = '';
let openSection = null;

const SECTION_AR = {
  head: 'عنوان الصفحة ووصفها (يظهر في جوجل)',
  home: 'البانر الرئيسي',
  about: 'من نحن',
  founder: 'كلمة المدير التنفيذي',
  vision: 'رؤية 2030',
  services: 'الخدمات',
  projects: 'قسم المشاريع',
  timeline: 'الخط الزمني',
  team: 'الإدارات',
  credentials: 'السجلات الموثّقة',
  careers: 'الوظائف',
  blog: 'المدوّنة (مخفية حالياً)',
  calculator: 'حاسبة التكلفة',
  contact: 'التواصل وطلب عرض السعر',
  skyline: 'المجسّم ثلاثي الأبعاد',
  configurator: 'مكوّن المشروع',
  footer: 'تذييل الموقع',
  section: 'أقسام أخرى'
};

/* ---------------- ui helpers ---------------- */
function note(host, kind, text) {
  host.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'notice ' + kind;
  d.textContent = text;
  host.appendChild(d);
}
const clearNote = (h) => { h.innerHTML = ''; };

function setDirty(v) {
  dirty = v;
  const b = $('save');
  if (b) { b.disabled = !v; }
  $('dirty').classList.toggle('hidden', !v);
}

function mkBtn(label, cls, fn, disabled) {
  const b = document.createElement('button');
  b.className = 'btn ' + cls + ' btn-s';
  b.textContent = label;
  b.disabled = !!disabled;
  b.addEventListener('click', fn);
  return b;
}

/* ---------------- supabase ---------------- */
async function sb(path, opts) {
  opts = opts || {};
  const headers = Object.assign({
    'apikey': SB_KEY,
    'Content-Type': 'application/json'
  }, opts.headers || {});
  if (session && session.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
  const res = await fetch(SB_URL + path, Object.assign({}, opts, { headers: headers }));
  if (res.status === 401 && session) {
    const ok = await refresh();
    if (ok) return sb(path, opts);
  }
  if (!res.ok) {
    let m = res.status + '';
    try { const j = await res.json(); m = j.message || j.error_description || j.msg || m; } catch (e) {}
    throw new Error(m);
  }
  if (res.status === 204) return null;
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function signIn(email, password) {
  const res = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error_description || j.msg || j.message || 'تعذّر تسجيل الدخول');
  session = j;
  localStorage.setItem('arc-sb', JSON.stringify({ refresh_token: j.refresh_token }));
  return j;
}

async function refresh() {
  const saved = localStorage.getItem('arc-sb');
  if (!saved) return false;
  try {
    const rt = JSON.parse(saved).refresh_token;
    const res = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    });
    if (!res.ok) return false;
    session = await res.json();
    localStorage.setItem('arc-sb', JSON.stringify({ refresh_token: session.refresh_token }));
    return true;
  } catch (e) { return false; }
}

function signOut() {
  localStorage.removeItem('arc-sb');
  session = null;
  location.reload();
}

/* ---------------- github ---------------- */
async function gh(path, opts) {
  const res = await fetch('https://api.github.com' + path, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + ghToken,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  }, opts || {}));
  if (!res.ok) {
    let d = '';
    try { d = (await res.json()).message || ''; } catch (e) {}
    throw new Error('GitHub ' + res.status + (d ? ' — ' + d : ''));
  }
  return res.status === 204 ? null : res.json();
}

function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function fromB64(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(a);
}
async function getFile(path) {
  const j = await gh('/repos/' + OWNER + '/' + REPO + '/contents/' + path + '?ref=' + BRANCH);
  return fromB64(j.content);
}

/* ---------------- boot ---------------- */
async function boot() {
  $('who').textContent = (session.user && session.user.email) || '';
  $('logout').classList.remove('hidden');
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  await loadLeads();
  try {
    const rows = await sb('/rest/v1/app_secrets?key=eq.github_token&select=value');
    if (rows && rows.length) ghToken = rows[0].value;
  } catch (e) { /* the projects tab will ask for it */ }
  render();
}

/* ---------------- leads ---------------- */
async function loadLeads() {
  try {
    leads = await sb('/rest/v1/leads?select=*&order=created_at.desc') || [];
  } catch (e) {
    note($('msg'), 'err', 'تعذّر تحميل الطلبات: ' + e.message);
    leads = [];
  }
}

const STATUS = {
  new:       { ar: 'جديد',    cls: 'st-new' },
  contacted: { ar: 'تواصلنا', cls: 'st-con' },
  quoted:    { ar: 'قُدّم عرض', cls: 'st-quo' },
  won:       { ar: 'فوز',     cls: 'st-won' },
  lost:      { ar: 'خسارة',   cls: 'st-lost' }
};

function when(iso) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return 'قبل ' + mins + ' دقيقة';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return 'قبل ' + hrs + ' ساعة';
  const days = Math.round(hrs / 24);
  if (days < 30) return 'قبل ' + days + ' يوم';
  return d.toLocaleDateString('ar-SA');
}

function renderLeads() {
  const host = $('body');
  host.innerHTML = '';

  const counts = { all: leads.length };
  Object.keys(STATUS).forEach((k) => { counts[k] = leads.filter((l) => l.status === k).length; });

  const tabs = document.createElement('div');
  tabs.className = 'filters';
  [['all', 'الكل']].concat(Object.keys(STATUS).map((k) => [k, STATUS[k].ar])).forEach(([k, label]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (leadFilter === k ? ' on' : '');
    b.textContent = label + ' (' + (counts[k] || 0) + ')';
    b.addEventListener('click', () => { leadFilter = k; render(); });
    tabs.appendChild(b);
  });
  host.appendChild(tabs);

  const rows = leadFilter === 'all' ? leads : leads.filter((l) => l.status === leadFilter);

  if (!rows.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = leads.length ? 'لا طلبات بهذه الحالة.' : 'لا توجد طلبات بعد. حين يرسل عميل النموذج سيظهر هنا.';
    host.appendChild(e);
    return;
  }

  const list = document.createElement('div');
  list.className = 'list';
  rows.forEach((l) => list.appendChild(leadCard(l)));
  host.appendChild(list);
}

function leadCard(l) {
  const c = document.createElement('div');
  c.className = 'lead';

  const head = document.createElement('div');
  head.className = 'lead-head';
  const nm = document.createElement('b');
  nm.textContent = l.name;
  const st = document.createElement('span');
  const s = STATUS[l.status] || STATUS.new;
  st.className = 'badge ' + s.cls;
  st.textContent = s.ar;
  const tm = document.createElement('span');
  tm.className = 'ago';
  tm.textContent = when(l.created_at);
  head.appendChild(nm); head.appendChild(st); head.appendChild(tm);
  c.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'facts';
  const add = (label, val, href) => {
    if (!val) return;
    const d = document.createElement('div');
    const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
    d.appendChild(k);
    if (href) {
      const a = document.createElement('a');
      a.href = href; a.textContent = val; a.className = 'num-ltr';
      if (href.indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
      d.appendChild(a);
    } else {
      const v = document.createElement('span'); v.textContent = val;
      d.appendChild(v);
    }
    facts.appendChild(d);
  };
  add('الجوال', l.phone, 'tel:' + l.phone);
  add('واتساب', 'مراسلة', 'https://wa.me/' + String(l.phone).replace(/[^\d]/g, ''));
  add('البريد', l.email, l.email ? 'mailto:' + l.email : null);
  add('النطاق', l.scope);
  add('المدينة', l.city);
  add('المساحة', l.area ? l.area + ' م²' : '');
  c.appendChild(facts);

  if (l.details) {
    const p = document.createElement('p');
    p.className = 'details';
    p.textContent = l.details;
    c.appendChild(p);
  }

  const acts = document.createElement('div');
  acts.className = 'acts';
  const sel = document.createElement('select');
  sel.className = 'status-sel';
  Object.keys(STATUS).forEach((k) => {
    const o = document.createElement('option');
    o.value = k; o.textContent = STATUS[k].ar;
    if (l.status === k) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => setStatus(l, sel.value));
  acts.appendChild(sel);
  acts.appendChild(mkBtn('ملاحظة', 'btn-o', () => editNote(l)));
  acts.appendChild(mkBtn('حذف', 'btn-d', () => delLead(l)));
  c.appendChild(acts);

  if (l.notes) {
    const n = document.createElement('div');
    n.className = 'notes';
    n.textContent = '📝 ' + l.notes;
    c.appendChild(n);
  }
  return c;
}

async function setStatus(l, status) {
  try {
    await sb('/rest/v1/leads?id=eq.' + l.id, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: status })
    });
    l.status = status;
    render();
  } catch (e) { note($('msg'), 'err', 'تعذّر تحديث الحالة: ' + e.message); }
}

async function editNote(l) {
  const v = prompt('ملاحظة داخلية (لا تظهر للعميل):', l.notes || '');
  if (v === null) return;
  try {
    await sb('/rest/v1/leads?id=eq.' + l.id, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ notes: v || null })
    });
    l.notes = v || null;
    render();
  } catch (e) { note($('msg'), 'err', 'تعذّر حفظ الملاحظة: ' + e.message); }
}

async function delLead(l) {
  if (!confirm('حذف طلب "' + l.name + '" نهائياً؟ لا يمكن التراجع.')) return;
  try {
    await sb('/rest/v1/leads?id=eq.' + l.id, { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } });
    leads = leads.filter((x) => x.id !== l.id);
    render();
  } catch (e) { note($('msg'), 'err', 'تعذّر الحذف: ' + e.message); }
}

/* ---------------- projects ---------------- */
async function loadContent() {
  const [c, h] = await Promise.all([getFile('data/content.json'), getFile('index.html')]);
  content = JSON.parse(c);
  indexHtml = h;
  setDirty(false);
}

async function ensureGh() {
  if (ghToken) return true;
  const t = prompt('لتعديل المشاريع أحتاج رمز وصول GitHub (Contents: Read and write على مستودع ARCWEB).\n\nسيُحفظ في قاعدة بياناتك ولن تحتاج إدخاله مرة أخرى:');
  if (!t) return false;
  ghToken = t.trim();
  try {
    await gh('/repos/' + OWNER + '/' + REPO);
    await sb('/rest/v1/app_secrets', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: 'github_token', value: ghToken })
    });
    return true;
  } catch (e) {
    ghToken = null;
    note($('msg'), 'err', 'الرمز غير صالح: ' + e.message);
    return false;
  }
}

const sorted = () => content.projects.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

function renderProjects() {
  const host = $('body');
  host.innerHTML = '';

  if (!content) {
    const e = document.createElement('div');
    e.className = 'empty';
    const b = mkBtn('تحميل المشاريع', 'btn-p', async () => {
      if (!await ensureGh()) return;
      try { await loadContent(); render(); }
      catch (err) { note($('msg'), 'err', 'تعذّر التحميل: ' + err.message); }
    });
    e.appendChild(document.createTextNode('اضغط للتحميل من المستودع. '));
    e.appendChild(b);
    host.appendChild(e);
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'bar';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-p'; saveBtn.id = 'save';
  saveBtn.textContent = 'حفظ ونشر'; saveBtn.disabled = !dirty;
  saveBtn.addEventListener('click', saveContent);
  bar.appendChild(saveBtn);
  bar.appendChild(mkBtn('+ مشروع جديد', 'btn-o', addProject));
  host.appendChild(bar);

  const eh = document.createElement('div');
  eh.id = 'editorHost';
  host.appendChild(eh);
  renderEditor(eh);

  const list = document.createElement('div');
  list.className = 'list';
  sorted().forEach((p, i, arr) => {
    const row = document.createElement('div');
    row.className = 'row' + (p.published === false ? ' off' : '');
    const img = document.createElement('img');
    img.src = '../assets/projects/' + (p.images[0] || ''); img.alt = ''; img.loading = 'lazy';
    img.onerror = function () { this.style.visibility = 'hidden'; };
    row.appendChild(img);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const b = document.createElement('b'); b.textContent = p.title.ar || p.title.en;
    const s = document.createElement('span');
    s.textContent = p.scope.ar + ' · ' + p.images.length + ' صورة' + (p.published === false ? ' · مخفي' : '');
    meta.appendChild(b); meta.appendChild(s);
    row.appendChild(meta);
    const acts = document.createElement('div');
    acts.className = 'acts';
    acts.appendChild(mkBtn('تعديل', 'btn-o', () => { editingSlug = p.slug; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    acts.appendChild(mkBtn('↑', 'btn-o', () => move(p, -1), i === 0));
    acts.appendChild(mkBtn('↓', 'btn-o', () => move(p, 1), i === arr.length - 1));
    acts.appendChild(mkBtn(p.published === false ? 'إظهار' : 'إخفاء', 'btn-o', () => {
      p.published = p.published === false; setDirty(true); render();
    }));
    acts.appendChild(mkBtn('حذف', 'btn-d', () => {
      if (!confirm('حذف "' + (p.title.ar || p.title.en) + '"؟ التراجع ممكن من تاريخ Git.')) return;
      content.projects = content.projects.filter((x) => x !== p);
      if (editingSlug === p.slug) editingSlug = null;
      setDirty(true); render();
    }));
    row.appendChild(acts);
    list.appendChild(row);
  });
  host.appendChild(list);
}

function move(p, dir) {
  const arr = sorted();
  const i = arr.indexOf(p), j = i + dir;
  if (j < 0 || j >= arr.length) return;
  const a = arr[i].order; arr[i].order = arr[j].order; arr[j].order = a;
  setDirty(true); render();
}

function field(label, value, oninput, opts) {
  opts = opts || {};
  const w = document.createElement('div'); w.className = 'field';
  const l = document.createElement('label'); l.textContent = label;
  const el = document.createElement(opts.textarea ? 'textarea' : 'input');
  el.value = value == null ? '' : value;
  if (opts.ltr) el.setAttribute('dir', 'ltr');
  el.addEventListener('input', () => { oninput(el.value); setDirty(true); });
  w.appendChild(l); w.appendChild(el);
  if (opts.hint) { const h = document.createElement('div'); h.className = 'hint'; h.textContent = opts.hint; w.appendChild(h); }
  return w;
}

function renderEditor(host) {
  host.innerHTML = '';
  if (!editingSlug) return;
  const p = content.projects.find((x) => x.slug === editingSlug);
  if (!p) { editingSlug = null; return; }

  const box = document.createElement('div'); box.className = 'editor';
  const h = document.createElement('h3'); h.textContent = 'تعديل: ' + (p.title.ar || p.title.en);
  const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = 'المعرّف: ' + p.slug;
  box.appendChild(h); box.appendChild(sub);

  const pair = (labAr, labEn, obj) => {
    const g = document.createElement('div'); g.className = 'grid2';
    g.appendChild(field(labAr, obj.ar, (v) => { obj.ar = v; }));
    g.appendChild(field(labEn, obj.en, (v) => { obj.en = v; }, { ltr: true }));
    box.appendChild(g);
  };
  pair('الاسم (عربي)', 'الاسم (إنجليزي)', p.title);
  pair('نطاق العمل (عربي)', 'نطاق العمل (إنجليزي)', p.scope);
  pair('سطر البطاقة (عربي)', 'سطر البطاقة (إنجليزي)', p.cardSubtitle);
  pair('الشريك (عربي)', 'الشريك (إنجليزي)', p.partner);

  const g = document.createElement('div'); g.className = 'grid2';
  g.appendChild(field('التصنيف (للفلاتر)', p.category, (v) => { p.category = v.trim(); }, {
    ltr: true, hint: 'architectural / mechanical / electrical — يمكن الجمع بمسافة'
  }));
  g.appendChild(field('وصف الصورة للقارئات الشاشية', p.alt, (v) => { p.alt = v; }, { ltr: true }));
  box.appendChild(g);

  box.appendChild(field('الوصف (عربي)', p.description.ar, (v) => { p.description.ar = v; }, { textarea: true }));
  box.appendChild(field('الوصف (إنجليزي)', p.description.en, (v) => { p.description.en = v; }, { textarea: true, ltr: true }));

  const sec = document.createElement('div'); sec.className = 'sec';
  const sh = document.createElement('h4'); sh.textContent = 'الصور — الأولى هي صورة البطاقة';
  sec.appendChild(sh);
  const imgs = document.createElement('div'); imgs.className = 'imgs';
  p.images.forEach((name, i) => {
    const bx = document.createElement('div'); bx.className = 'imgbox';
    const im = document.createElement('img');
    im.src = '../assets/projects/' + name; im.alt = name; im.loading = 'lazy';
    im.onerror = function () { this.style.opacity = .25; };
    bx.appendChild(im);
    if (i === 0) { const f = document.createElement('span'); f.className = 'first'; f.textContent = 'الغلاف'; bx.appendChild(f); }
    const tools = document.createElement('div'); tools.className = 'tools';
    const t = (lab, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.disabled = !!dis; b.addEventListener('click', fn); return b; };
    tools.appendChild(t('→', () => swapImg(p, i, i - 1), i === 0));
    tools.appendChild(t('←', () => swapImg(p, i, i + 1), i === p.images.length - 1));
    tools.appendChild(t('✕', () => {
      if (p.images.length === 1) { alert('لا يمكن حذف الصورة الأخيرة — كل مشروع يحتاج غلافاً.'); return; }
      p.images.splice(i, 1); setDirty(true); render();
    }));
    bx.appendChild(tools);
    imgs.appendChild(bx);
  });
  sec.appendChild(imgs);
  box.appendChild(sec);

  const done = mkBtn('إغلاق التعديل', 'btn-o', () => { editingSlug = null; render(); });
  done.style.marginTop = '18px';
  box.appendChild(done);
  host.appendChild(box);
}

function swapImg(p, i, j) {
  if (j < 0 || j >= p.images.length) return;
  const t = p.images[i]; p.images[i] = p.images[j]; p.images[j] = t;
  setDirty(true); render();
}

function addProject() {
  const nameAr = prompt('اسم المشروع بالعربية:'); if (!nameAr) return;
  const nameEn = prompt('اسم المشروع بالإنجليزية:'); if (!nameEn) return;
  const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (!slug) { alert('تعذّر توليد معرّف من الاسم الإنجليزي.'); return; }
  if (content.projects.some((p) => p.slug === slug)) { alert('يوجد مشروع بنفس المعرّف: ' + slug); return; }
  const maxOrder = content.projects.reduce((m, p) => Math.max(m, p.order || 0), 0);
  const first = content.projects[0];
  content.projects.push({
    slug: slug, order: maxOrder + 1, published: false, category: 'architectural',
    title: { en: nameEn, ar: nameAr },
    scope: { en: 'Architectural', ar: 'معماري' },
    partner: { en: '', ar: '' }, cardSubtitle: { en: '', ar: '' }, description: { en: '', ar: '' },
    alt: nameEn, ariaLabel: nameEn,
    heroWidth: (first && first.heroWidth) || 1000,
    heroHeight: (first && first.heroHeight) || 700,
    images: [(first && first.images[0]) || '']
  });
  editingSlug = slug; setDirty(true); render();
  alert('أُضيف المشروع كـ «مخفي». أكمل بياناته وصورته ثم اضغط «إظهار» ثم «حفظ ونشر».');
}

async function saveContent() {
  if (!dirty) return;
  if (!await ensureGh()) return;
  const btn = $('save');
  btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
  clearNote($('msg'));
  try {
    const problems = [];
    content.projects.forEach((p) => {
      if (!p.title.ar || !p.title.en) problems.push(p.slug + ': الاسم ناقص');
      if (!p.images.length || !p.images[0]) problems.push(p.slug + ': لا غلاف');
      if (!p.category.trim()) problems.push(p.slug + ': التصنيف فارغ');
    });
    if (problems.length) throw new Error('راجع: ' + problems.join('، '));

    const newJson = JSON.stringify(content, null, 2) + '\n';
    const newHtml = window.ARCRender.applyAll(indexHtml, content);

    const ref = await gh('/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + BRANCH);
    const baseSha = ref.object.sha;
    const base = await gh('/repos/' + OWNER + '/' + REPO + '/git/commits/' + baseSha);
    const tree = [];
    for (const f of [{ p: 'data/content.json', t: newJson }, { p: 'index.html', t: newHtml }]) {
      const b = await gh('/repos/' + OWNER + '/' + REPO + '/git/blobs', {
        method: 'POST', body: JSON.stringify({ content: toB64(f.t), encoding: 'base64' })
      });
      tree.push({ path: f.p, mode: '100644', type: 'blob', sha: b.sha });
    }
    const t = await gh('/repos/' + OWNER + '/' + REPO + '/git/trees', {
      method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: tree })
    });
    const n = window.ARCRender.livingProjects(content.projects).length;
    const commit = await gh('/repos/' + OWNER + '/' + REPO + '/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: 'Update site content from the admin panel (' + n + ' published projects)', tree: t.sha, parents: [baseSha] })
    });
    await gh('/repos/' + OWNER + '/' + REPO + '/git/refs/heads/' + BRANCH, {
      method: 'PATCH', body: JSON.stringify({ sha: commit.sha })
    });
    indexHtml = newHtml;
    setDirty(false);
    note($('msg'), 'ok', 'تم الحفظ. الموقع يعيد البناء — التغيير يظهر خلال نصف دقيقة تقريباً.');
  } catch (e) {
    note($('msg'), 'err', 'تعذّر الحفظ: ' + e.message);
  } finally {
    btn.textContent = 'حفظ ونشر';
    btn.disabled = !dirty;
  }
}

/* ---------------- render ---------------- */
function render() {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  if (tab === 'leads') renderLeads();
  else if (tab === 'texts') renderTexts();
  else renderProjects();
}

/* ---------------- texts ---------------- */
// tags and HTML entities both need to survive an edit untouched
const looksLikeHtml = (s) => /<[a-z/][^>]*>/i.test(s) || /&[a-z]+;|&#\d+;/i.test(s);

function renderTexts() {
  const host = $('body');
  host.innerHTML = '';

  if (!content) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.appendChild(document.createTextNode('اضغط للتحميل من المستودع. '));
    e.appendChild(mkBtn('تحميل النصوص', 'btn-p', async () => {
      if (!await ensureGh()) return;
      try { await loadContent(); render(); }
      catch (err) { note($('msg'), 'err', 'تعذّر التحميل: ' + err.message); }
    }));
    host.appendChild(e);
    return;
  }
  if (!content.texts) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'ملف المحتوى لا يحوي النصوص. شغّل: node tools/build.js';
    host.appendChild(e);
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'bar';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-p'; saveBtn.id = 'save';
  saveBtn.textContent = 'حفظ ونشر'; saveBtn.disabled = !dirty;
  saveBtn.addEventListener('click', saveContent);
  bar.appendChild(saveBtn);
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'ابحث في نصوص الموقع…';
  search.className = 'search';
  search.value = textFilter;
  search.addEventListener('input', function () {
    textFilter = this.value;
    const pos = this.selectionStart;
    renderTexts();
    const s2 = $('body').querySelector('.search');
    if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); }
  });
  bar.appendChild(search);
  host.appendChild(bar);

  const keys = Object.keys(content.texts);
  const q = textFilter.trim().toLowerCase();
  const groups = {};
  keys.forEach((k) => {
    const t = content.texts[k];
    if (q && (t.en + ' ' + t.ar + ' ' + k).toLowerCase().indexOf(q) === -1) return;
    (groups[t.section] = groups[t.section] || []).push(k);
  });

  const names = Object.keys(groups);
  if (!names.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'لا نتائج لـ "' + textFilter + '".';
    host.appendChild(e);
    return;
  }
  if (q && names.length) openSection = names[0];

  names.forEach((sec) => {
    const wrap = document.createElement('div');
    wrap.className = 'group';
    const head = document.createElement('button');
    head.className = 'group-head' + (openSection === sec ? ' on' : '');
    head.innerHTML = '';
    const nm = document.createElement('b');
    nm.textContent = SECTION_AR[sec] || sec;
    const ct = document.createElement('span');
    ct.textContent = groups[sec].length + ' نص';
    head.appendChild(nm); head.appendChild(ct);
    head.addEventListener('click', () => { openSection = openSection === sec ? null : sec; renderTexts(); });
    wrap.appendChild(head);

    if (openSection === sec) {
      const body = document.createElement('div');
      body.className = 'group-body';
      groups[sec].forEach((k) => body.appendChild(textRow(k)));
      wrap.appendChild(body);
    }
    host.appendChild(wrap);
  });
}

function textRow(key) {
  const t = content.texts[key];
  const row = document.createElement('div');
  row.className = 'trow';

  const k = document.createElement('div');
  k.className = 'tkey';
  k.textContent = key;
  row.appendChild(k);

  const html = looksLikeHtml(t.en) || looksLikeHtml(t.ar);
  if (html) {
    const w = document.createElement('div');
    w.className = 'twarn';
    w.textContent = 'يحتوي رموز HTML مثل <span> أو &rsquo; — عدّل الكلمات فقط وأبقِ الرموز كما هي.';
    row.appendChild(w);
  }

  const g = document.createElement('div');
  g.className = 'grid2';
  const mk = (label, val, set, ltr) => {
    const f = document.createElement('div'); f.className = 'field';
    const l = document.createElement('label'); l.textContent = label;
    const long = String(val).length > 90 || html;
    const el = document.createElement(long ? 'textarea' : 'input');
    el.value = val;
    if (ltr) el.setAttribute('dir', 'ltr');
    if (long) el.rows = Math.min(6, Math.ceil(String(val).length / 60) + 1);
    el.addEventListener('input', () => { set(el.value); setDirty(true); });
    f.appendChild(l); f.appendChild(el);
    return f;
  };
  g.appendChild(mk('عربي', t.ar, (v) => { t.ar = v; }, false));
  g.appendChild(mk('إنجليزي', t.en, (v) => { t.en = v; }, true));
  row.appendChild(g);
  return row;
}

/* ---------------- wire ---------------- */
async function doLogin() {
  const btn = $('loginBtn');
  const email = $('email').value.trim();
  const raw = $('pw').value;
  if (!email || !raw) { note($('loginMsg'), 'err', 'أدخل البريد وكلمة المرور.'); return; }
  btn.disabled = true;
  btn.textContent = 'جارٍ الدخول…';
  clearNote($('loginMsg'));
  try {
    try {
      await signIn(email, raw);
    } catch (first) {
      const trimmed = raw.trim();
      if (trimmed && trimmed !== raw) {
        // almost always a space or newline picked up while copying
        await signIn(email, trimmed);
        $('pw').value = trimmed;
      } else {
        throw first;
      }
    }
    await boot();
  } catch (e) {
    const m = String(e.message || '');
    note($('loginMsg'), 'err',
      /invalid login credentials/i.test(m)
        ? 'البريد أو كلمة المرور غير صحيحة. إن نسختها فتأكد أنها بلا مسافة زائدة — اضغط 👁 لرؤيتها.'
        : /failed to fetch|networkerror/i.test(m)
          ? 'تعذّر الوصول إلى الخادم. تحقق من الاتصال، وإن كان لديك مانع إعلانات فقد يحجب supabase.co.'
          : 'تعذّر الدخول: ' + m);
  } finally {
    btn.disabled = false;
    btn.textContent = 'دخول';
  }
}

$('loginBtn').addEventListener('click', doLogin);
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
$('email').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
$('pwEye').addEventListener('click', function () {
  const f = $('pw');
  const show = f.type === 'password';
  f.type = show ? 'text' : 'password';
  this.textContent = show ? '🙈' : '👁';
  this.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
});
$('logout').addEventListener('click', signOut);
$('refresh').addEventListener('click', async () => { await loadLeads(); render(); });
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  if (dirty && b.dataset.tab !== 'projects' && !confirm('لديك تغييرات غير محفوظة. المغادرة؟')) return;
  tab = b.dataset.tab; render();
}));
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

(async function () {
  if (await refresh()) boot();
})();
})();
