// Downloads each product's official brand photo (imageSourceUrl), optimizes it
// to a lightweight WebP on a white 4:3 canvas, saves it to public/products/<id>.webp
// and points the product's `image` at it. Hosting our own copy keeps pages fast
// and means a brand redesigning its website can't break our product cards.
//
// Manual photos: save an official photo as photos-inbox/<product-id>.jpg (or
// .png/.webp) and run this script; it is optimized and attached automatically.
//
// Usage: node scripts/fetch-brand-images.mjs [--force] [--only id1,id2]

import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../src/data/products.json', import.meta.url);
const DIR = new URL('../public/products/', import.meta.url);
const force = process.argv.includes('--force');
const onlyArg = process.argv[process.argv.indexOf('--only') + 1];
const only = process.argv.includes('--only') ? new Set(onlyArg.split(',')) : null;

mkdirSync(DIR, { recursive: true });
const INBOX = new URL('../photos-inbox/', import.meta.url);

async function optimize(input, p) {
  const out = new URL(`${p.id}.webp`, DIR);
  const meta = await sharp(input).metadata();
  if (!meta.width || meta.width < 300) throw new Error(`too small (${meta.width}px)`);
  await sharp(input)
    .flatten({ background: '#ffffff' })
    .trim({ background: '#ffffff', threshold: 12 })
    .resize(1000, 750, { fit: 'contain', background: '#ffffff' })
    .webp({ quality: 80, effort: 5 })
    .toFile(out.pathname);
  await sharp(out.pathname).resize(440).webp({ quality: 74 }).toFile(new URL(`${p.id}-sm.webp`, DIR).pathname);
  p.image = `/products/${p.id}.webp`;
}
const products = JSON.parse(readFileSync(FILE, 'utf8'));
let ok = 0, skipped = 0;
const failed = [];

for (const p of products) {
  if (only && !only.has(p.id)) continue;
  const manual = ['jpg', 'jpeg', 'png', 'webp'].map((ext) => new URL(`${p.id}.${ext}`, INBOX)).find((u) => existsSync(u));
  if (manual) {
    try { await optimize(manual.pathname, p); ok++; } catch (e) { failed.push(`${p.id} (inbox): ${e.message}`); }
    continue;
  }
  if (!p.imageSourceUrl) continue;
  const out = new URL(`${p.id}.webp`, DIR);
  if (existsSync(out) && !force) {
    const sm = new URL(`${p.id}-sm.webp`, DIR);
    if (!existsSync(sm)) await sharp(out.pathname).resize(440).webp({ quality: 74 }).toFile(sm.pathname);
    p.image = `/products/${p.id}.webp`;
    skipped++;
    continue;
  }
  try {
    const res = await fetch(p.imageSourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0 ElectroysImageBot/1.0 (+https://electroys.com)' }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 15_000_000) throw new Error('image over 15 MB');
    await optimize(buf, p);
    ok++;
  } catch (e) {
    failed.push(`${p.id}: ${e.message}`);
  }
}
writeFileSync(FILE, JSON.stringify(products, null, 1) + '\n');
console.log(`Brand photos: ${ok} downloaded, ${skipped} already present, ${failed.length} failed`);
failed.forEach((f) => console.log('  ! ' + f));
