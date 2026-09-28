# Electroys product catalog

The homepage's Explore All Products link opens `products.html`. This static GitHub Pages page retains the site's branding and existing subscription form and handler.

To add a product:

1. Add a uniquely keyed entry in `products.json`, following an existing entry. Include `categories` and `levels` arrays. Use a verified product URL and image; keep price-check dates explicit.
2. Add its card to `products.html` inside `productGrid`, with a matching `data-product-id`. Include the name, image with descriptive alt text, age, level, price, expandable learning details, and original product link. This static card keeps the catalog usable without JavaScript.
3. Category, brand, and level options and result counts update automatically from the listed cards and JSON entries. Search and filters combine; Clear filters resets them all.

Check the new card, filters, mobile layout, and product link before publishing. Keep the subscription form action, field names, hidden iframe target, consent, and confirmation behavior intact. The catalog uses only the eight current featured products; the homepage's unused draft product data is not published as additional listings.
