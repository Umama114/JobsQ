# Finds the page (1-based) where each heading starts in a PDF that has an index.
# Usage: python -I pdf-heading-pages.py doc.pdf heads.json  -> prints a JSON list of page numbers.
import json, re, sys
from pypdf import PdfReader

def norm(t):
    return re.sub(r'\s+', '', t).lower()

pdf, heads_path = sys.argv[1], sys.argv[2]
heads = json.load(open(heads_path, encoding='utf-8'))
pages = [norm(p.extract_text() or '') for p in PdfReader(pdf).pages]
marker = norm('— end of index —')
start = next((k for k, t in enumerate(pages) if marker in t), -1) + 1
cur, out = start, []
for h in heads:
    key = norm(h)[:40]
    # a heading must start on its page; search from the previous heading's page on
    k = next((j for j in range(cur, len(pages)) if key in pages[j]), None)
    if k is None:
        print('heading not found: ' + h, file=sys.stderr); sys.exit(2)
    out.append(k + 1); cur = k
print(json.dumps(out))
