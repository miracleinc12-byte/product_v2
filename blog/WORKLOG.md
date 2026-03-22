# Worklog

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
