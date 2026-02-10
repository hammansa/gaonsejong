## 노가다뉴스 기사 작성 · 수정 · 배포 가이드

이 문서는 `www.nogadanews.com` 사이트에서 **새 기사를 만드는 전체 흐름**을 정리한 안내서입니다.

- 대상 독자: 노가다뉴스 편집자/기자
- 환경: 로컬 PC(Windows)에서 작업 → Netlify로 배포

---

## 1. 기본 구조 이해하기

### 1-1. 주요 폴더와 파일

- `article_pages/…`  
  - 실제 기사 HTML 파일이 들어있는 곳입니다.  
  - 예: `notice-001.html`, `news-001.html`, `nogada-2026-02-10-004.html` 등

- `news.json`  
  - 메인 페이지·뉴스룸·`article.html` 이 참고하는 **기사 목록 데이터**입니다.
  - 각 기사를 하나의 JSON 객체로 가지고 있습니다.

- `article.html`  
  - `?id=...` 쿼리스트링으로 기사를 열어주는 **상세 페이지 템플릿**입니다.
  - 동작 방식:
    - `news.json`에서 `id`로 기사를 찾음
    - `articleUrl`이 있으면 해당 HTML을 불러와 `<body>` 내용을 삽입

- `index.html`  
  - 메인 페이지
  - `news.json` 기준으로 “최신 뉴스 3개”와 사이드 기사 목록을 렌더링합니다.

- `scripts/build_site.js`  
  - `npm run build` 실행 시, 현재 폴더를 복사해서 `nogadanews_publish` 폴더를 만드는 스크립트입니다.
  - Netlify에 업로드할 최종 산출물이 `nogadanews_publish` 입니다.

### 1-2. 기사 카테고리(분야)

현재 기준 주요 카테고리는 다음과 같습니다:

1. **현장소식** (`category: "현장소식"`)
2. **취재수첩** (`"취재수첩"`)
3. **권익보호** (`"권익보호"`)
4. **인터뷰** (`"인터뷰"`)
5. **칼럼** (`"칼럼"`)
6. **속보** (`"속보"`)

각 카테고리마다 재사용 가능한 HTML 템플릿을 만들어 두었습니다.

---

## 2. 카테고리별 기사 템플릿

### 2-1. 템플릿 파일 목록

`article_pages` 폴더 안에 다음 템플릿들이 준비되어 있습니다:

1. **현장소식**: `template-site-news.html`
2. **취재수첩**: `template-notebook.html`
3. **권익보호**: `template-rights.html`
4. **인터뷰**: `template-interview.html`
5. **칼럼**: `template-column.html`
6. **속보**: `template-breaking.html`

각 템플릿에는:
- 제목 자리
- 날짜/기자 이름/리드 문단
- 해당 카테고리 특성에 맞는 소제목 구조
가 이미 준비되어 있습니다.

---

## 3. 새 기사 만드는 전체 흐름 (요약)

새 기사를 만들 때의 전체 단계는 공통적으로 다음과 같습니다.

1. **맞는 템플릿 복사 → 새 HTML 파일 생성**
2. **복사한 HTML 안의 내용(제목/날짜/본문)을 작성**
3. **`news.json`에 새 기사 정보를 1개 추가**
4. **(Git 사용 시) 커밋 후 푸시 → Netlify가 자동 배포**
5. **(Git 미사용 시) `npm run build` → `nogadanews_publish`를 Netlify에 업로드**

아래에서 각 단계를 상세히 설명합니다.

---

## 4. 새 기사 작성 – 단계별 자세한 설명

### 4-1. 템플릿 복사해서 새 HTML 파일 만들기

1. 파일 탐색기에서 `article_pages` 폴더로 이동합니다.
2. 카테고리에 맞는 템플릿을 고릅니다. 예:
   - 현장소식: `template-site-news.html`
   - 속보: `template-breaking.html`
3. 해당 파일을 **복사(Ctrl+C) → 붙여넣기(Ctrl+V)** 해서 새 파일로 만듭니다.
4. 새 파일 이름을 규칙에 맞게 변경합니다. 예:
   - `nogada-2026-02-11-001.html`
   - 패턴 예시: `카테고리-YYYY-MM-DD-번호.html`

