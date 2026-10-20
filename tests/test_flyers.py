import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

spec = importlib.util.spec_from_file_location('flyers', Path(__file__).resolve().parents[1] / 'tools/build_flyers.py')
flyers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(flyers)
NOW = datetime(2026, 10, 20, 12, tzinfo=timezone.utc)

class FlyerTests(unittest.TestCase):
    def setUp(self):
        self.products = {'one': {'t': 'Circuit kit', 'cat': 'Electronics', 'learn': 'Explore circuits.'}, 'two': {'t': 'Project book', 'cat': 'Books', 'learn': 'Learn through building.'}, 'three': {'t': 'New robot', 'addedAt': '2026-10-20T05:00:00Z', 'learn': 'Explore movement.'}}
        self.raw = json.dumps(self.products).encode()
        self.manifest = {'status': 'published', 'verifiedAt': NOW.isoformat(), 'catalogSha256': hashlib.sha256(self.raw).hexdigest(), 'productIds': list(self.products), 'verifiedProductIds': list(self.products), 'baseUrl': 'https://electroys.com', 'publicationId': 'test-publication'}
    def test_gate_accepts_valid_manifest(self):
        self.assertEqual(len(flyers.validate_manifest(self.manifest, self.raw, self.products, NOW)), 3)
    def test_gate_rejects_stale_future_changed_unpublished_unknown(self):
        for field, value in [('verifiedAt', (NOW-timedelta(days=2)).isoformat()), ('verifiedAt', (NOW+timedelta(hours=2)).isoformat()), ('catalogSha256', 'bad'), ('status', 'preview'), ('verifiedProductIds', ['unknown']), ('baseUrl', 'https://electroys.com.evil.example'), ('productIds', ['one', 'one'])]:
            with self.subTest(field=field, value=value):
                with self.assertRaises(ValueError):
                    flyers.validate_manifest({**self.manifest, field: value}, self.raw, self.products, NOW)
    def test_empty_and_insufficient(self):
        for products in ({}, {'one': {'t': 'Only item'}}):
            with self.assertRaises(ValueError):
                flyers.validate_manifest(self.manifest, self.raw, products, NOW)
    def test_changed_products_excluded(self):
        self.products['one']['verification'] = {'status': 'changed'}
        self.assertNotIn('one', flyers.validate_manifest(self.manifest, self.raw, self.products, NOW))
    def test_newest_first_and_recent_avoided(self):
        self.assertEqual(flyers.choose(self.products, list(self.products), {'runs': []}, NOW)[0], 'three')
        history = {'runs': [{'generatedAt': NOW.isoformat(), 'productIds': ['three']}]}
        self.assertNotIn('three', flyers.choose(self.products, list(self.products), history, NOW))
    def test_calendar_themes(self):
        self.assertEqual(flyers.seasonal_theme(NOW)['name'], 'autumn-making')
        self.assertEqual(flyers.seasonal_theme(datetime(2026, 12, 15, 12, tzinfo=timezone.utc))['name'], 'gift-season')
        self.assertEqual(flyers.seasonal_theme(datetime(2026, 8, 15, 12, tzinfo=timezone.utc))['name'], 'back-to-learning')
        self.assertEqual(flyers.seasonal_theme(datetime(2026, 2, 15, 12, tzinfo=timezone.utc))['name'], 'learning')
    def test_large_catalog_selection(self):
        products = {f'item-{i}': {'t': f'Item {i}', 'addedAt': '2026-10-20T00:00:00Z'} for i in range(10000)}
        chosen = flyers.choose(products, list(products), {'runs': []}, NOW)
        self.assertEqual(len(chosen), 2)
        self.assertEqual(len(set(chosen)), 2)
    def test_render_and_idempotence(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest('Pillow required for image generation')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'catalog.json').write_bytes(self.raw)
            (root/'publication.json').write_text(json.dumps(self.manifest))
            args = (root/'catalog.json', root/'publication.json', root/'out', root/'history.json')
            result = flyers.generate(*args, now=NOW)
            self.assertEqual(len(result['concepts']), 2)
            self.assertEqual(len(result['files']), 6)
            for name in result['files']:
                if name.endswith('.png'):
                    with Image.open(root/'out'/result['runId']/name) as image:
                        self.assertEqual(image.size, flyers.SIZES['story' if 'story' in name else 'feed'])
            self.assertEqual(flyers.generate(*args, now=NOW), result)
            self.assertEqual(len(json.loads((root/'history.json').read_text())['runs']), 1)
            # Recover a history-write failure after output was finalized.
            (root/'history.json').unlink()
            self.assertEqual(flyers.generate(*args, now=NOW), result)
            self.assertEqual(len(json.loads((root/'history.json').read_text())['runs']), 1)
            # Do not reuse a previous output for another unverified publication.
            (root/'publication.json').write_text(json.dumps({**self.manifest, 'publicationId': 'different'}))
            with self.assertRaises(ValueError):
                flyers.generate(*args, now=NOW)
    def test_adversarial_long_text_layout(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest('Pillow required')
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / 'stress.png'
            product = {'t': '<script>alert(1)</script>' + 'x' * 180, 'cat': 'Long category ' * 40, 'learn': 'Longword' * 90}
            flyers.render(product, 1, flyers.SIZES['feed'], destination, True, flyers.seasonal_theme(NOW))
            with Image.open(destination) as image:
                self.assertEqual(image.size, (1080, 1350))
    def test_no_output_on_empty(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'catalog.json').write_text('{}')
            (root/'publication.json').write_text(json.dumps(self.manifest))
            with self.assertRaises(ValueError):
                flyers.generate(root/'catalog.json', root/'publication.json', root/'out', root/'history.json', now=NOW)
            self.assertFalse((root/'out').exists())
    def test_preview_does_not_modify_production_history(self):
        try:
            import PIL
        except ImportError:
            self.skipTest('Pillow required')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'catalog.json').write_bytes(self.raw)
            (root/'publication.json').write_text(json.dumps({**self.manifest, 'status': 'preview'}))
            flyers.generate(root/'catalog.json', root/'publication.json', root/'out', root/'history.json', now=NOW, preview=True)
            self.assertFalse((root/'history.json').exists())

if __name__ == '__main__':
    unittest.main()
