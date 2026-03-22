import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { fetchNews, CATEGORY_MAP } from "@/lib/news-fetcher";
import { fetchGoogleTrends, matchTrendToCategory, type TrendingKeyword } from "@/lib/trending-fetcher";
import { generateArticle, insertImages, type GeneratedPost } from "@/lib/ai-writer";
import { fetchBodyImages } from "@/lib/image-fetcher";
import type { NewsArticle } from "@/lib/news-fetcher";

export interface GenerateSettings {
  geminiKey?: string;
  newsKey?: string;
  unsplashKey?: string;
  openAiKey?: string;
  articleLength?: number;
  triggerType?: "manual" | "cron";
  publishMode?: "auto" | "draft";
}

export interface GenerateResult {
  category: string;
  title: string;
  status: string;
  images?: number;
  published?: boolean;
  jobId?: number;
  draftId?: number;
  postId?: number;
  sourceArticleId?: number;
}

type EnrichedArticle = NewsArticle & { _trend?: string; _topicImages: string[]; _sourceArticleId?: number };
type OnProgress = (data: Record<string, unknown>) => void;

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

function extractKeywords(value: string): string[] {
  return value
    .replace(/[^가-힣a-z0-9\s]/gi, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function keywordOverlapRatio(a: string, b: string): number {
  const ka = new Set(extractKeywords(a));
  const kb = new Set(extractKeywords(b));
  if (!ka.size || !kb.size) return 0;

  let overlap = 0;
  for (const word of ka) {
    if (kb.has(word)) overlap++;
  }

  return overlap / Math.min(ka.size, kb.size);
}

function isSimilarKorean(a: string, b: string): boolean {
  return keywordOverlapRatio(a, b) >= 0.35;
}

function collectTopicImages(articles: NewsArticle[], exclude?: string | null): string[] {
  const seen = new Set<string>(exclude ? [exclude] : []);
  const images: string[] = [];
  for (const article of articles) {
    if (article.urlToImage && !seen.has(article.urlToImage)) {
      seen.add(article.urlToImage);
      images.push(article.urlToImage);
    }
  }
  return images;
}

function safeDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function hashSourceArticle(article: NewsArticle): string {
  return createHash("sha1")
    .update([article.title, article.description ?? "", article.content ?? "", article.url].join("|"))
    .digest("hex");
}

function parseTrafficScore(trend: TrendingKeyword): number | undefined {
  const digits = trend.traffic.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  return Number.parseInt(digits, 10);
}

function calculateQualityScore(post: GeneratedPost, articleLength: number): number {
  const titleScore = Math.min(post.title.trim().length / 28, 1) * 20;
  const summaryScore = Math.min(post.summary.trim().length / 120, 1) * 20;
  const contentScore = Math.min(post.content.trim().length / articleLength, 1) * 50;
  const tagScore = Math.min(post.tags.split(",").filter(Boolean).length / 4, 1) * 10;
  return Math.round((titleScore + summaryScore + contentScore + tagScore) * 10) / 10;
}

function parseExcludedKeywords(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function ensureAutomationRule(category: string, articleLength: number) {
  return prisma.automationRule.upsert({
    where: { category },
    update: {},
    create: {
      category,
      targetLength: articleLength,
      publishMode: "auto",
      requireReview: false,
    },
  });
}

async function upsertSourceArticle(article: NewsArticle, category: string) {
  return prisma.sourceArticle.upsert({
    where: { sourceUrl: article.url },
    update: {
      sourceName: article.source.name,
      title: article.title,
      summary: article.description ?? null,
      content: article.content ?? null,
      category,
      imageUrl: article.urlToImage,
      publishedAt: safeDate(article.publishedAt),
      contentHash: hashSourceArticle(article),
      fetchedAt: new Date(),
    },
    create: {
      sourceName: article.source.name,
      sourceUrl: article.url,
      title: article.title,
      summary: article.description ?? null,
      content: article.content ?? null,
      category,
      imageUrl: article.urlToImage,
      publishedAt: safeDate(article.publishedAt),
      contentHash: hashSourceArticle(article),
      fetchedAt: new Date(),
    },
  });
}

async function recordTrendKeywords(category: string, trends: TrendingKeyword[]) {
  for (const trend of trends.slice(0, 10)) {
    await prisma.trendKeyword.create({
      data: {
        keyword: trend.keyword,
        category,
        score: parseTrafficScore(trend),
        collectedAt: new Date(),
      },
    });
  }
}

export async function generateForCategory(
  category: string,
  settings: GenerateSettings,
  onProgress: OnProgress
): Promise<GenerateResult> {
  const fallbackArticleLength = settings.articleLength ?? 2000;
  const rule = await ensureAutomationRule(category, fallbackArticleLength);

  if (!rule.enabled) {
    return { category, title: "-", status: "Automation disabled for category" };
  }

  const articleLength = rule.targetLength ?? fallbackArticleLength;
  const publishMode = settings.publishMode ?? (rule.publishMode === "draft" ? "draft" : "auto");
  const excludedKeywords = parseExcludedKeywords(rule.excludedKeywords);
  const triggerType = settings.triggerType ?? "manual";

  const job = await prisma.generationJob.create({
    data: {
      category,
      status: "running",
      triggerType,
      publishMode,
      articleLength,
    },
  });

  try {
    onProgress({ step: "Loading recent posts and generation history...", jobId: job.id });

    const cutoff = new Date(Date.now() - 14 * 86400000);
    const recentPosts = await prisma.post.findMany({
      where: { category, createdAt: { gte: cutoff } },
      select: { title: true, usedUrl: true },
    });
    const usedUrls = new Set(recentPosts.map((post) => post.usedUrl).filter(Boolean) as string[]);
    const existingTitles = recentPosts.map((post) => post.title);

    onProgress({ step: "Collecting trend keywords...", jobId: job.id });

    const trends = await fetchGoogleTrends("KR");
    const matchedTrends = trends.filter((trend) => matchTrendToCategory(trend.keyword) === category);

    if (matchedTrends.length > 0) {
      await recordTrendKeywords(category, matchedTrends);
    }

    const candidateArticles: EnrichedArticle[] = [];
    const seenUrls = new Set<string>();

    if (matchedTrends.length > 0) {
      onProgress({
        step: `Matched ${matchedTrends.length} trends for ${category}`,
        trends: matchedTrends.slice(0, 5).map((trend) => trend.keyword),
        jobId: job.id,
      });

      for (const trend of matchedTrends.slice(0, 5)) {
        const articles = await fetchNews(category, settings.newsKey, 8, trend.keyword);
        const topicImages = collectTopicImages(articles);

        for (const article of articles) {
          if (!seenUrls.has(article.url) && !usedUrls.has(article.url)) {
            candidateArticles.push({ ...article, _trend: trend.keyword, _topicImages: topicImages });
            seenUrls.add(article.url);
          }
        }

        if (candidateArticles.length >= 10) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (candidateArticles.length < 3) {
      const catKeyword = CATEGORY_MAP[category]?.keywords ?? category;
      onProgress({ step: `Fallback article search for ${catKeyword}`, jobId: job.id });
      const fallbackArticles = await fetchNews(category, settings.newsKey, 10);
      const topicImages = collectTopicImages(fallbackArticles);

      for (const article of fallbackArticles) {
        if (!seenUrls.has(article.url) && !usedUrls.has(article.url)) {
          candidateArticles.push({ ...article, _topicImages: topicImages });
          seenUrls.add(article.url);
        }
      }
    }

    if (candidateArticles.length === 0) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "no_candidates", finishedAt: new Date(), error: "No recent source articles found" },
      });
      return { category, title: "-", status: "No recent source articles found", jobId: job.id };
    }

    for (const article of candidateArticles) {
      const sourceArticle = await upsertSourceArticle(article, category);
      article._sourceArticleId = sourceArticle.id;
    }

    for (const article of candidateArticles.slice(0, 5)) {
      const trendKeyword = article._trend;
      const sourceArticleId = article._sourceArticleId;
      const publishedDate = safeDate(article.publishedAt)?.toLocaleDateString("ko-KR") ?? "unknown";

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          selectedTrend: trendKeyword,
          selectedTitle: article.title,
          sourceArticleId,
        },
      });

      onProgress({
        step: `Generating article from ${trendKeyword ?? article.title.slice(0, 40)}`,
        sourceArticleId,
        publishedDate,
        jobId: job.id,
      });

      let generated: GeneratedPost;
      try {
        generated = await generateArticle(article, category, settings.geminiKey, articleLength, trendKeyword);
      } catch (error) {
        onProgress({
          step: `Generation failed, trying next candidate: ${error instanceof Error ? error.message : String(error)}`,
          jobId: job.id,
        });
        continue;
      }

      if (excludedKeywords.some((keyword) => generated.title.toLowerCase().includes(keyword))) {
        onProgress({ step: `Excluded keyword matched in title: ${generated.title}`, jobId: job.id });
        continue;
      }

      const duplicateScore = existingTitles.reduce((max, title) => Math.max(max, keywordOverlapRatio(title, generated.title)), 0);
      if (duplicateScore >= 0.35 || existingTitles.some((title) => isSimilarKorean(title, generated.title))) {
        const matched = existingTitles.find((title) => isSimilarKorean(title, generated.title));
        onProgress({ step: `Duplicate candidate skipped: ${matched ?? generated.title}`, jobId: job.id, duplicateScore });
        usedUrls.add(article.url);
        existingTitles.push(generated.title);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      onProgress({ step: "Collecting images and preparing draft...", sourceArticleId, jobId: job.id });

      let thumbnailUrl = article.urlToImage ?? null;
      let bodyImages = collectTopicImages(candidateArticles, thumbnailUrl).slice(0, 3);

      // Generate a high-quality DALL-E image if key is provided and we want a unique cover
      if (settings.openAiKey) {
        onProgress({ step: "Generating DALL-E image for thumbnail...", jobId: job.id });
        const { fetchImage } = await import('@/lib/image-fetcher');
        const dalleImage = await fetchImage(generated.tags.split(',')[0] ?? "News", generated.title, {
          openAiKey: settings.openAiKey,
          unsplashKey: settings.unsplashKey
        });
        
        if (dalleImage) {
          // If we successfully generated a DALL-E image, make it the main thumbnail
          // and push the original news thumbnail down to the body images.
          if (thumbnailUrl) {
            bodyImages.unshift(thumbnailUrl);
          }
          thumbnailUrl = dalleImage;
        }
      }

      if (bodyImages.length < 2 && settings.unsplashKey) {
        const { fetchBodyImages } = await import('@/lib/image-fetcher');
        const unsplashImages = await fetchBodyImages(
          generated.tags,
          generated.title,
          settings.unsplashKey,
          2 - bodyImages.length
        );
        bodyImages = [...bodyImages, ...unsplashImages];
      }
      bodyImages = bodyImages.slice(0, 3);

      const contentWithImages = insertImages(generated.content, bodyImages);
      const qualityScore = calculateQualityScore({ ...generated, content: contentWithImages }, articleLength);
      const needsReview = publishMode !== "auto" || rule.requireReview || qualityScore < 65;

      const draft = await prisma.generatedDraft.create({
        data: {
          title: generated.title,
          summary: generated.summary,
          content: contentWithImages,
          tags: generated.tags,
          category,
          status: needsReview ? "review" : "published",
          qualityScore,
          duplicateScore,
          reviewNotes: needsReview ? "Manual review required before publishing" : null,
          thumbnail: thumbnailUrl,
          sourceArticleId,
          generationJobId: job.id,
        },
      });

      let postId: number | undefined;
      if (!needsReview) {
        const post = await prisma.post.create({
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
            publishedAt: new Date(),
            seoTitle: generated.title,
            seoDescription: generated.summary.slice(0, 160),
            sourceArticleId,
            generationJobId: job.id,
          },
        });
        postId = post.id;

        await prisma.generatedDraft.update({
          where: { id: draft.id },
          data: { postId: post.id, status: "published", reviewNotes: null },
        });
      }

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: needsReview ? "review_required" : "published",
          finishedAt: new Date(),
          sourceArticleId,
          selectedTrend: trendKeyword,
          selectedTitle: generated.title,
        },
      });

      return {
        category,
        title: generated.title,
        status: needsReview ? "Draft created for review" : `Published with ${bodyImages.length + (thumbnailUrl ? 1 : 0)} images`,
        images: bodyImages.length + (thumbnailUrl ? 1 : 0),
        published: !needsReview,
        jobId: job.id,
        draftId: draft.id,
        postId,
        sourceArticleId,
      };
    }

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "skipped", finishedAt: new Date(), error: "All candidates rejected or duplicate" },
    });

    return {
      category,
      title: "-",
      status: "All candidates were rejected or detected as duplicates",
      jobId: job.id,
    };
  } catch (error) {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
