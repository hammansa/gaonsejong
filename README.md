# gaonsejong
nurion holdings
# 🚀 가온세종 (GAON SEJONG)
**위성·6G·AI 인프라 전문 콘텐츠 플랫폼**

가온세종은 위성통신(LEO), 6G, AI 정책과 산업의 연결을 빠르고 정확하게 정리하여 전달하는 인터넷 신문사 사이트입니다. 

## 🌐 바로가기
- **도메인**: [https://gsnews.netlify.app](https://gsnews.netlify.app)
- **제휴 및 문의**: [카카오 오픈채팅](https://open.kakao.com/0/gYojhMci)

## 🛠 주요 기능 및 특징
- **데이터 기반 렌더링**: `news.json`과 `docs.json` 파일을 수정하는 것만으로 기사와 자료실 목록을 자동으로 업데이트할 수 있는 구조입니다.
- **반응형 디자인**: PC와 모바일 어디서든 최적화된 화면을 제공합니다.
- **스페이스 테마**: Orbitron 폰트와 우주 배경 비디오/그래픽을 활용한 미래지향적 UI/UX가 적용되었습니다.

## 📂 파일 구조 및 관리 방법
- `index.html`: 메인 페이지 (최신 기사 6개 자동 노출)
- `newsroom.html`: 전체 기사 목록 및 검색/필터링 페이지
- `article.html`: 기사 상세 페이지 (URL 파라미터 `?id=`를 통해 기사 로드)
- `docs.html`: IR 자료 및 백서 자료실
- `assets/`: 로고, 영상, PDF 등 미디어 자원 폴더
- **핵심 데이터 파일**:
  - `news.json`: 기사 제목, 요약, 본문(HTML) 관리
  - `docs.json`: 자료실 카테고리 및 PDF 파일 경로 관리

## 🚀 운영 가이드
1. **기사 추가**: `news.json`의 `articles` 배열에 새로운 객체를 추가합니다.
2. **자료 추가**: PDF 파일을 `assets/docs/`에 업로드한 후 `docs.json`에 경로를 등록합니다.
3. **배포**: GitHub 저장소에 Push하면 연결된 Netlify를 통해 자동으로 실시간 반영됩니다.

---
© 2026 GAON SEJONG. 발행인 박상현 · 지주회사 누리온홀딩스
