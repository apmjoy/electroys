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
      <div class="catalog-card-action"><p class="product-price">{esc(p['price'])}</p><a class="btn btn-primary btn-sm" href="{esc(p['url'])}" target="_blank" rel="{'sponsored nofollow noopener noreferrer' if p['store']=='Makeblock' else 'noopener noreferrer'}" aria-label="View {esc(p['t'])} at {esc(p['store'])}">View at {esc(p['store'])} <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a></div>
    </div>
  </article>
</div>''')
page=(root/'products.html').read_text(encoding='utf-8')
grid='<!-- CATALOG-GRID-START -->\n<div class="row g-4" id="productGrid">\n'+'\n'.join(cards)+'\n</div>\n        <!-- CATALOG-GRID-END -->'
page,n=re.subn(r'<!-- CATALOG-GRID-START -->.*?<!-- CATALOG-GRID-END -->',lambda _:grid,page,flags=re.S)
assert n==1
(root/'products.html').write_text(page,encoding='utf-8')
print(f'Rendered {len(cards)} product cards.')
