"""Select and attach exact first-party feed image references, never copied files."""
import argparse
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from catalog_model import safe_url

ALLOWED_IMAGE_HOSTS = {'cdn.shopify.com'}

def image_url(value, width=640):
    if not safe_url(value):
        return None
    p = urlsplit(value)
    if p.hostname not in ALLOWED_IMAGE_HOSTS or not p.path.startswith('/s/files/'):
        return None
    if not re.search(r'\.(?:jpe?g|png|webp|avif|gif)$', p.path, re.I):
        return None
    query = [(k, v) for k, v in parse_qsl(p.query) if k == 'v']
    query.append(('width', str(max(160, min(1280, int(width))))))
    return urlunsplit(('https', p.hostname, p.path, urlencode(query), ''))

def select_image(item, variant):
    """Prefer exact selected variant, then generic family image, never other variant."""
    if not isinstance(item, dict) or not isinstance(variant, dict):
        return None
    images = item.get('images', [])
    if not isinstance(images, list):
        return None
    selected_id = str(variant.get('id', ''))
    featured = variant.get('featured_image')
    featured_id = str(featured.get('id')) if isinstance(featured, dict) else str(featured or '')
    choices = []
    for order, candidate in enumerate(images):
        if not isinstance(candidate, dict):
            continue
        url = image_url(candidate.get('src'))
        if not url:
            continue
        if candidate.get('product_id') is not None and str(candidate['product_id']) != str(item.get('id')):
            continue
        variants = candidate.get('variant_ids', [])
        if not isinstance(variants, list):
            continue
        variants = [str(v) for v in variants]
        exact = str(candidate.get('id')) == featured_id or selected_id in variants
        if variants and not exact:
            continue
        choices.append((0 if exact else 1, order, {'url':url,'providerImageId':str(candidate.get('id','')),'providerProductId':str(item.get('id','')),'providerVariantId':selected_id,'source':'original-retailer-feed'}))
    return min(choices, key=lambda c: c[:2])[2] if choices else None

def apply_image(product, item, variant, checked_at=None):
    """Preserve curated images; refresh only missing or previously feed-owned images."""
    current = product.get('image', '')
    metadata=product.get('imageSource')
    if current and (not isinstance(metadata,dict) or metadata.get('source') != 'original-retailer-feed'):
        return False
    selected = select_image(item, variant)
    if not selected:
        return False
    if checked_at:
        selected['feedCheckedAt'] = checked_at
    selected['contentVerified'] = False
    changed = current != selected['url']
    product['image'] = selected['url']
    product['imageSource'] = selected
    return changed

def enrich_existing(products, feeds):
    """Image-only operation: does not alter offers, counts, editorial copy or dates."""
    index = {}
    for provider, items in feeds.items():
        for item in items if isinstance(items, list) else []:
            if isinstance(item, dict):
                index[(provider, str(item.get('id')))] = item
    stores = {'Arduino':'arduino','Pimoroni':'pimoroni','Cooler Master':'coolermaster'}
    changed, missing = [], []
    for key, product in products.items():
        if not isinstance(product, dict) or product.get('store') not in stores:
            continue
        item = index.get((stores[product['store']],str(product.get('providerProductId'))))
        if not item:
            if not product.get('image'):missing.append(key)
            continue
        variant = next((v for v in item.get('variants',[]) if isinstance(v,dict) and str(v.get('id'))==str(product.get('providerVariantId'))),None)
        if variant and apply_image(product,item,variant):
            changed.append(key)
        elif not product.get('image'):
            missing.append(key)
    return {'updated':len(changed),'productIds':changed,'stillMissing':missing,'scope':'image references only; cached feed is not current price or image-content verification'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--products',type=Path,required=True)
    parser.add_argument('--cached-feeds',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.resolve()==args.products.resolve():parser.error('use a separate staging output; never overwrite production directly')
    products=json.loads(args.products.read_text())
    feeds={p.stem:json.loads(p.read_text()) for p in args.cached_feeds.glob('*.json') if p.stem in ('arduino','pimoroni','coolermaster')}
    result=enrich_existing(products,feeds)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(products,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(result))
if __name__=='__main__':main()
