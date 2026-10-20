#!/usr/bin/env python3
"""Generate two social concepts only from a verified publication manifest.

Requires Pillow. No network access or retailer image reuse. See FLYERS.md.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import urlencode, urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
CT = ZoneInfo('America/Chicago')
DISCLOSURE = 'Affiliate links: Electroys may earn a commission from qualifying purchases.'
SIZES = {'feed': (1080, 1350), 'story': (1080, 1920)}

def seasonal_theme(now):
    """Calendar-based editorial invitations, never product suitability claims."""
    day = now.astimezone(CT).date()
    if day.month in (11, 12):
        return {'name': 'gift-season', 'headline': 'Give curiosity\nroom to grow.', 'intro': 'Gift-season inspiration: explore a hands-on learning idea.', 'tag': '#GiftIdeas'}
    if day.month in (8, 9):
        return {'name': 'back-to-learning', 'headline': 'A fresh start\nfor curiosity.', 'intro': 'Back-to-learning inspiration: make space for hands-on discovery.', 'tag': '#BackToLearning'}
    if day.month == 10:
        return {'name': 'autumn-making', 'headline': 'Build a little\nwonder this fall.', 'intro': 'Autumn project inspiration: explore something new to build or learn.', 'tag': '#FallProjects'}
    if day.month in (6, 7):
        return {'name': 'summer-discovery', 'headline': 'Make summer\na discovery.', 'intro': 'Summer inspiration: explore hands-on learning at your own pace.', 'tag': '#SummerLearning'}
    return {'name': 'learning', 'headline': 'Make room\nfor discovery.', 'intro': 'Make room for a new learning idea.', 'tag': '#LearningIdeas'}


def timestamp(value):
    result = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Timestamp must include a timezone')
    return result.astimezone(timezone.utc)


def clean(value, limit=400):
    return re.sub(r'\s+', ' ', str(value or '')).strip()[:limit]


def validate_manifest(manifest, catalog_bytes, products, now, preview=False):
    if not isinstance(products, dict) or not products:
        raise ValueError('Catalog has no products; no flyers generated')
    if not isinstance(manifest, dict):
        raise ValueError('Publication manifest must be an object')
    required_status = 'preview' if preview else 'published'
    if manifest.get('status') != required_status:
        raise ValueError(f'Expected {required_status} publication manifest')
    if manifest.get('catalogSha256') != hashlib.sha256(catalog_bytes).hexdigest():
        raise ValueError('Catalog changed after publication verification')
    checked = timestamp(manifest.get('verifiedAt'))
    if checked > now + timedelta(minutes=5) or now - checked > timedelta(hours=24):
        raise ValueError('Publication verification is stale or in the future')
    base = urlsplit(manifest.get('baseUrl', ''))
    if base.scheme != 'https' or base.netloc not in ('electroys.com', 'www.electroys.com') or base.path not in ('', '/') or base.query or base.fragment:
        raise ValueError('Publication must use the Electroys HTTPS origin')
    if not clean(manifest.get('publicationId')):
        raise ValueError('Publication ID is required')
    published = manifest.get('productIds')
    verified = manifest.get('verifiedProductIds')
    if not isinstance(published, list) or not isinstance(verified, list) or not all(isinstance(x, str) for x in published + verified):
        raise ValueError('Published and verified product ID lists are required')
    if len(set(published)) != len(published) or len(set(verified)) != len(verified):
        raise ValueError('Manifest contains duplicate IDs')
    if not set(verified) <= set(published) or not set(published) <= set(products):
        raise ValueError('Manifest references an unknown or unpublished product')
    eligible = []
    for key in verified:
        product = products[key]
        if not isinstance(product, dict) or not clean(product.get('t')):
            continue
        verification = product.get('verification', {})
        state = verification.get('state', verification.get('status')) if isinstance(verification, dict) else None
        if state in ('unavailable', 'changed', 'unable-to-verify', 'unable_to_verify', 'review', 'invalid') or product.get('status') in ('archived', 'draft', 'unavailable'):
            continue
        eligible.append(key)
    if len(eligible) < 2:
        raise ValueError('At least two verified published products are required; no flyers generated')
    return eligible


def description_for(product):
    guidance = {
        'Project kit': 'Plan your next hands-on build. Check the kit contents, required tools and manufacturer instructions before you begin.',
        'PC case': 'Planning a custom PC? Check motherboard size, cooling clearance and power-supply fit before choosing your case.',
        'Power supply': 'Plan the power behind your next PC build. Check required wattage, connectors and case compatibility before ordering.',
        'PC cooling': 'Think through cooling for your next PC build. Check the supported socket, case clearance and mounting requirements.',
        'Book': 'Find inspiration for your next STEM project. Check the edition, required hardware and software before following along.',
    }
    if product.get('classificationStatus') == 'rule-classified':
        return guidance.get(product.get('productType'), product.get('why') or product.get('learn') or 'Explore the product details on Electroys.')
    return product.get('learn') or product.get('why') or 'Explore the product and its learning possibilities on Electroys.'

def choose(products, eligible, history, now):
    # Avoid all products used in the previous 14 days when enough choices exist.
    last_used = {}
    for run in history.get('runs', []):
        try:
            date = timestamp(run['generatedAt'])
            for key in run['productIds']:
                last_used[key] = max(date, last_used.get(key, datetime.min.replace(tzinfo=timezone.utc)))
        except (KeyError, TypeError, ValueError):
            continue
    def order(key):
        product = products[key]
        try:
            added = timestamp(product.get('addedAt', product.get('publishedAt', '1970-01-01T00:00:00Z')))
        except (ValueError, TypeError):
            added = datetime(1970, 1, 1, tzinfo=timezone.utc)
        used = last_used.get(key, datetime.min.replace(tzinfo=timezone.utc))
        return (used > now - timedelta(days=14), used if used > now - timedelta(days=14) else datetime.min.replace(tzinfo=timezone.utc), -added.timestamp(), key)
    return sorted(eligible, key=order)[:2]


def font(size, bold=False):
    from PIL import ImageFont
    names = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default(size=size)


def wrap(draw, text, fnt, width):
    words = clean(text, 2000).split()
    lines = []
    line = ''
    for word in words:
        if draw.textlength(word, font=fnt) > width:
            chunks = []
            chunk = ''
            for char in word:
                if chunk and draw.textlength(chunk + char, font=fnt) > width:
                    chunks.append(chunk)
                    chunk = char
                else:
                    chunk += char
            chunks.append(chunk)
        else:
            chunks = [word]
        for chunk in chunks:
            candidate = (line + ' ' + chunk).strip()
            if line and draw.textlength(candidate, font=fnt) > width:
                lines.append(line)
                line = chunk
            else:
                line = candidate
    if line:
        lines.append(line)
    return lines


def fit_text(draw, text, box, size, color, bold=False, min_size=18):
    x, y, width, height = box
    while size >= min_size:
        fnt = font(size, bold)
        lines = wrap(draw, text, fnt, width)
        spacing = round(size * 1.28)
        if len(lines) * spacing <= height:
            for line in lines:
                draw.text((x, y), line, fill=color, font=fnt)
                y += spacing
            return y
        size -= 1
    raise ValueError('Text does not fit flyer; shorten product editorial text')


def render(product, concept, size, output, preview=False, theme=None):
    from PIL import Image, ImageDraw
    width, height = size
    navy, teal, orange = '#102C49', '#007E80', '#F6B54C'
    background = '#F5F9F8' if concept == 0 else navy
    ink, secondary = (navy, '#435C6F') if concept == 0 else ('#FFFFFF', '#C3D8E3')
    im = Image.new('RGB', size, background)
    draw = ImageDraw.Draw(im)
    margin = 80
    draw.rounded_rectangle((80, 74, 326, 130), radius=15, fill=teal if concept == 0 else orange)
    draw.text((99, 84), 'ELECTROYS', font=font(32, True), fill='white' if concept == 0 else navy)
    draw.text((80, 159), 'EXPLORE. BUILD. LEARN. PLAY.', font=font(23, True), fill=secondary)
    if preview:
        draw.text((740, 86), 'PREVIEW', font=font(26, True), fill=secondary)
    headline = 'Meet your next\nproject idea.' if concept == 0 else (theme or {}).get('headline', 'Make room\nfor discovery.')
    # Original abstract circuit decoration, no product imagery or implied product photo.
    art_y = 235
    for index in range(4):
        yy = art_y + index * 46
        xx = 625 + index * 43
        draw.line([(xx, yy), (xx + 75, yy), (xx + 110, yy - 30), (984, yy - 30)], fill=teal if concept == 0 else '#266078', width=7)
        draw.ellipse((972, yy - 42, 996, yy - 18), fill=orange)
    for index, line in enumerate(headline.splitlines()):
        fit_text(draw, line, (margin, 252 + index * 84, 570, 84), 66, ink, True, 32)
    panel_y = 490 if height == 1350 else 650
    panel_h = 540 if height == 1350 else 685
    panel_color = '#FFFFFF' if concept == 0 else '#193D58'
    draw.rounded_rectangle((60, panel_y, 1020, panel_y + panel_h), radius=32, fill=panel_color)
    fit_text(draw, clean(product.get('cat', 'STEM & MAKER PICKS'), 80).upper(), (90, panel_y + 28, 900, 70), 26, teal if concept == 0 else orange, True)
    fit_text(draw, clean(product.get('t'), 180), (90, panel_y + 103, 900, 210), 53, ink, True, 28)
    # Descriptive facts from the verified catalog, no price/ease/rank claims invented.
    description = clean(description_for(product), 360)
    fit_text(draw, description, (90, panel_y + 335, 900, panel_h - 355), 32, secondary, min_size=21)
    bottom = height - 260
    draw.rounded_rectangle((80, bottom, 1000, bottom + 82), radius=20, fill=teal if concept == 0 else orange)
    draw.text((112, bottom + 19), 'Explore the details at electroys.com', font=font(36, True), fill='white' if concept == 0 else navy)
    fit_text(draw, 'Check the retailer for current price, availability and product guidance.', (80, bottom + 106, 920, 65), 23, secondary)
    fit_text(draw, DISCLOSURE, (80, height - 67, 920, 54), 20, secondary)
    im.save(output, optimize=True)


def generate(catalog, manifest_path, output_root, history_path, now=None, preview=False):
    now = now or datetime.now(timezone.utc)
    catalog_bytes = Path(catalog).read_bytes()
    products = json.loads(catalog_bytes)
    manifest = json.loads(Path(manifest_path).read_text())
    eligible = validate_manifest(manifest, catalog_bytes, products, now, preview)
    output_root, history_path = Path(output_root), Path(history_path)
    history = json.loads(history_path.read_text()) if history_path.exists() else {'runs': []}
    if not isinstance(history, dict) or not isinstance(history.get('runs'), list):
        raise ValueError('Invalid flyer history')
    day = now.astimezone(CT).date().isoformat()
    mode = 'preview' if preview else 'published'
    run_id = f'{day}-{mode}'
    destination = output_root / run_id
    if destination.exists():
        existing = json.loads((destination / 'manifest.json').read_text())
        names = existing.get('files')
        if existing.get('runId') == run_id and existing.get('catalogSha256') == manifest['catalogSha256'] and existing.get('publicationId') == manifest['publicationId'] and set(existing.get('productIds', [])) <= set(eligible) and isinstance(names, list) and len(names) == 6 and all(isinstance(name, str) and Path(name).name == name and (destination / name).is_file() for name in names):
            if not preview:
                save_history(history, history_path, existing)
            return existing
        raise ValueError('Daily output already exists with a different catalog or incomplete files; inspect it before regenerating')
    chosen = choose(products, eligible, history, now)
    output_root.mkdir(parents=True, exist_ok=True)
    working = Path(tempfile.mkdtemp(prefix='.flyers-', dir=output_root))
    files = []
    concepts = []
    try:
        for index, key in enumerate(chosen):
            product = products[key]
            theme = seasonal_theme(now) if index == 1 else {'name': 'project', 'intro': 'Explore your next project idea.', 'tag': '#ProjectIdeas'}
            base = f'{index+1:02d}-' + ('project-spotlight' if index == 0 else 'learning-spotlight')
            url = 'https://electroys.com/products.html?' + urlencode({'q': clean(product['t'], 180), 'utm_source': 'social', 'utm_medium': 'flyer', 'utm_campaign': day, 'utm_content': str(index + 1)})
            title = clean(product['t'], 180)
            description = clean(description_for(product), 360)
            caption = f'{theme["intro"]}\n\n{title}\n\n{description}\n\nExplore the details: {url}\n\nCheck the retailer for current price, availability and product guidance.\n{DISCLOSURE}\n\n#Electroys #STEM #HandsOnLearning #MakerProjects {theme["tag"]}\n'
            alt = f'Electroys {theme["name"]} spotlight: {title}. {description} Abstract circuit illustration. Visit electroys.com for details.'
            for variant, size in SIZES.items():
                name = f'{base}-{variant}.png'
                render(product, index, size, working / name, preview, theme)
                files.append(name)
            name = f'{base}-caption.txt'
            (working / name).write_text(caption + '\nAlt text: ' + alt + '\n')
            files.append(name)
            concepts.append({'productId': key, 'theme': theme['name'], 'title': title, 'landingUrl': url, 'caption': caption, 'altText': alt})
        result = {'runId': run_id, 'status': mode, 'publicationId': manifest['publicationId'], 'catalogSha256': manifest['catalogSha256'], 'generatedAt': now.isoformat(), 'productIds': chosen, 'files': files, 'concepts': concepts}
        (working / 'manifest.json').write_text(json.dumps(result, indent=2) + '\n')
        working.rename(destination)
        if not preview:
            save_history(history, history_path, result)
        return result
    finally:
        if working.exists():
            shutil.rmtree(working)

def save_history(history, history_path, result):
    if any(isinstance(run, dict) and run.get('runId') == result['runId'] for run in history['runs']):
        return
    history['runs'].append({k: result[k] for k in ('runId', 'generatedAt', 'productIds', 'publicationId')})
    history_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = history_path.with_suffix('.tmp')
    tmp.write_text(json.dumps(history, indent=2) + '\n')
    tmp.replace(history_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', type=Path, default=ROOT / 'products.json')
    parser.add_argument('--publication-manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--history', type=Path, required=True)
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    try:
        result = generate(args.catalog, args.publication_manifest, args.output, args.history, preview=args.preview)
    except (ValueError, OSError, TypeError, KeyError, ImportError) as error:
        parser.exit(1, f'Flyers not generated: {error}\n')
    print(json.dumps({'status': result['status'], 'runId': result['runId'], 'productIds': result['productIds'], 'files': result['files']}, indent=2))


if __name__ == '__main__':
    main()
