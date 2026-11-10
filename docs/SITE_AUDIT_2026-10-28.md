# Electroys site audit — baseline

**Date:** 2026-10-28
**Snapshot:** commit `05d61a7` on `main`
**Live site:** https://electroys.com (GitHub Pages)
**Purpose:** Record where the site stands today, so the planned improvements can be judged against it. Each issue has an ID (e.g. `M1`). The scorecard at the end has an empty "After" column to fill in later.

---

## 1. What the site is

Electroys is an affiliate site that recommends STEM, robotics, coding and electronics products. When a visitor clicks through to a retailer and buys, the site can earn a commission, but only when the link carries an affiliate tracking tag.

How it is built:

- **Hosting:** static files on GitHub Pages under the custom domain `electroys.com`. There is no server or database.
- **Data:** `products.json` (581 products) and `offers.json` (516 prices) are the source of truth.
- **Generation:** Python scripts in `tools/` turn the data into static HTML pages: the homepage, `products.html` plus `products-page-2` … `products-page-25`, `deals.html`, `best-sellers.html`, and 12 pages under `reviews/`.
- **Front end:** Bootstrap 5, with plain JavaScript (`catalog.js`, `collections.js`, `engagement.js`) for search, filters, Like/Dislike and click tracking.
- **Analytics:** Google Analytics 4 (`G-1H82DFLP86`), with a custom `product_outbound_click` event that counts clicks to retailers.
- **Operations:** `CATALOG.md`, `FLYERS.md` and `docs/VALIDATION.md` describe a daily automated pipeline: a 2 a.m. content refresh, 4 a.m. validation, and 7 a.m. social-flyer generation emailed through Gmail. **The scheduler that runs this pipeline is not in this repository.**
- **History:** 79 commits since 2026-09-27, all by `apmjoy`. The style of the docs and commits suggests most of the code was written with an AI coding assistant.

---

## 2. What is already good (keep this)

- **Honest compliance:** an affiliate disclosure page, the Amazon Associates statement, "paid link" labels and `rel="sponsored"` on Amazon links. The site never invents prices, discounts or bestseller claims. This protects the Amazon account.
- **Works without JavaScript:** product cards are pre-rendered into the HTML, which helps search engines.
- **SEO basics are present:** a sitemap, `robots.txt`, canonical URLs, and Article structured data on reviews.
- **Click tracking already exists:** GA4 can show which products people click. That data is valuable for deciding what to keep.
- **Tests exist:** 58 Python tests (57 pass; the one failure is only the Pillow image library missing locally) and 4 JS tests (all pass).
- **Privacy-conscious:** analytics respect Do-Not-Track and Global Privacy Control, and no personal data is sent.

---

## 3. Issues

Severity: **High** = directly costs money or rankings. **Medium** = hurts user experience or adds risk. **Low** = cleanup.

### Monetization

#### M1 — About 96% of products earn nothing when clicked · High
Only **20 of 581** product links carry affiliate tracking:

| Store | Products | Affiliate tracked? |
|---|---|---|
| Pimoroni | 493 | No |
| Cooler Master | 32 | No |
| Amazon | 14 | Yes (`tag=myelectroys-20`) |
| Makeblock | 6 | Yes (`ref=electroys`) |
| Others (SparkFun, DFRobot, KiwiCo, Elenco, Walmart, Best Buy, Etsy, etc.) | 36 | No |

Almost every click the site generates today cannot produce a commission.

#### M2 — Most prices are in British pounds · High
484 of the 516 prices in `offers.json` are **GBP** (Pimoroni is a UK store). Only 32 are USD. The Amazon tag is a US tag, and the site reads as US-focused. A US visitor who sees £ prices and lands on a UK store is unlikely to buy.

#### M3 — Catalog doesn't match the brand · High
"Electroys" and its homepage ("Explore. Build. Learn. Play.") suggest kids' STEM toys and kits. The catalog is mostly:
- **397** bare electronic components (breakout boards, displays, GPIO expanders) in "Electronics"
- **84** "Maker Essentials" (power supplies, cables, tools)
- **35** "Computer Parts" (Cooler Master PC cases, PSUs, CPU coolers)

Only a few dozen products are kits that a parent would buy for a child. The import tool targets 750 products (`--target 750`), which looks like a push for volume rather than curation.

#### M4 — Who the site is for is unclear · Medium
The homepage tries to speak to young children, parents, teachers and adult hobbyists all at once ("STEM is not only for kids"). Affiliate sites convert better when they serve one clear buyer.

### Content and SEO

#### C1 — Hundreds of products share the same boilerplate text · High
505 products share just four generic descriptions:
- 377 × "A development board or electronic component for building and experimenting."
- 84 × "Supporting equipment used when assembling or powering electronics projects."
- 32 × "A PC build component; verify motherboard size…"
- 12 × "A hands-on kit; consult the retailer for included parts…"

**529 of 581** products have the age "Check maker guidance", meaning there is no real age information.

These pages appear in the sitemap. Google's helpful-content systems tend to rate sites with lots of thin, duplicated pages lower, which can pull down rankings for the good pages too.

