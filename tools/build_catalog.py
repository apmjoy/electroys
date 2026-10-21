"""Rebuild the static product cards from products.json. No dependencies needed."""
import json, html, re, math
from urllib.parse import urlsplit
from pathlib import Path
root=Path(__file__).resolve().parent.parent
products=json.loads((root/'products.json').read_text(encoding='utf-8'))
esc=lambda value:html.escape(str(value),quote=True)
def safe_url(value, image=False):
    if not isinstance(value,str): return ''
    if image and re.fullmatch(r'assets/[a-zA-Z0-9_./-]+',value) and '..' not in value: return value
    try:
        u=urlsplit(value)
        return value if u.scheme=='https' and u.hostname and not u.username and not u.password else ''
    except ValueError: return ''
products={key:p for key,p in products.items() if isinstance(p,dict) and p.get('t') and safe_url(p.get('url')) and p.get('status') not in ('archived','draft')}

icons={'Robotics':'robot','Coding':'code-slash','Electronics':'lightning-charge','Build & Make':'tools','STEM & Science':'sun','Makers & Adults':'cpu','Young Explorers':'stars'}
cards=[]
for key,p in products.items():
    fallback=f'<span class="image-fallback"><i class="bi bi-{icons.get(p["cat"],"box")} mb-2" aria-hidden="true"></i><span>{esc(p["t"])}</span><small>Product photo at the store</small></span>'
    picture=f'<img src="{esc(safe_url(p.get("image"),True))}" alt="{esc(p["t"])}" loading="lazy" decoding="async">' if p.get('image') else fallback
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
      <p class="product-copy">{esc(p.get('why',''))}</p>
      <div class="product-facts"><span><b>Age / audience:</b> {esc(p.get('age','Check maker guidance'))}</span><span><b>Level:</b> {esc(p.get('level','Check product details'))}</span></div>
      <details class="product-details mt-3"><summary>What you’ll learn</summary><p class="small mt-2">{esc(p.get('learn','See provider for learning details.'))}</p><p class="small text-secondary">{esc(p.get('consider','Check provider details before ordering.'))}</p></details>
      <div class="catalog-card-action"><p class="product-price">{esc(p.get('price','Check current price & availability'))}</p><a class="btn btn-primary btn-sm" href="{esc(safe_url(p['url']))}" target="_blank" rel="{relation}" aria-label="View {esc(p['t'])} at {esc(p['store'])}">View at {esc(p['store'])} <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>{disclosure}</div>
    </div>
  </article>
