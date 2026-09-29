# Electroys product catalog

The catalog contains 48 products, including at least three from each of the homepage's 14 Brands & Stores. The two additional featured brands remain available. Homepage store buttons open the corresponding catalog filter.

To add or update products:

1. Edit `products.json` with a unique key, verified destination, store, categories, levels, learning details, and review date. Leave image empty if no suitable product image is available; a branded text placeholder will appear. Do not invent prices or availability.
2. Run `python tools/build_catalog.py` to regenerate the static cards in `products.html`. These remain usable without JavaScript.
3. Update the introductory total if the number changes. Filters and result counts derive automatically from the data.
4. Check search, combined filters, empty/reset states, mobile layout, and destination links before publishing.

The Starting age filter groups products by the beginning of the maker's stated age guidance. Products without a clear age use "Check maker guidance"; always verify the maker's safety instructions.

Amazon links use the user-provided Associates tracking ID `myelectroys-20` on product detail URLs. The catalog renderer adds a nearby paid-link label and sponsored link attributes when an Amazon URL contains `tag=`. The required Amazon Associate statement is present on the catalog and disclosure page. Verify listings periodically; do not copy Amazon product images without appropriate rights.

Preserve the subscription form action, field names, hidden iframe, consent, and confirmation behavior. Privacy information is in `privacy.html`, with contact myelectroys@gmail.com. Provider policies and product availability can change; review periodically.
