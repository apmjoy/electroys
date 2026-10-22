# Catalog validation and refresh operations

The validator distinguishes a safe catalog structure, a reachable provider page, supported source claims, and a current offer. These are not interchangeable. It never calls all products verified just because links return HTTP 200.

## Commands

Run from the repository root. Reports and staging directories must stay outside the public release package.

```sh
python3 -m unittest discover -s tests -p test_validation.py -v
python3 tools/validate_catalog.py --output /private/tmp/electroys-validation.json
python3 tools/validate_catalog.py --online --output /private/tmp/electroys-validation-online.json
python3 tools/refresh_catalog.py --output-dir /private/tmp/electroys-refresh-RUN_ID
```

The first validation command performs structure, duplicate and offer checks only. `--online` attempts the original provider and documentation pages, with at most four concurrent workers, bounded responses, timeouts and one retry. A 403, 404, CAPTCHA, DNS error or timeout is **unable to verify**, not proof of discontinuation. The report records per-source results and evidence digests, not copies of provider pages.

Exit status 1 indicates invalid structure, duplicate identities, invalid offers or a fatal error. Exit status 0 means these structural checks passed; it does **not** mean every source claim was verified. Read `summary.allVerified`, `summary.states` and the per-field results before publication decisions.

## Source evidence

Optional product `claims` entries contain `field`, the exact published `value`, a source `expected` excerpt of at least eight characters, and `sourceUrl`. An editor must have approved the mapping between the source excerpt and the published claim. The validator detects changed source excerpts or changed published values. It cannot establish that a subjective learning claim is true merely through text matching.

The current detail fields checked are title (`t`), age, level, description (`why`), learning outcome (`learn`), and buying considerations (`consider`). Missing evidence yields `needs_evidence`; changed excerpts yield `changed`; blocked requests yield `unable_to_verify`. Online checks will therefore honestly report incomplete coverage for legacy records without evidence mappings.

Feed imports may establish **identity, variant, price and availability** from the original retailer feed. Their verification metadata must state this limited scope. Import freshness does not establish every editorial claim, safety statement, compatibility claim, best-seller rank or build-time estimate. Manufacturer documentation is the source for specifications; the selected retailer and exact variant is the source for an offer.

Amazon product pages are not scraped. An Amazon listing lacking an authorized integration is explicitly reported as requiring one. Do not turn a manual page observation into an API offer by changing its label.

## Offer contract

`offers.json` contains `{ "version": 1, "offers": [...] }`. Required fields per offer:

- `id`, `productId`, `retailer`, exact HTTPS `url`
- Positive finite numeric `price`; `currency` is USD, GBP or EUR
- `verification: "verified"`
- `sourceType`: `amazon-creators-api`, `retailer-api`, or `retailer-feed`
- `availability: "in_stock"`
- Timezone-aware `checkedAt` and `expiresAt`; expiry must follow the check and be at most 24 hours later

Source-specific stricter expiry rules should be honored. Checks more than five minutes in the future are rejected. Amazon destinations require `amazon-creators-api`. Expired, missing, malformed, unsupported-currency, non-stock and orphan offers are rejected. Currencies must never be compared as equal amounts; the UI keeps USD budgets separate.

Optional `referencePrice` must exceed the price and be a genuine source-supplied comparison price. Optional `coupon` requires `type` (`clip` or `code`) and nonempty `conditions`; code coupons need a code. Amount/percent must be positive valid numbers, with percent at most 100. Optional coupon expiry must remain current. Conditional discounts are separate from the base price. The page may show a deal only with the explicit deal flag and supported savings/promotion evidence.

## Duplicate handling

Exact candidate groups use ASIN, normalized retailer URL (tracking removed, variant query retained), GTIN/UPC/EAN, ISBN/format, or brand plus manufacturer part number. Recorded variant and format distinguish intentionally different configurations. Similar titles produce review suggestions, never automatic merges. Existing product IDs are idempotent intake keys.

The daily validator never deletes or merges product records. An approved merge must preserve retailer offers and update all collection/project/flyer references. Inventory counts must not be padded with retailer duplicates or trivial variants.

## Refresh staging and daily sequence

The owner confirmed an existing discovery automation at **02:00 America/Chicago**. Its scheduler configuration is not in this checkout. Do not create a duplicate or claim the scheduler was updated.

Recommended integration:

