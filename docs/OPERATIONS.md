# Running Electroys

A plain-English guide to keeping the site earning. No coding experience needed for the everyday tasks.

---

## 1. One-time setup (do this once, before the new site goes live)

1. **Turn off the old ChatGPT/Codex automations.** The old site ran scheduled jobs (2 a.m. content refresh, 4 a.m. validation, 7 a.m. flyer email) that committed to this repo. They will break or overwrite the new site. Disable them wherever they were set up.
2. **Switch GitHub Pages to GitHub Actions.** In the repo on GitHub: **Settings → Pages → Build and deployment → Source → "GitHub Actions"**. Leave the custom domain as `electroys.com` and keep **Enforce HTTPS** on.
3. **Merge the `redesign` branch into `main`.** The *Build & deploy* workflow runs automatically and publishes the site in about 2 minutes. Watch it under the **Actions** tab.
4. **Check the newsletter.** Sign up with your own email on the live site and confirm a row appears in the Google Sheet behind the Apps Script. The old site's own message said the form wasn't connected to a real email list yet.
5. **Google Search Console** (free, recommended): add `electroys.com`, then submit `https://electroys.com/sitemap-index.xml`. This tells Google about all the new pages.

---

## 2. What runs automatically

| When | What | Where to look |
|---|---|---|
| Every change pushed to `main` | Tests, then build, then publish | Actions → *Build & deploy* |
| **Every day** (~5am Central) | Refreshes brand list prices (saved to git as a price history), fetches Amazon's live prices and photos when the API keys are set, rebuilds and publishes | Actions → *Build & deploy* |
| Every Monday | **Product health check**: tries every Amazon link and opens a GitHub Issue if a product looks discontinued | Issues tab (label `product-health`) |
| Every pull request | Tests and a trial build, so broken changes can't be merged | The PR's checks |

If the catalog has a mistake (duplicate product, bad ASIN, missing field), the build **stops** and the live site stays as it was. Nothing broken ever goes live.

> **About the health check:** Amazon often blocks automated visitors with a captcha. Those products show as "couldn't check", which is normal and raises no alarm. An issue is opened only when a page clearly says the item is gone or unavailable.

---

## 3. Adding or changing a product

All products live in **`src/data/products.json`**. You can edit it right on GitHub (open the file → pencil icon → *Commit changes*). The site republishes itself.

Copy an existing product and change the fields:

```json
{
  "id": "lego-technic-mclaren-p1",
  "title": "LEGO Technic McLaren P1",
  "brand": "LEGO",
  "asin": "B0CKXXXXXX",
  "ageMin": 18,
  "ageMax": null,
  "categories": ["Building", "Engineering"],
  "priceBand": "$$$$",
  "tagline": "Short benefit line, 70 characters or fewer",
  "summary": "2–3 sentences in your own words: what it is and what kids do with it.",
  "highlights": ["Three", "specific", "reasons it's great"],
  "skills": ["Skill one", "Skill two", "Skill three"],
  "considerations": ["Batteries not included", "Needs a tablet"],
  "screenFree": true,
  "requiresDevice": null,
  "occasions": ["Holiday", "Birthday"],
  "editorPick": false,
  "checkedAt": "2026-10-28",
  "status": "active"
}
```

| Field | Rules |
|---|---|
| `id` | Lowercase words with dashes. Becomes the page URL: `/products/<id>/`. Never change it once live. |
| `asin` | The 10-character code in the Amazon URL (`amazon.com/dp/`**`B0CKXXXXXX`**). For books, the ISBN-10. **Double-check it opens the exact product.** |
| `ageMin` / `ageMax` | From the manufacturer. Use `null` for `ageMax` when the box says "8+". |
| `categories` | 1–3 of: Robotics, Coding, Electronics, Science, Engineering, Building, Math & Logic, Space, Nature, Art & Design, Games & Puzzles. The **first one** sets the illustration's color and icon. |
| `priceBand` | `$` under $25 · `$$` $25–50 · `$$$` $50–100 · `$$$$` $100+ |
| `occasions` | Any of: Holiday, Birthday, Stocking Stuffer, Classroom, Rainy Day. These feed the gift guides. |
| `editorPick` | `true` puts it on the homepage and at the top of lists. Keep it to about 1 in 5. |
| `status` | `"unavailable"` hides a product everywhere without deleting it. |
| `glance` | At-a-glance facts shown on product pages and the compare table: `batteries` (none / included / required / unknown), `batteryNote` (e.g. "3 AAA, not included"), `adultHelp` (minimal / some / lots / unknown), `playStyle` (solo / together / either), `bestFor` (finishes "Best for kids who…"), `inTheBox`. Use "unknown" rather than guessing. |

