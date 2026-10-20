# Electroys product catalog

The catalog is generated from canonical products.json; the October 20 release contains 750 products. Homepage store buttons open the corresponding catalog filter.

To add or update products:

1. Edit `products.json` with a unique key, verified destination, store, categories, levels, learning details, and review date. Leave image empty if no suitable product image is available; a branded text placeholder will appear. Do not invent prices or availability.
2. Run `python tools/build_catalog.py` to regenerate the static cards in `products.html` and `index.html`, including homepage Quick Look data. These remain usable without JavaScript.
3. Update the introductory total if the number changes. Filters and result counts derive automatically from the data.
4. Check search, combined filters, empty/reset states, mobile layout, and destination links before publishing.

The Starting age filter groups products by the beginning of the maker's stated age guidance. Products without a clear age use "Check maker guidance"; always verify the maker's safety instructions.

Amazon links use the user-provided Associates tracking ID `myelectroys-20` on product detail URLs. The catalog renderer adds a nearby paid-link label and sponsored link attributes when an Amazon URL contains `tag=`. The required Amazon Associate statement is present on the catalog and disclosure page. Verify listings periodically; do not copy Amazon product images without appropriate rights.

Preserve the subscription form action, field names, hidden iframe, consent, and confirmation behavior. Privacy information is in `privacy.html`, with contact myelectroys@gmail.com. Provider policies and product availability can change; review periodically.

Homepage selection: edit `featured.json` to choose product keys from `products.json`, then run the build command. Publish both generated HTML pages with the data. This is a manual editorial refresh, not an automatic product-discovery or price feed. Keep prices and savings claims off the cards unless a verified live pricing integration is implemented.


## Catalog release workflow

Sorting, URL filters and 12/24/48/100 page sizes operate on the full catalog. Static pages contain 24 cards each. Offers are separate in offers.json and prices expire automatically within 24 hours. Budgets are item prices in USD, excluding conditional coupons, tax and shipping. No currency conversion is applied.

Refresh original Arduino, Cooler Master and Pimoroni feeds with tools/import_retailer_catalogs.py --output-dir PRIVATE_STAGING --target 750. Review staged changes and scoped verification before replacing canonical data. Run build_catalog.py followed by build_collections.py and the test suite. The source adapters preserve original editorial records and never scrape Amazon prices.

Slickdeals discovery writes a private review queue with tools/discover_deals.py. A candidate cannot become an offer until the original retailer, exact variant and promotion are verified. Purchase links never use Slickdeals. Amazon API credentials and best-seller evidence are separate external dependencies.

After deployment, tools/verify_publication.py verifies the exact live catalog digest and writes a private publication manifest. tools/build_flyers.py uses that manifest; see FLYERS.md. Neither a successful structural check nor a reachable link proves all editorial claims are verified. See docs/VALIDATION.md for evidence scope.
