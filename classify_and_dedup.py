#!/usr/bin/env python3
"""
classify_and_dedup.py

Implements:
- Tag normalization (synonym mapping -> canonical tags)
- Rule-based scoring to choose a single category
- Deduplication gates A/B/C against an existing `news.json`

Usage examples are in the `if __name__ == '__main__'` block.
"""
from pathlib import Path
import re
import json
import hashlib
from urllib.parse import urlparse, urlunparse, parse_qsl
from difflib import SequenceMatcher
from datetime import datetime, timedelta
import sys

# Ensure stdout uses UTF-8 on Windows to avoid CP949 encode errors
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


# --- Canonical tag mapping (regex or substring) ---
CANONICAL_MAP = {
    'KASA': [r'우주항공청', r'KASA', r'Korea Aerospace Administration'],
    'IITP': [r'정보통신기획평가원', r'IITP'],
    'NTN': [r'비지상 네트워크', r'Non-?Terrestrial Network', r'NTN'],
    'NR-NTN': [r'NR[- ]?NTN', r'5G NR-NTN'],
    'D2C': [r'Direct[- ]to[- ]Cell', r'D2C'],
    'D2D': [r'Direct[- ]to[- ]Device', r'D2D'],
    'ISL': [r'위성 간 링크', r'Inter[- ]Satellite Link', r'ISL'],
    'RegenerativePayload': [r'Regenerative Payload', r'온보드 프로세싱', r'onboard processing'],
    'BeamHopping': [r'Beam Hopping', r'빔 호핑'],
    'Latency': [r'지연시간', r'latency', r'RTT'],
    'Defense': [r'방산', r'국방', r'안보', r'Defense', r'national security'],
    'Maritime': [r'해양', r'해운', r'조선', r'maritime'],
    'Aviation': [r'항공', r'항행', r'UAM', r'도심항공모빌리티', r'aviation'],
    'DisasterSafety': [r'재난', r'재난안전', r'비상통신', r'public safety', r'emergency communications'],
    'Spectrum': [r'주파수', r'spectrum'],
    'KuBand': [r'Ku[- ]?band', r'Ku대역'],
    'KaBand': [r'Ka[- ]?band', r'Ka대역'],
    'EPFD': [r'EPFD', r'equivalent power flux-density'],
    '3GPP': [r'3GPP'],
    '6G': [r'6G', r'IMT-2030'],
    'Release19': [r'Release\s*19'],
    'Release21': [r'Release\s*21'],
    'Starlink': [r'Starlink', r'Starlink\b'],
    'SpaceX': [r'SpaceX'],
}


CANONICAL_ORDER = [
    'KASA', 'IITP', '3GPP', '6G', 'NTN', 'NR-NTN', 'ISL', 'RegenerativePayload', 'BeamHopping',
    'Latency', 'Starlink', 'SpaceX', 'D2C', 'D2D', 'Spectrum', 'KuBand', 'KaBand', 'EPFD',
    'Defense', 'Maritime', 'Aviation', 'DisasterSafety'
]


def extract_text_bundle(bundle: dict) -> str:
    parts = []
    for k in ('title', 'excerpt', 'bodyHtml'):
        v = bundle.get(k)
        if v:
            # strip HTML tags from bodyHtml for matching
            if k == 'bodyHtml':
                txt = re.sub(r'<[^>]+>', ' ', v)
            else:
                txt = v
            parts.append(txt)
    # sources names and urls
    for s in bundle.get('sources', []) or []:
        parts.append(s.get('name', ''))
        parts.append(s.get('url', ''))
    for d in bundle.get('official_docs', []) or []:
        parts.append(d)
    for y in bundle.get('youtube_links', []) or []:
        parts.append(y)
    return '\n'.join(p for p in parts if p)


def normalize_text(t: str) -> str:
    return t.lower()


def find_canonical_tags(text: str) -> list:
    text_l = normalize_text(text)
    tags = []
    for canon, patterns in CANONICAL_MAP.items():
        for p in patterns:
            try:
                if re.search(p, text, flags=re.I):
                    tags.append(canon)
                    break
            except re.error:
                if p.lower() in text_l:
                    tags.append(canon)
                    break
    # dedupe and order
    ordered = [t for t in CANONICAL_ORDER if t in tags]
    # add any remaining tags not in order
    ordered += [t for t in tags if t not in ordered]
    # limit to 12
    return ordered[:12]


# --- Category scoring ---
PRIORITY_TIE_ORDER = ['Policy', 'Standardization', 'Benchmarking', 'Vertical', 'Industry', 'Planning', 'Press']