> 파일명은 자유지만, 나중에 `id`와 `articleUrl`를 맞추기 편하도록  
> 날짜+번호 형식으로 지어두는 것을 추천합니다.

### 4-2. HTML 내용 수정하기

코드 에디터(Visual Studio Code, Cursor 등)에서 방금 만든 HTML 파일을 엽니다.

1. `<title>…</title>` 안의 텍스트를 실제 기사 제목에 맞게 수정
2. 페이지 안의:
   - 제목 (`<h1>` 태그)
   - 날짜/기자 이름 부분
   - 리드(요약) 문단
   - 본문(소제목, 문단, 리스트, 인용구 등)
   을 알맞게 채웁니다.

**주의사항**
- `<html>`, `<head>`, `<body>` 같은 큰 구조는 그대로 두고,  
  텍스트와 문단 위주로만 수정하는 것이 안전합니다.
- 템플릿 안에 있는 안내 문구(“제목을 입력하세요”, “여기에 내용을 쓰세요” 등)를 실제 내용으로 모두 교체합니다.

---

## 5. `news.json`에 기사 등록하기

새 HTML만 추가하면 사이트가 자동으로 알지는 못합니다.  
메인/뉴스룸/상세 페이지에서 기사를 보려면 **`news.json`의 `articles` 배열에 새 객체를 추가**해야 합니다.

### 5-1. `news.json` 구조

대략 이런 형태입니다:

```json
{
  "articles": [
    {
      "id": "notice-001",
      "category": "창간특집",
      "cover": "assets/thumbs/launch.jpg",
      "title": "...",
      "excerpt": "...",
      "date": "2026-02-05",
      "readTime": "3분",
      "articleUrl": "/article_pages/notice-001.html"
    }
    // ... 더 많은 기사들
  ]
}
```

### 5-2. 새 항목 추가 예시

예를 들어, 새 속보 기사 HTML 파일을  
`article_pages/nogada-2026-02-11-001.html` 로 만들었다면,

`news.json`의 `articles` 배열 안(필요하면 제일 위)에 다음 객체를 추가합니다:

```json
{
  "id": "nogada-2026-02-11-001",
  "category": "속보",
  "cover": "assets/thumbs/breaking.jpg",
  "title": "수도권 OO공사 현장, 추가 안전 점검으로 부분 통제 지속",
  "excerpt": "지반 침하 징후가 재차 확인되면서, OO공사 현장의 일부 구간 통제가 연장됐습니다.",
  "date": "2026-02-11",
  "readTime": "1분",
  "articleUrl": "/article_pages/nogada-2026-02-11-001.html"
}
```

**필드 설명**
- `id`: 기사 고유 아이디.  
  - 나중에 상세 페이지 주소: `article.html?id=이값` 으로 사용됩니다.
  - 보통 파일명과 비슷하게 맞추면 관리하기 좋습니다.
- `category`: 카테고리 이름 (예: `현장소식`, `취재수첩`, `권익보호`, `인터뷰`, `칼럼`, `속보`)
- `cover`: 메인/리스트에 쓸 썸네일 이미지 경로  
  - 예: `assets/thumbs/breaking.jpg`
- `title`: 기사 제목
- `excerpt`: 한두 문장 요약
- `date`: 공개 날짜 (예: `"2026-02-11"`)
- `readTime`: 읽는 데 걸리는 대략의 시간 (예: `"3분"`)
- `articleUrl`: 실제 HTML 파일 경로  
  - 항상 `/article_pages/파일명.html` 형태로 입력합니다.

**주의사항**
- JSON 문법에 맞게 쉼표(,)를 확인합니다.
  - 마지막 항목 뒤에는 쉼표가 오면 안 됩니다.
- `id`는 기존 글과 겹치지 않게 설정합니다.

---

## 6. 로컬에서 결과 확인 (선택)

정적 HTML이기 때문에, 단순히 `index.html`을 더블 클릭해서 열어보면  
대부분의 내용은 보이지만, **`fetch("news.json")` 를 사용하는 부분은 브라우저 보안 때문에 안 될 수 있습니다.**

