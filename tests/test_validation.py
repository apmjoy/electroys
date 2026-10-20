"""Adversarial tests use synthetic data only, never modify production catalogs."""
import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from catalog_model import duplicate_groups, fresh_offer, normalized_url, safe_url, validate_offer, validate_products
from validate_catalog import SourceError, fetch_source, public_addresses, make_report, verify_product
from refresh_catalog import stage_candidates

NOW = datetime(2026, 10, 20, 12, tzinfo=timezone.utc)

def product(title='Example robot', url='https://example.com/product/robot'):
    return dict(t=title,store='Example',url=url,cat='Robotics',age='8+',level='Beginner',why='Build a robot',learn='Learn circuits',consider='Requires batteries',categories=['Robotics'],relationship='core',source=url,verification={'status':'verified'})

def offer(**kwargs):
    value = dict(id='offer1',productId='robot',retailer='Example',url='https://example.com/product/robot',price=25,currency='USD',verification='verified',sourceType='retailer-feed',availability='in_stock',checkedAt=NOW.isoformat(),expiresAt=(NOW+timedelta(hours=2)).isoformat())
    value.update(kwargs)
    return value

class ModelTests(unittest.TestCase):
    def test_valid_offer(self):
        self.assertTrue(fresh_offer(offer(), {'robot':product()}, NOW))
    def test_gbp_valid_but_not_converted(self):
        self.assertTrue(fresh_offer(offer(currency='GBP'), {'robot':product()}, NOW))
    def test_offer_rejections(self):
        for changes in ({'price':True},{'price':float('nan')},{'price':float('inf')},{'price':0},{'price':-1},{'price':'25'},{'productId':'absent'},{'currency':'BTC'},{'verification':'unverified'},{'sourceType':'scraped'},{'availability':'out_of_stock'},{'url':'javascript:alert(1)'},{'url':'https://127.0.0.1/x'},{'expiresAt':None},{'expiresAt':(NOW-timedelta(seconds=1)).isoformat()},{'expiresAt':(NOW+timedelta(days=2)).isoformat()},{'checkedAt':(NOW+timedelta(hours=1)).isoformat()},{'referencePrice':10},{'referencePrice':True}):
            with self.subTest(changes=changes):
                self.assertFalse(fresh_offer(offer(**changes), {'robot':product()}, NOW))
    def test_amazon_source_gate(self):
        amz=offer(url='https://www.amazon.com/dp/B012345678?tag=myelectroys-20',retailer='Amazon')
        self.assertFalse(fresh_offer(amz,{'robot':product()},NOW))
        amz['sourceType']='amazon-creators-api'
        self.assertTrue(fresh_offer(amz,{'robot':product()},NOW))
    def test_coupon_conditions(self):
        self.assertFalse(fresh_offer(offer(coupon={'type':'code'}),{'robot':product()},NOW))
        self.assertFalse(fresh_offer(offer(coupon={'type':'clip','conditions':'Select accounts','percent':150}),{'robot':product()},NOW))
        self.assertTrue(fresh_offer(offer(coupon={'type':'clip','conditions':'Eligible accounts only','percent':10}),{'robot':product()},NOW))
    def test_normalized_tracking(self):
        self.assertEqual(normalized_url('https://example.com/p/?utm_source=x&variant=12&ref=y#foo'), 'https://example.com/p?variant=12')
    def test_asin_duplicates(self):
        a=product(url='https://www.amazon.com/dp/B012345678?tag=a-20')
        b=product(url='https://www.amazon.com/gp/product/B012345678?tag=b-20')
        self.assertEqual(len(duplicate_groups({'a':a,'b':b})),1)
    def test_variant_protection(self):
        a=product();b=product();a['variant']='16GB';b['variant']='32GB'
        self.assertEqual(duplicate_groups({'a':a,'b':b}),[])
        a=product(url='https://example.com/p?variant=1');b=product(url='https://example.com/p?variant=2')
        self.assertEqual(duplicate_groups({'a':a,'b':b}),[])
    def test_isbn_format_protection(self):
        a=product(url='https://example.com/a');b=product(url='https://example.com/b')
        a.update(isbn='978-1234567890',format='ebook');b.update(isbn='9781234567890',format='paperback')
        self.assertEqual(duplicate_groups({'a':a,'b':b}),[])
        b['format']='ebook'
        self.assertEqual(len(duplicate_groups({'a':a,'b':b})),1)
    def test_bad_product_records(self):
        self.assertTrue(validate_products([]))
        self.assertTrue(validate_products({'bad':None}))
        self.assertTrue(validate_products({'bad':product(url='data:text/html,test')}))
        self.assertFalse(validate_products({'ok':product()}))
    def test_unsafe_urls(self):
        for url in ('http://example.com','https://user:pass@example.com','https://example.com:8080','javascript:alert(1)','https://localhost','https://127.0.0.1','https://[::1]','https://169.254.169.254','https://example.com\n/a'):
            self.assertFalse(safe_url(url),url)

