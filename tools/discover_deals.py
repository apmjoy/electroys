"""Discover deal candidates without publishing aggregator links or unverified offers.

Slickdeals is provenance only. Items lacking an original direct merchant URL
remain review candidates and cannot become production offers automatically.
"""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit, parse_qs, urlencode, urlunsplit
import urllib.request

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.items=[]; self.current=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='a': self.current={'url':a.get('href',''),'text':'','retailer':a.get('data-product-exitwebsite','')}
    def handle_data(self, data):
        if self.current: self.current['text']+=data
    def handle_endtag(self, tag):
        if tag=='a' and self.current:
            self.items.append(self.current);self.current=None

def direct_merchant(value):
    try:
        p=urlsplit(value)
        host=(p.hostname or '').lower()
        allowed=('amazon.com','bestbuy.com','newegg.com','walmart.com','bhphotovideo.com','microcenter.com')
        if p.scheme!='https' or p.username or p.password or p.port not in (None,443) or host not in allowed and not any(host=='www.'+h for h in allowed): return None
        if host.endswith('amazon.com'):
            m=re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})(?:/|$)',p.path,re.I)
            return 'https://www.amazon.com/dp/'+m[1].upper()+'?tag=myelectroys-20' if m else None
        query={k:v for k,v in parse_qs(p.query).items() if not k.lower().startswith('utm_') and k.lower() not in ('ref','ref_','tag','ascsubtag','affid','affiliateid','irclickid','irgwc')}
        return urlunsplit(('https',p.netloc,p.path,urlencode(query,doseq=True),''))
    except ValueError: return None

def candidates(html, base='https://slickdeals.net/deals/tech/', limit=20):
    parser=Links();parser.feed(html);seen=set();result=[]
    for item in parser.items:
        url=urljoin(base,item['url']);p=urlsplit(url)
        if p.hostname!='slickdeals.net' or not re.match(r'^/f/\d+-',p.path) or p.path in seen: continue
        title=re.sub(r'\s+',' ',item['text']).strip()
        if len(title)<12: continue
        seen.add(p.path)
        result.append({'discoveredVia':'Slickdeals','sourceUrl':'https://slickdeals.net'+p.path,'title':title[:240],'status':'needs_original_retailer_verification','publishable':False})
        if len(result)>=limit: break
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    class OriginalOnly(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            target=urlsplit(newurl)
            if target.scheme!='https' or target.hostname not in ('slickdeals.net','www.slickdeals.net'): raise ValueError('Unexpected discovery redirect')
            return super().redirect_request(req,fp,code,msg,headers,newurl)
    request=urllib.request.Request('https://slickdeals.net/deals/tech/',headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.build_opener(OriginalOnly()).open(request,timeout=25) as r:
        body=r.read(3_000_001)
        if len(body)>3_000_000: raise ValueError('Discovery response too large')
    data={'version':1,'candidates':candidates(body.decode('utf-8')),'note':'Verify original merchant/model/variant and promotion before intake. No Slickdeals purchase link is published.'}
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(data,indent=2)+'\n');print('Discovered',len(data['candidates']),'candidates; none automatically published.')
if __name__=='__main__': main()
