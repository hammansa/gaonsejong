#!/usr/bin/env python3
"""Generate a JSON file listing articles that lack a cover in news.json

Usage: python scripts/generate_missing_covers.py
Writes: dev/missing_covers.json
"""
import json, os

IN = 'news.json'
OUT_DIR = 'dev'
OUT = os.path.join(OUT_DIR, 'missing_covers.json')

def main():
    if not os.path.isfile(IN):
        print('news.json not found')
        return 2
    with open(IN, 'r', encoding='utf8') as f:
        data = json.load(f)
    articles = data.get('articles', data if isinstance(data, list) else [])
    missing = []
    for a in articles:
        cov = a.get('cover') if isinstance(a, dict) else None
        if not cov:
            missing.append({'id': a.get('id'), 'title': a.get('title'), 'date': a.get('date')})
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, 'w', encoding='utf8') as fo:
        json.dump({'count': len(missing), 'missing': missing}, fo, ensure_ascii=False, indent=2)
    print('wrote', OUT)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
