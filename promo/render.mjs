// Frame-accurate renderer: N headless Chromium workers seek the timeline and capture JPEG frames.
// usage: node render.mjs <variant> [fps=60] [workers=6]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [variant, fpsArg = '60', wArg = '6'] = process.argv.slice(2);
const FPS = +fpsArg, W = +wArg;
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(here, 'src');
const outDir = path.join(here, 'out', 'frames_' + variant);
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] }); r.end(d); }); });
await new Promise(r => srv.listen(0, r));
const url = `http://localhost:${srv.address().port}/index.html?v=${variant}`;
let total = 0, done = 0; const t0 = Date.now();
async function worker(w) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__error); if (err) throw new Error(err);
  const dur = await page.evaluate(() => window.__meta.duration);
  total = Math.round(dur * FPS);
  const cdp = await page.context().newCDPSession(page);
  for (let i = w; i < total; i += W) {
    const f = path.join(outDir, String(i).padStart(5, '0') + '.jpg');
    if (fs.existsSync(f) && fs.statSync(f).size > 1000) { done++; continue; }
    await page.evaluate(t => window.__seek(t), i / FPS);
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true });
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
    done++;
    if (w === 0 && done % 300 < W) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${variant} ${done}/${total}  ${(el / done * 1000).toFixed(0)}ms/frame  eta ${((total - done) * el / done / 60).toFixed(1)}min`);
    }
  }
  await browser.close();
}
await Promise.all([...Array(W)].map((_, w) => worker(w)));
console.log(`${variant} done: ${total} frames in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
srv.close();
