"""Inspect PDF structure/text and assemble page contact sheets for visual review."""
from pathlib import Path
import sys
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
reader = PdfReader(ROOT / 'deliverables/glucotwin_illustrated_project_handbook.pdf')
assert len(reader.pages) == 30, 'A section overflowed; update layout before delivery'
assert len(reader.outline) == 30, 'Missing PDF navigation bookmarks'
for i, page in enumerate(reader.pages, start=1):
    lines = [line for line in page.extract_text().splitlines() if line.strip()]
    print(f'{i:02d}: ' + ' / '.join(lines[:5]))
links = [annotation.get_object().get('/A', {}).get('/URI') for page in reader.pages for annotation in page.get('/Annots', [])]
print('Pages:', len(reader.pages), 'External link annotations:', len([url for url in links if url]))
print('Null glyphs in text:', sum('\x00' in page.extract_text() for page in reader.pages))
feature_names = __import__('json').loads((ROOT / 'contracts/v1.json').read_text())['featureNames']
feature_text = '\n'.join(page.extract_text() for page in reader.pages[24:26])
assert all(name in feature_text for name in feature_names), 'Feature name missing or damaged'
assert len(set(url for url in links if url)) == 25, 'Reference URL missing'
assert all('\x00' not in page.extract_text() for page in reader.pages), 'Invalid text glyph'
print('PASS: 30 pages, 30 bookmarks, all 43 exact feature names, 25 reference URLs')
rendered = ROOT / ('tmp/pdfs/' + (sys.argv[1] if len(sys.argv) > 1 else 'handbook-v1'))
paths = sorted(rendered.glob('page-*.png'))
if len(paths) == len(reader.pages):
    for start in range(0, len(paths), 6):
        sheet = Image.new('RGB', (1250, 1810), '#d7e0e5')
        draw = ImageDraw.Draw(sheet)
        for local, path in enumerate(paths[start:start+6]):
            im = Image.open(path).convert('RGB')
            im.thumbnail((405, 850))
            x = 10 + (local % 3) * 415
            y = 35 + (local // 3) * 890
            sheet.paste(im, (x, y))
            draw.text((x, y-21), path.stem, fill='#12324a')
        target = rendered / f'contact-{start//6+1}.jpg'
        sheet.save(target, quality=90)
        print(target)
