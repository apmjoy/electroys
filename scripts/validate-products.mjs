// Fails the build if the product catalog has problems. Runs before every build
// and in CI, so a bad edit can never reach the live site.
import { existsSync, readFileSync } from 'node:fs';

const CATEGORIES = new Set(['Robotics', 'Coding', 'Electronics', 'Science', 'Engineering', 'Building', 'Math & Logic', 'Space', 'Nature', 'Art & Design', 'Games & Puzzles']);
const OCCASIONS = new Set(['Holiday', 'Birthday', 'Stocking Stuffer', 'Classroom', 'Rainy Day']);
const BANDS = new Set(['$', '$$', '$$$', '$$$$']);

export function validate(products) {
  const errors = [];
  if (!Array.isArray(products) || products.length === 0) return ['Catalog must be a non-empty array'];
  const ids = new Set();
  const asins = new Set();
  for (const [n, p] of products.entries()) {
    const at = `#${n} (${p?.id ?? 'no id'})`;
    const err = (m) => errors.push(`${at}: ${m}`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? '')) err('id must be kebab-case');
    if (ids.has(p.id)) err('duplicate id'); ids.add(p.id);
    if (p.asin) {
      if (!/^[A-Z0-9]{10}$/.test(p.asin)) err('asin must be 10 uppercase letters/digits');
      if (asins.has(p.asin)) err(`duplicate asin ${p.asin}`); asins.add(p.asin);
    } else if (!/^https:\/\//.test(p.url ?? '')) err('needs an asin or an https url');
    for (const k of ['title', 'brand', 'tagline', 'summary']) if (typeof p[k] !== 'string' || !p[k].trim()) err(`missing ${k}`);
    if (p.tagline && p.tagline.length > 80) err('tagline over 80 chars');
    if (!Number.isInteger(p.ageMin) || p.ageMin < 0 || p.ageMin > 18) err('ageMin must be an integer 0–18');
    if (p.ageMax !== null && (!Number.isInteger(p.ageMax) || p.ageMax < p.ageMin)) err('ageMax must be null or >= ageMin');
    if (!Array.isArray(p.categories) || !p.categories.length || p.categories.some((c) => !CATEGORIES.has(c))) err(`bad categories ${JSON.stringify(p.categories)}`);
    if (!BANDS.has(p.priceBand)) err('priceBand must be $, $$, $$$ or $$$$');
    for (const k of ['highlights', 'skills']) if (!Array.isArray(p[k]) || !p[k].length) err(`${k} must be a non-empty list`);
    if (!Array.isArray(p.considerations)) err('considerations must be a list');
    if (!Array.isArray(p.occasions) || p.occasions.some((o) => !OCCASIONS.has(o))) err(`bad occasions ${JSON.stringify(p.occasions)}`);
    if (typeof p.screenFree !== 'boolean') err('screenFree must be true/false');
    if (typeof p.editorPick !== 'boolean') err('editorPick must be true/false');
    if (p.status && !['active', 'unavailable'].includes(p.status)) err('status must be active or unavailable');
    if (p.listPrice != null && !(typeof p.listPrice === 'number' && p.listPrice > 0 && p.listPrice < 5000)) err('listPrice must be a positive USD number');
    if (p.image && !/^\/products\/[a-z0-9-]+\.webp$/.test(p.image)) err('image must be /products/<id>.webp');
    if (p.image && !existsSync(new URL(`../public${p.image}`, import.meta.url))) err(`image file missing: public${p.image}`);
    if (p.glance) {
      const g = p.glance;
      if (!['none', 'included', 'required', 'unknown'].includes(g.batteries)) err('glance.batteries must be none, included, required or unknown');
      if (!['minimal', 'some', 'lots', 'unknown'].includes(g.adultHelp)) err('glance.adultHelp must be minimal, some, lots or unknown');
      if (!['solo', 'together', 'either'].includes(g.playStyle)) err('glance.playStyle must be solo, together or either');
      if (g.bestFor != null && (typeof g.bestFor !== 'string' || g.bestFor.length > 80)) err('glance.bestFor must be a short phrase');
    }
    for (const k of ['mfrUrl', 'feedUrl', 'imageSourceUrl']) if (p[k] && !/^https:\/\//.test(p[k])) err(`${k} must be an https URL`);
  }
  const active = products.filter((p) => p.status !== 'unavailable');
  if (active.filter((p) => p.editorPick).length < 4) errors.push('Need at least 4 active editor picks for the homepage');
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
  const errors = validate(products);
  if (errors.length) {
    console.error(`✗ Product catalog has ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  const active = products.filter((p) => p.status !== 'unavailable');
  console.log(`✓ ${active.length} active products valid (${products.length - active.length} unavailable)`);
}
