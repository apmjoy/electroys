import json
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime, timezone
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from prepare_flyer_email import prepare


class EmailTests(unittest.TestCase):
    def test_attachments_and_duplicate_guard(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            release = {'publicationId': 'verified-release', 'catalogSha256': 'abc'}
            review = {**release, 'status': 'passed', 'checkedAt': datetime.now(timezone.utc).isoformat(), 'checks': {k: True for k in ('contentLoaded', 'images', 'browser', 'functional', 'security')}}
            (root / 'publication.json').write_text(json.dumps(release))
            (root / 'review.json').write_text(json.dumps(review))
            names = []
            for n in (1, 2):
                for size, height in [('feed', 1350), ('story', 1920)]:
                    name = f'{n}-{size}.png'
                    Image.new('RGB', (1080, height)).save(root / name)
                    names.append(name)
                name = f'{n}-caption.txt'
                (root / name).write_text('Caption and affiliate disclosure')
                names.append(name)
            (root / 'manifest.json').write_text(json.dumps({**release, 'status': 'published', 'runId': 'daily-test', 'files': names}))
            args = (root, root / 'publication.json', root / 'review.json', root / 'receipt.json', 'owner@example.com')
            package = prepare(*args)
            self.assertEqual(len(package['gmail']['payload']['parts']), 7)
            self.assertEqual(len(package['attachmentSha256']), 6)
            with self.assertRaises(ValueError):
                prepare(*args[:-1], 'owner@example.com\nBcc: bad@example.com')
            (root / 'receipt.json').write_text(json.dumps({'deliveryId': package['deliveryId'], 'messageId': 'sent'}))
            with self.assertRaises(ValueError):
                prepare(*args)
            (root / 'receipt.json').unlink()
            (root / names[0]).write_bytes(b'broken')
            with self.assertRaises(OSError):
                prepare(*args)


if __name__ == '__main__':
    unittest.main()