</div>''')
page=(root/'products.html').read_text(encoding='utf-8')
# Build bounded HTML pages for visitors and crawlers without JavaScript.
page_size=24
page_count=max(1,math.ceil(len(cards)/page_size))
for number in range(1,page_count+1):
    chunk=cards[(number-1)*page_size:number*page_size]
    grid='<!-- CATALOG-GRID-START -->\n<div class="row g-4" id="productGrid">\n'+'\n'.join(chunk)+'\n</div>\n<!-- CATALOG-GRID-END -->'
    current,n=re.subn(r'<!-- CATALOG-GRID-START -->.*?<!-- CATALOG-GRID-END -->',lambda _:grid,page,flags=re.S)
    assert n==1
    current=re.sub(r'<body[^>]*>',f'<body data-catalog-page="{number}">',current,count=1)
    links=[]
    for target in range(1,page_count+1):
        href='products.html' if target==1 else f'products-page-{target}.html'
        selected=' aria-current="page"' if target==number else ''
        links.append(f'<a class="btn btn-outline-primary btn-sm" href="{href}"{selected}>Page {target}</a>')
    navigation='<!-- CATALOG-PAGES-START --><nav id="catalogStaticPagination" class="catalog-pagination mt-4" aria-label="Saved product pages">'+''.join(links)+'</nav><!-- CATALOG-PAGES-END -->'
    current,n=re.subn(r'<!-- CATALOG-PAGES-START -->.*?<!-- CATALOG-PAGES-END -->',lambda _:navigation,current,flags=re.S)
    assert n==1
    filename='products.html' if number==1 else f'products-page-{number}.html'
    current=re.sub(r'<link rel="canonical" href="[^"]*">',f'<link rel="canonical" href="https://electroys.com/{filename}">',current)
    if number>1: current=re.sub(r'<title>.*?</title>',f'<title>All Products — Page {number} | Electroys</title>',current,count=1)
    (root/filename).write_text(current,encoding='utf-8')
for stale in root.glob('products-page-*.html'):
    match=re.fullmatch(r'products-page-(\d+)\.html',stale.name)
    if match and int(match[1])>page_count: stale.unlink()
print(f'Rendered {len(cards)} products in {page_count} bounded static pages.')

# Homepage cards and Quick Look use the same source as the full catalog.
featured=json.loads((root/'featured.json').read_text(encoding='utf-8'))
home=(root/'index.html').read_bytes().decode('utf-8')
featured_cards=[]
for key in featured:
    p=products.get(key)
    if not p: continue
    picture=f'<img src="{esc(safe_url(p.get("image"),True))}" alt="{esc(p["t"])}" loading="lazy">' if p.get('image') else f'<span class="p-4">{esc(p["t"])}</span>'
    relation='sponsored nofollow noopener noreferrer' if 'tag=' in p['url'] or 'ref=' in p['url'] else 'noopener noreferrer'
    featured_cards.append(f'''<div class="col-xl-3 col-lg-4 col-md-6 product-item" data-product-id="{esc(key)}" data-brand="{esc(p['store'])}" data-cat="{esc(p['cat'])}">
      <div class="product-card h-100"><div class="product-img-wrap">{picture}</div><div class="p-4">
      <span class="product-kicker">{esc(p['cat'])}</span><h3>{esc(p['t'])}</h3><p class="product-copy">{esc(p.get('why',''))}</p>
      <div class="product-facts"><span>{esc(p.get('age','Check maker guidance'))}</span><span>{esc(p.get('level','Check product details'))}</span></div>
      <div class="product-price">Check current price &amp; availability</div>
      <div class="d-flex gap-2 flex-wrap mt-3"><button class="btn btn-outline-primary btn-sm" data-product-key="{esc(key)}" onclick="openQuick(this.dataset.productKey)">Quick Look</button>
      <a class="btn btn-primary btn-sm" href="{esc(safe_url(p['url']))}" target="_blank" rel="{relation}">View Product</a></div></div></div></div>''')
grid='<!-- FEATURED-GRID-START -->\n<div class="row g-4" id="productGrid">\n'+'\n'.join(featured_cards)+'\n</div>\n<!-- FEATURED-GRID-END -->'
home,n=re.subn(r'<!-- FEATURED-GRID-START -->.*?<!-- FEATURED-GRID-END -->',lambda _:grid,home,flags=re.S)
assert n==1
for name,data in [('productData',{k:products[k] for k in featured if k in products}),('productImages',{k:products[k].get('image','') for k in featured if k in products}),('productStores',{k:products[k]['store'] for k in featured if k in products})]:
    value=json.dumps(data,ensure_ascii=False).replace('<','\\u003c')
    home,n=re.subn(r'const '+name+r'=.*?;(?=\r?\n)',lambda _:'const '+name+'='+value+';',home,count=1)
    assert n==1
def link_identity(value):
    try:
        u=urlsplit(html.unescape(value)); host=(u.hostname or '').removeprefix('www.')
        if u.scheme!='https':return None
        asin=re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})(?:/|$)',u.path,re.I)
        return ('amazon.com',asin.group(1).upper()) if host=='amazon.com' and asin else (host,u.path.rstrip('/'))
    except ValueError:return None
link_products={}
for key,p in products.items():
    for url in [p.get('url'),p.get('amazonUrl')]:
        identity=link_identity(url or '')
        if identity:link_products[identity]=key
def annotate_link(match):
    attrs,url=match.group(1),match.group(2)
    key=link_products.get(link_identity(url))
    if not key:return match.group(0)
    if 'data-product-id=' not in attrs:attrs+=' data-product-id="'+esc(key)+'"'
    if 'data-product-name=' not in attrs:attrs+=' data-product-name="'+esc(products[key]['t'])+'"'
    return '<a'+attrs+'>'
home=re.sub(r'<a(\s[^>]*?href="([^"]+)"[^>]*)>',annotate_link,home)
(root/'index.html').write_bytes(home.encode('utf-8'))
print(f'Rendered {len(featured)} homepage cards from the shared catalog.')
