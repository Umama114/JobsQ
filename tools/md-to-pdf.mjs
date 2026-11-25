// Renders a Markdown doc to a PDF styled like the TrunkQ framework documents.
// Usage: node tools/md-to-pdf.mjs docs/PRD.md docs/PRD.pdf "Nov 16, 2026" "@Abdul Ahad" "Owner: Abdul Muqtadir (CTO)" "Draft v0.1"
// Needs Chrome or Edge installed (used headless to print the PDF). No npm packages.
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [src, out, date = '', author = '', owner = '', status = '', tocFlag = ''] = process.argv.slice(2);
const WANT_TOC = tocFlag === 'toc'; // 7th argument "toc": add a clickable index with page numbers (needs python + pypdf)
if (!src || !out) { console.error('usage: md-to-pdf.mjs <in.md> <out.pdf> [date] [author] [owner] [status]'); process.exit(1); }

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => (/^(https?:|mailto:|#)/.test(url) ? `<a href="${url}">${text}</a>` : text))
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  .replace(/\[TBD([^\]]*)\]/g, '<span class="tbd">TBD$1</span>');

const lines = readFileSync(src, 'utf8').replace(/\r/g, '').split('\n');
let html = '', title = '', i = 0;
const heads = []; // headings for the index
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function list(baseIndent) {
  // Consumes consecutive list items at >= baseIndent; nested items recurse.
  const m0 = lines[i].match(/^(\s*)([-*]|\d+\.)\s+/);
  const tag = /\d/.test(m0[2]) ? 'ol' : 'ul';
  let h = `<${tag}>`;
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (!m || m[1].length < baseIndent) break;
    if (m[1].length > baseIndent) { h = h.replace(/<\/li>$/, '') + list(m[1].length) + '</li>'; continue; }
    let text = m[3]; i++;
    while (i < lines.length && /^\s+\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) text += ' ' + lines[i++].trim();
    h += `<li>${inline(text)}</li>`;
  }
  return h + `</${tag}>`;
}