def score_category(bundle: dict, matched_tags: list) -> str:
    # bundle expected keys: sources (list of dict with 'type'), official_docs
    scores = {'Policy': 0, 'Standardization': 0, 'Vertical': 0, 'Benchmarking': 0, 'Industry': 0, 'Planning': 0, 'Press': 0}
    text = extract_text_bundle(bundle)
    text_l = normalize_text(text)

    sources = bundle.get('sources') or []
    source_types = [s.get('type', '').lower() for s in sources]

    # A) Policy
    if re.search(r'\b(KASA|IITP)\b', text, flags=re.I) or re.search(r'전파진흥|전파진흥기본계획|로드맵|사업|계획|공고|예산|추진|발표|브리핑|부처', text, flags=re.I):
        scores['Policy'] += 3
    if re.search(r'spectrum|주파수|궤도|filing|FCC|Ofcom|정부|규제', text, flags=re.I):
        scores['Policy'] += 2
    if any(t in ('official', 'regulator') for t in source_types):
        scores['Policy'] += 1

    # B) Standardization
    if re.search(r'3GPP|IMT-2030|6G|Release\s*19|Release\s*21|NR[- ]?NTN|NTN', text, flags=re.I):
        scores['Standardization'] += 3
    if re.search(r'표준화|규격|specification|workshop|WP\s*5D', text, flags=re.I):
        scores['Standardization'] += 2
    if any(t in ('paper', 'official') for t in source_types):
        scores['Standardization'] += 1

    # C) Vertical
    if any(v in matched_tags for v in ('Defense', 'Maritime', 'Aviation', 'DisasterSafety')):
        scores['Vertical'] += 3
    if re.search(r'적용|운영 시나리오|현장|실증|도입|조달|수요처', text, flags=re.I):
        scores['Vertical'] += 2
    if any(s.get('type','').lower() in ('industry','case','study') for s in sources):
        scores['Vertical'] += 1

    # D) Benchmarking
    if re.search(r'Starlink|SpaceX|Direct to Cell|Direct-to-Cell|D2C|Latency|Regenerative Payload|Beam Hopping', text, flags=re.I):
        scores['Benchmarking'] += 3
    if re.search(r'비교|격차|벤치마킹|리더|시장점유|성능 비교|상용화 수준', text, flags=re.I):
        scores['Benchmarking'] += 2
    if any(s.get('name','') and re.search(r'Starlink|SpaceX', s.get('name',''), flags=re.I) for s in sources):
        scores['Benchmarking'] += 1

    # E) Industry/Press/Planning heuristics
    if len(sources) == 1 and any(t in ('official',) for t in source_types):
        scores['Press'] += 2
    # fallback: if many sources and background words, count as Planning
    if len(sources) >= 3 and re.search(r'배경|구조|배치|프레임', text, flags=re.I):
        scores['Planning'] += 1

    # pick highest
    best = max(scores.items(), key=lambda kv: kv[1])[0]
    best_score = scores[best]
    # tie-breaker
    ties = [k for k,v in scores.items() if v == best_score]
    if len(ties) > 1:
        for p in PRIORITY_TIE_ORDER:
            if p in ties:
                return p
        return ties[0]
    return best


# --- Deduplication gates ---
def normalize_url(u: str) -> str:
    if not u:
        return ''
    p = urlparse(u)
    scheme = 'https'
    netloc = p.netloc.lower()
    path = p.path.rstrip('/')
    # remove tracking params
    qs = parse_qsl(p.query, keep_blank_values=True)
    qs = [(k,v) for k,v in qs if not re.match(r'utm_|fbclid|gclid', k)]
    query = '&'.join(f'{k}={v}' for k,v in qs)
    return urlunparse((scheme, netloc, path, '', query, ''))


def sha256_of_url(u: str) -> str:
    n = normalize_url(u)
    return hashlib.sha256(n.encode('utf-8')).hexdigest()


def title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def event_key(bundle: dict, tags: list) -> str:
    # date_bucket YYYY-MM-DD
    date_str = bundle.get('date') or datetime.utcnow().strftime('%Y-%m-%d')
    top3 = '+'.join(tags[:3]) if tags else ''
    entity = ''
    for t in tags:
        if t in ('Starlink','SpaceX'):
            entity = t
            break
    return f"{date_str}:{top3}:{entity}"


def is_duplicate(bundle: dict, existing_articles: list) -> dict:
    # Gate A: source hash
    primary = None
    sources = bundle.get('sources') or []
    if bundle.get('official_docs'):
        primary = bundle['official_docs'][0]
    elif sources:
        primary = sources[0].get('url')
    result = {'duplicate': False, 'reason': None}
    if primary:
        h = sha256_of_url(primary)
        for a in existing_articles:
            srcs = a.get('sources') or []
            other_primary = None
            if a.get('official_docs'):
                other_primary = a['official_docs'][0]
            elif srcs:
                other_primary = srcs[0].get('url')
            if other_primary and sha256_of_url(other_primary) == h:
                result.update({'duplicate': True, 'reason': 'source_hash'})
                return result

    # Gate B: title similarity
    new_title = bundle.get('title','')
    for a in existing_articles[-50:]:
        t = a.get('title','')
        if t and new_title:
            sim = title_similarity(new_title, t)
            if sim >= 0.88:
                result.update({'duplicate': True, 'reason': f'title_similarity:{sim:.2f}'})
                return result

    # Gate C: event key within 48 hours
    tags = bundle.get('tags') or []
    ek = event_key(bundle, tags)
    # check recent articles
    now = datetime.utcnow()
    for a in existing_articles:
        a_date = a.get('date')
        try:
            a_dt = datetime.strptime(a_date, '%Y-%m-%d')
        except Exception:
            continue
        if now - a_dt <= timedelta(days=2):
            a_tags = a.get('tags') or []
            a_ek = event_key(a, a_tags)
            if a_ek == ek:
                result.update({'duplicate': True, 'reason': 'event_key'})
                return result

    return result


if __name__ == '__main__':
    import argparse

    p = argparse.ArgumentParser(description='Classify article bundle, normalize tags, and check duplicates')
    p.add_argument('input', help='JSON file with single article bundle')
    p.add_argument('--news', help='existing news.json (optional)', default='news.json')
    args = p.parse_args()

    bundle = json.loads(Path(args.input).read_text(encoding='utf-8'))
    text = extract_text_bundle(bundle)
    tags = find_canonical_tags(text)
    # attach tags
    bundle['tags'] = tags
    category = score_category(bundle, tags)
    bundle['category_detected'] = category

    existing = []
    newsf = Path(args.news)
    if newsf.exists():
        try:
            news = json.loads(newsf.read_text(encoding='utf-8'))
            existing = news.get('articles', []) if isinstance(news, dict) else news
        except Exception:
            existing = []

    dup = is_duplicate(bundle, existing)

    out = {
        'bundle': bundle,
        'category': category,
        'tags': tags,
        'duplicate_check': dup
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
