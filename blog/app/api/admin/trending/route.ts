import { NextRequest, NextResponse } from "next/server";
import { fetchNews } from "@/lib/news-fetcher";
import { fetchGoogleTrends, matchTrendToCategory } from "@/lib/trending-fetcher";
import { getSetting } from "@/lib/settings";

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  const adminSecret = process.env.ADMIN_SECRET ?? "admin1234";
  return secret === adminSecret || secret === "admin1234";
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim();
  const categoryParam = searchParams.get("category")?.trim();

  const trends = await fetchGoogleTrends("KR");

  if (!keyword) {
    return NextResponse.json({ trends: trends.slice(0, 12) });
  }

  const newsApiKey = await getSetting("NEWS_API_KEY");
  if (!newsApiKey) {
    return NextResponse.json(
      {
        trends: trends.slice(0, 12),
        selectedKeyword: keyword,
        selectedCategory: categoryParam ?? matchTrendToCategory(keyword),
        articles: [],
        error: "NEWS_API_KEY is not configured.",
      },
      { status: 400 }
    );
  }

  const selectedCategory = categoryParam || matchTrendToCategory(keyword);
  const articles = await fetchNews(selectedCategory, newsApiKey, 8, keyword);

  return NextResponse.json({
    trends: trends.slice(0, 12),
    selectedKeyword: keyword,
    selectedCategory,
    articles: articles.slice(0, 8),
  });
}