#### C2 — Reviews say they are not hands-on · High
Every review states it is "documentation-based… does not claim hands-on testing." That is honest and should stay honest, but Google's product-review guidance favors first-hand experience: original photos, real usage, pros and cons from testing. Reviews and buying guides are the pages most likely to bring in search traffic that converts. There are only 8 reviews and guides.

#### C3 — Duplicate review pages · Low
Each review exists twice, at the root (e.g. `/botley-2-coding-robot-review.html`) and under `/reviews/`, with identical content. The canonical tag points to `/reviews/`, so search impact is limited, but it is clutter and a maintenance trap.

#### C4 — Weak homepage title and social previews · Medium
The homepage `<title>` is just "Electroys", with no keywords. Open Graph tags are minimal (only `og:site_name`), so links shared on social media or in messages show no proper image or description.

#### C5 — 24 paginated product pages in the sitemap · Medium
`products-page-2` … `products-page-25` are listed in the sitemap. Combined with C1, this exposes hundreds of thin product cards to search engines.

### Performance (speed)

#### P1 — Very large data downloads · High
The homepage and products page download **`products.json` (1.4 MB)** and **`offers.json` (376 KB)** with `cache: 'no-cache'`, so the browser re-checks them on every visit. Most visitors only need to see 6–24 products.

#### P2 — Heavy third-party CSS, JS and fonts · Medium
Every main page loads:
- Bootstrap CSS and the Bootstrap JS bundle (full builds)
- the Bootstrap Icons font
- **3 Google Font families (Roboto, Raleway, Poppins) × 5 weights each**
- Cloudflare Turnstile (anti-bot) on every page, not only where the form is
- Google Analytics

#### P3 — Large homepage · Medium
- `index.html` is **108 KB** of HTML.
- It has **13 sections**.
- It has a **10-slide hero carousel**. Carousels add weight and are rarely viewed past slide 1.
- The hero image is 256 KB.
- 23 images in total, 20 of them lazy-loaded.

#### P4 — Product images come from other sites · Low
524 product images are loaded directly from Shopify CDNs. That's fine for speed, but they can change or disappear without warning. 32 products use generic illustrations instead of photos.

### Design and user experience

#### D1 — Homepage is crowded and unfocused · Medium
There are 13 stacked sections: hero carousel, quick picks, featured, projects by grade, reviews, deals, best sellers, more ways, brands, Ask Electroys, Why Electroys, Subscribe. The site does not make one simple path obvious, such as "find a kit by age or interest → see top picks → click to buy."

#### D2 — Dated, generic styling · Medium
The look is a stock Bootstrap template with an orange accent and gradient headings. It works, but it does not build trust the way a polished, editorial look does. Trust drives affiliate clicks.

#### D3 — Products browsing is overwhelming · Medium
25 pages of mostly electronic components make it hard for a parent to find a kid-friendly kit. Filters exist, but the default view is dominated by parts.

### Operations and maintenance

#### O1 — Prices disappear if the automation stops · High
By design, offers expire within 24 hours. The daily refresh job lives outside this repo (the docs say "its scheduler configuration is not in this checkout"). If that job breaks or is turned off, every price and deal on the site disappears within a day, silently.

#### O2 — Over-engineered tooling · Medium
The repo includes a social-flyer generator, a Gmail delivery helper, a "morning gate", a Slickdeals discovery tool, publication manifests and digest checks. A lot of effort has gone into process rather than into the content and traffic that earn money. All of it needs maintaining.

#### O3 — Stray and legacy files · Low
- `Electroys_1_8_4_Updated_Live_Subscription_URL.html` (redirect stub)
- `529bd0c256d1baeac0a2e5ddd25745cc.txt` (likely a site-verification file; confirm before removing)
- `prime-deals.html` and `crunchlabs-hack-pack-review.html` (redirect stubs)
- both `affiliate.css` and `assets/affiliate.css`
- `amazon-picks.json` and `featured.json` alongside the main data
- Two `impact-site-verification` meta tags in the homepage `<head>`, which suggests applications to the Impact affiliate network. Their status is unknown.

#### O4 — Test suite needs a dependency · Low
`tests/test_email.py` fails without Pillow installed. Minor, but a full test run should pass cleanly.

---

## 4. Questions for the owner

These answers decide which fixes matter most:

