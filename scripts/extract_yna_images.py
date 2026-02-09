#!/usr/bin/env python3
"""Extract data: URI images from an HTML file into a folder and write a mapping.json.

Usage: python scripts/extract_yna_images.py path/to/file.html output/folder/
"""
import sys, os, re, base64, hashlib, json

def safe_mkdir(path):
    try:
        os.makedirs(path, exist_ok=True)
    except Exception as e:
        print('mkdir failed', e)

def main():
    if len(sys.argv) < 3:
        print('Usage: extract_yna_images.py <input.html> <outdir>')
        return 2
    infile = sys.argv[1]
    outdir = sys.argv[2]
    if not os.path.isfile(infile):
        print('Input file not found:', infile); return 3
    safe_mkdir(outdir)
    data = open(infile, 'rb').read()
    # find data:image/...;base64,XXXX
    pattern = re.compile(rb'data:image/(?P<fmt>png|jpeg|jpg|gif);base64,(?P<data>[A-Za-z0-9+/=]+)')
    items = []
    for i, m in enumerate(pattern.finditer(data)):
        fmt = m.group('fmt').decode('ascii')
        b64 = m.group('data')
        try:
            raw = base64.b64decode(b64)
        except Exception as e:
            print('decode failed for image', i, e); continue
        h = hashlib.sha1(raw).hexdigest()[:12]
        ext = 'jpg' if fmt in ('jpeg','jpg') else fmt
        fname = f'extracted_{i}_{h}.{ext}'
        fpath = os.path.join(outdir, fname)
        with open(fpath, 'wb') as fo:
            fo.write(raw)
        snippet = data[m.start():m.end()][:80]
        items.append({'index': i, 'file': os.path.relpath(fpath), 'ext': ext, 'snippet': snippet.decode('latin1', errors='replace')})
        print('wrote', fpath)

    mapping = {'source': infile, 'count': len(items), 'images': items}
    mapfile = os.path.join(outdir, 'mapping.json')
    with open(mapfile, 'w', encoding='utf8') as mf:
        json.dump(mapping, mf, indent=2, ensure_ascii=False)
    print('extracted', len(items), 'images ->', outdir)
    return 0

if __name__ == '__main__':
    sys.exit(main())
