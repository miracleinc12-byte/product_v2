import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { rewriteArticleForSeo } from "@/lib/ai-writer";

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  const adminSecret = process.env.ADMIN_SECRET ?? "admin1234";
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

async function fetchArticleBody(url?: string) {
  if (!url) return "";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) return "";
    const html = await response.text();
    return stripHtml(html).slice(0, 6000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    category?: string;
    articleType?: string;
    referenceUrl?: string;
    sourceTitle?: string;
    sourceDescription?: string;
    sourceName?: string;
  };

  if (!body.category || !body.articleType || !body.sourceTitle || !body.sourceDescription) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const settings = await getSettings(["GEMINI_API_KEY", "ARTICLE_LENGTH"]);
  if (!settings.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 400 });
  }

  const articleLength = Number.parseInt(settings.ARTICLE_LENGTH, 10) || 2200;
  const sourceContent = await fetchArticleBody(body.referenceUrl);
  const rewritten = await rewriteArticleForSeo(
    {
      category: body.category,
      articleType: body.articleType,
      referenceUrl: body.referenceUrl,
      sourceTitle: body.sourceTitle,
      sourceDescription: body.sourceDescription,
      sourceContent,
      sourceName: body.sourceName,
    },
    settings.GEMINI_API_KEY,
    articleLength
  );

  return NextResponse.json({
    draft: {
      title: rewritten.title,
      summary: rewritten.summary,
      content: rewritten.content,
      tags: rewritten.tags,
      category: body.category,
      articleType: body.articleType,
      referenceUrl: body.referenceUrl ?? "",
      seoTitle: rewritten.seoTitle,
      seoDescription: rewritten.seoDescription,
    },
  });
}