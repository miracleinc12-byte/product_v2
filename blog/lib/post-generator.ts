import { prisma } from "@/lib/prisma";
import { fetchNews, CATEGORY_MAP } from "@/lib/news-fetcher";
import { fetchGoogleTrends, matchTrendToCategory } from "@/lib/trending-fetcher";
import { generateArticle, insertImages } from "@/lib/ai-writer";
import { fetchBodyImages } from "@/lib/image-fetcher";
import type { NewsArticle } from "@/lib/news-fetcher";

export interface GenerateSettings {
  geminiKey?: string;
  newsKey?: string;
  unsplashKey?: string;
  articleLength?: number;
}

export interface GenerateResult {
  category: string;
  title: string;
  status: string;
  images?: number;
}

type EnrichedArticle = NewsArticle & { _trend?: string; _topicImages: string[] };

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const id = Date.now().toString(36);
  return base ? `${base}-${id}` : `post-${id}`;
}

function extractKeywords(s: string): string[] {
  return s
    .replace(/[^가-힣a-z0-9\s]/gi, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function isSimilarKorean(a: string, b: string): boolean {
  const ka = new Set(extractKeywords(a));
  const kb = new Set(extractKeywords(b));
  if (!ka.size || !kb.size) return false;
  let overlap = 0;
  for (const w of ka) if (kb.has(w)) overlap++;
  const ratio = overlap / Math.min(ka.size, kb.size);
  return ratio >= 0.35;
}

function collectTopicImages(articles: NewsArticle[], exclude?: string | null): string[] {
  const seen = new Set<string>(exclude ? [exclude] : []);
  const images: string[] = [];
  for (const a of articles) {
    if (a.urlToImage && !seen.has(a.urlToImage)) {
      seen.add(a.urlToImage);
      images.push(a.urlToImage);
    }
  }
  return images;
}

type OnProgress = (data: Record<string, unknown>) => void;

export async function generateForCategory(
  category: string,
  settings: GenerateSettings,
  onProgress: OnProgress
): Promise<GenerateResult> {
  const articleLength = settings.articleLength ?? 2000;

  onProgress({ step: "기존 기사 목록 로드 중..." });

  const cutoff = new Date(Date.now() - 14 * 86400000);
  const recentPosts = await prisma.post.findMany({
    where: { category, createdAt: { gte: cutoff } },
    select: { title: true, usedUrl: true },
  });
  const usedUrls = new Set(recentPosts.map((p) => p.usedUrl).filter(Boolean) as string[]);
  const existingTitles = recentPosts.map((p) => p.title);

  onProgress({ step: "Google Trends 인기 검색어 수집 중..." });

  const trends = await fetchGoogleTrends("KR");
  const matchedTrends = trends.filter((t) => matchTrendToCategory(t.keyword) === category);

  const candidateArticles: EnrichedArticle[] = [];
  const seenUrls = new Set<string>();

  if (matchedTrends.length > 0) {
    onProgress({
      step: `카테고리 매칭 트렌드 ${matchedTrends.length}건: "${matchedTrends.slice(0, 3).map((t) => t.keyword).join('", "')}"`,
    });
    for (const trend of matchedTrends.slice(0, 5)) {
      const articles = await fetchNews(category, settings.newsKey, 8, trend.keyword);
      // 같은 트렌드 주제의 기사 이미지를 모두 수집
      const topicImages = collectTopicImages(articles);

      for (const a of articles) {
        if (!seenUrls.has(a.url) && !usedUrls.has(a.url)) {
          candidateArticles.push({ ...a, _trend: trend.keyword, _topicImages: topicImages });
          seenUrls.add(a.url);
        }
      }
      if (candidateArticles.length >= 10) break;
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  if (candidateArticles.length < 3) {
    const catKeyword = CATEGORY_MAP[category]?.keywords ?? category;
    onProgress({ step: `카테고리 키워드 "${catKeyword}"로 뉴스 검색 중...` });
    const fallbackArticles = await fetchNews(category, settings.newsKey, 10);
    const topicImages = collectTopicImages(fallbackArticles);
    for (const a of fallbackArticles) {
      if (!seenUrls.has(a.url) && !usedUrls.has(a.url)) {
        candidateArticles.push({ ...a, _topicImages: topicImages });
        seenUrls.add(a.url);
      }
    }
  }

  if (candidateArticles.length === 0) {
    return { category, title: "-", status: "새로운 뉴스 없음 (최근 7일 내 뉴스 없음)" };
  }

  for (const article of candidateArticles.slice(0, 5)) {
    const trendKeyword = article._trend;
    const publishedDate = new Date(article.publishedAt).toLocaleDateString("ko-KR");
    onProgress({
      step: `"${trendKeyword ?? article.title.slice(0, 25)}" 기사 작성 중... (${publishedDate})`,
    });

    let generated;
    try {
      generated = await generateArticle(
        article,
        category,
        settings.geminiKey,
        articleLength,
        trendKeyword
      );
    } catch (err) {
      onProgress({
        step: `생성 실패, 다음 뉴스 시도 중... (${err instanceof Error ? err.message.slice(0, 40) : "오류"})`,
      });
      continue;
    }

    const isDuplicate = existingTitles.some((t) => isSimilarKorean(t, generated.title));
    if (isDuplicate) {
      const matched = existingTitles.find((t) => isSimilarKorean(t, generated.title));
      onProgress({ step: `중복 감지 ("${matched?.slice(0, 20)}..."), 다음 뉴스로 재시도...` });
      usedUrls.add(article.url);
      existingTitles.push(generated.title);
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }

    onProgress({ step: "이미지 수집 중..." });

    // 썸네일: 해당 기사 이미지 우선
    const thumbnailUrl = article.urlToImage ?? null;

    // 본문 이미지: 같은 주제 뉴스 기사들의 실제 이미지 사용 (썸네일 제외)
    const newsBodyImages = collectTopicImages(candidateArticles, thumbnailUrl).slice(0, 3);

    // 뉴스 이미지가 부족할 때만 Unsplash로 보완
    let bodyImages = [...newsBodyImages];
    if (bodyImages.length < 2 && settings.unsplashKey) {
      const unsplashImgs = await fetchBodyImages(
        generated.tags,
        generated.title,
        settings.unsplashKey,
        2 - bodyImages.length
      );
      bodyImages = [...bodyImages, ...unsplashImgs];
    }
    bodyImages = bodyImages.slice(0, 3);

    const contentWithImages = insertImages(generated.content, bodyImages);

    await prisma.post.create({
      data: {
        title: generated.title,
        slug: makeSlug(generated.title),
        summary: generated.summary,
        content: contentWithImages,
        category,
        tags: generated.tags,
        thumbnail: thumbnailUrl,
        usedUrl: article.url,
        published: true,
      },
    });

    return {
      category,
      title: generated.title,
      status: `게시 완료 (뉴스이미지 ${newsBodyImages.length}장 + 썸네일${thumbnailUrl ? " 있음" : " 없음"})`,
      images: bodyImages.length + (thumbnailUrl ? 1 : 0),
    };
  }

  return { category, title: "-", status: "중복으로 인해 게시 불가 (새 뉴스 소진)" };
}
