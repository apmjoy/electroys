# Daily social flyers

`tools/build_flyers.py` produces exactly two concepts, each with a 1080 × 1350 feed PNG, 1080 × 1920 story PNG, and caption/alt-text file. The artwork is original typographic/circuit decoration; retailer product photographs are not downloaded or redistributed. The templates intentionally avoid unverified price, coupon, ease-of-build, and bestseller claims. The first concept emphasizes product learning value. The second uses a date-aware editorial theme: autumn making in October, gift-season inspiration in November/December, back-to-learning in August/September, summer discovery in June/July, or evergreen learning otherwise. These are invitations to explore, not claims of product suitability or holiday discounts. Offer-specific creative requires an approved, evidence-backed input extension rather than invented claims.

## Publication gate

Invoke this only after the refreshed website is published and checked live. The publishing job writes a private manifest (outside the public site) containing:

```json
{
  "status": "published",
  "publicationId": "release-or-commit-id",
  "verifiedAt": "2026-10-20T11:30:00Z",
  "baseUrl": "https://electroys.com",
  "catalogSha256": "SHA256-of-the-exact-products.json-bytes",
  "productIds": ["published-product-id", "another-published-product-id"],
  "verifiedProductIds": ["published-product-id", "another-published-product-id"]
}
```

`productIds` means published records confirmed present in the live catalog. `verifiedProductIds` is the subset whose original-source/content checks passed; it must not include inaccessible or unverified records merely to reach two selections. The renderer additionally excludes records explicitly marked unavailable, changed, invalid, or draft. Verification older than 24 hours, a changed catalog digest, foreign origin, unknown IDs, duplicate IDs, and fewer than two eligible records fail closed before any output is written.

A preview must have `status: "preview"` and use `--preview`. Every preview image is visibly marked PREVIEW and cannot write production selection history. The preview flag is for layout QA, not an assertion that production publication succeeded.

## Invocation

Requires Python 3.10+ and Pillow. The bundled desktop Python includes Pillow; system Python may not. In a separately provisioned environment install Pillow from its trusted package distribution.

```sh
python3 tools/build_flyers.py \
  --publication-manifest /absolute/private/publication.json \
  --output /absolute/social-output \
  --history /absolute/private/flyer-history.json
```

Keep the history and manifest outside the public site. Outputs use the America/Chicago date. A second invocation on the same date and unchanged catalog returns existing files without generating duplicate concepts. A changed catalog or incomplete output under that date fails for inspection instead of silently overwriting already-shared media. Use one workflow lock around publication and generation; concurrent scheduler runs should not be allowed.

The two selections prioritize newest `addedAt` / `publishedAt` timestamps and avoid products used in the prior 14 days where possible. If the eligible pool is too small, least-recently-used products are allowed. Existing products lacking added dates remain eligible evergreen choices but are not described as newly added. URLs point to a filtered Electroys catalog with social campaign attribution; captions include affiliate disclosure and alt text.

## Schedule integration

The existing 5:15 a.m. America/Chicago discovery job should trigger publication only after existing-product validation and new-product validation complete. Flyer generation follows successful live publication verification, rather than a separate clock time that could race an unfinished refresh. This script does not itself schedule, deploy, post to social media, or fabricate the publication manifest.

## Tests

```sh
python3 -m unittest discover -s tests -p test_flyers.py -v
```

Tests cover stale/future manifests, digest mismatch, unknown/duplicate IDs, empty and insufficient catalogs, unverified status exclusion, newest/repeat selection, expected PNG dimensions, idempotence, preview isolation, long/malicious text layout, calendar themes, 10,000-record selection, and recovery of a failed history write. Image tests require Pillow.
