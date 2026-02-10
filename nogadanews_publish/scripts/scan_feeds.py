#!/usr/bin/env python3
"""
scan_feeds.py

Simple analyzer for logs/discovered_feeds.csv
- summarizes counts per source
- reports unique discovered feed URLs

Usage: python scripts/scan_feeds.py [logs/discovered_feeds.csv]
"""
import sys
import csv
from collections import Counter, defaultdict

path = sys.argv[1] if len(sys.argv) > 1 else 'logs/discovered_feeds.csv'

counts = Counter()
per_source = defaultdict(set)
unique_feeds = set()

try:
    with open(path, newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        for row in r:
            name = row.get('source_name') or row.get('source') or ''
            feed = row.get('discovered_feed') or row.get('feed') or ''
            counts[name] += 1
            if feed:
                per_source[name].add(feed)
                unique_feeds.add(feed)
except FileNotFoundError:
    print('No discovered feeds log found at', path)
    sys.exit(2)

print('Discovered feeds summary:')
for name, c in counts.most_common():
    print(f'- {name}: {c} entries, {len(per_source[name])} unique feeds')

print('\nTotal unique discovered feeds:', len(unique_feeds))

print('\nSample feeds:')
for i, f in enumerate(sorted(unique_feeds)[:30], 1):
    print(f'{i}. {f}')

print('\nTo export unique feeds as CSV:')
print('  python scripts/scan_feeds.py > /dev/null && python -c "import scripts.scan_feeds as s"')
