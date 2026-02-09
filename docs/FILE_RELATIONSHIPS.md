## 파일 간 구동 관계 (요약)

아래는 `nogadanews` 저장소의 핵심 정적/파이프라인 파일들이 어떻게 상호작용하는지 정리한 문서입니다.

- 브라우저(클라이언트)
  - `index.html`, `newsroom.html`, `article.html` 등은 루트의 `news.json`을 `fetch`하여 화면을 구성합니다.
  - 기사 상세(`article.html`)는 URL 쿼리 `?id=...`를 읽어 `news.json.articles`에서 해당 `id`를 찾아 렌더링합니다.
  - 클라이언트는 `item.bodyHtml` 또는 `item.content`/`item.body` 중 가능한 필드에서 본문을 읽도록 구현되어 있습니다.

- 데이터(루트 파일)
  - `news.json` : 클라이언트가 실시간으로 읽는 단일 소스이며 `articles` 배열을 포함합니다.
    - 각 article 객체는 최소 `id`, `title`, `date` 등을 포함해야 하며 본문은 `bodyHtml`(혹은 `content`/`body`)에 HTML로 들어갑니다.

- 파이프라인(콘텐츠 생성/갱신)
  - `scripts/run_pipeline.js` : RSS·YouTube 수집 → LLM을 통한 기사 생성 → `classify_and_dedup.py`로 중복/분류 → `news.json`에 prepend
    - 외부 키: `YOUTUBE_API_KEY`, LLM/GENSPARK 키 등(환경변수 통해 주입)
    - 임시 파일: `article.tmp.json` (파이프라인 실행 중 생성)
  - `classify_and_dedup.py` : 기존 `news.json`을 기준으로 중복체크 및 분류를 수행하고 JSON을 stdout으로 반환

- 정적 자원
  - `style.css`, `site.webmanifest`/`manifest.json`, `assets/*`(icons, thumbs, header.mp4 등)는 클라이언트 렌더링에 필수

- 배포/빌드 치환
  - HTML 내 `__DEPLOY_PRIME_URL__`, `__CONTEXT__` 등 메타는 Netlify 빌드 시 치환을 권장(스크립트: `scripts/netlify_replace_meta.sh` 참고).

## 운영 시 주의사항
- `news.json`은 반드시 웹 루트에 존재해야 하며 공개적으로 접근 가능해야 클라이언트가 정상 동작합니다.
- 파이프라인에서 출력하는 article 스키마(`bodyHtml` vs `content`)가 혼재할 수 있으므로, 클라이언트는 두 필드를 모두 지원하도록 설계되어야 합니다(이미 반영됨).
- 외부 API 키는 절대 리포지터리에 커밋하지 말고 CI/Netlify 환경변수로 관리하세요.

원하시면 이 파일을 더 상세한 파일별 호출 그래프(파일→파일 라인 참조 포함) 형태로 확장해 드리겠습니다.
