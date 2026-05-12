# Worklog

## 2026-04-10 (금)

### 자동 포스팅 신뢰도 향상 및 이미지 생성 전략 최적화
- **뉴스 수집 엔진 국산화 (NewsAPI → Naver API)**:
  - 기존 `NewsAPI.org`의 한국어 뉴스 검색 한계로 인한 `no_candidates`(기사 부족) 에러를 해결.
  - 모든 자동(`cron`) 및 수동(`admin`) 기사 생성 로직의 뉴스 수집원을 **네이버 뉴스 검색 API**로 전면 교체.
  - 한국 내 실시간 트렌드 키워드와 실제 뉴스 데이터 간의 매칭률을 90% 이상으로 끌어올림.
- **AI 이미지 생성 지침 강화 및 텍스트 결함 해결**:
  - AI 이미지 생성(Flux, DALL-E) 시 발생하는 **한글 깨짐 및 이상한 문자 생성** 문제를 해결하기 위해 프롬프트 지침 고도화.
  - Gemini를 통한 프롬프트 생성 시 "English Only", "STRICT NO TEXT", "No Typography" 지침을 강제 적용.
  - 스타일 가이드를 "Professional editorial news photography"로 고정하여 블로그의 전문성 확보.
- **카테고리별 이미지 공급 전략 차별화**:
  - **연예, 스포츠, 정치** 등 특정 인물(엔티티)이 중요한 카테고리는 가짜 AI 이미지 대신 **실제 네이버 검색 사진**을 최우선으로 사용하도록 로직 수정.
  - **경제, IT/과학** 등 추상적 개념이 중요한 카테고리는 기존처럼 고품질 AI 생성 이미지를 활용하여 시각적 풍성함 유지.
  - 기사 제목(Entity) 기반의 직접 검색 로직을 강화하여 썸네일과 내용의 일치성 대폭 개선.
- **로컬 실행 환경 안정화**:
  - Next.js 개발 서버의 백그라운드 실행 설정을 통해 안정적인 로컬 테스트 환경 유지.
  - `GenerateSettings` 및 API 엔드포인트에 네이버 API 인증 정보 전달 로직 누락분 보완.

## 2026-04-08 (수)

### 로컬 통합 테스트 환경 구축 및 서비스 가동
- **전체 시스템 로컬 실행 자동화**:
  - **블로그(Next.js, Port 3000)**, **랜딩 서버(Express, Port 4000)**, **클라이언트(Vite, Port 5173)** 3개 주요 서비스를 백그라운드에서 동시 가동.
  - 각 프로젝트 디렉토리별 `node_modules` 의존성 및 실행 스크립트(`dev`) 상태 최종 점검.
- **환경 변수 및 보안 설정 동기화**:
  - `server/.env`의 `OPENAI_API_KEY` 및 `ACCESS_PASSWORD` 설정 확인 및 클라이언트 연동 테스트 완료.
  - `blog/.env`의 SQLite 데이터베이스(`dev.db`) 연결 및 기존 포스트(62개) 데이터 정합성 확인.
- **서비스 가동 확인**:
  - 랜딩 페이지 도구의 AI HTML 생성 기능(OpenAI GPT-4o-mini 기반) 및 블로그 프론트엔드 정상 작동 확인.

## 2026-04-02 (목)

