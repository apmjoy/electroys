#!/usr/bin/env python3
"""Review and stage discovery intake, prune expired offers, produce refresh state.
Does not publish. Publication and flyer generation must consume a successful run ID.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
from catalog_model import validate_products, duplicate_groups, validate_offer, utcnow
from validate_catalog import make_report


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', dir=path.parent, prefix='.' + path.name, delete=False) as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')
        temp = Path(stream.name)
    temp.replace(path)


def stage_candidates(products, candidates):
    """Idempotent intake. Existing identities are never duplicated or overwritten."""
    accepted, rejected, unchanged = {}, [], []
    if not isinstance(candidates, dict):
        return {}, [{'productId': None, 'errors': ['candidates must be an object']}], []
    working = dict(products)
    for key, product in candidates.items():
        if key in products:
            if product == products[key]:
                unchanged.append(key)
            else:
                rejected.append({'productId': key, 'errors': ['existing product update requires source reconciliation']})
            continue
        errors = validate_products({key: product})
        if isinstance(product, dict):
            if product.get('relationship') not in ('core', 'support', 'general'):
                errors.append({'errors': ['classification required before intake']})
            evidence = product.get('verification', {})
            if not isinstance(evidence, dict) or evidence.get('status') != 'verified':
                errors.append({'errors': ['verified source evidence required']})
            if not product.get('source'):
                errors.append({'errors': ['original provider source required']})
        if errors:
            rejected.append({'productId': key, 'errors': errors})
            continue
        duplicates = [d for d in duplicate_groups({**working, key: product}) if key in d['products']]
        if duplicates:
            rejected.append({'productId': key, 'errors': ['duplicate candidate'], 'matches': duplicates})
            continue
        working[key] = product
        accepted[key] = product
    return accepted, rejected, unchanged


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parent.parent
    parser.add_argument('--products', type=Path, default=root / 'products.json')
    parser.add_argument('--offers', type=Path, default=root / 'offers.json')
    parser.add_argument('--candidates', type=Path)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--online', action='store_true')
    args = parser.parse_args()
    run_id = utcnow().strftime('%Y%m%dT%H%M%SZ')
    state = {'version': 1, 'runId': run_id, 'startedAt': utcnow().isoformat(), 'stage': 'failed', 'published': False, 'flyerReady': False}
    try:
        products = json.loads(args.products.read_text())
        offers = json.loads(args.offers.read_text())
        if validate_products(products):
            raise ValueError('catalog structure invalid; run validate_catalog.py for details')
        candidates = json.loads(args.candidates.read_text()) if args.candidates else {}
        accepted, rejected, unchanged = stage_candidates(products, candidates)
        staged = {**products, **accepted}
        all_offers = offers.get('offers', [])
        if not isinstance(all_offers, list):
            raise ValueError('offers must be an array')
        current, removed = [], []
        for offer in all_offers:
            errors = validate_offer(offer, staged)
            if errors:
                removed.append({'id': offer.get('id') if isinstance(offer, dict) else None, 'reasons': errors})
            else:
                current.append(offer)
        report = make_report(staged, {'version': 1, 'offers': current}, online=args.online)
        # Stage only: caller reviews report and atomically publishes this snapshot.
        atomic_json(args.output_dir / 'products.json', staged)
        atomic_json(args.output_dir / 'offers.json', {'version': 1, 'offers': current})
        atomic_json(args.output_dir / 'validation.json', report)
        state.update({'stage': 'staged', 'added': list(accepted), 'rejected': rejected, 'unchanged': unchanged,
                      'removedOffers': removed, 'allDetailsVerified': report['summary']['allVerified'],
                      'requiresReview': bool(rejected or report['structuralErrors'] or report['duplicateCandidates'] or not report['summary']['allVerified']),
                      'completedAt': utcnow().isoformat()})
    except (OSError, ValueError, TypeError) as exc:
        state['error'] = str(exc)
    atomic_json(args.output_dir / 'run-state.json', state)
    print(json.dumps({k: state[k] for k in ('runId', 'stage', 'published', 'flyerReady')}))
    return 1 if state['stage'] == 'failed' else 0

if __name__ == '__main__':
    raise SystemExit(main())
