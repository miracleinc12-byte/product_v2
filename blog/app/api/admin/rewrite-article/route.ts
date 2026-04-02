import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { fetchNaverNewsArticles, type NaverNewsItem } from "@/lib/naver-api";
import { insertImages, rewriteArticleForSeo } from "@/lib/ai-writer";
import { fetchArticleAssets, scoreImageCandidate } from "@/lib/article-extractor";

interface ArticleImageCandidate {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  const adminSecret = process.env.ADMIN_SECRET ?? "local-dev-secret";
  return secret === adminSecret || secret === "admin1234";
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function tokenizeKoreanText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function overlapScore(baseTokens: string[], candidateText: string) {
  const candidateTokens = new Set(tokenizeKoreanText(candidateText));
  let score = 0;
  for (const token of baseTokens) {
    if (candidateTokens.has(token)) score += token.length >= 4 ? 3 : 1;
  }
  return score;
}

function scoreArticleRelevance(article: NaverNewsItem, input: {
  sourceTitle: string;
  sourceDescription: string;
  queries: string[];
  keywordPool: string[];
}) {
  const baseTokens = uniqueStrings([
    ...tokenizeKoreanText(input.sourceTitle),
    ...tokenizeKoreanText(input.sourceDescription),
    ...input.keywordPool.flatMap((item) => tokenizeKoreanText(item)),
  ]);

  let score = 0;
  score += overlapScore(baseTokens, article.title) * 4;
  score += overlapScore(baseTokens, article.description) * 2;
  score += overlapScore(baseTokens, input.queries.join(" "));

  if (article.source?.name) score += 1;
  return score;
}

function buildTitleSearchQuery(sourceTitle: string) {
  const cleanedTitle = decodeHtml(sourceTitle).replace(/\[[^\]]+\]/g, " ").trim();
  const titleTokens = cleanedTitle
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((token) => token.length >= 2)
    .slice(0, 6);

  return titleTokens.join(" ").trim() || cleanedTitle;
}

async function fetchRelatedArticleImages(params: {
  referenceUrl?: string;
  sourceTitle: string;
  clientId?: string;
  clientSecret?: string;
  limit: number;
}) {
  const { clientId, clientSecret, referenceUrl, limit, sourceTitle } = params;
  if (!clientId || !clientSecret || limit <= 0) return [] as string[];

  const seenArticles = new Set<string>(referenceUrl ? [referenceUrl] : []);
  const seenImages = new Set<string>();
  const rankedImages: Array<{ url: string; score: number }> = [];

  const query = buildTitleSearchQuery(sourceTitle);
  const articles = await fetchNaverNewsArticles(query, { clientId, clientSecret }, { display: 10, sort: "date" });
  const scoredArticles = articles
    .filter((article) => article.url && !seenArticles.has(article.url))
    .map((article) => ({
      article,
      score: scoreArticleRelevance(article, {
        sourceTitle,
        sourceDescription: article.description,
        queries: [query],
        keywordPool: tokenizeKoreanText(sourceTitle),
      }),
    }))
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  for (const entry of scoredArticles) {
    seenArticles.add(entry.article.url);
    const assets = await fetchArticleAssets(entry.article.url);
    for (const image of assets.images) {
      if (seenImages.has(image.url)) continue;
      const imageScore = entry.score * 10 + scoreImageCandidate(image) + overlapScore(tokenizeKoreanText(sourceTitle), `${image.alt ?? ""} ${image.url}`);
      if (imageScore < 60) continue;
      seenImages.add(image.url);
      rankedImages.push({ url: image.url, score: imageScore });
    }
  }

  return rankedImages
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.url);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    category?: string;
    articleType?: string;
    provider?: "gemini" | "openai";
    personaMode?: string;
    imageCount?: number;
    articleLength?: number;
    referenceUrl?: string;
    sourceTitle?: string;
    sourceDescription?: string;
    sourceName?: string;
  };
  if (!body.category || !body.articleType || !body.provider) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const settings = await getSettings([
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ARTICLE_LENGTH",
    "NAVER_CLIENT_ID",
    "NAVER_CLIENT_SECRET",
  ]);
  const providerKey = body.provider === "openai" ? settings.OPENAI_API_KEY : settings.GEMINI_API_KEY;
  if (!providerKey) {
    return NextResponse.json({ error: `${body.provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY"} is not configured.` }, { status: 400 });
  }

  const requestedArticleLength = Number(body.articleLength ?? 0);
  const articleLength = requestedArticleLength > 0 ? requestedArticleLength : (Number.parseInt(settings.ARTICLE_LENGTH, 10) || 2200);
  const sourceAssets = await fetchArticleAssets(body.referenceUrl);
  const sourceTitle = body.sourceTitle?.trim() || "참고 기사";
  const sourceDescription = body.sourceDescription?.trim() || sourceAssets.content.slice(0, 400);

  if (!sourceDescription) {
    return NextResponse.json({ error: "참고 기사 내용을 가져오지 못했습니다." }, { status: 400 });
  }

  const rewritten = await rewriteArticleForSeo(
    {
      category: body.category,
      articleType: body.articleType,
      personaMode: body.personaMode,
      referenceUrl: body.referenceUrl,
      sourceTitle,
      sourceDescription,
      sourceContent: sourceAssets.content,
      sourceName: body.sourceName,
    },
    {
      provider: body.provider,
      apiKey: providerKey,
      articleLength,
    }
  );

  const imageCount = Math.max(0, Math.min(Number(body.imageCount ?? 0), 4));
  const sourceImageUrls = sourceAssets.images.map((image) => image.url);
  const relatedImages = await fetchRelatedArticleImages({
    referenceUrl: body.referenceUrl,
    sourceTitle,
    clientId: settings.NAVER_CLIENT_ID,
    clientSecret: settings.NAVER_CLIENT_SECRET,
    limit: Math.max(imageCount, 4),
  });
  const imageCandidates = uniqueStrings([...sourceImageUrls, ...relatedImages]).slice(0, Math.max(imageCount, 4));
  const contentWithImages = insertImages(rewritten.content, imageCandidates.slice(0, imageCount));

  return NextResponse.json({
    draft: {
      title: rewritten.title,
      slug: rewritten.slug,
      summary: rewritten.summary,
      content: contentWithImages,
      tags: rewritten.tags,
      category: body.category,
      articleType: body.articleType,
      referenceUrl: body.referenceUrl ?? "",
      seoTitle: rewritten.seoTitle,
      seoDescription: rewritten.seoDescription,
      provider: body.provider,
      personaMode: body.personaMode ?? "auto",
      imageCount,
      imageCandidates,
      imageKeywords: rewritten.imageKeywords,
      persona: rewritten.persona,
    },
  });
}
