import raw from '../data/products.json';
import { aboutPrice, isPriceDateFresh } from './price-rules.mjs';
import { AGE_BANDS, AFFILIATE_TAG, BUDGETS, INTERESTS, type AgeBand, type Interest } from './taxonomy';

export interface Product {
  id: string;
  title: string;
  brand: string;
  /** Amazon ASIN (or ISBN-10 for books). */
  asin?: string;
  /** Non-Amazon affiliate destination, used when there is no ASIN. */
  url?: string;
  retailer?: string;
  ageMin: number;
  ageMax: number | null;
  categories: string[];
  priceBand: '$' | '$$' | '$$$' | '$$$$';
  tagline: string;
  summary: string;
  highlights: string[];
  skills: string[];
  considerations: string[];
  screenFree: boolean;
  requiresDevice: string | null;
  occasions: string[];
  editorPick: boolean;
  /** Official brand photo, optimized and stored under /products/. */
  image?: string;
  imageAlt?: string;
  /** Where the brand photo came from (official brand page/CDN). */
  imageSourceUrl?: string;
  /** Official product page on the brand's own site. */
  mfrUrl?: string;
  /** Brand's own US list price in USD (refreshed daily when feedUrl is set). */
  listPrice?: number | null;
  priceCheckedAt?: string;
  /** Public Shopify product JSON used for the daily price refresh. */
  feedUrl?: string | null;
  variantId?: string | number | null;
  /** Where the ASIN/listing was verified. */
  source?: string;
  addedAt?: string;
  checkedAt?: string;
  status?: 'active' | 'unavailable';
  /** Structured at-a-glance facts (derived from the researched listing text). */
  glance?: Glance;
}

export interface Glance {
  batteries: 'none' | 'included' | 'required' | 'unknown';
  batteryNote: string | null;
  adultHelp: 'minimal' | 'some' | 'lots' | 'unknown';
  playStyle: 'solo' | 'together' | 'either';
  bestFor: string | null;
  inTheBox: string | null;
}

export const GLANCE_LABELS = {
  batteries: { none: 'Not needed', included: 'Included / rechargeable', required: 'Required, not included', unknown: 'Check listing' },
  adultHelp: { minimal: 'Little to none', some: 'Some, for setup', lots: 'Plan to help', unknown: 'Varies' },
  playStyle: { solo: 'Solo', together: 'Together (2+ players)', either: 'Solo or together' },
} as const;

export function batteriesLabel(g?: Glance): string {
  if (!g) return 'Check listing';
  // A note always wins: it says how a plug-in item is powered, or the battery count.
  return g.batteryNote ?? GLANCE_LABELS.batteries[g.batteries];
}

export const products: Product[] = (raw as Product[]).filter((p) => p.status !== 'unavailable');

/* Amazon Creators API data ----------------------------------------------------
   Generated fresh on each daily build by scripts/refresh-amazon.mjs. Missing
   until the Associates account has API access; everything falls back cleanly. */
export interface AmazonItem {
  asin: string; url: string | null; title: string | null;
  price: number | null; currency: string | null; display: string | null;
  listPrice: number | null; savingsPct: number | null; availability: string | null; deal: string | null;
  image: { url: string; width: number | null; height: number | null } | null;
}
const amazonFiles = import.meta.glob<{ default: { fetchedAt: string; items: Record<string, AmazonItem> } }>('../data/amazon.json', { eager: true });
const amazonData = Object.values(amazonFiles)[0]?.default;
const AMAZON_MAX_AGE_MS = 26 * 3600 * 1000; // Amazon requires prices no older than 24h; builds run daily.
export const amazonFetchedAt: Date | null =
  amazonData && Date.now() - Date.parse(amazonData.fetchedAt) < AMAZON_MAX_AGE_MS ? new Date(amazonData.fetchedAt) : null;

export function amazonFor(p: Product): AmazonItem | null {
  if (!amazonFetchedAt || !p.asin) return null;
  const it = amazonData!.items[p.asin];
  return it && it.availability !== 'OUT_OF_STOCK' ? it : null;
}

export interface PriceView {
  /** 'amazon' = Amazon's live price, 'list' = brand list price, 'band' = typical range only. */
  kind: 'amazon' | 'list' | 'band';
  amount: number | null;
  display: string;
  /** Rounded form for cards and lists, e.g. "About $45". */
  approx: string;
  was: number | null;
  savingsPct: number | null;
  asOf: string | null;
}

export function isListPriceFresh(p: Product, now = Date.now()): boolean {
  return Boolean(p.listPrice) && isPriceDateFresh(p.priceCheckedAt, now);
}

const usd = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

