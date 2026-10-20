"""Verify exact live catalog bytes and write a private flyer publication manifest."""
import argparse
from datetime import datetime, timezone, timedelta
import hashlib
import json
from pathlib import Path
import urllib.request
from urllib.parse import urlsplit
from catalog_model import timestamp

ROOT = Path(__file__).resolve().parent.parent

def verify(catalog, publication_id, output):
    data = Path(catalog).read_bytes()
    products = json.loads(data)
    if not isinstance(products, dict) or not products:
        raise ValueError('No products to verify')
    class SameOrigin(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            p=urlsplit(newurl)
            if p.scheme!='https' or p.hostname not in ('electroys.com','www.electroys.com'):
                raise ValueError('Unexpected publication redirect')
            return super().redirect_request(req,fp,code,msg,headers,newurl)
    opener=urllib.request.build_opener(SameOrigin())
    url='https://electroys.com/products.json?release='+publication_id
    with opener.open(urllib.request.Request(url,headers={'Cache-Control':'no-cache'}),timeout=30) as response:
        live=response.read(10_000_001)
    if len(live)>10_000_000 or hashlib.sha256(live).digest()!=hashlib.sha256(data).digest():
        raise ValueError('Live catalog differs from local release; no publication manifest written')
    now=datetime.now(timezone.utc);verified=[]
    for key,p in products.items():
        evidence=p.get('verification',{})
        try:
            checked=timestamp(evidence.get('checkedAt'))
            if evidence.get('status')=='verified' and timedelta(0)<=now-checked<timedelta(hours=24) and 'identity' in evidence.get('scope',[]) and p.get('status') not in ('archived','draft','unavailable'):
                verified.append(key)
        except (ValueError,TypeError):pass
    if len(verified)<2:raise ValueError('Insufficient fresh original-source evidence for flyers')
    manifest={'status':'published','publicationId':publication_id,'verifiedAt':now.isoformat(),'baseUrl':'https://electroys.com','catalogSha256':hashlib.sha256(data).hexdigest(),'productIds':list(products),'verifiedProductIds':verified,'verificationScope':'Fresh original-source identity and offer checks; learning descriptions are editorial guidance, not claims of hands-on testing.'}
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'published':len(products),'sourceVerified':len(verified),'catalogSha256':manifest['catalogSha256']}))
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--catalog',type=Path,default=ROOT/'products.json');p.add_argument('--publication-id',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();verify(a.catalog,a.publication_id,a.output)
