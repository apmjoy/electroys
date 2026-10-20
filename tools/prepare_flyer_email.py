"""Prepare authorized Gmail MIME attachments after the morning publication gate.

Does not send mail. The connected Gmail send_email tool delivers this payload;
save its returned message ID to a private receipt before retrying any send.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
from morning_gate import validate_files

def prepare(directory, publication, review, receipt, recipients):
    if not isinstance(recipients, str) or not recipients.strip() or any(c in recipients for c in "\r\n"):
        raise ValueError("Explicit authorized recipients are required")
    validate_files(review, publication)
    root = Path(directory)
    manifest = json.loads((root / 'manifest.json').read_text())
    release = json.loads(Path(publication).read_text())
    if manifest.get('status') != 'published' or any(manifest.get(k) != release.get(k) for k in ('publicationId', 'catalogSha256')):
        raise ValueError('Flyers are not for the validated live release')
    files = manifest.get('files', [])
    if len(files) != 6 or len(set(files)) != 6:
        raise ValueError('Expected four images and two caption files')
    if sum(str(n).endswith('.png') for n in files) != 4 or sum(str(n).endswith('.txt') for n in files) != 2:
        raise ValueError('Expected four PNGs and two captions')
    parts = [{'mime_type': 'text/html', 'body': {'content': '<p>Your two Electroys flyer concepts are attached, each with feed and story images plus captions and alt text. These follow the website refresh and page/image validation.</p><p>Affiliate links: Electroys may earn a commission from qualifying purchases.</p><p><a href="https://electroys.com">Open Electroys</a></p>'}}]
    hashes = {}
    total = 0
    for name in files:
        if not isinstance(name, str) or Path(name).name != name or Path(name).suffix not in ('.png', '.txt'):
            raise ValueError('Unexpected attachment filename')
        data = (root / name).read_bytes()
        if name.endswith('.png'):
            from PIL import Image
            with Image.open(root / name) as image:
                if image.format != 'PNG' or image.size != (1080, 1920 if 'story' in name else 1350):
                    raise ValueError('Unexpected flyer image format or dimensions')
                image.verify()
        total += len(data)
        if not data or total > 15_000_000:
            raise ValueError('Attachment payload is empty or exceeds the delivery budget')
        hashes[name] = hashlib.sha256(data).hexdigest()
        parts.append({'mime_type': 'image/png' if name.endswith('.png') else 'text/plain', 'filename': name, 'content_disposition': 'attachment', 'body': {'base64_url_content': base64.urlsafe_b64encode(data).decode()}})
    delivery_id = hashlib.sha256(json.dumps([recipients, manifest['runId'], hashes], sort_keys=True).encode()).hexdigest()
    if Path(receipt).exists():
        previous = json.loads(Path(receipt).read_text())
        if previous.get('deliveryId') == delivery_id:
            raise ValueError('This exact flyer package has already been sent; do not duplicate')
        raise ValueError('Existing receipt requires inspection before sending a revised package')
    return {'deliveryId': delivery_id, 'attachmentSha256': hashes, 'gmail': {'to': recipients, 'subject': 'Electroys daily flyers — ' + manifest['runId'], 'payload': {'mime_type': 'multipart/mixed', 'parts': parts}}, 'receiptPath': str(receipt)}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--to', required=True, help='User-authorized recipient list; keep addresses in private automation configuration')
    p.add_argument('--directory', type=Path, required=True)
    p.add_argument('--publication-manifest', type=Path, required=True)
    p.add_argument('--page-validation', type=Path, required=True)
    p.add_argument('--receipt', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    result = prepare(a.directory, a.publication_manifest, a.page_validation, a.receipt, a.to)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result))
    print(json.dumps({'deliveryId': result['deliveryId'], 'attachments': len(result['attachmentSha256']), 'to': a.to}))
