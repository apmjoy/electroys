"""Refresh factual first-party retailer catalog records; never import Amazon HTML prices.

Original descriptions are deliberately short: these records describe components,
not tested complete projects. Run before the shared build and validation steps.
"""
import argparse
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parent.parent
PROVIDERS = [('arduino', 'Arduino', 'https://store-usa.arduino.cc', 'USD', 2),
             ('coolermaster', 'Cooler Master', 'https://store.coolermaster.com', 'USD', 1),
             ('pimoroni', 'Pimoroni', 'https://shop.pimoroni.com', 'GBP', 4)]

def classification(item):
    kind = item.get('product_type', '').lower()
    title = item.get('title', '').lower()
    if 'एक' in title: return None
    if kind in ('merchandising', 'swag', 'software') or any(w in title for w in ('notebook', 't-shirt', 'gift card', 'sticker pack')):
        return None
    if kind in ('pc cases','power supplies','cooling'):
        return ('Computer Parts', {'pc cases':'PC case','power supplies':'Power supply','cooling':'PC cooling'}[kind], 'support', 'A PC build component; verify motherboard size, physical clearance, power requirements and connectors before ordering.')
    if kind == 'book':
        return ('Books & Learning Resources', 'Book', 'core', 'A practical learning resource; verify edition and prerequisites at the publisher.')
    if any(w in kind for w in ('robot', 'motor', 'servo')):
        return ('Robotics', 'Robot kit' if 'kit' in kind or 'robot' in kind else 'Motor & motion', 'core', 'A robotics or motion component; additional parts may be required.')
    if kind in ('tool', 'battery', 'power', 'cable', 'cable/wire', 'case', 'accessory', 'antenna', 'keyboard'):
        return ('Maker Essentials', kind.title(), 'support', 'Supporting equipment used when assembling or powering electronics projects.')
    if re.search(r'\b(?:nvme|ssd|pcie|heatsink)\b', title):
        return ('Computer Parts', 'Computer component', 'support', 'A computer component; check exact platform, physical and electrical compatibility.')
    if kind == 'camera':
        return ('Electronics', 'Camera module', 'core', 'A camera module for a compatible development platform; check interface and software support.')
    if kind == 'wearable':
        return ('Electronics', 'Wearable electronics', 'core', 'Electronics intended for wearable projects; additional components may be needed.')
    if kind in ('kit', 'soldering project', 'experimentation'):
        return ('Build & Make', 'Project kit', 'core', 'A hands-on kit; consult the retailer for included parts and required equipment.')
    if 'sensor' in kind:
        return ('Electronics', 'Sensor', 'core', 'A sensor for a compatible circuit or development board; check voltage and interface requirements.')
    return ('Electronics', item.get('product_type') or 'Electronic component', 'core', 'A development board or electronic component for building and experimenting.')

def money(value):
    try:
        result = Decimal(str(value))
        return float(result) if result.is_finite() and result > 0 else None
    except (InvalidOperation, ValueError, TypeError):
        return None

def fetch_json(url):
    # Only fixed original provider endpoints are accepted, including redirects.
    # urllib honors the execution environment's outbound proxy and TLS trust.
    import urllib.request
    from time import sleep
    allowed = {"store-usa.arduino.cc", "shop.pimoroni.com", "store.coolermaster.com"}
    def allowed_url(value):
        p = urlsplit(value)
        return p.scheme == "https" and p.hostname in allowed and not p.username and not p.password and p.port in (None, 443) and p.path in ("/products.json", "/meta.json")
    class Redirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            if not allowed_url(newurl):
                raise ValueError("Unexpected feed redirect")
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    if not allowed_url(url):
        raise ValueError("Only original configured catalog feeds are allowed")
    opener = urllib.request.build_opener(Redirect())
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "ElectroysCatalog/1.0", "Accept": "application/json"})
            with opener.open(request, timeout=30) as response:
                if "json" not in response.headers.get("Content-Type", "").lower():
                    raise ValueError("Unexpected feed content type")
                payload = response.read(10_000_001)
                if len(payload) > 10_000_000:
                    raise ValueError("Feed exceeds size limit")
                return json.loads(payload)
        except (OSError, ValueError):
            if attempt == 2: raise
            sleep(1)