1. **Traffic:** how many visitors per month does GA4 show, and from where (Google search, social, direct)?
2. **Earnings:** has the Amazon Associates account made any sales? (Amazon closes accounts with no qualifying sales within 180 days.)
3. **Affiliate programs:** which programs is the site approved for? What happened with the Impact applications? Do Pimoroni, Cooler Master, SparkFun, KiwiCo and others offer programs he has joined?
4. **Audience:** is the target buyer parents and gift-givers (kids' STEM), or adult makers and hobbyists?
5. **Automation:** where does the daily refresh run, and does he want to keep it?
6. **Hands-on content:** is anyone able to buy or borrow a few kits to photograph and actually test?

---

## 5. Recommended plan (in order)

1. **Answer the questions in section 4.** They decide whether the Pimoroni and Cooler Master products stay.
2. **Monetize or remove.**
   - Join affiliate programs for the retailers that matter.
   - Remove untracked products, or hide them from search engines (`noindex`) and from the default view.
   - Prefer US-shipping retailers with USD prices.
3. **Refocus the catalog** on a clear buyer, likely parents buying STEM kits by age. Fewer, better products with real descriptions and age guidance.
4. **Invest in content that ranks:** gift guides by age, "X vs Y" comparisons, and reviews with original photos and hands-on notes.
5. **Speed fixes** (safe to do now, whatever the answers):
   - Use one font family.
   - Remove the carousel.
   - Load Turnstile only on pages with the form.
   - Ship small per-page data instead of the full 1.4 MB catalog.
   - Allow browser caching of the data files.
6. **Homepage and visual redesign:** a simpler page with a single "find a kit by age or interest" path and a more trustworthy editorial look.
7. **Cleanup:** remove duplicate review pages and stray files (O3), fix the homepage title and social tags (C4), and make the tests pass cleanly (O4).
8. **Make operations resilient:** keep prices visible (or degrade gracefully) if the refresh stops, and move the scheduler into the repo (e.g. GitHub Actions) or simplify it.

---

## 6. Baseline scorecard

The "After" column shows the `redesign` branch, measured 2026-10-28 before launch. Rows 17–20 still need a live measurement or the owner's data. Note: the section 7 commands describe the old site's file layout; the new catalog is `src/data/products.json`.

| # | Metric | Baseline (2026-10-28) | Target | After |
|---|---|---|---|---|
| 1 | Total products | 581 | Curated (quality over count) | 92, all hand-researched |
| 2 | Products with affiliate tracking | 20 (3.4%) | ≥ 90% | 92 (100%), each ASIN checked against Amazon |
| 3 | Prices in USD / total offers | 32 / 516 | All USD for US audience | All USD. 60 products show the brand's list price (29 refresh daily from brand feeds); the rest show a price range. Amazon's live prices switch on automatically with Creators API keys |
| 4 | Products sharing a boilerplate description | 505 | 0 | 0 |
| 5 | Products with no real age guidance | 529 | 0 for kids' products | 0 (every product has a numeric age range) |
| 6 | Reviews and guides | 8 (none hands-on) | More, with hands-on reviews | 3 in-depth buying guides + 7 gift guides + 12 age/interest pages (still not hands-on) |
| 7 | Data downloaded by products page | ~1.8 MB (1.4 MB + 376 KB) | < 150 KB | 0 KB of JSON; whole shop page is 26 KB gzipped |
| 8 | Homepage HTML size | 108 KB | < 50 KB | 76 KB raw / 13 KB gzipped |
| 9 | Homepage sections | 13 | ~6–8 | 9, with one clear path (age → picks → buy) |
| 10 | Hero carousel slides | 10 | 0–1 | 0 |
| 11 | Google Font families loaded | 3 (× 5 weights) | 1 (≤ 3 weights) | 2 self-hosted variable fonts (~90 KB, cached); no Google Fonts requests |
| 12 | Paginated product pages in sitemap | 24 | 0 thin pages | 0; old URLs redirect |
| 13 | Duplicate review pages | 8 root copies | 0 | 0; old URLs redirect |
| 14 | Homepage `<title>` | "Electroys" | Descriptive, with keywords | "Electroys \| STEM Kits & Brain-Building Gifts for Kids, Teens and Young Adults" |
| 15 | Open Graph tags | `og:site_name` only | title, description, image | Full set on every page + branded share image |
| 16 | Python tests passing | 57 / 58 (Pillow missing) | All | Replaced: 4/4 Node tests + catalog validation + type check (0 errors), all run in CI |
| 17 | Lighthouse Performance (mobile) | *not measured yet* | ≥ 90 | |
| 18 | Monthly visitors (GA4) | *ask owner* | ↑ | |
| 19 | Monthly product outbound clicks (GA4) | *ask owner* | ↑ | |
| 20 | Monthly affiliate earnings | *ask owner* | ↑ | |

Rows 17–20 need a measurement or data from the owner. Recording them before changes go live gives a fair comparison.

---

## 7. How to re-measure

Run these from the repository root.

```sh
# Product count, store breakdown, tracked links, boilerplate, missing ages
python3 - <<'EOF'
import json, re
from collections import Counter
d = json.load(open('products.json'))
print('products', len(d))
print('stores', Counter(v['store'] for v in d.values()).most_common())
print('tracked', sum(bool(re.search(r'(tag=|ref=|aff|irclick|sscid|avad)', v['url'])) for v in d.values()))
why = Counter(v['why'] for v in d.values())
print('boilerplate', sum(n for n in why.values() if n > 1))
print('no age', sum(v['age'] == 'Check maker guidance' for v in d.values()))
o = json.load(open('offers.json'))['offers']
print('offer currencies', Counter(x['currency'] for x in o))
EOF

# File sizes of key pages and data
wc -c index.html products.html products.json offers.json

# Tests
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.js
```

For Lighthouse, open the live site in Chrome → DevTools → Lighthouse → Mobile → Analyze. Record the Performance, SEO and Best Practices scores.
