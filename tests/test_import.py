import json
from pathlib import Path
import sys
import unittest
from datetime import datetime, timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from import_retailer_catalogs import classification, import_catalog, money
from discover_deals import direct_merchant, candidates

class ImportTests(unittest.TestCase):
    def test_money(self):
        for value in ['NaN','Infinity','0','-3',None]: self.assertIsNone(money(value))
        self.assertEqual(money('12.34'),12.34)
    def test_exclude_filler(self):
        self.assertIsNone(classification({'product_type':'Swag','title':'Sticker'}))
        self.assertIsNone(classification({'product_type':'Board','title':'Controller एक R4'}))
        self.assertEqual(classification({'product_type':'Display','title':'eInk SSD1680Z'})[0],'Electronics')
        self.assertEqual(classification({'product_type':'Book','title':'Robotics guide'})[1],'Book')
    def test_excluded_brand_does_not_return_through_other_retailer(self):
        self.assertIsNone(classification({'product_type':'Board','title':'Arduino Nano','vendor':'Arduino'}))
        self.assertIsNone(classification({'product_type':'Book','title':'Arduino Project Handbook'}))
        item={'id':12,'title':'Adafruit Metro RP2040','handle':'metro','product_type':'Arduino Compatible','vendor':'Adafruit','variants':[{'id':13,'title':'Default Title','price':'12.50','available':True}]}
        products,offers,_=import_catalog({}, {'offers':[]}, {'pimoroni':[item],'coolermaster':[]}, datetime.now(timezone.utc))
        self.assertEqual(len(products),1)
        product=products['pimoroni-12']
        self.assertEqual(product['productType'],'Microcontroller board')
        self.assertNotIn('Arduino',product['focus'])
        self.assertEqual(offers['offers'][0]['productId'],'pimoroni-12')
    def test_idempotence_and_exact_variant(self):
        item={'id':12,'title':'Sensor module','handle':'sensor','product_type':'Sensor','variants':[{'id':13,'title':'3V','price':'7.50','available':True},{'id':14,'title':'5V','price':'5.50','available':False}]}
        feeds={'pimoroni':[item],'coolermaster':[]}; now=datetime.now(timezone.utc)
        p,o,c=import_catalog({}, {'offers':[]},feeds,now)
        self.assertEqual(len(p),1);self.assertEqual(o['offers'][0]['price'],7.5)
        self.assertIn('variant=13',o['offers'][0]['url'])
        p2,o2,c2=import_catalog(p,o,feeds,now)
        self.assertEqual(len(p2),1);self.assertEqual(len(o2['offers']),1)
    def test_direct_link_policy(self):
        self.assertIsNone(direct_merchant('https://slickdeals.net/click?url=x'))
        self.assertIsNone(direct_merchant('https://amazon.com.evil.test/dp/B012345678'))
        self.assertEqual(direct_merchant('https://www.amazon.com/dp/B012345678?tag=someone-20'),'https://www.amazon.com/dp/B012345678?tag=myelectroys-20')
    def test_candidates_not_offers(self):
        r=candidates('<a href="/f/123-a-computer">An example computer deal</a>')
        self.assertFalse(r[0]['publishable']);self.assertNotIn('price',r[0])
if __name__=='__main__': unittest.main()
