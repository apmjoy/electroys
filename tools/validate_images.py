#!/usr/bin/env python3
"""Check catalog image URLs, bounded downloads and decoded raster contents.
Reports are private; this command never mutates product data or downloads image files.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import io
import http.client
import json
from pathlib import Path
import ssl
import warnings
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit, urljoin
import urllib.request
from retailer_images import image_url
from catalog_model import safe_url, utcnow
from validate_catalog import PinnedHTTPS, SourceError

MAX_IMAGE_BYTES=5_000_000
MAX_IMAGE_PIXELS=25_000_000

def fetch_shopify_image(url):
    """Proxy-aware path restricted to the exact original feed CDN host."""
    if not image_url(url):raise SourceError('image URL outside configured Shopify CDN')
    class Redirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,req,fp,code,msg,headers,newurl):
            if not image_url(newurl):raise SourceError('unexpected image redirect')
            return super().redirect_request(req,fp,code,msg,headers,newurl)
    try:
        opener=urllib.request.build_opener(Redirect())
        request=urllib.request.Request(url,headers={'User-Agent':'ElectroysImageValidator/1.0','Accept':'image/jpeg,image/png,image/webp,image/gif,image/avif','Accept-Encoding':'identity'})
        with opener.open(request,timeout=20) as response:
            content_type=response.headers.get('Content-Type','').split(';')[0].strip().lower()
            if content_type not in ('image/jpeg','image/png','image/webp','image/gif','image/avif'):
                raise SourceError('unsupported image content type '+content_type)
            data=response.read(MAX_IMAGE_BYTES+1)
            if len(data)>MAX_IMAGE_BYTES:raise SourceError('image exceeds 5 MB')
            return data,response.url
    except (OSError,ValueError,http.client.HTTPException) as exc:
        raise SourceError(type(exc).__name__) from exc

def fetch_image(url):
    if safe_url(url) and urlsplit(url).hostname=='cdn.shopify.com':
        return fetch_shopify_image(url)
    for _ in range(5):
        if not safe_url(url):raise SourceError('unsafe image URL')
        p=urlsplit(url)
        conn=PinnedHTTPS(p.hostname,timeout=15,context=ssl.create_default_context())
        try:
            path=p.path or '/'
            if p.query:path+='?'+p.query
            conn.request('GET',path,headers={'User-Agent':'ElectroysImageValidator/1.0 (+https://electroys.com/contact.html)','Accept':'image/jpeg,image/png,image/webp,image/gif,image/avif','Accept-Encoding':'identity'})
            response=conn.getresponse()
            if response.status in (301,302,303,307,308):
                target=response.getheader('Location')
                if not target:raise SourceError('image redirect missing destination')
                url=urljoin(url,target);continue
            if response.status!=200:raise SourceError('image HTTP '+str(response.status))
            content_type=response.getheader('Content-Type','').split(';')[0].strip().lower()
            if content_type not in ('image/jpeg','image/png','image/webp','image/gif','image/avif'):
                raise SourceError('unsupported image content type '+content_type)
            data=response.read(MAX_IMAGE_BYTES+1)
            if len(data)>MAX_IMAGE_BYTES:raise SourceError('image exceeds 5 MB')
            return data,url
        except (OSError,ValueError,http.client.HTTPException) as exc:
            raise SourceError(type(exc).__name__) from exc
        finally:conn.close()
    raise SourceError('too many image redirects')

def decode_image(data):
    try:
        from PIL import Image
    except ImportError as exc:
        raise SourceError('Pillow unavailable: use bundled workspace Python for decoding') from exc
    if len(data)>MAX_IMAGE_BYTES:raise SourceError('image exceeds 5 MB')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error')
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in ('JPEG','PNG','WEBP','GIF','AVIF'):raise SourceError('unsupported raster format')
                w,h=image.size
                if w<1 or h<1 or w*h>MAX_IMAGE_PIXELS:raise SourceError('invalid or excessive image dimensions')
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                image.load()
                return {'format':image.format,'width':w,'height':h,'bytes':len(data)}
    except SourceError:raise
    except Exception as exc:
        raise SourceError('image decode failed: '+type(exc).__name__) from exc

def check_image(value,root,online=False,fetch=fetch_image):
    if not isinstance(value,str) or not value:
        return {'status':'missing','reason':'No image; branded fallback required'}
    if value.startswith('https://'):
        if not safe_url(value):return {'status':'invalid','reason':'Unsafe image URL'}
        if not online:return {'status':'unable_to_verify','reason':'Network image check not requested'}
        try:
            data,final=fetch(value)
            return {'status':'verified','url':final,**decode_image(data)}
        except SourceError as exc:return {'status':'unable_to_verify','reason':str(exc)}
    try:
        if value.startswith('/') or '\\' in value or ':' in value:raise SourceError('Unsafe local image path')
        path=(root/value).resolve()
        if not path.is_relative_to(root.resolve()):raise SourceError('Image path escapes site root')
        if not path.is_file():raise SourceError('Local image missing')
        if path.stat().st_size>MAX_IMAGE_BYTES:raise SourceError('image exceeds 5 MB')
        if path.suffix.lower()=='.svg':
            if not value.startswith('assets/illustrations/'):
                raise SourceError('Only owned illustration SVGs are accepted')
            raw=path.read_text()
            if '<!' in raw or 'url(' in raw.lower():raise SourceError('Active SVG content is forbidden')
            tree=ET.fromstring(raw)
            allowed={'svg','g','rect','circle','ellipse','line','polyline','polygon','path','text','title','desc'}
            for element in tree.iter():
                if element.tag.split('}')[-1] not in allowed:raise SourceError('Unsupported SVG element')
                for key,val in element.attrib.items():
                    if key.lower().startswith('on') or key.split('}')[-1] in ('href','style') or 'javascript:' in val.lower() or 'url(' in val.lower():
                        raise SourceError('Active SVG attributes are forbidden')
            if tree.tag.split('}')[-1]!='svg':raise SourceError('Invalid SVG root')
            return {'status':'verified','format':'SVG','bytes':path.stat().st_size,'kind':'owned illustration, not product photo'}
        return {'status':'verified',**decode_image(path.read_bytes())}
    except (OSError,SourceError,ET.ParseError,UnicodeError) as exc:return {'status':'invalid','reason':str(exc)}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    root=Path(__file__).resolve().parents[1]
    parser.add_argument('--products',type=Path,default=root/'products.json')
    parser.add_argument('--root',type=Path,default=root)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--online',action='store_true')
    parser.add_argument('--ids',nargs='*')
    args=parser.parse_args()
    products=json.loads(args.products.read_text())
    selected={k:p for k,p in products.items() if args.ids is None or k in args.ids}
    urls=list(dict.fromkeys(p.get('image','') for p in selected.values() if isinstance(p,dict)))
    with ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(lambda u:check_image(u,args.root,args.online),urls))
    cache=dict(zip(urls,results))
    records=[{'productId':k,'image':p.get('image',''),**cache[p.get('image','')]} for k,p in selected.items() if isinstance(p,dict)]
    counts={status:sum(r['status']==status for r in records) for status in ('verified','missing','invalid','unable_to_verify')}
    report={'checkedAt':utcnow().isoformat(),'summary':{'products':len(records),'uniqueImageRequests':len(urls),'states':counts,'allVerified':bool(records) and all(r['status']=='verified' for r in records)},'images':records}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report['summary']))
    return 1 if counts['missing'] or counts['invalid'] or counts['unable_to_verify'] else 0
if __name__=='__main__':raise SystemExit(main())
