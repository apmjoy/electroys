"""Rebuild the static product cards from products.json. No dependencies needed."""
import json, html, re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
products=json.loads((root/'products.json').read_text(encoding='utf-8'))
esc=lambda value:html.escape(str(value),quote=True)
icons={'Robotics':'robot','Coding':'code-slash','Electronics':'lightning-charge','Build & Make':'tools','STEM & Science':'sun','Makers & Adults':'cpu','Young Explorers':'stars'}
cards=[]
for key,p in products.items():
    fallback=f'<span class="image-fallback"><i class="bi bi-{icons.get(p["cat"],"box")} mb-2" aria-hidden="true"></i><span>{esc(p["t"])}</span><small>Product photo at the store</small></span>'
    picture=f'<img src="{esc(p["image"])}" alt="{esc(p["t"])}" loading="lazy" decoding="async">' if p.get('image') else fallback
    paid=p['store']=='Amazon' and 'tag=' in p['url']
    relation='sponsored nofollow noopener noreferrer' if paid or p['store']=='Makeblock' else 'noopener noreferrer'
    disclosure='<small class="d-block mt-2">Amazon paid link</small>' if paid else ''
    cards.append(f'''<div class="col-xl-3 col-lg-4 col-md-6 product-item" data-product-id="{esc(key)}" data-brand="{esc(p['store'])}" data-cat="{esc(p['cat'])}">
  <article class="product-card h-100" aria-labelledby="title-{esc(key)}">
    <div class="product-img-wrap">{picture}</div>
    <div class="p-4 catalog-card-body">
      <span class="product-kicker">{esc(p['cat'])}</span>
      <h3 id="title-{esc(key)}">{esc(p['t'])}</h3>
      <p class="catalog-store"><i class="bi bi-shop" aria-hidden="true"></i> {esc(p['store'])}</p>
      <p class="product-copy">{esc(p['why'])}</p>
      <div class="product-facts"><span><b>Age / audience:</b> {esc(p['age'])}</span><span><b>Level:</b> {esc(p['level'])}</span></div>
      <details class="product-details mt-3"><summary>What you’ll learn</summary><p class="small mt-2">{esc(p['learn'])}</p><p class="small text-secondary">{esc(p['consider'])}</p></details>
      <div class="catalog-card-action"><p class="product-price">{esc(p['price'])}</p><a class="btn btn-primary btn-sm" href="{esc(p['url'])}" target="_blank" rel="{relation}" aria-label="View {esc(p['t'])} at {esc(p['store'])}">View at {esc(p['store'])} <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>{disclosure}</div>
    </div>
  </article>
</div>''')
page=(root/'products.html').read_bytes().decode('utf-8')
grid='<!-- CATALOG-GRID-START -->\n<div class="row g-4" id="productGrid">\n'+'\n'.join(cards)+'\n</div>\n        <!-- CATALOG-GRID-END -->'
newline='\r\n' if '\r\n' in page else '\n'
grid=grid.replace('\n',newline)
page,n=re.subn(r'<!-- CATALOG-GRID-START -->.*?<!-- CATALOG-GRID-END -->',lambda _:grid,page,flags=re.S)
assert n==1
(root/'products.html').write_bytes(page.encode('utf-8'))
print(f'Rendered {len(cards)} product cards.')

# Homepage cards and Quick Look use the same source as the full catalog.
featured=json.loads((root/'featured.json').read_text(encoding='utf-8'))
home=(root/'index.html').read_bytes().decode('utf-8')
featured_cards=[]
for key in featured:
    p=products[key]
    picture=f'<img src="{esc(p["image"])}" alt="{esc(p["t"])}" loading="lazy">' if p.get('image') else f'<span class="p-4">{esc(p["t"])}</span>'
    relation='sponsored nofollow noopener noreferrer' if 'tag=' in p['url'] or 'ref=' in p['url'] else 'noopener noreferrer'
    featured_cards.append(f'''<div class="col-xl-3 col-lg-4 col-md-6 product-item" data-brand="{esc(p['store'])}" data-cat="{esc(p['cat'])}">
      <div class="product-card h-100"><div class="product-img-wrap">{picture}</div><div class="p-4">
      <span class="product-kicker">{esc(p['cat'])}</span><h3>{esc(p['t'])}</h3><p class="product-copy">{esc(p['why'])}</p>
      <div class="product-facts"><span>{esc(p['age'])}</span><span>{esc(p['level'])}</span></div>
      <div class="product-price">Check current price &amp; availability</div>
      <div class="d-flex gap-2 flex-wrap mt-3"><button class="btn btn-outline-primary btn-sm" onclick="openQuick('{esc(key)}')">Quick Look</button>
      <a class="btn btn-primary btn-sm" href="{esc(p['url'])}" target="_blank" rel="{relation}">View Product</a></div></div></div></div>''')
grid='<!-- FEATURED-GRID-START -->\n<div class="row g-4" id="productGrid">\n'+'\n'.join(featured_cards)+'\n</div>\n<!-- FEATURED-GRID-END -->'
home,n=re.subn(r'<!-- FEATURED-GRID-START -->.*?<!-- FEATURED-GRID-END -->',lambda _:grid,home,flags=re.S)
assert n==1
for name,data in [('productData',{k:products[k] for k in featured}),('productImages',{k:products[k].get('image','') for k in featured}),('productStores',{k:products[k]['store'] for k in featured})]:
    value=json.dumps(data,ensure_ascii=False).replace('<','\\u003c')
    home,n=re.subn(r'const '+name+r'=.*?;(?=\r?\n)',lambda _:'const '+name+'='+value+';',home,count=1)
    assert n==1
(root/'index.html').write_bytes(home.encode('utf-8'))
print(f'Rendered {len(featured)} homepage cards from the shared catalog.')
