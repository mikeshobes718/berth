// Dump the timeline (cues, sections, VO) for each variant so the audio build can follow it.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'src');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] }); r.end(d); }); });
await new Promise(r => srv.listen(0, r));
const browser = await chromium.launch();
fs.mkdirSync('out', { recursive: true });
for (const v of process.argv.slice(2)) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://localhost:${srv.address().port}/index.html?v=${v}`);
  await page.waitForFunction(() => window.__ready || window.__error);
  const m = await page.evaluate(() => window.__error ? { error: window.__error } : window.__meta);
  if (m.error) { console.error(v, m.error); process.exit(1); }
  fs.writeFileSync(`out/meta_${v}.json`, JSON.stringify(m, null, 1));
  console.log(v, m.duration.toFixed(2) + 's', m.cues.length, 'cues', m.sections.length, 'sections', m.vo.length, 'vo');
  await page.close();
}
await browser.close(); srv.close();
