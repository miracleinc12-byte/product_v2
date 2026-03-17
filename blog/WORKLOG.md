# Worklog

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