def identity(url):
    p = urlsplit(url)
    return (p.hostname, p.path.rstrip('/'))

def import_catalog(products, previous_offers, feeds, now, target=600):
    products = dict(products)
    checked = now.isoformat()
    expiry = (now + timedelta(hours=24)).isoformat()
    offers = [o for o in previous_offers.get('offers', []) if o.get('retailer') not in tuple(provider[1] for provider in PROVIDERS)]
    known = {identity(p['url']): k for k, p in products.items() if isinstance(p, dict) and p.get('url')}
    titles = {''.join(c for c in p['t'].casefold() if c.isalnum()): k for k, p in products.items()}
    counts = {}
    for prefix, retailer, base, currency, pages in PROVIDERS:
        items = feeds.get(prefix, [])
        imported = 0
        for existing in products.values():
            if existing.get('store') == retailer and existing.get('sourceType') == 'retailer-feed':
                existing['verification'] = {'status':'unable_to_verify','checkedAt':checked,'scope':[],'issues':['Not confirmed in this feed refresh']}
        for item in items:
            if prefix == 'coolermaster' and item.get('product_type', '').lower() not in ('pc cases', 'power supplies', 'cooling'): continue
            info = classification(item)
            if not info or not isinstance(item.get('handle'), str) or not re.fullmatch(r'[a-zA-Z0-9-]+', item['handle']):
                continue
            variants = [v for v in item.get('variants', []) if v.get('available') is True and money(v.get('price'))]
            if not variants:
                source = base + '/products/' + item['handle']
                known_key = known.get(identity(source))
                if known_key and products[known_key].get('store') == retailer:
                    products[known_key]['verification'] = {'status':'unavailable','checkedAt':checked,'scope':['identity','availability'],'issues':['No available priced variant in the original retailer feed']}
                continue
            # One canonical product per product family; explicitly name selected variant.
            v = min(variants, key=lambda x: Decimal(x['price']))
            source = base + '/products/' + item['handle']
            key = known.get(identity(source))
            title_key = ''.join(c for c in str(item.get('title', '')).casefold() if c.isalnum())
            key = key or titles.get(title_key)
            if not key and len(products) >= target:
                continue
            key = key or (prefix + '-' + str(item['id']))
            category, product_type, relation, reason = info
            url = source + '?variant=' + str(v['id'])
            selected_variant = str(v.get('title', 'Default Title'))
            if key not in products:
                products[key] = {
                    't': item['title'], 'store': retailer, 'url': url,
                    'cat': category, 'categories': [category], 'productType': product_type,
                    'age': 'Check maker guidance', 'level': 'Check prerequisites', 'levels': ['Check prerequisites'],
                    'focus': product_type, 'why': reason,
                    'learn': 'Explore ' + product_type.lower() + ' as part of a suitable project. Follow the manufacturer documentation for setup and supported uses.',
                    'fit': 'Makers selecting parts for a documented project; check prerequisites before ordering.',
                    'consider': 'This listing is for the selected item, not a complete project unless the retailer specifies a complete kit. Check included parts, voltage, tools, shipping, tax and compatibility. Variant: ' + selected_variant + '.',
                    'price': 'Check current price & availability', 'image': '', 'source': source,
                    'relationship': relation, 'classificationReason': reason, 'classificationStatus': 'rule-classified',
                    'addedAt': checked, 'reviewed': now.date().isoformat(), 'dealbadge': '', 'brand': item.get('vendor') or retailer,
                }
                known[identity(source)] = key
                titles[title_key] = key
                imported += 1
            product = products[key]
            if product.get('classificationStatus') == 'rule-classified':
                product.update({'t':item['title'],'url':url,'source':source,'cat':category,'categories':[category],'productType':product_type,'relationship':relation,'classificationReason':reason,'why':reason,'focus':product_type,'learn':'Explore '+product_type.lower()+' as part of a suitable project. Follow the manufacturer documentation for setup and supported uses.','consider':'This listing is for the selected item, not a complete project unless the retailer specifies a complete kit. Check included parts, voltage, tools, shipping, tax and compatibility. Variant: '+selected_variant+'.'})
            # Preserve reviewed copy and affiliate URLs of existing records.
            if product.get('store') != retailer:
                continue
            product.update({'providerProductId': str(item['id']), 'providerVariantId': str(v['id']),
                            'sku': v.get('sku') or '', 'variant': selected_variant,
                            'sourceType': 'retailer-feed', 'sourceFeed': base + '/products.json',
                            'verification': {'status': 'verified', 'checkedAt': checked, 'scope': ['identity', 'selected-variant', 'price', 'availability'],
                                             'issues': ['Learning guidance is editorial; no independent build test is claimed.']}})
            price = money(v['price'])
            offer = {'id': prefix + '-' + str(v['id']), 'productId': key, 'retailer': retailer,
                     'url': url, 'price': price, 'currency': currency, 'verification': 'verified',
                     'sourceType': 'retailer-feed', 'sourceUrl': base + '/products.json',
                     'availability': 'in_stock', 'checkedAt': checked, 'expiresAt': expiry,
                     'variant': selected_variant, 'conditions': 'Shipping and taxes may apply. Retailer checkout determines the final total.'}
            reference = money(v.get('compare_at_price'))
            if reference and reference > price:
                offer.update({'referencePrice': reference, 'deal': True, 'promotionSource': 'Retailer compare-at price for the selected variant'})
            offers.append(offer)
        counts[retailer] = imported
    return products, {'version': 1, 'offers': offers}, counts

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--target', type=int, default=600)
    parser.add_argument('--cached-feeds', type=Path, help='Offline testing only; no fresh production verification')
    args = parser.parse_args()
    if not 500 <= args.target <= 2000:
        parser.error('target must be 500–2000')
    feeds = {}
    for prefix, retailer, base, currency, pages in PROVIDERS:
        if args.cached_feeds:
            feeds[prefix] = json.loads((args.cached_feeds / (prefix + '.json')).read_text())
        else:
            metadata = fetch_json(base + '/meta.json')
            if metadata.get('currency') != currency:
                raise ValueError('Retailer currency changed: ' + retailer)
            feeds[prefix] = []
            for page in range(1, pages + 1):
                batch = fetch_json(f'{base}/products.json?limit=250&page={page}').get('products')
                if not isinstance(batch, list):
                    raise ValueError('Invalid feed for ' + retailer)
                feeds[prefix].extend(batch)
                if len(batch) < 250:
                    break
    products = json.loads((ROOT / 'products.json').read_text())
    offers_path = ROOT / 'offers.json'
    previous = json.loads(offers_path.read_text()) if offers_path.exists() else {'offers': []}
    products, offers, counts = import_catalog(products, previous, feeds, datetime.now(timezone.utc), args.target)
    if args.cached_feeds:
        # Cached content must never receive current-time verification or offers.
        offers['offers'] = []
        for p in products.values():
            if p.get('sourceType') == 'retailer-feed':
                p['verification'] = {'status': 'unable_to_verify', 'issues': ['Offline test data']}
    from catalog_model import validate_products, duplicate_groups, validate_offer
    errors = validate_products(products)
    duplicates = duplicate_groups(products)
    bad_offers = [o['id'] for o in offers['offers'] if validate_offer(o, products)]
    if errors or duplicates or bad_offers:
        raise ValueError(json.dumps({'structural': errors, 'duplicates': duplicates, 'badOffers': bad_offers}))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for filename, data in [('products.json', products), ('offers.json', offers)]:
        (args.output_dir / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'products': len(products), 'offers': len(offers['offers']), 'deals': sum(o.get('deal') is True for o in offers['offers']), 'added': counts, 'offline': bool(args.cached_feeds)}))

if __name__ == '__main__':
    main()
