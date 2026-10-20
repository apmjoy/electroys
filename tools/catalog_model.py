"""Shared catalog rules. No network or filesystem side effects on import."""
from datetime import datetime, timezone, timedelta
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import math
import ipaddress
import re

OFFER_SOURCES = {'amazon-creators-api', 'retailer-api', 'retailer-feed'}
TRACKING = {'tag', 'ref', 'ref_', 'linkcode', 'camp', 'creative', 'ascsubtag', 'gclid', 'fbclid'}

def utcnow():
    return datetime.now(timezone.utc)

def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('timestamp must be an ISO8601 string')
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('timestamp requires timezone')
    return result.astimezone(timezone.utc)

def safe_url(value):
    if not isinstance(value, str) or any(ord(c) < 33 for c in value):
        return False
    try:
        p = urlsplit(value)
        try:
            if p.hostname and not ipaddress.ip_address(p.hostname).is_global:
                return False
        except ValueError:
            pass
        return p.scheme == 'https' and bool(p.hostname) and not p.username and not p.password and p.port in (None, 443) and p.hostname not in ('localhost',) and not p.hostname.endswith(('.local', '.localhost'))
    except ValueError:
        return False

def asin(value):
    if not safe_url(value):
        return None
    p = urlsplit(value)
    if p.hostname not in ('amazon.com', 'www.amazon.com', 'smile.amazon.com'):
        return None
    match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})(?:/|$)', p.path, re.I)
    return match.group(1).upper() if match else None

def normalized_url(value):
    if not safe_url(value):
        return None
    p = urlsplit(value)
    item = asin(value)
    if item:
        return 'https://www.amazon.com/dp/' + item
    query = sorted((k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
                   if k.lower() not in TRACKING and not k.lower().startswith('utm_'))
    return urlunsplit(('https', p.netloc.lower(), p.path.rstrip('/') or '/', urlencode(query), ''))

def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def validate_offer(offer, products, now=None):
    now = now or utcnow()
    if not isinstance(offer, dict):
        return ['offer must be an object']
    errors = []
    if not isinstance(offer.get('productId'), str) or offer.get('productId') not in products:
        errors.append('unknown productId')
    if not safe_url(offer.get('url')):
        errors.append('unsafe offer URL')
    if offer.get('currency') not in ('USD', 'GBP', 'EUR'):
        errors.append('unsupported currency')
    if not number(offer.get('price')) or offer['price'] <= 0:
        errors.append('price must be a finite positive number')
    if offer.get('verification') != 'verified' or not isinstance(offer.get('sourceType'), str) or offer.get('sourceType') not in OFFER_SOURCES:
        errors.append('offer requires verified authorized source')
    is_amazon = 'amazon' in str(offer.get('retailer', '')).lower() or (safe_url(offer.get('url')) and urlsplit(offer['url']).hostname in ('amazon.com', 'www.amazon.com', 'smile.amazon.com'))
    if is_amazon and offer.get('sourceType') != 'amazon-creators-api':
        errors.append('Amazon offer requires Creators API')
    if offer.get('availability') != 'in_stock':
        errors.append('offer not in stock')
    try:
        checked, expiry = timestamp(offer.get('checkedAt')), timestamp(offer.get('expiresAt'))
        if checked > now + timedelta(minutes=5):
            errors.append('checkedAt is in the future')
        if not checked < expiry <= checked + timedelta(hours=24):
            errors.append('expiry must be within 24 hours of check')
        if now >= expiry or now - checked >= timedelta(hours=24):
            errors.append('expired offer')
    except (ValueError, TypeError, OverflowError):
        errors.append('valid checkedAt and expiresAt required')
    reference = offer.get('referencePrice')
    if reference is not None and (not number(reference) or not number(offer.get('price')) or reference <= offer['price']):
        errors.append('invalid comparison price')
    coupon = offer.get('coupon')
    if coupon is not None:
        if not isinstance(coupon, dict):
            errors.append('coupon must be an object')
        else:
            if coupon.get('type') not in ('clip', 'code') or not isinstance(coupon.get('conditions'), str) or not coupon['conditions'].strip():
                errors.append('coupon type and conditions required')
            if coupon.get('type') == 'code' and not coupon.get('code'):
                errors.append('coupon code required')
            if 'percent' in coupon and (not number(coupon['percent']) or not 0 < coupon['percent'] <= 100):
                errors.append('invalid coupon percent')
            if 'amount' in coupon and (not number(coupon['amount']) or coupon['amount'] <= 0):
                errors.append('invalid coupon amount')
            if coupon.get('expiresAt'):
                try:
                    if timestamp(coupon['expiresAt']) <= now:
                        errors.append('expired coupon')
                except (ValueError, TypeError, OverflowError):
                    errors.append('invalid coupon expiry')
    return errors

def fresh_offer(offer, products, now=None):
    return not validate_offer(offer, products, now)

def duplicate_groups(products):
    """Exact matches are candidates for merge, never destructive automatic merges.
    Preserve variant and format in identity; normalized URLs retain variant query.
    """
    identities, groups = {}, []
    if not isinstance(products, dict):
        return []
    for key, p in products.items():
        if not isinstance(p, dict):
            continue
        variant = str(p.get('variant', '')).strip().lower()
        fmt = str(p.get('format', '')).strip().lower()
        tokens = []
        item = p.get('asin') or asin(p.get('url'))
        if item:
            tokens.append(('asin', str(item).upper(), variant, fmt))
        for field in ('gtin', 'upc', 'ean', 'isbn'):
            if p.get(field):
                tokens.append((field, re.sub(r'[-\s]', '', str(p[field])).upper(), variant, fmt))
        if p.get('manufacturerPartNumber') and p.get('brand'):
            tokens.append(('mpn', str(p['brand']).lower(), str(p['manufacturerPartNumber']).lower(), variant, fmt))
        url = normalized_url(p.get('url'))
        if url:
            tokens.append(('url', url, variant, fmt))
        for token in tokens:
            identities.setdefault(token, []).append(key)
    seen = set()
    for token, keys in identities.items():
        signature = tuple(sorted(set(keys)))
        if len(signature) > 1 and signature not in seen:
            seen.add(signature)
            groups.append({'products': list(signature), 'reason': token[0], 'identity': token[1], 'action': 'review_merge'})
    return groups

def validate_products(products):
    errors = []
    if not isinstance(products, dict):
        return [{'productId': None, 'errors': ['catalog must be an object']}]
    required = ('t', 'store', 'url', 'cat', 'age', 'level', 'why', 'learn', 'consider')
    for key, p in products.items():
        e = []
        if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,100}', key):
            e.append('invalid product key')
        if not isinstance(p, dict):
            errors.append({'productId': key, 'errors': ['product must be an object']})
            continue
        for field in required:
            if not isinstance(p.get(field), str) or not p[field].strip():
                e.append('missing ' + field)
        if not safe_url(p.get('url')):
            e.append('unsafe product URL')
        if p.get('relationship', 'core') not in ('core', 'support', 'general'):
            e.append('invalid relationship')
        if not isinstance(p.get('categories'), list) or not p.get('categories') or not all(isinstance(x, str) for x in p['categories']):
            e.append('categories must be a nonempty string array')
        if e:
            errors.append({'productId': key, 'errors': e})
    return errors