**Retiring a product:** set `"status": "unavailable"`. Its page disappears and its links stop showing.

**Writing good copy:** describe what the kid actually *does*. No copied marketing text, no star ratings, no "bestseller" claims and no exact prices. Amazon's rules forbid showing prices that aren't fetched from their API.

---

## 4. Writing a buying guide

Add a Markdown file in `src/content/guides/`, using the existing guides as templates. The `products:` list at the top shows those products as cards at the end of the guide. Guides are the pages most likely to bring in Google traffic, so one solid guide a month is a great habit.

---

## 5. Is it working? Reading the numbers

**Google Analytics** (Google tag `GTM-5CJ7GCKB` → GA4 property `G-67H7VTBMWZ`), under Reports → Engagement → Events:

| Event | Meaning |
|---|---|
| `product_outbound_click` | Someone clicked through to Amazon. **This is the number that drives earnings.** |
| `save_to_list` | Someone saved a product to their gift list. |
| `kit_finder_complete` | Someone finished the Kit Finder quiz. |
| `newsletter_signup` | Someone subscribed. |

To see *which* products get clicked, register `product_id` and `surface` as custom dimensions (Admin → Custom definitions).

**Amazon Associates dashboard:** clicks, orders and earnings. Amazon closes new Associates accounts that don't make at least 3 qualifying sales within 180 days of signing up, so check that sales are coming in.

---

## 6. Growing earnings: what to do next

1. **Qualify for Amazon's Creators API.** Amazon gates it on recent sales; third-party guides report about 10 qualifying sales in 30 days in 2026, so check Associates Central for the current rule. Once approved, follow section 7 and the site switches to Amazon's own photos and live prices automatically.
2. **Publish a buying guide every month**, especially from September to December (the gift season). Ideas: "Best gifts for 10-year-olds", "LEGO vs. Magna-Tiles", "Best telescopes for kids".
3. **Share gift guides** in parent groups, on Pinterest (great for gift ideas) and in school newsletters.
4. **Join more affiliate programs.** Many toy and STEM brands run their own programs on networks like Impact, Rakuten, Awin and ShareASale, and the old site already has Impact verification tags. For a product sold through one of these, replace `asin` with `"url": "<your affiliate link>"` and `"retailer": "<store name>"`.
5. **Refresh the holiday guide every October**: add the year's hot new toys and mark them `"Holiday"`.

---

## 7. Prices and photos: how they work

Each product shows the best information available, in this order:

| Priority | Shows | Source | Refreshed |
|---|---|---|---|
| 1 | **Amazon's live price** (with any discount) and Amazon's photo | Amazon Creators API | Daily, with the "as of" time Amazon requires |
| 2 | **Brand list price** and official brand photo | The brand's own store | Daily for brands with a Shopify feed (`feedUrl`); otherwise as researched (`priceCheckedAt`) |
| 3 | Typical price range ($–$$$$) and an Electroys illustration | Our research | When edited |

Amazon's rules ban copying prices or photos from Amazon's website, so Amazon data **only** comes through the official API. Until then the site shows the brand's list price, clearly labeled, and the Amazon button gives today's price.

### Turning on Amazon prices and photos (once the account qualifies)

1. In **Associates Central → Tools → Creators API**, create credentials for the North America region. You get a *Credential ID* and *Credential Secret*.
2. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:
   - `AMAZON_CREATORS_CLIENT_ID` = the Credential ID
   - `AMAZON_CREATORS_CLIENT_SECRET` = the Credential Secret
3. **Actions → Build & deploy → Run workflow.** The log line "Amazon Creators API: N items, N with prices" confirms it worked.

