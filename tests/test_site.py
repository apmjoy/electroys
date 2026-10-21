from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]

class Scan(HTMLParser):
    def __init__(self):super().__init__();self.refs=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        for key in ('src','href'):
            if a.get(key):self.refs.append(a[key])

class SiteTests(unittest.TestCase):
    def test_local_assets_and_unique_ids(self):
        for p in [*ROOT.glob('*.html'), *ROOT.glob('reviews/*.html')]:
            if p.name.startswith('Electroys_'):continue
            with self.subTest(page=p.name):
                scan=Scan();scan.feed(p.read_text())
                self.assertEqual(len(scan.ids),len(set(scan.ids)))
                for value in scan.refs:
                    if value.startswith(('https:','http:','data:','mailto:','#','//')):continue
                    rel=value.split('?')[0].split('#')[0]
                    target=ROOT/urlsplit(urljoin('https://electroys.com/'+p.relative_to(ROOT).as_posix(),rel)).path.lstrip('/')
                    self.assertTrue(target.exists(),f'{p.name}: {value}')
    def test_inline_script_syntax(self):
        for name in ['index.html','products.html','deals.html','best-sellers.html']:
            text=(ROOT/name).read_text()
            for attrs,script in re.findall(r'<script([^>]*)>(.*?)</script>',text,re.S|re.I):
                if not script.strip() or 'application/ld+json' in attrs:continue
                with tempfile.NamedTemporaryFile('w',suffix='.js') as f:
                    f.write(script);f.flush()
                    result=subprocess.run(['node','--check',f.name],capture_output=True,text=True)
                    self.assertEqual(result.returncode,0,name+result.stderr)
    def test_shared_hero_background_and_cross_page_anchor(self):
        text=(ROOT/'index.html').read_text()
        hero=re.search(r'<section id="home".*?</section>',text,re.S).group()
        self.assertEqual(hero.count('<img '),1)
        self.assertIn('data-bs-interval="7000"',hero)
        self.assertIn('carousel.cycle()',text)
        self.assertEqual(hero.count('class="carousel-item'),3)
        self.assertIn('class="hero-background"',hero)
        self.assertIn('carousel-control-next',hero)
        self.assertIn('Pause hero messages',text)
        self.assertIn("window.addEventListener('load',alignInitialSection",text)
        self.assertIn('<details class="mb-4"><summary',text)
    def test_static_pages_bounded(self):
        for p in [ROOT/'products.html',*ROOT.glob('products-page-*.html')]:
            self.assertLessEqual(p.read_text().count('data-product-id='),24)
    def test_collections_never_embed_stale_offers(self):
        for name in ['deals.html','best-sellers.html']:
            text=(ROOT/name).read_text();self.assertNotIn('data-product-id=',text)
            self.assertIn('Browse the complete saved product catalog',text)
if __name__=='__main__':unittest.main()
