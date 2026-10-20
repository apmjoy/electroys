import copy
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from retailer_images import image_url,select_image,apply_image,enrich_existing
from validate_images import check_image,decode_image,fetch_image
from validate_catalog import SourceError

URL='https://cdn.shopify.com/s/files/1/1234/files/robot.jpg?v=123'
def item():return {'id':1,'images':[{'id':10,'product_id':1,'src':URL,'variant_ids':[]},{'id':11,'product_id':1,'src':URL.replace('robot','red'),'variant_ids':[2]},{'id':12,'product_id':1,'src':URL.replace('robot','blue'),'variant_ids':[3]}],'variants':[{'id':2}]}
class ImageTests(unittest.TestCase):
    def test_safe_selection(self):
        self.assertIn('width=640',image_url(URL))
        for value in ('javascript:alert(1)','http://cdn.shopify.com/s/files/a.jpg','https://cdn.shopify.com.evil.test/s/files/a.jpg','https://cdn.shopify.com/s/files/a.svg','https://127.0.0.1/s/files/a.jpg','https://cdn.shopify.com/other/a.jpg'):
            self.assertIsNone(image_url(value))
    def test_variant_selected(self):
        self.assertIn('/red.jpg',select_image(item(),{'id':2})['url'])
        self.assertIn('/blue.jpg',select_image(item(),{'id':3})['url'])
        self.assertIn('/robot.jpg',select_image(item(),{'id':4})['url'])
    def test_wrong_product_and_variant_not_selected(self):
        p=item();p['images']=p['images'][1:];self.assertIsNone(select_image(p,{'id':4}))
        p=item();p['images'][0]['product_id']=99;p['images']=p['images'][:1]
        self.assertIsNone(select_image(p,{'id':2}))
    def test_preserve_curated_local(self):
        p={'image':'assets/products/test.png'}
        self.assertFalse(apply_image(p,item(),{'id':2}));self.assertEqual(p['image'],'assets/products/test.png')
    def test_apply_and_enrich_only_image(self):
        products={'one':{'store':'Arduino','providerProductId':'1','providerVariantId':'2','image':'','t':'Keep title','verification':{'checkedAt':'old'}},'book':{'store':'Amazon','image':'','t':'Keep book'}}
        before=copy.deepcopy(products)
        result=enrich_existing(products,{'arduino':[item()]})
        self.assertEqual(result['updated'],1);self.assertEqual(products['one']['t'],'Keep title');self.assertEqual(products['one']['verification'],before['one']['verification']);self.assertEqual(products['book'],before['book'])
        self.assertFalse(products['one']['imageSource']['contentVerified'])
    def test_no_network_means_not_verified(self):
        self.assertEqual(check_image(URL,Path('/tmp'))['status'],'unable_to_verify')
        self.assertEqual(check_image('',Path('/tmp'))['status'],'missing')
    def test_local_traversal(self):
        for value in ('../secret.png','/etc/passwd','data:image/png,a','a\\b.jpg'):
            self.assertEqual(check_image(value,Path('/tmp'))['status'],'invalid')
    def test_unsafe_download(self):
        with self.assertRaises(SourceError):fetch_image('https://127.0.0.1/a.png')
    def test_redirect_private_blocked(self):
        class Response:
            status=302
            def getheader(self,k,default=None):return 'https://127.0.0.1/a.png' if k=='Location' else default
        class Connection:
            def __init__(self,*a,**kw):pass
            def request(self,*a,**kw):pass
            def getresponse(self):return Response()
            def close(self):pass
        with patch('validate_images.PinnedHTTPS',Connection):
            with self.assertRaises(SourceError):fetch_image("https://images.example.com/robot.jpg")
    def test_decoding(self):
        try:from PIL import Image
        except ImportError:self.skipTest('use bundled workspace Python for raster decoding')
        buff=io.BytesIO();Image.new('RGB',(16,16)).save(buff,format='PNG')
        result=decode_image(buff.getvalue());self.assertEqual(result['width'],16)
        with self.assertRaises(SourceError):decode_image(b'<html>not an image</html>')
        with self.assertRaises(SourceError):decode_image(buff.getvalue()[:20])
    def test_owned_svg_rejects_active_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);path=root/'assets/illustrations/test.svg';path.parent.mkdir(parents=True)
            path.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg>')
            self.assertEqual(check_image('assets/illustrations/test.svg',root)['status'],'verified')
            for content in ('<svg><script>alert(1)</script></svg>','<svg onload="alert(1)"/>','<svg><rect fill="url&#40;https://evil.test/a&#41;"/></svg>','<svg><image href="https://evil.test/a"/></svg>'):
                path.write_text(content)
                self.assertEqual(check_image('assets/illustrations/test.svg',root)['status'],'invalid')

if __name__=='__main__':unittest.main()