1. At 02:00 CT, let the existing content-loading job finish; inspect its completion and release evidence.
2. At 04:00 CT, validate the completed refresh. Refresh original retailer feeds into private staging where needed to verify source claims. Slickdeals is discovery only; verify the original retailer before intake.
3. Run `refresh_catalog.py` into a unique directory for the run. It stages products/offers and removes stale offers from the staged snapshot, preserving the production files. Rejected candidates and unresolved verification remain explicit.
4. Check duplicate candidates, field coverage and publication policy. Build an isolated public-file allowlist, test it, then publish atomically through the existing hosting workflow.
5. Verify the live catalog digest and URLs before writing the publication manifest used by `build_flyers.py`. The staging state always has `published: false` and `flyerReady: false`; staging alone cannot unlock flyers.
6. Generate flyers only from that successful live publication, with a fresh check of promotional claims. Notify on meaningful corrections, failure or action needed.

The scripts do not mutate schedulers, publish websites, manufacture a verified status, or create price data when no authorized source is connected. The release owner must provide a single-run lock around the complete pipeline, bounded retries, actual deployment authentication, run-specific logs, and live verification. A fixed cron time must use America/Chicago with daylight saving, not a hard-coded UTC offset.

## Request safety and operational boundaries

Provider fetches permit HTTPS on port 443 only, reject credentials and private literal addresses, resolve public IPs only, pin the validated address to the TLS connection, and repeat these checks for every redirect. They do not inherit proxy credentials or browser cookies. Responses are bounded to 2 MB, redirects to five, and requested content to HTML/JSON/plain text. Tests cover private DNS results, malformed URLs, expired prices, duplicate variants, empty inputs and 1,000 synthetic records.

Test data belongs under tests or temporary directories, never in the production catalog. Exclude tools, tests, reports, raw provider responses and staging files from the deployed public files. No claim of a security certification is made.


## Daily image validation and repair

`import_retailer_catalogs.py` now selects image references from each configured original Shopify retailer feed. It prefers the exact selected variant, then an unassigned family image; it will not use an image explicitly assigned only to another variant. Only HTTPS raster URLs from the exact `cdn.shopify.com/s/files/` host/path are accepted. Requests use a 640-pixel rendition to avoid serving multi-megabyte original product photos. Existing curated/local images remain unchanged.

Use this image-only staging command to enrich existing catalog records without altering product additions, offers, editorial copy, or verification dates:

```sh
python3 tools/retailer_images.py --products products.json --cached-feeds /private/tmp/electroys-provider-data --output /private/tmp/electroys-images-staged.json
```

Review and apply the staged result in the release owner workflow. Cached feed image references are not fresh price evidence; image metadata explicitly records `contentVerified: false` until a separate content check. Missing images retain the branded fallback. Never replace accurate product photography with an unrelated/generated product image.

Run the morning image audit with the bundled Python runtime (Pillow required):

```sh
python3 tools/validate_images.py --products products.json --online --output /private/tmp/electroys-image-report.json
```

An optional `--ids ID1 ID2` checks selected homepage/deal products. The validator checks local paths cannot escape the site root, downloads remote images into memory only, limits content to 5 MB and decoded size to 25 million pixels, verifies raster content and decodes it. It records dimensions, format, byte count and failure reasons without persisting retailer images. Local-only runs report remote images as unverified, not successful.

The image checker uses an exact-host/path allowlist and same-host validated redirects for the known Shopify CDN, allowing the host environment's outbound proxy. Other image hosts use the public-IP-pinned TLS request path and may be unavailable in a proxy-only environment. Failed checks do not assert an image is permanently gone; retain a safe fallback and retry later. A publisher must inspect the browser's actual decoded images too.


## Morning ordering and release evidence

Content loading runs at 02:00 America/Chicago; validation runs at 04:00 after that job finishes, then flyers at 07:00 after validation succeeds. A late job blocks its dependents. Validate the union of current homepage featured IDs, the six displayed deals, and the 15 Amazon picks; report missing images elsewhere separately. Owned SVG illustrations are accepted only under assets/illustrations, with a strict passive-element/attribute check. Never label an illustration as an actual product photo.

After actual browser, image, functional and security checks on the live release, write the private dated page-validation.json described in FLYERS.md. It must match publicationId and catalogSha256 and is required by the production flyer CLI. Do not automatically write success from a working catalog URL alone. Email delivery follows visual flyer review and records a Gmail message ID; failed upstream checks must prevent email.
