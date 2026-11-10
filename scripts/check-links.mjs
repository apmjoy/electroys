// Weekly product health check.
//
// Visits every product's Amazon page and sorts the results into:
//   ok          — page loads and looks purchasable
//   unavailable — Amazon says "Currently unavailable" / no buying options
//   broken      — 404 / dog page: the ASIN no longer exists
//   unknown     — Amazon blocked the automated request (captcha / 503)
//
// Amazon often answers automated requests with a captcha; those count as
// "unknown" and never raise an alarm. The fully reliable option is Amazon's
// Product Advertising / Creators API once the Associates account qualifies.
//
// It never edits the catalog. A person reviews the report and sets
// "status": "unavailable" (or replaces the product) in src/data/products.json.
//
// Usage: node scripts/check-links.mjs [--report report.md] [--limit 10]

import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const reportPath = opt('--report');
const limit = Number(opt('--limit') ?? Infinity);

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'))
  .filter((p) => p.status !== 'unavailable')
  .slice(0, limit);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function classify(status, html) {
  if (status === 404 || /dogsofamazon|Page Not Found|looking for something\?/i.test(html)) return 'broken';
  if (status === 503 || /captcha|Robot Check|automated access/i.test(html)) return 'unknown';
  if (status >= 500 || status === 0) return 'unknown';
  if (/id="outOfStock"|Currently unavailable\.|We don't know when or if this item will be back/i.test(html)) return 'unavailable';
  if (status === 200 && /id="productTitle"|id="title"/.test(html)) return 'ok';
  return 'unknown';
}

async function check(p) {
  const url = p.asin ? `https://www.amazon.com/dp/${p.asin}` : p.url;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });
      const html = (await res.text()).slice(0, 600_000);
      const state = classify(res.status, html);
      if (state !== 'unknown' || attempt === 1) return { p, url, state, status: res.status };
    } catch (e) {
      if (attempt === 1) return { p, url, state: 'unknown', status: 0, error: String(e.message ?? e) };
    }
    await sleep(4000);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = [];
  for (const p of products) {
    const r = await check(p);
    results.push(r);
    console.log(`${r.state.padEnd(11)} ${r.status} ${p.id}`);
    await sleep(1500 + Math.random() * 1500); // be polite
  }

  const by = (s) => results.filter((r) => r.state === s);
  const problems = [...by('broken'), ...by('unavailable')];
  const lines = [
    `## Product health check — ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Checked ${results.length} products: ✅ ${by('ok').length} ok · ⚠️ ${by('unavailable').length} unavailable · ❌ ${by('broken').length} broken · ❔ ${by('unknown').length} couldn't check (Amazon blocked the robot; usually fine).`,
    '',
  ];
  if (problems.length) {
    lines.push('NEEDS_ATTENTION', '', '| Product | State | Link |', '|---|---|---|');
    for (const r of problems) lines.push(`| ${r.p.title} (\`${r.p.id}\`) | ${r.state} | ${r.url} |`);
    lines.push(
      '',
      '**What to do:** open each link. If the product really is gone, either replace it or set `"status": "unavailable"` on it in `src/data/products.json` and commit. The site rebuilds automatically.',
    );
  }
  const report = lines.join('\n');
  console.log('\n' + report);
  if (reportPath) writeFileSync(reportPath, report + '\n');
}
