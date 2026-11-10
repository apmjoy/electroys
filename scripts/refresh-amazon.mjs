// Amazon Creators API refresh (runs at build time, every day).
//
// When AMAZON_CREATORS_CLIENT_ID and AMAZON_CREATORS_CLIENT_SECRET are set,
// fetches Amazon's own price, availability and product photo for every ASIN
// and writes src/data/amazon.json. Without credentials it does nothing, and
// the site falls back to brand photos and list prices.
//
// Amazon's rules: prices must be refreshed at least every 24 hours (or shown
// with an "as of" time), and Amazon content must not be stored long-term.
// That's why this file is generated fresh on each daily build and is never
// committed (it is in .gitignore).
//
// Access: the Associates account must qualify for the Creators API (Amazon
// gates it on recent qualifying sales). Credentials are created in Associates
// Central → Tools → Creators API. Docs:
// https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction

import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN_URL = process.env.AMAZON_CREATORS_TOKEN_URL ?? 'https://api.amazon.com/auth/o2/token'; // NA, credential v3.1
const API_URL = 'https://creatorsapi.amazon/catalog/v1/getItems';
const MARKETPLACE = 'www.amazon.com';
const TAG = process.env.AMAZON_PARTNER_TAG ?? 'myelectroys-20';
const OUT = new URL('../src/data/amazon.json', import.meta.url);

const RESOURCES = [
  'itemInfo.title',
  'images.primary.large',
  'offersV2.listings.price',
  'offersV2.listings.availability',
  'offersV2.listings.condition',
  'offersV2.listings.isBuyBoxWinner',
  'offersV2.listings.dealDetails',
];

/** Normalize one Creators API item into the small shape the site uses. */
export function normalizeItem(item) {
  const listings = item?.offersV2?.listings ?? [];
  const l = listings.find((x) => x.isBuyBoxWinner) ?? listings.find((x) => (x.condition?.value ?? 'New') === 'New') ?? listings[0];
  const money = l?.price?.money;
  const basis = l?.price?.savingBasis?.money;
  const img = item?.images?.primary?.large;
  return {
    asin: item.asin,
    url: item.detailPageURL ?? null,
    title: item?.itemInfo?.title?.displayValue ?? null,
    price: typeof money?.amount === 'number' ? money.amount : null,
    currency: money?.currency ?? null,
    display: money?.displayAmount ?? null,
    listPrice: typeof basis?.amount === 'number' && money?.amount != null && basis.amount > money.amount ? basis.amount : null,
    savingsPct: l?.price?.savings?.percentage ?? null,
    availability: l?.availability?.type ?? null,
    deal: l?.dealDetails?.badge ?? null,
    image: img?.url ? { url: img.url, width: img.width ?? null, height: img.height ?? null } : null,
  };
}

async function token(id, secret) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: id, client_secret: secret, scope: 'creatorsapi::default' }),
  });
  if (!res.ok) throw new Error(`token request failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function getItems(accessToken, asins) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'x-marketplace': MARKETPLACE },
    body: JSON.stringify({ itemIds: asins, partnerTag: TAG, marketplace: MARKETPLACE, resources: RESOURCES }),
  });
  if (!res.ok) throw new Error(`getItems failed: HTTP ${res.status} ${await res.text()}`);
  const body = await res.json();
  const items = body?.itemsResult?.items ?? body?.ItemsResult?.Items ?? [];
  const errors = body?.errors ?? body?.Errors ?? [];
  return { items, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.env.AMAZON_CREATORS_CLIENT_ID;
  const secret = process.env.AMAZON_CREATORS_CLIENT_SECRET;
  if (!id || !secret) {
    console.log('Amazon Creators API: no credentials set, skipping (site uses brand photos and list prices).');
    process.exit(0);
  }
  const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
  const asins = [...new Set(products.filter((p) => p.asin && p.status !== 'unavailable').map((p) => p.asin))];
  try {
    const t = await token(id, secret);
    const out = {};
    for (let i = 0; i < asins.length; i += 10) {
      const { items, errors } = await getItems(t, asins.slice(i, i + 10));
      for (const it of items) out[it.asin] = normalizeItem(it);
      for (const e of errors) console.log(`  ! ${e.code ?? e.Code}: ${e.message ?? e.Message}`);
      await new Promise((r) => setTimeout(r, 1100)); // stay under the default 1 request/second
    }
    writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), items: out }, null, 1));
    const priced = Object.values(out).filter((x) => x.price != null).length;
    console.log(`Amazon Creators API: ${Object.keys(out).length}/${asins.length} items, ${priced} with prices.`);
  } catch (e) {
    // Never fail the deploy because Amazon is unavailable: the site falls back gracefully.
    console.error(`Amazon Creators API refresh failed, using fallback data: ${e.message}`);
    process.exit(0);
  }
}