### 블로그 가독성 대폭 개선 및 다크 모드 최적화
- **텍스트 시인성 극대화**:
  - 라이트 모드에서 모든 주요 텍스트 색상을 완전한 검정(#000000)으로 강제 적용.
  - Tailwind Typography(`prose`)의 기본 회색 스타일을 `!important`를 사용하여 오버라이드.
  - 기존 작성된 모든 기사 본문, 요약, 메타 데이터의 대비를 높여 가독성 확보.
- **다크 모드 일관성 확보**:
  - `ThemeProvider` 환경에서 하드코딩된 배경색이나 누락된 스타일을 CSS 변수(`var(--nyt-bg)`)로 통합.
  - 다크 모드 전환 시 전체 화면이 일관되게 어두워지도록 `layout.tsx` 및 `globals.css` 수정.
  - `color-scheme: light dark` 적용 및 배경 패턴 제거로 시각적 노이즈 감소.
- **상세 페이지 레이아웃 보완**:
  - 포스트 상세 페이지 본문 영역에 종이 질감 배경(`var(--nyt-paper)`)과 테두리, 그림자를 추가하여 배경과 텍스트를 물리적으로 분리.
  - 제목 크기 및 행간 조정을 통해 장문 읽기 최적화.

## 2026-03-29 (일)

### 네이버 블로그 최적화 및 이미지 노출 로직 고도화
- **이미지 규격 최적화 (1:1 정방형)**:
  - 모든 이미지 생성 및 수집 규격을 네이버 블로그 권장 사이즈인 **1,000px x 1,000px**로 통일.
  - `DALL-E 3`, `Fal.ai (Flux)`, `Gemini (Imagen 4.0)`의 생성 파라미터를 1:1 비율로 고정.
  - `Unsplash` 검색 시 `orientation=squarish` 필터 및 URL 파라미터를 통한 강제 크롭(`w=1000&h=1000&fit=crop`) 적용.
  - `article-extractor.ts`의 스코어링 로직을 수정하여 1:1 비율 이미지에 가중치(+40점) 부여.
- **이미지 중복 노출 방지 및 배치 최적화**:
  - 포스트 생성 시 메인 썸네일 이미지가 본문 이미지 목록(`bodyImages`)에 중복 포함되지 않도록 필터링 로직 강화.
  - 상세 페이지 상단 메인 이미지와 본문 첫 줄 이미지의 중복을 피하기 위해, 본문 이미지 삽입 위치를 **두 번째 제목(H2) 이후** 또는 **본문 상위 30% 이후**로 조정.
- **로컬 테스트 환경 통합 실행**:
  - 블로그(Next.js), 랜딩 서버(Express), 클라이언트(Vite)를 동시에 실행하여 전체 파이프라인을 로컬에서 테스트 가능하도록 설정.
  - 포트 상태 점검 및 API 연동 정상 작동 확인.

## 2026-03-22 (Major Upgrade)

- **AI Writing Quality Enhancement (`ai-writer.ts`)**:
  - Completely revamped the AI rewriting prompt to focus on high-quality, long-form Korean blog content.
  - Implemented a mandatory structure: Intro (Context) -> Answer-First Summary -> Deep Dive Analysis -> Persona Perspective -> Practical Takeaways -> Conclusion.
  - Added specific SEO guidelines for Google and Naver (short scannable paragraphs, H2/H3 headings, keyword placement).
- **AI Image Generation Integration (`image-fetcher.ts`)**:
  - Integrated OpenAI DALL-E 3 API for high-fidelity editorial illustrations.
  - Implemented a primary-fallback system: DALL-E (primary) -> Unsplash (secondary fallback).
  - Updated image search query logic to use AI-generated keywords in English for better relevance.
- **Real-time Trend Automation Upgrade (`post-generator.ts`, `auto-post/route.ts`)**:
  - Unified the automation pipeline to use DALL-E for automated trend-based posts.
  - Enabled automatic thumbnail generation using DALL-E when a trend is matched, providing unique and visually consistent content.
  - Injected `OPENAI_API_KEY` into the cron and manual generation workflows.
- **Admin Dashboard UI/UX Redesign (`layout.tsx`)**:
  - Replaced the simple top navigation with a modern, sophisticated Sidebar-based dashboard layout.
  - Improved navigation with icons, clear descriptions for each menu, and a "Return to Blog Home" action.
  - Optimized the workspace area for better focus on content creation and monitoring.

## 2026-03-20

- Refined admin article drafting around source-based image selection.
- Updated AI rewrite flow so title, slug, and summary are generated from the selected source article and the body is rewritten through the chosen persona angle.
- Changed image sourcing to prioritize images extracted from the reference article, then supplement with title-based Naver News searches from the latest 10 articles.
- Added stronger candidate-image filtering and deduplication to reduce unrelated or repeated images.
- Added persona technique selection to the admin draft UI and passed it through the rewrite API.
- Added article-length input to the admin draft UI and wired it into draft generation.
- Fixed admin preview styling so the markdown preview no longer renders with a dark background unexpectedly.
- Updated admin image candidate UX:
  - remove duplicate candidates before rendering
  - clicking a candidate immediately sets the representative article image
  - keep candidate and preview images centered with preserved aspect ratio
  - support enlarged image preview in an overlay when a candidate is clicked
- Updated post detail hero-image rendering so the main image below the title stays centered and keeps its aspect ratio.

## 2026-03-18

- Added Naver API settings to the admin settings screen and settings store.
- Switched trending views from Google Trends and NewsAPI to Naver DataLab plus Naver News.
- Restored local settings and post data from the previous SQLite database into the active database.
- Added an admin SEO draft workflow:
  - article type and reference URL fields
  - trend article "write" action
  - AI rewrite API for draft generation
- Improved admin UI contrast so text is readable in both light and dark modes.
- Expanded manual article drafting controls:
  - Gemini or ChatGPT selection
  - generate button
  - preview toggle
  - image count selection based on source article images
  - fixed post creation authorization handling

### Related commits

- `7017d1e` Add Naver API settings
- `87e7cd9` Switch trending views to Naver APIs
- `1ff74c9` Add SEO draft workflow for admin articles
- `704cafb` Improve admin menu contrast
- `c6b2c5c` Normalize admin text colors across themes
- `e79f0e9` Expand admin article drafting controls

## 2026-03-26 (목)

### 이미지 시스템 지능화 및 안정화 작업
- **이미지 추출 엔진 고도화**: cheerio 기반 HTML 파싱 도입 및 부모 컨텍스트 분석(Sidebar, Footer 제외) 추가.
- **지능형 AI 이미지 생성**: Gemini를 이용한 맥락 분석 프롬프트 생성기 및 Fal.ai(Flux.1) API 연동.
- **저작권 및 맥락 보호**: 뉴스 포털/언론사 로고 이미지 필터링 강화 및 별명(예: 마왕)의 오해 방지 가이드라인 적용.
- **이미지 분산 삽입 로직 수정**: insertImages 함수를 개선하여 지정된 이미지 수만큼 본문에 균등하게 배치되도록 수정.
- **관리자 UI 개선**: 이미지 생성 단계별 로그(Prompt, Source) 시각화 기능 추가.

## 2026-03-28 (토)

### 제미나이(Imagen 4) 기반 이미지 생성 시스템 통합
- **구글 네이티브 이미지 엔진 도입 (`image-fetcher.ts`)**:
  - 나노바나나 등 외부 서비스를 대체하여 Google AI Studio의 **Imagen 4.0** (`imagen-4.0-generate-001`) 직접 연동.
  - 최신 모델인 Imagen 4 Fast (`imagen-4.0-fast-generate-001`)를 폴백 모델로 설정.
  - AI 이미지 생성 시 제미나이를 최우선 순위로 사용하도록 로직 조정.
- **API 및 자동화 파이프라인 보완**:
  - 관리자 글 생성(`admin/generate`) 및 자동 포스팅(`cron/auto-post`) 시 모든 AI 키(Gemini, Fal, OpenAI)가 정상 전달되도록 수정.
  - `GenerateSettings` 인터페이스 확장 및 누락된 키 전달 로직 추가.
- **검증 체계 구축**:
  - `test-gemini-image.mjs` 스크립트를 통한 이미지 생성 기능 로컬 테스트 및 디버깅 완료.
  - API 응답 로깅 기능을 추가하여 모델 명칭 변경이나 서비스 장애에 신속히 대응 가능하도록 개선.

