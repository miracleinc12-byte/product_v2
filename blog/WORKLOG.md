# Worklog

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

