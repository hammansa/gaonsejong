#!/usr/bin/env python3
"""
fetch_procurements.py

Simple, configurable fetcher that reads `scripts/procurements_sources.yml` (or list of URLs)
and writes normalized output to `data/procurements.json`.

This script is a template; adapt source parsing for real APIs (조달청, 지자체 RSS/JSON).
"""
import json
import os
import sys
from datetime import datetime

try:
    import requests
except Exception:
    print("requests 라이브러리가 필요합니다. pip install requests", file=sys.stderr)
    raise

HERE = os.path.dirname(__file__) or '.'
OUT = os.path.abspath(os.path.join(HERE, '..', 'data', 'procurements.json'))

def fetch_example_sources():
    # Placeholder: in production, replace with real endpoints and parsing logic
    sources = [
        'https://procurement.example/api/region/충남/latest',
        'https://procurement.example/api/region/대전/latest'
    ]
    items = []
    for url in sources:
        # We cannot call real APIs here; this section should be implemented per source
        print(f"Would fetch: {url}")
    # For now, keep existing sample file if present
    return None

def load_existing():
    if os.path.exists(OUT):
        with open(OUT,'r',encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return []
    return []

def write_out(items):
    with open(OUT,'w',encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print('Wrote', OUT)

def main():
    print('Fetch procurements (template)')
    existing = load_existing()
    remote = fetch_example_sources()
    if remote is None:
        print('No remote fetch implemented; leaving existing data in place.')
        print('You should implement fetch logic for your data sources in scripts/fetch_procurements.py')
        sys.exit(0)
    # Merge/normalize logic here
    items = remote
    write_out(items)

if __name__ == '__main__':
    main()