If Amazon's API is ever down, the build still succeeds and falls back to brand prices.

### Product fields for prices and photos

| Field | Meaning |
|---|---|
| `listPrice` | Brand's US list price in dollars, e.g. `49.99`. |
| `priceCheckedAt` | Date that price was confirmed. |
| `feedUrl` | The brand store's Shopify product JSON (e.g. `https://brand.com/products/kit-name.json`). When set, the price refreshes daily. |
| `mfrUrl` | The brand's official product page (linked on the product page). |
| `imageSourceUrl` | The official photo to use. Run `node scripts/fetch-brand-images.mjs` to download and optimize it into `public/products/`, which also sets `image`. |

**Adding a photo by hand:** many brand sites block automated downloads. Open the brand's product page in your browser, save the main photo as `photos-inbox/<product-id>.jpg`, then run `node scripts/fetch-brand-images.mjs` and commit. Only use the brand's own photo of the *exact* product, and never images from Amazon's website.

**Stale prices hide themselves.** A brand list price that hasn't been re-confirmed within 45 days (`priceCheckedAt`) is automatically replaced by the price range until someone updates it. Cards show rounded prices ("About $45"); product pages show the exact list price with its date.

If a daily price moves more than 60% at once, it is **not** applied automatically (it's usually a feed glitch). The run log lists it so a person can check.

---

## 8. Sharing on WhatsApp and Facebook

Most visitors will come from links shared on WhatsApp and Facebook, so the site is built for that:

- **Every product, gift guide, age page and interest page has its own preview image.** When you paste a link, WhatsApp and Facebook show the product photo, its name and price, and the Electroys brand. Nothing to set up.
- **Best links to share:**
  - a single product: `electroys.com/products/<product-id>/`
  - a gift guide: `electroys.com/gifts/holiday-gift-guide/`, `/gifts/stocking-stuffers/`, `/gifts/gifts-under-25/`
  - an age group: `electroys.com/shop/ages-6-8/`
  - the quiz: `electroys.com/finder/`
- **Track your own posts:** add tags to the end of a link so Google Analytics shows where visitors came from, for example
  `electroys.com/gifts/holiday-gift-guide/?utm_source=whatsapp&utm_medium=social&utm_campaign=family-group`.
  Links shared with the site's own "WhatsApp" and "Facebook" buttons are tagged automatically.
- **Preview looks old on Facebook?** Facebook caches previews. Paste the link into the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and press "Scrape Again". WhatsApp refreshes on its own after a while.
- **In Google Analytics,** the `share` event counts how often visitors pass pages along, and on which channel (`method` = whatsapp, facebook or native).

---

## 9. Play features: quiz, gift surprises, advent calendar, circuit game

| Feature | Where | How to edit |
|---|---|---|
| **Maker quiz** | `/quiz/`; results at `/quiz/<type>/` | Types and questions live in `src/lib/makers.ts`. Each maker type has its own share image (`/og/quiz/<type>.jpg`). |
| **Gift surprises** | "Send as a surprise" on every product page → `/gift/<product-id>/?to=…&from=…&note=…` | Nothing to maintain. The link preview is a mystery gift on purpose, so it never spoils what's inside. Gift pages stay out of Google. |
| **Advent calendar** | `/advent/` | The 24 activities live in `src/data/advent.ts`. Doors unlock at midnight US Central on each December day. To preview a day before it unlocks, add `?day=6` to the URL. A test fails the build if any day points at a product that's been removed. |
| **"Light it up" game** | `/play/` | Levels live in `src/scripts/circuit-logic.ts` as paths from battery to bulb. Tests guarantee every level is solvable. |
| **Easter egg** | Tap the logo 5 times on the homepage (or type the Konami code) | — |

**For the marketing calendar:** the advent calendar gives you a ready-made post every day of December 1–24. Share `electroys.com/advent/`, and quiz results (`electroys.com/quiz/`) make great "what's yours?" posts for parent groups.

**Analytics events:** `maker_quiz_complete` (with `maker_type`), `gift_unwrap`, `advent_open` (with `day`), `circuit_level_complete`, `easter_egg`, and `share` (with `method` and `surface`).
