import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class CatalogExclusions(unittest.TestCase):
    def test_hack_pack_not_recommended(self):
        products = json.loads((ROOT / 'products.json').read_text())
        self.assertNotIn('hackpack', products)
        self.assertFalse(any('hack-pack-subscription' in p.get('url', '') for p in products.values()))
        for name in ['index.html', 'reviews/index.html', 'beginner-stem-kits-guide.html',
                     'how-to-choose-stem-kit-by-age.html', 'reviews/beginner-stem-kits-guide.html',
                     'reviews/how-to-choose-stem-kit-by-age.html', 'sitemap.xml']:
            self.assertNotIn('crunchlabs-hack-pack-review.html', (ROOT / name).read_text())

    def test_featured_variety_and_paid_label(self):
        products = json.loads((ROOT / 'products.json').read_text())
        featured = json.loads((ROOT / 'featured.json').read_text())
        self.assertEqual(len(set(featured)), 6)
        self.assertEqual(len({products[k]['cat'] for k in featured}), 6)
        home = (ROOT / 'index.html').read_text()
        self.assertIn('Amazon paid link', home)
        self.assertIn('myelectroys-20', home)

if __name__ == '__main__':
    unittest.main()