export function priceFor(p: Product): PriceView {
  const az = amazonFor(p);
  if (az?.price != null && az.currency === 'USD') {
    const display = az.display ?? usd(az.price);
    return { kind: 'amazon', amount: az.price, display, approx: display, was: az.listPrice, savingsPct: az.savingsPct, asOf: amazonFetchedAt!.toISOString() };
  }
  if (isListPriceFresh(p)) {
    return { kind: 'list', amount: p.listPrice!, display: usd(p.listPrice!), approx: aboutPrice(p.listPrice!), was: null, savingsPct: null, asOf: p.priceCheckedAt ?? null };
  }
  return { kind: 'band', amount: null, display: p.priceBand, approx: p.priceBand, was: null, savingsPct: null, asOf: null };
}

/** Best photo available: Amazon (when licensed via API), then official brand photo. */
export function photoFor(p: Product): { src: string; kind: 'amazon' | 'brand' } | null {
  const az = amazonFor(p);
  if (az?.image?.url) return { src: az.image.url, kind: 'amazon' };
  if (p.image) return { src: p.image, kind: 'brand' };
  return null;
}

export function productById(id: string) {
  return products.find((p) => p.id === id);
}

export function buyUrl(p: Product): string {
  if (p.asin) return `https://www.amazon.com/dp/${p.asin}?tag=${AFFILIATE_TAG}`;
  return p.url ?? '#';
}

export function retailerName(p: Product): string {
  return p.asin ? 'Amazon' : p.retailer ?? 'retailer';
}

/**
 * Open-ended ranges ("4+") get a realistic upper bound so a preschool toy
 * isn't recommended to tweens. 10+ products stay relevant for teens.
 */
export function effectiveAgeMax(p: Product): number {
  if (p.ageMax != null) return p.ageMax;
  if (p.ageMin >= 12) return 99;
  if (p.ageMin >= 10) return 17;
  return p.ageMin + 4;
}

export function ageLabel(p: Product): string {
  if (p.ageMax == null || p.ageMax >= 99) return `Ages ${p.ageMin}+`;
  return `Ages ${p.ageMin}–${p.ageMax}`;
}

export function fitsBand(p: Product, band: AgeBand): boolean {
  return p.ageMin <= band.max && effectiveAgeMax(p) >= band.min;
}

export function bandsFor(p: Product): AgeBand[] {
  return AGE_BANDS.filter((b) => fitsBand(p, b));
}

export function interestsFor(p: Product): Interest[] {
  return INTERESTS.filter((i) => i.sources.some((s) => p.categories.includes(s)));
}

export function primaryInterest(p: Product): Interest {
  return interestsFor(p)[0] ?? INTERESTS[4];
}

/** Budget bucket from the best known price, falling back to the researched band. */
export function bandFor(p: Product): Product['priceBand'] {
  const amt = priceFor(p).amount;
  if (amt == null) return p.priceBand;
  return amt < 25 ? '$' : amt < 50 ? '$$' : amt < 100 ? '$$$' : '$$$$';
}

export function budgetFor(p: Product) {
  return BUDGETS.find((b) => b.band === bandFor(p)) ?? BUDGETS[1];
}

/** Stable ordering: editor picks first, then everything else as curated in the data file. */
export function ranked(list: Product[]): Product[] {
  return [...list].sort((a, b) => Number(b.editorPick) - Number(a.editorPick));
}

export function related(p: Product, limit = 4): Product[] {
  const mine = new Set(interestsFor(p).map((i) => i.slug));
  return products
    .filter((o) => o.id !== p.id)
    .map((o) => {
      let score = 0;
      for (const i of interestsFor(o)) if (mine.has(i.slug)) score += 2;
      const overlap = Math.min(p.ageMax ?? 99, effectiveAgeMax(o)) - Math.max(p.ageMin, o.ageMin);
      if (overlap >= 0) score += 2;
      if (o.priceBand === p.priceBand) score += 1;
      if (o.editorPick) score += 0.5;
      return { o, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.o);
}

/** Compact data attributes used by client-side filters (no JSON download needed). */
export function filterAttrs(p: Product) {
  return {
    'data-id': p.id,
    'data-ages': bandsFor(p).map((b) => b.slug).join(' '),
    'data-interests': interestsFor(p).map((i) => i.slug).join(' '),
    'data-budget': budgetFor(p).slug,
    'data-occasions': p.occasions.map((o) => o.toLowerCase().replace(/\s+/g, '-')).join(' '),
    'data-screenfree': String(p.screenFree),
    'data-pick': String(p.editorPick),
    'data-search': `${p.title} ${p.brand} ${p.tagline} ${p.skills.join(' ')} ${p.categories.join(' ')}`.toLowerCase(),
  };
}
