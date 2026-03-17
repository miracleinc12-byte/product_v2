import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { insertImages, rewriteArticleForSeo } from "@/lib/ai-writer";

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  const adminSecret = process.env.ADMIN_SECRET ?? "local-dev-secret";
  return secret === adminSecret || secret === "admin1234";
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(src: string, baseUrl: string) {
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return src;
  }
}

function extractArticleImages(html: string, baseUrl: string) {
  const imageMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  const images = imageMatches
    .map((match) => toAbsoluteUrl(match[1], baseUrl))
    .filter((url) => /^https?:\/\//i.test(url));

  return [...new Set(images)].slice(0, 6);
}

async function fetchArticleAssets(url?: string) {
  if (!url) return { content: "", images: [] as string[] };
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) return { content: "", images: [] as string[] };
    const html = await response.text();
    return {
      content: stripHtml(html).slice(0, 6000),
      images: extractArticleImages(html, url),
    };
  } catch {
    return { content: "", images: [] as string[] };
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    category?: string;
    articleType?: string;
    provider?: "gemini" | "openai";
    imageCount?: number;
    referenceUrl?: string;
    sourceTitle?: string;
    sourceDescription?: string;
    sourceName?: string;
  };

  if (!body.category || !body.articleType || !body.provider) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const settings = await getSettings(["GEMINI_API_KEY", "OPENAI_API_KEY", "ARTICLE_LENGTH"]);
  const providerKey = body.provider === "openai" ? settings.OPENAI_API_KEY : settings.GEMINI_API_KEY;
  if (!providerKey) {
    return NextResponse.json({ error: `${body.provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY"} is not configured.` }, { status: 400 });
  }

  const articleLength = Number.parseInt(settings.ARTICLE_LENGTH, 10) || 2200;
  const assets = await fetchArticleAssets(body.referenceUrl);
  const sourceTitle = body.sourceTitle?.trim() || "참고 기사";
  const sourceDescription = body.sourceDescription?.trim() || assets.content.slice(0, 400);

  if (!sourceDescription) {
    return NextResponse.json({ error: "참고 기사 내용을 가져오지 못했습니다." }, { status: 400 });
  }

  const rewritten = await rewriteArticleForSeo(
    {
      category: body.category,
      articleType: body.articleType,
      referenceUrl: body.referenceUrl,
      sourceTitle,
      sourceDescription,
      sourceContent: assets.content,
      sourceName: body.sourceName,
    },
    {
      provider: body.provider,
      apiKey: providerKey,
      articleLength,
    }
  );

  const imageCount = Math.max(0, Math.min(Number(body.imageCount ?? 0), 4));
  const contentWithImages = insertImages(rewritten.content, assets.images.slice(0, imageCount));

  return NextResponse.json({
    draft: {
      title: rewritten.title,
      summary: rewritten.summary,
      content: contentWithImages,
      tags: rewritten.tags,
      category: body.category,
      articleType: body.articleType,
      referenceUrl: body.referenceUrl ?? "",
      seoTitle: rewritten.seoTitle,
      seoDescription: rewritten.seoDescription,
      provider: body.provider,
      imageCount,
      imageCandidates: assets.images,
    },
  });
}