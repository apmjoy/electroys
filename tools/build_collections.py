#!/usr/bin/env python3
"""Build collections from the shared catalog template; run after build_catalog.py.

No static price/rank claims are embedded: catalog.js validates current evidence
at viewing time, so an old deployment cannot keep advertising expired offers.
"""
from pathlib import Path
import argparse
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent

DESCRIPTIONS = {
    'deals': ('Deals', 'Find a worthwhile next step.', 'Verified offers on STEM projects, books, maker equipment and supporting technology. Use Project-focused to hide general tech and supporting gear.', 'Current verified deals'),
    'bestsellers': ('Best Sellers', 'Explore what is getting attention.', 'Explore 15 Amazon picks curated by Electroys for STEM learning and supporting technology. These are editorial selections; Amazon sales rankings are shown only when verified.', 'Curated Amazon picks'),
}


def replace_once(pattern, replacement, page):
    page, count = re.subn(pattern, lambda _: replacement, page, count=1, flags=re.S)
    if count != 1:
        raise ValueError('Missing template marker: ' + pattern)
    return page


def collection_page(template, kind):
    title, headline, description, section_title = DESCRIPTIONS[kind]
    filename = 'deals.html' if kind == 'deals' else 'best-sellers.html'
    page = replace_once(r'<title>.*?</title>', f'<title>{title} | Electroys</title>', template)
    page = replace_once(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{description}">', page)
    page = replace_once(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="https://electroys.com/{filename}">', page)
    page = replace_once(r'<body[^>]*>', f'<body data-collection="{kind}">', page)
    page = replace_once(r'<h1>.*?</h1>', f'<h1>{headline}</h1>', page)
    page = replace_once(r'<p class="text-secondary mb-0">.*?</p>', f'<p class="text-secondary mb-0">{description}</p>', page)
    page = replace_once(r'<h2 id="catalog-title">.*?</h2>', f'<h2 id="catalog-title">{section_title}</h2>', page)
    # Never inherit regular products, fallback counts or all-product page links.
    page = replace_once(r'<!-- CATALOG-GRID-START -->.*?<!-- CATALOG-GRID-END -->', '<!-- CATALOG-GRID-START -->\n<div class="row g-4" id="productGrid"></div>\n<!-- CATALOG-GRID-END -->', page)
    page = replace_once(r'<!-- CATALOG-PAGES-START -->.*?<!-- CATALOG-PAGES-END -->', '<!-- CATALOG-PAGES-START --><!-- CATALOG-PAGES-END -->', page)
    page = replace_once(r'<noscript>.*?</noscript>', '<noscript><p>Enable JavaScript to check current offers and ranking evidence. <a href="products.html">Browse the complete saved product catalog</a>.</p></noscript>', page)
    page = page.replace('class="nav-link active" href="products.html" aria-current="page"', 'class="nav-link" href="products.html"')
    page = page.replace('href="index.html#deals"', 'href="deals.html"')
    page = page.replace(f'class="nav-link" href="{filename}"', f'class="nav-link active" href="{filename}" aria-current="page"')
    fallback = ('<div class="alert alert-light border mt-3"><strong>Every deal is also in All Products.</strong> '
                'Conditional coupons, membership requirements, shipping and tax can affect the final cost. '
                '<a href="https://www.amazon.com/deals?tag=myelectroys-20" target="_blank" rel="sponsored nofollow noopener noreferrer">Browse Amazon deals (paid link)</a> · <a href="products.html">Browse all products</a> · <a href="products.html?category=Books%20%26%20Learning%20Resources">Books &amp; learning</a> · '
                '<a href="products.html?category=Computer%20Parts">PC components</a></div>') if kind == 'deals' else (
                '<div class="alert alert-light border mt-3"><strong>Curated by Electroys.</strong> '
                'Electroys recommendations are editorial selections, not Amazon sales rankings. '
                '<a href="products.html?sort=recommended">Explore Electroys picks</a> · <a href="https://www.amazon.com/gp/bestsellers/?tag=myelectroys-20" target="_blank" rel="sponsored nofollow noopener noreferrer">Browse Amazon Best Sellers (paid link)</a>.</div>')
    page = page.replace('<section class="section pt-4"', fallback + '\n<section class="section pt-4"', 1)
    if kind == 'bestsellers':
        ribbon = '<section class="container py-4" aria-label="Curated Amazon picks"><p id="bestSellersRibbonStatus" role="status">Loading Electroys Amazon picks.</p><div id="bestSellersRibbon" class="amazon-ribbon"></div></section>'
        page = page.replace('<section class="section pt-4"', ribbon + '<section class="section pt-4"', 1)
        page = page.replace('</head>', '<link rel="stylesheet" href="collections.css?v=20261020-2">\n</head>', 1)
        page = page.replace('</body>', '<script src="collections.js?v=20261020-2"></script>\n</body>', 1)
    return page


HOME_COLLECTIONS = '''<!-- HOME-COLLECTIONS-START -->
<section id="deals" class="section section-light" aria-labelledby="home-deals-title"><div class="container">
  <div class="section-title"><h2 id="home-deals-title">Deals worth exploring</h2><div class="line"></div><p>Current verified offers from the same catalog. Every deal is also listed in All Products.</p></div>
  <p id="homeDealsStatus" class="text-center" role="status">Open Deals to check current verified offers.</p>
  <div id="homeDealsGrid" class="row g-4"></div>
  <div class="text-center mt-4"><a class="btn btn-primary px-4" href="deals.html">More deals</a> <a class="btn btn-outline-primary" href="deals.html?relationship=core">STEM project deals</a></div>
</div></section>
<section id="best-sellers" class="section" aria-labelledby="home-bestsellers-title"><div class="container">
  <div class="section-title"><h2 id="home-bestsellers-title">Best Sellers</h2><div class="line"></div><p>Fifteen Amazon picks curated for STEM learning and supporting technology. Electroys editorial selections; not a claim of Amazon sales rank.</p></div>
  <p id="homeBestSellersStatus" class="text-center" role="status">Loading our curated Amazon picks. All picks are also in All Products.</p>
  <div id="homeBestSellersGrid" class="row g-4"></div>
  <div class="text-center mt-4"><a class="btn btn-primary px-4" href="best-sellers.html">Explore Best Sellers</a> <a class="btn btn-outline-primary" href="products.html?sort=recommended">Electroys picks</a></div>
</div></section>
<section class="section section-light" aria-labelledby="more-ways-heading"><div class="container"><div class="section-title"><h2 id="more-ways-heading">More ways to build your curiosity</h2><div class="line"></div><p>Start with a project, learn from a book, or explore the equipment that supports your next build.</p></div>
<div class="d-flex justify-content-center gap-3 flex-wrap"><a class="btn btn-outline-primary" href="products.html?relationship=core">Project-focused picks</a><a class="btn btn-outline-primary" href="products.html?category=Books%20%26%20Learning%20Resources">STEM books</a><a class="btn btn-outline-primary" href="products.html?category=Computer%20Parts">PC components</a><a class="btn btn-outline-primary" href="products.html?relationship=support">Projects + supporting gear</a></div>
</div></section>
<!-- HOME-COLLECTIONS-END -->'''


def update_home(home):
    if '<!-- HOME-COLLECTIONS-START -->' in home:
        home = replace_once(r'<!-- HOME-COLLECTIONS-START -->.*?<!-- HOME-COLLECTIONS-END -->', HOME_COLLECTIONS, home)
    else:
        home = replace_once(r'<section id="deals".*?</section>', HOME_COLLECTIONS, home)
    if 'href="collections.css' not in home:
        home = home.replace('</head>', '<link rel="stylesheet" href="collections.css?v=20261020-2">\n</head>', 1)
    if 'src="collections.js' not in home:
        home = home.replace('</body>', '<script src="catalog.js?v=20261020-2"></script>\n<script src="collections.js?v=20261020-2"></script>\n</body>', 1)
    home = home.replace("catalog.js?v=20261020-2", "catalog.js?v=20261020-2").replace("collections.js?v=20261020-2", "collections.js?v=20261020-2")
    home = home.replace('href="collections.css"', 'href="collections.css?v=20261020-2"')
    return home


def build(root=ROOT):
    template = (root / 'products.html').read_text()
    for kind in DESCRIPTIONS:
        filename = 'deals.html' if kind == 'deals' else 'best-sellers.html'
        (root / filename).write_text(collection_page(template, kind))
    (root / 'index.html').write_text(update_home((root / 'index.html').read_text()))
    (root / 'prime-deals.html').write_text('''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deals have moved | Electroys</title><link rel="canonical" href="https://electroys.com/deals.html"><meta http-equiv="refresh" content="0;url=deals.html"></head><body><main><h1>Electroys Deals</h1><p>Our current deals are now on the dedicated Deals page.</p><a href="deals.html">Continue to Deals</a><p><a href="products.html">Browse all products</a></p></main></body></html>\n''')
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', namespace)
    path = root / 'sitemap.xml'
    tree = ET.parse(path)
    element = tree.getroot()
    targets = {'https://electroys.com/deals.html', 'https://electroys.com/best-sellers.html'}
    targets.update('https://electroys.com/' + p.name for p in root.glob('products-page-*.html'))
    for entry in list(element):
        location = entry.find(f'{{{namespace}}}loc')
        if location is not None and location.text == 'https://electroys.com/prime-deals.html':
            element.remove(entry)
    existing = {e.find(f'{{{namespace}}}loc').text for e in element if e.find(f'{{{namespace}}}loc') is not None}
    for url in sorted(targets - existing):
        entry = ET.SubElement(element, f'{{{namespace}}}url')
        ET.SubElement(entry, f'{{{namespace}}}loc').text = url
        ET.SubElement(entry, f'{{{namespace}}}lastmod').text = datetime.now(timezone.utc).date().isoformat()
    tree.write(path, encoding='UTF-8', xml_declaration=True)
    return ['deals.html', 'best-sellers.html', 'prime-deals.html', 'index.html', 'sitemap.xml']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    print('Built collections: ' + ', '.join(build(args.root)))
