// Render stills for review: node still.mjs a60 1.2,3.4,... outdir
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [variant, times, outDir = 'out/stills'] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'src');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
await new Promise(r => srv.listen(0, r));
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const logs = []; page.on('console', m => logs.push(m.text())); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${port}/index.html?v=${variant}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
const err = await page.evaluate(() => window.__error);
if (err) { console.error(err, logs); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
for (const t of times.split(',').map(Number)) {
  const t0 = Date.now();
  await page.evaluate(t => window.__seek(t), t);
  await page.screenshot({ path: `${outDir}/${variant}_${t.toFixed(2)}.jpg`, type: 'jpeg', quality: 85 });
  process.stdout.write(`${t} ${Date.now() - t0}ms\n`);
}
if (logs.length) console.log(logs.slice(0, 20).join('\n'));
await browser.close(); srv.close();
