#!/usr/bin/env python3
"""
Simple script to read `kasa-ai-keywords.yml` and generate search query examples.
Generates `kasa-search-queries.txt` with AND/OR combination examples suitable for API/crawler input.
"""
from pathlib import Path
import re

KW_FILE = Path(__file__).with_name('kasa-ai-keywords.yml')
OUT_FILE = Path(__file__).with_name('kasa-search-queries.txt')


def parse_simple_yaml(path: Path):
    """Minimal YAML extractor for lists of quoted strings under keys.
    Builds a flat dict like { 'core': [...], 'vertical_defense': [...], ... }
    """
    data = {}
    stack = []
    current_key = None
    with path.open(encoding='utf-8') as f:
        for raw in f:
            line = raw.rstrip('\n')
            # section header
            m = re.match(r'^(\s*)([A-Za-z0-9_\-]+):\s*$', line)
            if m:
                indent, key = m.groups()
                level = len(indent)
                # simple flat key: if nested, join with underscore
                if stack and level > stack[-1][0]:
                    parent = stack[-1][1]
                    key = f"{parent}_{key}"
                # maintain stack
                stack.append((level, key))
                current_key = key
                if current_key not in data:
                    data[current_key] = []
                continue
            # list item like: - "text"
            m2 = re.match(r'^\s*-\s*"(.*)"\s*$', line)
            if m2 and current_key:
                data.setdefault(current_key, []).append(m2.group(1))
                continue
            # dedent handling: if blank or other line, maybe pop
            m3 = re.match(r'^(\S)', line)
            if m3:
                # top-level or new key; reset stack to top-level
                stack = []
                current_key = None
    return data


def mk_and(query_parts):
    return ' AND '.join(f'"{p}"' if ' ' in p else p for p in query_parts)


def mk_or(parts):
    return ' OR '.join(f'"{p}"' if ' ' in p else p for p in parts)


def generate_queries(data):
    queries = []
    core = data.get('core', [])
    benchmarking = data.get('benchmarking', [])
    # Simple core queries: pair with KASA and 6G NTN
    for k in core:
        queries.append(mk_and(['KASA', k]))
        queries.append(mk_and(['6G NTN', k]))
        queries.append(mk_and(['KASA', '3GPP', k]))
    # OR bundles: top-5 core OR
    if core:
        top5 = core[:5]
        queries.append(mk_or(top5))
        queries.append(mk_and(['KASA', f'({mk_or(top5)})']))
    # verticals
    for prefix in ('vertical_defense', 'vertical_maritime', 'vertical_aviation', 'vertical_disaster'):
        for k in data.get(prefix, []):
            queries.append(mk_and(['KASA', k]))
            queries.append(mk_and(['6G', k]))
    # maritime_aviation combined key (from our file naming)
    for k in data.get('vertical_maritime_aviation', []) + data.get('maritime_aviation', []):
        queries.append(mk_and(['KASA', k]))
    # benchmarking
    for b in benchmarking:
        queries.append(mk_and(['Starlink', b]))
        queries.append(mk_and(['benchmark', b]))
    # example compound queries
    if core and benchmarking:
        queries.append(mk_and(['KASA', core[0], benchmarking[0]]))
    # add suggested search templates
    queries.append('KASA + "저궤도 위성통신 기술개발사업" + 3GPP')
    queries.append('KASA + "6G NTN" + "위성 주파수"')
    queries.append('"KASA" AND ("저궤도 위성" OR "NTN") AND "시험 발사"')

    # deduplicate while preserving order
    seen = set()
    out = []
    for q in queries:
        if q not in seen:
            out.append(q)
            seen.add(q)
    return out


if __name__ == '__main__':
    if not KW_FILE.exists():
        print(f"Keyword file not found: {KW_FILE}")
        raise SystemExit(1)
    data = parse_simple_yaml(KW_FILE)
    queries = generate_queries(data)
    with OUT_FILE.open('w', encoding='utf-8') as f:
        for q in queries:
            f.write(q + '\n')
    print(f"Wrote {len(queries)} queries to {OUT_FILE}")