while (i < lines.length) {
  const l = lines[i];
  if (!l.trim()) { i++; continue; }
  if (l.startsWith('```')) {
    let code = ''; i++;
    while (i < lines.length && !lines[i].startsWith('```')) code += lines[i++] + '\n';
    i++; html += `<pre>${esc(code.replace(/\n$/, ''))}</pre>`; continue;
  }
  const h = l.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    if (h[1].length === 1 && !title) { title = h[2]; i++; continue; }
    const lv = h[1].length, inl = inline(h[2]);
    let idAttr = '';
    if (WANT_TOC && (lv === 2 || lv === 3)) { const id = 's' + heads.length; heads.push({ id, lv, html: inl, text: plain(inl) }); idAttr = ` id="${id}"`; }
    html += `<h${lv}${idAttr}>${inl}</h${lv}>`; i++; continue;
  }
  if (/^---+\s*$/.test(l)) { i++; continue; }
  if (l.trim().startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
    const hasSep = rows[1] && rows[1].every((c) => /^:?-+:?$/.test(c));
    const head = hasSep ? rows[0] : null, body = hasSep ? rows.slice(2) : rows;
    const blankHead = head && head.every((c) => !c);
    html += '<table>';
    if (head && !blankHead) html += '<thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>';
    html += '<tbody>' + body.map((r) => '<tr>' + r.map((c, k) => `<td${blankHead && k === 0 ? ' class="key"' : ''}>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
    continue;
  }
  if (/^\s*([-*]|\d+\.)\s+/.test(l)) { html += list(l.match(/^\s*/)[0].length); continue; }
  const img = l.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/); // a picture on its own line: ![caption](path/relative/to/this/file.svg)
  if (img) {
    const file = resolve(dirname(resolve(src)), img[2]);
    html += existsSync(file) ? `<figure><img src="${pathToFileURL(file).href}" alt="${esc(img[1])}"><figcaption>${esc(img[1])}</figcaption></figure>` : `<p class="tbd">missing image ${esc(img[2])}</p>`;
    i++; continue;
  }
  let p = l; i++;
  while (i < lines.length && lines[i].trim() && !/^(#|\||```|\s*([-*]|\d+\.)\s+|---|!\[)/.test(lines[i])) p += ' ' + lines[i++];
  html += `<p>${inline(p)}</p>`;
}

const chip = (t) => (t ? `<span class="chip">${esc(t)}</span>` : '');
const meta = [chip(date), chip(author), owner ? `<span class="plain">${esc(owner)}</span>` : '', status ? `<span class="chip draft">${esc(status)}</span>` : ''].filter(Boolean).join('<span class="dot">·</span>');
const running = title.replace(/"/g, '\\"');

const tocHtml = (pages) => !WANT_TOC ? '' : '<div class="toc"><h2 class="tochead">Index</h2><p class="tochint">Press any line to jump to the page where that topic starts.</p>' +
  heads.map((h, k) => `<a class="toc${h.lv}" href="#${h.id}"><span class="t">${h.html}</span><span class="pg">${pages ? pages[k] : '00'}</span></a>`).join('') + '<p class="tocend">— end of index —</p></div>';
const build = (pages) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page { size: A4; margin: 24mm 18mm 22mm 18mm;
  @top-left { content: "${running}"; font: 7pt "Segoe UI", Arial, sans-serif; color: #555; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7pt "Segoe UI", Arial, sans-serif; color: #555; } }
* { box-sizing: border-box; }
body { font: 10pt/1.5 "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #1f1f1f; margin: 0; }
h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; font-weight: 400; color: #1a1a1a; break-after: avoid; }
h1 { font-size: 25pt; line-height: 1.2; margin: 0 0 8pt; }
h2 { font-size: 16pt; margin: 20pt 0 7pt; }
h3 { font-size: 12.5pt; margin: 15pt 0 5pt; }
h4 { font-size: 10pt; font-weight: 700; margin: 12pt 0 4pt; break-after: avoid; }
p { margin: 0 0 7pt; }
.meta { margin: 0 0 9pt; font-size: 10pt; }
.chip { background: #f0efed; border-radius: 4px; padding: 1.5pt 6pt; font-size: 8.5pt; color: #333; }
.chip.draft { background: #fdf0d5; color: #7a4b00; font-weight: 600; }
.dot { margin: 0 5pt; color: #666; }
ul, ol { margin: 0 0 7pt; padding-left: 17pt; }
li { margin: 2pt 0; } li > ul, li > ol { margin: 2pt 0; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 11pt; font-size: 9pt; line-height: 1.4; }
th, td { border: 0.6pt solid #dddcd8; padding: 4.5pt 6pt; text-align: left; vertical-align: top; }
th { background: #f4f3f1; font-weight: 500; color: #2a2a2a; }
td.key { background: #f4f3f1; width: 24%; font-weight: 500; }
tr { break-inside: avoid; }
pre { background: #f4f3f1; border-radius: 4px; padding: 8pt 10pt; font: 8.5pt/1.5 Consolas, "Courier New", monospace; white-space: pre-wrap; break-inside: avoid; margin: 7pt 0 10pt; }
code { font: 8.8pt Consolas, monospace; background: #f4f3f1; padding: 0 3pt; border-radius: 3px; }
figure { margin: 8pt 0 12pt; text-align: center; break-inside: avoid; }
figure img { width: 100%; max-width: 170mm; }
figcaption { font-size: 8.5pt; color: #666; margin-top: 3pt; }
a { color: #1f1f1f; text-decoration: underline; text-decoration-color: #aaa; }
.tbd { background: #fdf0d5; color: #7a4b00; border-radius: 3px; padding: 0 3pt; font-weight: 600; font-size: 0.92em; }
strong { font-weight: 650; }
.toc { break-after: page; }
.tochead { margin-top: 6pt; }
.tochint { color: #666; font-size: 8.5pt; margin-bottom: 8pt; }
a.toc2, a.toc3 { display: flex; align-items: baseline; text-decoration: none; color: #1f1f1f; break-inside: avoid; }
a.toc2 { font-weight: 650; margin-top: 5pt; font-size: 10pt; }
a.toc3 { padding-left: 14pt; font-size: 9pt; margin-top: 1pt; }
a.toc2 .t, a.toc3 .t { flex: 0 1 auto; }
a.toc2::after, a.toc3::after { content: ""; order: 1; flex: 1 1 auto; border-bottom: 0.6pt dotted #aaa; margin: 0 4pt; min-width: 12pt; }
a.toc2 .pg, a.toc3 .pg { order: 2; flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.tocend { color: #888; font-size: 7.5pt; margin-top: 10pt; }
</style></head><body><h1>${inline(title)}</h1><p class="meta">${meta}</p>${tocHtml(pages)}${html}</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'md2pdf-'));
const htmlPath = join(dir, 'doc.html');
const browser = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
if (!browser) { console.error('Chrome or Edge not found'); process.exit(1); }
const render = (pages) => {
  writeFileSync(htmlPath, build(pages), 'utf8');
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--generate-pdf-document-outline', `--user-data-dir=${join(dir, 'profile')}`, `--print-to-pdf=${resolve(out)}`, pathToFileURL(htmlPath).href], { stdio: 'ignore' });
};
render(null);
if (WANT_TOC) {
  // Pass 1 gave the layout; find the page where each heading starts, then print again with real numbers.
  const jsonPath = join(dir, 'heads.json');
  writeFileSync(jsonPath, JSON.stringify(heads.map((h) => h.text)), 'utf8');
  const py = join(dirname(fileURLToPath(import.meta.url)), 'pdf-heading-pages.py');
  const pages = JSON.parse(execFileSync('python', [py, resolve(out), jsonPath], { encoding: 'utf8' }));
  render(pages);
  console.log('index entries:', heads.length);
}
console.log('wrote', resolve(out));
