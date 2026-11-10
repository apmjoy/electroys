import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from '../scripts/validate-products.mjs';
import { classify } from '../scripts/check-links.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));

test('the live catalog passes validation', () => {
  assert.deepEqual(validate(products), []);
});

test('every active product can earn a commission', () => {
  for (const p of products.filter((x) => x.status !== 'unavailable')) {
    assert.ok(p.asin || /^https:\/\//.test(p.url), `${p.id} has no affiliate destination`);
  }
});

test('validator catches common mistakes', () => {
  const good = products[0];
  const errs = validate([{ ...good }, { ...good }]);
  assert.ok(errs.some((e) => e.includes('duplicate id')));
  assert.ok(errs.some((e) => e.includes('duplicate asin')));
  assert.ok(validate([{ ...good, asin: 'b0bad' }]).some((e) => e.includes('asin')));
  assert.ok(validate([{ ...good, priceBand: '$$$$$' }]).some((e) => e.includes('priceBand')));
  assert.ok(validate([{ ...good, categories: ['Toys'] }]).some((e) => e.includes('categories')));
  assert.ok(validate([{ ...good, ageMin: 8, ageMax: 5 }]).some((e) => e.includes('ageMax')));
  assert.ok(validate([]).length > 0);
});

test('link checker classifies Amazon responses', () => {
  assert.equal(classify(200, '<html><span id="productTitle">Robot</span></html>'), 'ok');
  assert.equal(classify(404, ''), 'broken');
  assert.equal(classify(200, 'Sorry! We couldn\'t find that page. dogsofamazon'), 'broken');
  assert.equal(classify(503, ''), 'unknown');
  assert.equal(classify(200, 'Enter the characters you see below. Robot Check'), 'unknown');
  assert.equal(classify(200, '<div id="outOfStock">Currently unavailable.</div>'), 'unavailable');
});

import { parseShopify } from '../scripts/refresh-brand-prices.mjs';
import { normalizeItem } from '../scripts/refresh-amazon.mjs';

test('Shopify price feeds parse in both .json and .js formats', () => {
  assert.deepEqual(parseShopify({ product: { variants: [{ id: 1, price: '49.99', compare_at_price: '59.99' }] } }), { price: 49.99, compareAt: 59.99, available: null });
  assert.deepEqual(parseShopify({ variants: [{ id: 1, price: 2999, compare_at_price: null, available: true }] }), { price: 29.99, compareAt: null, available: true });
  assert.equal(parseShopify({ product: { variants: [{ id: 1, price: '10' }, { id: 2, price: '20' }] } }, 2).price, 20);
  assert.equal(parseShopify({ product: { variants: [] } }), null);
});

test('Amazon Creators API items normalize to price + photo', () => {
  const n = normalizeItem({
    asin: 'B000000001', detailPageURL: 'https://www.amazon.com/dp/B000000001?tag=x',
    images: { primary: { large: { url: 'https://m.media-amazon.com/images/I/x.jpg', width: 500, height: 500 } } },
    offersV2: { listings: [{ isBuyBoxWinner: true, price: { money: { amount: 59.49, currency: 'USD', displayAmount: '$59.49' }, savingBasis: { money: { amount: 69.99 } }, savings: { percentage: 15 } }, availability: { type: 'IN_STOCK' } }] },
  });
  assert.equal(n.price, 59.49);
  assert.equal(n.listPrice, 69.99);
  assert.equal(n.savingsPct, 15);
  assert.equal(n.image.url, 'https://m.media-amazon.com/images/I/x.jpg');
  assert.equal(normalizeItem({ asin: 'B1' }).price, null);
});

import { isPriceDateFresh, aboutPrice } from '../src/lib/price-rules.mjs';

test('list prices older than 45 days are treated as stale', () => {
  const now = Date.parse('2026-12-01T12:00:00Z');
  assert.equal(isPriceDateFresh('2026-11-20', now), true);
  assert.equal(isPriceDateFresh('2026-10-18', now), true);
  assert.equal(isPriceDateFresh('2026-10-01', now), false);
  assert.equal(isPriceDateFresh(undefined, now), false);
});

test('card prices round sensibly', () => {
  assert.equal(aboutPrice(16.99), 'About $17');
  assert.equal(aboutPrice(44.95), 'About $45');
  assert.equal(aboutPrice(149.99), 'About $150');
  assert.equal(aboutPrice(121.47), 'About $120');
});