class VerificationTests(unittest.TestCase):
    def test_empty_never_all_verified(self):
        self.assertFalse(make_report({}, {'offers':[]})['summary']['allVerified'])
    def test_structural_is_not_source_verification(self):
        report=make_report({'robot':product()}, {'offers':[]})
        self.assertFalse(report['summary']['allVerified'])
        self.assertEqual(report['products'][0]['status'],'unable_to_verify')
    def test_1000_stress(self):
        data={f'product-{n}':product(title=f'Robot model {n}',url=f'https://example.com/product/{n}') for n in range(1000)}
        report=make_report(data,{'offers':[]})
        self.assertEqual(report['summary']['products'],1000)
        self.assertFalse(report['summary']['allVerified'])
        self.assertFalse(report['duplicateCandidates'])
    def test_unavailable_source_not_discontinued(self):
        def fail(url):raise SourceError('HTTP 403')
        result=verify_product(('robot',product()),True,fail)
        self.assertEqual(result['status'],'unable_to_verify')
    def test_reachable_is_not_verified(self):
        def fetch(url):return {'url':url,'body':'<html><body>'+('Example robot available. '*20)+'</body></html>'}
        result=verify_product(('robot',product()),True,fetch)
        self.assertEqual(result['status'],'unable_to_verify')
    def test_verified_claim_mapping(self):
        p=product()
        p['claims']=[{'field':f,'value':p[f],'expected':'Manufacturer source evidence '+f,'sourceUrl':p['source']} for f in ('t','age','level','why','learn','consider')]
        body=' '.join(c['expected'] for c in p['claims'])
        result=verify_product(('robot',p),True,lambda url:{'url':url,'body':body})
        self.assertEqual(result['status'],'verified')
        p['why']='Changed editorial claim'
        result=verify_product(('robot',p),True,lambda url:{'url':url,'body':body})
        self.assertNotEqual(result['status'],'verified')
    def test_dns_ssrf(self):
        for address in ('127.0.0.1','10.0.0.1','169.254.169.254','::1','fc00::1'):
            with patch('socket.getaddrinfo',return_value=[(None,None,None,None,(address,443))]):
                with self.assertRaises(SourceError):public_addresses('example.com')
    def test_unsafe_fetch_before_network(self):
        with self.assertRaises(SourceError):fetch_source('http://example.com')
    def test_intake_idempotency_and_duplicates(self):
        p=product(); existing={'robot':p}
        a,r,u=stage_candidates(existing,{'robot':copy.deepcopy(p)})
        self.assertEqual(u,['robot']);self.assertFalse(a);self.assertFalse(r)
        a,r,u=stage_candidates(existing,{'duplicate':copy.deepcopy(p)})
        self.assertFalse(a);self.assertTrue(r)
    def test_intake_requires_evidence_and_classification(self):
        p=product();p.pop('verification')
        a,r,u=stage_candidates({}, {'robot':p});self.assertFalse(a);self.assertTrue(r)
        p=product();p.pop('relationship')
        a,r,u=stage_candidates({}, {'robot':p});self.assertFalse(a);self.assertTrue(r)

if __name__ == '__main__':unittest.main()
