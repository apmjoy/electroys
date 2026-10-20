#!/usr/bin/env python3
"""Validate structure, duplicate identities, offers, and optional source evidence.
No source contents or retailer prices are persisted. Network verification is opt-in.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
import hashlib
import html
import http.client
import ipaddress
import json
from pathlib import Path
import re
import socket
import ssl
import time
from urllib.parse import urlsplit, urljoin
from catalog_model import safe_url, validate_products, duplicate_groups, validate_offer, utcnow

MAX_BYTES = 2_000_000

class SourceError(Exception):
    pass

def public_addresses(host):
    try:
        addresses = list(dict.fromkeys(info[4][0] for info in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)))
    except socket.gaierror as exc:
        raise SourceError('DNS unavailable') from exc
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise SourceError('non-public destination blocked')
    return addresses

class PinnedHTTPS(http.client.HTTPSConnection):
    def connect(self):
        addresses = public_addresses(self.host)
        last = None
        for address in addresses:
            try:
                raw = socket.create_connection((address, 443), timeout=self.timeout)
                self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
                return
            except OSError as exc:
                last = exc
        raise SourceError('connection failed') from last

def fetch_source(url, timeout=12):
    """Revalidate and pin public IP on every redirect; no proxy/cookie/credentials."""
    for _ in range(5):
        if not safe_url(url):
            raise SourceError('unsafe URL blocked')
        parts = urlsplit(url)
        connection = PinnedHTTPS(parts.hostname, timeout=timeout, context=ssl.create_default_context())
        try:
            path = parts.path or '/'
            if parts.query:
                path += '?' + parts.query
            connection.request('GET', path, headers={'User-Agent': 'ElectroysCatalogValidator/1.0 (+https://electroys.com/contact.html)', 'Accept': 'text/html,application/json', 'Accept-Encoding': 'identity'})
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader('Location')
                if not location:
                    raise SourceError('redirect without destination')
                url = urljoin(url, location)
                continue
            if response.status != 200:
                raise SourceError('HTTP ' + str(response.status))
            if not any(x in response.getheader('Content-Type', '').lower() for x in ('text/html', 'application/json', 'text/plain')):
                raise SourceError('unsupported content type')
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise SourceError('source exceeds size limit')
            return {'url': url, 'body': body.decode('utf-8', errors='replace')}
        except (OSError, http.client.HTTPException) as exc:
            raise SourceError(type(exc).__name__) from exc
        finally:
            connection.close()
    raise SourceError('too many redirects')

def fetch_with_retry(url):
    for attempt in range(2):
        try:
            return fetch_source(url)
        except SourceError:
            if attempt:
                raise
            time.sleep(.3)

def source_text(body):
    body = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', ' ', body, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', body))).strip().lower()

def similar_products(products):
    """A suggestion only. Never merges based on title similarity."""
    buckets, results = {}, []
    for key, p in products.items():
        if not isinstance(p, dict):
            continue
        title = re.sub(r'[^a-z0-9 ]', ' ', str(p.get('t', '')).lower())
        words = title.split()
        if not words:
            continue
        bucket = str(p.get('brand') or words[0]).lower()
        for other, other_title in buckets.get(bucket, []):
            similarity = SequenceMatcher(None, title, other_title).ratio()
            if similarity >= .9:
                results.append({'products': [other, key], 'score': round(similarity, 3), 'action': 'review_only'})
        buckets.setdefault(bucket, []).append((key, title))
    return results

def verify_product(item, online=False, fetch=fetch_with_retry, feed_records=None):
    key, p = item
    result = {'productId': key, 'status': 'unable_to_verify', 'checkedAt': utcnow().isoformat(), 'fieldChecks': [], 'issues': []}
    if not isinstance(p, dict):
        result['issues'].append('invalid product record')
        return result
    if not online:
        result['issues'].append('network verification not requested')
        return result
    if p.get('sourceType') == 'retailer-feed' and p.get('providerProductId') and feed_records is not None:
        host = urlsplit(p.get('sourceFeed', '')).hostname
        record = feed_records.get((host, str(p['providerProductId'])))
        result['scope'] = ['identity', 'selected-variant', 'availability']
        if not record:
            result['issues'].append('Original feed record could not be refreshed; no discontinuation inferred')
            return result
        title_matches = re.sub(r'\s+', ' ', str(record.get('title', '')).strip()).casefold() == re.sub(r'\s+', ' ', str(p.get('t', '')).strip()).casefold()
        variant = next((v for v in record.get('variants', []) if str(v.get('id')) == str(p.get('providerVariantId'))), None)
        result['fieldChecks'] = [{'field':'t','status':'verified' if title_matches else 'changed'}]
        result['fieldChecks'] += [{'field':f,'status':'needs_evidence'} for f in ('age','level','why','learn','consider')]
        result['status'] = 'changed' if not title_matches or not variant else 'verified' if variant.get('available') is True else 'unavailable'
        result['detailsVerified'] = False
        result['issues'].append('Feed verifies factual identity and selected variant; editorial learning guidance is not independently build-tested')
        return result
    # Manufacturer details and retailer offers are separate evidence domains.
    claims = p.get('claims', [])
    required = ('t', 'age', 'level', 'why', 'learn', 'consider')
    if not isinstance(claims, list):
        claims = []
    urls = [u for u in (p.get('source'), p.get('documentation'), p.get('url')) if safe_url(u)]
    urls += [c.get('sourceUrl') for c in claims if isinstance(c, dict) and safe_url(c.get('sourceUrl'))]
    cache = {}
    for url in dict.fromkeys(urls):
        host = urlsplit(url).hostname
        if host in ('amazon.com', 'www.amazon.com', 'smile.amazon.com', 'amzn.to'):
            cache[url] = {'error': 'Amazon details require authorized source integration'}
            continue
        try:
            data = fetch(url)
            body = data['body']
            text = source_text(body)
            if len(text) < 80 or any(s in text[:5000] for s in ('verify you are human', 'captcha', 'access denied', 'just a moment...')):
                raise SourceError('access challenge or insufficient content')
            cache[url] = {'text': text, 'digest': hashlib.sha256(body.encode()).hexdigest(), 'url': data['url']}
        except SourceError as exc:
            cache[url] = {'error': str(exc)}
    result['sources'] = [{'url': u, 'status': 'unreachable' if 'error' in d else 'reachable', **({'error': d['error']} if 'error' in d else {'digest': d['digest']})} for u, d in cache.items()]
    for field in required:
        matches = [c for c in claims if isinstance(c, dict) and c.get('field') == field]
        if not matches:
            result['fieldChecks'].append({'field': field, 'status': 'needs_evidence'})
            continue
        field_status = 'verified'
        for claim in matches:
            data = cache.get(claim.get('sourceUrl'), {})
            expected = claim.get('expected')
            if not isinstance(expected, str) or len(expected.strip()) < 8 or claim.get('value') != p.get(field):
                field_status = 'needs_evidence'
            elif not data.get('text'):
                field_status = 'unable_to_verify'
            elif re.sub(r'\s+', ' ', expected.lower()).strip() not in data['text']:
                field_status = 'changed'
            # Verified means the recorded source excerpt still exists for an editor-
            # approved claim/value mapping, not that a language model proved it true.
        result['fieldChecks'].append({'field': field, 'status': field_status})
    statuses = [c['status'] for c in result['fieldChecks']]
    if statuses and all(s == 'verified' for s in statuses):
        result['status'] = 'verified'
    elif 'changed' in statuses:
        result['status'] = 'changed'
    else:
        result['issues'].append('source evidence incomplete; link reachability is not product validation')
    return result

def make_report(products, offers, online=False, workers=4):
    structural = validate_products(products)
    feed_records = {}
    feed_errors = []
    if online:
        from import_retailer_catalogs import PROVIDERS, fetch_json
        for prefix, retailer, base, currency, pages in PROVIDERS:
            try:
                for page in range(1,pages+1):
                    batch = fetch_json(f'{base}/products.json?limit=250&page={page}')['products']
                    for entry in batch: feed_records[(urlsplit(base).hostname,str(entry['id']))] = entry
                    if len(batch)<250: break
            except (OSError,ValueError,KeyError,TypeError) as exc:
                feed_errors.append({'retailer':retailer,'error':type(exc).__name__})
    valid_products = products if isinstance(products, dict) else {}
    with ThreadPoolExecutor(max_workers=max(1, min(workers, 4))) as pool:
        checks = list(pool.map(lambda item: verify_product(item, online, feed_records=feed_records if online else None), valid_products.items()))
    offer_list = offers.get('offers', []) if isinstance(offers, dict) else []
    offer_errors = []
    if not isinstance(offer_list, list):
        offer_errors.append({'offerId': None, 'errors': ['offers must be an array']})
        offer_list = []
    for o in offer_list:
        errors = validate_offer(o, valid_products)
        if errors:
            offer_errors.append({'offerId': o.get('id') if isinstance(o, dict) else None, 'errors': errors})
    exact = duplicate_groups(valid_products)
    counts = dict(Counter(c['status'] for c in checks))
    return {'version': 1, 'checkedAt': utcnow().isoformat(), 'mode': 'online' if online else 'structural-only',
            'summary': {'products': len(valid_products), 'target': 500, 'shortfall': max(0, 500 - len(valid_products)),
                        'states': counts, 'allVerified': bool(checks) and not structural and not exact and not offer_errors and all(c['status'] == 'verified' and all(f['status']=='verified' for f in c.get('fieldChecks',[])) for c in checks)},
            'structuralErrors': structural, 'duplicateCandidates': exact, 'similarityCandidates': similar_products(valid_products),
            'offerErrors': offer_errors, 'feedErrors': feed_errors, 'products': checks}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--products', type=Path, default=Path(__file__).resolve().parent.parent / 'products.json')
    parser.add_argument('--offers', type=Path, default=Path(__file__).resolve().parent.parent / 'offers.json')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--online', action='store_true')
    args = parser.parse_args()
    try:
        products = json.loads(args.products.read_text())
        offers = json.loads(args.offers.read_text())
        report = make_report(products, offers, args.online)
    except (ValueError, OSError) as exc:
        report = {'summary': {'allVerified': False}, 'fatalError': str(exc)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report.get('summary')))
    return 1 if report.get('fatalError') or report.get('structuralErrors') or report.get('duplicateCandidates') or report.get('offerErrors') else 0

if __name__ == '__main__':
    raise SystemExit(main())
