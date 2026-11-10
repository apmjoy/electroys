# Electroys

Hand-picked STEM kits and brain-building gifts for kids, teens and young adults. Live at **[electroys.com](https://electroys.com)**.

Built with [Astro](https://astro.build) as a fully static site, deployed free to GitHub Pages by GitHub Actions.

## Quick start

```sh
npm install
npm run dev        # http://localhost:4321 with live reload
npm test           # catalog tests + validation
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

Requires Node 20+.

## How it fits together

| Path | What it is |
|---|---|
| `src/data/products.json` | **The product catalog.** Every page, filter and guide is generated from it. |
| `src/lib/taxonomy.ts` | Age bands, interests, budgets and occasions, plus their page copy. |
| `src/lib/gifts.ts` | Gift guide definitions (rules that pick products from the catalog). |
| `src/content/guides/*.md` | Buying guides, written in Markdown. |
| `src/lib/art.ts` | Generates each product's original illustration from its id and category. |
| `src/pages/` | Routes: home, shop, age/interest pages, product pages, gift guides, Kit Finder, saved list, legal. |
| `src/scripts/` | The small amount of client JS: menus, search, filters, saved list, analytics. |
| `scripts/` | Catalog validator, weekly link checker, social image generator. |
| `public/` | Static files, including redirects from the old site's URLs. |
| `.github/workflows/` | Deploy on push, weekly rebuild, PR checks and weekly product health check. |

## Day-to-day

See **[docs/OPERATIONS.md](docs/OPERATIONS.md)** for adding products, writing guides, publishing and reading analytics.

## Monetization

All product buttons link to Amazon with the Associates tag `myelectroys-20` (set in `src/lib/taxonomy.ts`) and carry `rel="sponsored nofollow"`. Outbound clicks are recorded in Google Analytics 4 as `product_outbound_click`.
