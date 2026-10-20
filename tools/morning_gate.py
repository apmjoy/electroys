"""Fail closed unless page/image QA passed for today's exact published release."""
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo


def validate(review, publication, now=None):
    now = now or datetime.now(timezone.utc)
    if not isinstance(review, dict) or not isinstance(publication, dict):
        raise ValueError("Validation and publication records must be objects")
    if review.get('status') != 'passed':
        raise ValueError('Page validation has not passed')
    for field in ('publicationId', 'catalogSha256'):
        if not publication.get(field) or review.get(field) != publication[field]:
            raise ValueError('Page validation is for a different release')
    checked = datetime.fromisoformat(review.get('checkedAt', '').replace('Z', '+00:00'))
    if checked.tzinfo is None or not timedelta(0) <= now - checked < timedelta(hours=24):
        raise ValueError('Page validation is stale or future-dated')
    if checked.astimezone(ZoneInfo('America/Chicago')).date() != now.astimezone(ZoneInfo('America/Chicago')).date():
        raise ValueError('Today\'s page validation is required')
    for check in ('contentLoaded', 'images', 'browser', 'functional', 'security'):
        if review.get('checks', {}).get(check) is not True:
            raise ValueError('Missing successful check: ' + check)
    return True


def validate_files(review_path, publication_path):
    return validate(json.loads(Path(review_path).read_text()), json.loads(Path(publication_path).read_text()))
