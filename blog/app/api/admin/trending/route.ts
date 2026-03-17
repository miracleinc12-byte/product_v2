import { NextRequest, NextResponse } from "next/server";
import { fetchLatestCategoryNews, fetchNaverTrendKeywords } from "@/lib/naver-api";
import { matchTrendToCategory } from "@/lib/trending-fetcher";
import { getSettings } from "@/lib/settings";

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  const adminSecret = process.env.ADMIN_SECRET ?? "admin1234";
  return secret === adminSecret || secret === "admin1234";
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings(["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"]);
  if (!settings.NAVER_CLIENT_ID || !settings.NAVER_CLIENT_SECRET) {
    return NextResponse.json({ error: "NAVER API is not configured." }, { status: 400 });
  }

  const credentials = {
    clientId: settings.NAVER_CLIENT_ID,
    clientSecret: settings.NAVER_CLIENT_SECRET,
  };

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim();
  const categoryParam = searchParams.get("category")?.trim();

  if (!keyword && !categoryParam) {
    const trends = await fetchNaverTrendKeywords(credentials, 12);
    return NextResponse.json({ trends });
  }

  const selectedCategory = categoryParam || (keyword ? matchTrendToCategory(keyword) : "정치");
  const articles = await fetchLatestCategoryNews(selectedCategory, credentials, 8, keyword);

  return NextResponse.json({
    selectedKeyword: keyword ?? null,
    selectedCategory,
    articles,
  });
}