# Electroys product catalog

The catalog contains 44 products, including at least three from each of the homepage's 14 Brands & Stores. The two additional featured brands remain available. Homepage store buttons open the corresponding catalog filter.

To add or update products:

1. Edit `products.json` with a unique key, verified destination, store, categories, levels, learning details, and review date. Leave image empty if no suitable product image is available; a branded text placeholder will appear. Do not invent prices or availability.
2. Run `python tools/build_catalog.py` to regenerate the static cards in `products.html`. These remain usable without JavaScript.
3. Update the introductory total if the number changes. Filters and result counts derive automatically from the data.
4. Check search, combined filters, empty/reset states, mobile layout, and destination links before publishing.

Preserve the subscription form action, field names, hidden iframe, consent, and confirmation behavior. Privacy information is in `privacy.html`, with contact myelectroys@gmail.com. Provider policies and product availability can change; review periodically.
