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
    import feedparser
    import yaml
except Exception as e:
    print("필요한 라이브러리가 설치되어 있지 않습니다. 실행 전에 'pip install -r requirements_procurements.txt'를 실행하세요.", file=sys.stderr)
    raise

HERE = os.path.dirname(__file__) or '.'
OUT = os.path.abspath(os.path.join(HERE, '..', 'data', 'procurements.json'))

def load_sources_config():
    path = os.path.join(HERE, 'procurements_sources.yml')
    if not os.path.exists(path):
        print('sources config not found:', path)
        return []
    with open(path, 'r', encoding='utf-8') as f:
        cfg = yaml.safe_load(f)
        return cfg.get('sources', [])

def fetch_from_rss(url):
    d = feedparser.parse(url)
    items = []
    for e in d.entries:
        items.append({
            'id': e.get('id') or e.get('link'),
            'title': e.get('title'),
            'agency': e.get('source', {}).get('title') or '',
            'region': '',
            'amount': '',
            'deadline': e.get('published') or e.get('updated'),
            'postedDate': e.get('published') or e.get('updated'),
            'url': e.get('link'),
            'tags': ' '.join([t.term for t in e.get('tags', [])]) if e.get('tags') else ''
        })
    return items

def fetch_from_koness(endpoint, params=None):
    # KONEPS / 조달청 공공 API는 인증이 필요합니다. 이 함수 shows how to call a JSON API.
    params = params or {}
    resp = requests.get(endpoint, params=params, timeout=15)
    resp.raise_for_status()
    # Here you must parse the concrete response structure. This is an example placeholder.
    data = resp.json()
    items = []
    for rec in data.get('results', []):
        items.append({
            'id': rec.get('noticeNo') or rec.get('id'),
            'title': rec.get('title'),
            'agency': rec.get('agency') or rec.get('office'),
            'region': rec.get('region'),
            'amount': rec.get('estimateAmt'),
            'deadline': rec.get('deadline'),
            'postedDate': rec.get('noticeDate'),
            'url': rec.get('link'),
            'tags': rec.get('category') or ''
        })
    return items

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
    print('Fetch procurements (configured sources)')
    existing = load_existing() or []
    sources = load_sources_config()
    all_items = []
    for s in sources:
        try:
            if s.get('type') == 'rss':
                print('Fetching RSS:', s.get('url'))
                all_items.extend(fetch_from_rss(s.get('url')))
            elif s.get('type') in ('koness','koneps','koness_sample'):
                print('Fetching API (placeholder):', s.get('endpoint'))
                try:
                    all_items.extend(fetch_from_koness(s.get('endpoint'), s.get('params')))
                except Exception as e:
                    print('API fetch failed for', s.get('id'), e)
            else:
                print('Unknown source type:', s.get('type'))
        except Exception as e:
            print('source fetch error', s.get('id'), e)

    # Basic dedupe by id or url
    seen = set()
    dedup = []
    for it in all_items:
        key = it.get('id') or it.get('url')
        if not key or key in seen:
            continue
        seen.add(key)
        dedup.append(it)

    if dedup:
        write_out(dedup)
    else:
        print('No items fetched; leaving existing data in place.')

if __name__ == '__main__':
    main()
