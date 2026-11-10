// Daily brand list-price refresh.
//
// For every product with a `feedUrl` (a brand's public Shopify product JSON),
// read the current price and update `listPrice` + `priceCheckedAt` in
// src/data/products.json. Products without a feed keep their researched list
// price; the site shows when each price was last checked.
//
// Safety: a price that moves more than 60% in one day is NOT applied (it is
// more likely a wrong variant or a feed glitch) and is reported instead.
//
// Usage: node scripts/refresh-brand-prices.mjs [--dry-run]

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../src/data/products.json', import.meta.url);
const dryRun = process.argv.includes('--dry-run');
const today = new Date().toISOString().slice(0, 10);

/** Extract { price, compareAt, available } from a Shopify .json or .js product payload. */
export function parseShopify(body, variantId) {
  const product = body.product ?? body;
  const variants = product.variants ?? [];
  const v = (variantId && variants.find((x) => String(x.id) === String(variantId))) || variants[0];
  if (!v) return null;
  // /products/<handle>.js reports integer cents; /products/<handle>.json reports "49.99" strings.
  const isJs = !body.product;
  const conv = (x) => {
    if (x == null || x === '') return null;
    const n = isJs && typeof x === 'number' ? x / 100 : Number(x);
    return Number.isFinite(n) ? n : null;
  };
  const price = conv(v.price);
  const compareAt = conv(v.compare_at_price);
  return price && price > 0 ? { price: Math.round(price * 100) / 100, compareAt: compareAt && compareAt > price ? compareAt : null, available: v.available ?? null } : null;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'ElectroysPriceBot/1.0 (+https://electroys.com)' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const products = JSON.parse(readFileSync(FILE, 'utf8'));
  const changes = [];
  const problems = [];
  for (const p of products) {
    if (!p.feedUrl || p.status === 'unavailable') continue;
    try {
      const parsed = parseShopify(await fetchJson(p.feedUrl), p.variantId);
      if (!parsed) { problems.push(`${p.id}: feed had no usable price`); continue; }
      const old = p.listPrice;
      if (old && Math.abs(parsed.price - old) / old > 0.6) {
        problems.push(`${p.id}: price jumped ${old} → ${parsed.price}; not applied, please check ${p.feedUrl}`);
        continue;
      }
      if (old !== parsed.price) changes.push(`${p.id}: ${old ?? '—'} → ${parsed.price}`);
      p.listPrice = parsed.price;
      p.priceCheckedAt = today;
      if (parsed.available === false) problems.push(`${p.id}: sold out on the brand's own store (Amazon may still have it)`);
    } catch (e) {
      problems.push(`${p.id}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`Brand prices: ${changes.length} changed, ${problems.length} notes`);
  changes.forEach((c) => console.log('  ✓ ' + c));
  problems.forEach((c) => console.log('  ! ' + c));
  if (!dryRun) writeFileSync(FILE, JSON.stringify(products, null, 1) + '\n');
}