가장 정확하게 보려면:

1. 간단한 로컬 서버를 띄우거나
2. Netlify에 올렸을 때 사이트에서 확인하는 것이 좋습니다.

(필요하면 추후 로컬 미니 서버 사용법도 별도 문서로 정리 가능합니다.)

---

## 7. 배포(Deploy) 방법 정리

### 7-1. Git으로 연결된 경우 (추천)

1. 변경 내용 확인
   - 새 HTML 파일 (`article_pages/…`)
   - 수정된 `news.json`

2. Git 커밋
   ```bash
   git add .
   git commit -m "Add article: nogada-2026-02-11-001"
   ```

3. 원격 저장소로 푸시
   ```bash
   git push
   ```

4. Netlify가 자동으로 새 버전을 빌드/배포합니다.

### 7-2. Git을 쓰지 않고 폴더 업로드로만 운영할 때

1. 터미널(또는 PowerShell)에서 프로젝트 폴더로 이동
2. 빌드 실행
   ```bash
   npm run build
   ```
   - 성공하면 `nogadanews_publish` 폴더가 새로 생성/갱신됩니다.

3. Netlify 대시보드 접속 → 해당 사이트 선택
4. 상단 `Deploys` 메뉴 → “Deploys” 페이지
5. “Deploys” 화면에서:
   - “Deploy site” 또는
   - “Drag and drop your site folder here” 영역에  
     → 로컬의 `nogadanews_publish` 폴더를 통째로 드래그 앤 드롭

이렇게 하면 그 시점의 `index.html`, `article.html`, `article_pages/…`, `news.json` 등이 포함된  
새 버전이 사이트에 바로 반영됩니다.

---

## 8. 자주 하는 실수와 체크리스트

### 8-1. 새 기사가 안 보일 때 점검

1. `news.json`에 새 항목이 실제로 들어갔는지
2. JSON 문법 오류(쉼표, 큰따옴표 등)는 없는지
3. `articleUrl` 경로와 실제 HTML 파일명이 정확히 일치하는지
4. 배포를 다시 했는지 (Git 푸시 또는 `npm run build` + 폴더 업로드)

### 8-2. 상세 페이지에서 “기사 찾을 수 없음”이 뜰 때

1. 브라우저 주소창의 `id` 값 확인  
   - 예: `article.html?id=nogada-2026-02-11-001`
2. `news.json` 안의 `"id"` 값과 정확히 같아야 합니다.
3. 대소문자, 공백, 하이픈(-)까지 모두 일치하는지 확인합니다.

---

## 9. 추천 작업 흐름 (실무용)

1. **기사 구상**
   - 카테고리 결정: 현장소식 / 취재수첩 / 권익보호 / 인터뷰 / 칼럼 / 속보
2. **템플릿 복사**
   - 해당 템플릿 파일을 복사해서 `article_pages/새파일.html` 생성
3. **내용 작성**
   - 제목, 리드, 본문, 날짜/기자 이름까지 HTML 안에서 작성·수정
4. **`news.json` 등록**
   - 적절한 `id` 정하기 (파일명과 비슷하게)
   - `category`, `title`, `excerpt`, `date`, `readTime`, `articleUrl` 입력
5. **배포**
   - Git 사용 시: 커밋 + 푸시
   - Git 미사용 시: `npm run build` 후 `nogadanews_publish` 폴더를 Netlify에 업로드
6. **검수**
   - 메인 페이지 “최신 뉴스 3”에 잘 노출되는지
   - 뉴스룸(별도 페이지가 있다면)에서 목록이 잘 보이는지
   - `article.html?id=새_id` 로 상세 페이지가 잘 뜨는지 확인

---

이 문서를 출력해서 **편집실 매뉴얼**처럼 사용하셔도 됩니다.  
추가로 자동화(예: 스크립트로 `news.json`에 자동 추가)나 카테고리 확장 등이 필요하면,  
이 문서를 기준으로 다음 단계 작업을 설계할 수 있습니다.

