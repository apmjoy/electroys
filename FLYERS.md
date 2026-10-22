# Daily social flyers

`tools/build_flyers.py` produces exactly two concepts, each with a 1080 × 1350 feed PNG, 1080 × 1920 story PNG, and caption/alt-text file. The artwork is original typographic/circuit decoration; retailer product photographs are not downloaded or redistributed. The templates intentionally avoid unverified price, coupon, ease-of-build, and bestseller claims. The first concept emphasizes product learning value. The second uses a date-aware editorial theme: autumn making in October, gift-season inspiration in November/December, back-to-learning in August/September, summer discovery in June/July, or evergreen learning otherwise. These are invitations to explore, not claims of product suitability or holiday discounts. Offer-specific creative requires an approved, evidence-backed input extension rather than invented claims.

## Required Electroys flyer skill

Before generating any new flyer, read and apply the installed `electroys-flyers` skill at `~/.codex/skills/electroys-flyers/SKILL.md`. Its supplied logo assets and established layouts are the visual authority. Inspect its design preview, and adapt a workspace copy of its script for current source-verified copy and the requested social formats. Never edit the installed skill or its assets.

Keep the existing exact-publication/page-validation gates, selection history, two-concept count, captions and delivery receipts. Recompose each concept at 1080×1350 and 1080×1920; these requested social sizes override the skill's default Letter format. Use a supplied logo exactly once per image with its original proportions, colors and wording; do not substitute the old text-only ELECTROYS badge. Vary the two concepts' compositions. Follow the skill's palette, clean spacing, focal-visual limits and visible electroys.com CTA. Adapt the legacy renderer before using it for a new production run; its old typography-only artwork is not the approved visual default.

Deliver direct PNG links, a compact preview and a ZIP containing only the four final PNGs. Keep captions/alt text as separate files and email them alongside the PNGs after visual inspection. No new send is authorized merely by changing this documentation; normal daily delivery and explicit flyer requests retain their existing authorization and duplicate checks.

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
  --page-validation /absolute/private/page-validation.json \
  --output /absolute/social-output \
  --history /absolute/private/flyer-history.json
```

Keep the history and manifest outside the public site. Outputs use the America/Chicago date. A second invocation on the same date and unchanged catalog returns existing files without generating duplicate concepts. A changed catalog or incomplete output under that date fails for inspection instead of silently overwriting already-shared media. Use one workflow lock around publication and generation; concurrent scheduler runs should not be allowed.

The two selections prioritize newest `addedAt` / `publishedAt` timestamps and avoid products used in the prior 14 days where possible. If the eligible pool is too small, least-recently-used products are allowed. Existing products lacking added dates remain eligible evergreen choices but are not described as newly added. URLs point to a filtered Electroys catalog with social campaign attribution; captions include affiliate disclosure and alt text.

## Schedule integration

The existing content-loading job runs at 2:00 a.m. America/Chicago. Page/catalog/image validation follows at 4:00; flyer generation follows at 7:00 only after the same live release passed validation. A late or failed upstream stage blocks downstream work.

The production CLI requires `--page-validation`: a private JSON record with `status: "passed"`, matching `publicationId` and `catalogSha256`, today's `checkedAt` timestamp, and `checks` set to true for `contentLoaded`, `images`, `browser`, `functional`, and `security`. Write this record only after actually performing those checks. A refresh alone does not establish page/image success. The morning image check uses `tools/validate_images.py` and browser decoding checks for homepage featured/deals/ribbon cards. The renderer does not itself schedule, deploy, or fabricate evidence.

After all four images and captions pass visual review, prepare Gmail MIME attachments using `tools/prepare_flyer_email.py`. The user authorized delivery to both operational recipients configured in the helper. Pass the prepared `gmail` object to the connected Gmail `send_email` tool. Save its successful returned message ID, the deliveryId, recipient list and attachment hashes to a private dated receipt. If a receipt exists or a send result is uncertain, inspect Gmail Sent before retrying; do not duplicate delivery. Email is the final step, and a failure must not be marked as delivered. Nothing is posted to social media.

## Tests

```sh
python3 -m unittest discover -s tests -p test_flyers.py -v
```

Tests cover stale/future manifests, digest mismatch, unknown/duplicate IDs, empty and insufficient catalogs, unverified status exclusion, newest/repeat selection, expected PNG dimensions, idempotence, preview isolation, long/malicious text layout, calendar themes, 10,000-record selection, and recovery of a failed history write. Image tests require Pillow.
