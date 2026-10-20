import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import unittest
from datetime import datetime, timezone, timedelta
from morning_gate import validate


class MorningGateTests(unittest.TestCase):
    def test_requires_today_exact_release_and_all_checks(self):
        now = datetime(2026, 10, 20, 12, tzinfo=timezone.utc)
        pub = {'publicationId': 'release', 'catalogSha256': 'abc'}
        good = {**pub, 'status': 'passed', 'checkedAt': now.isoformat(), 'checks': {k: True for k in ('contentLoaded', 'images', 'browser', 'functional', 'security')}}
        self.assertTrue(validate(good, pub, now))
        for field, value in [('status', 'failed'), ('publicationId', 'old'), ('catalogSha256', 'changed'), ('checkedAt', (now - timedelta(days=1)).isoformat()), ('checkedAt', (now + timedelta(minutes=1)).isoformat()), ('checks', {'images': True})]:
            with self.subTest(field=field):
                with self.assertRaises(ValueError):
                    validate({**good, field: value}, pub, now)


if __name__ == '__main__':
    unittest.main()
