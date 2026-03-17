import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_MAP } from "@/lib/news-fetcher";
import { getSettings } from "@/lib/settings";
import { generateForCategory } from "@/lib/post-generator";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const settings = await getSettings([
    "CRON_SECRET",
    "GEMINI_API_KEY",
    "NEWS_API_KEY",
    "UNSPLASH_ACCESS_KEY",
    "ARTICLE_LENGTH",
  ]);

  const adminSecret = req.headers.get("x-admin-secret");
  const authHeader = req.headers.get("authorization");
  const cronSecret = settings.CRON_SECRET;

  const isAdminCall = adminSecret && adminSecret === (process.env.ADMIN_SECRET ?? "admin1234");
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdminCall && !isCronCall) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { categories?: string[] };
  const targetCategories = body.categories ?? Object.keys(CATEGORY_MAP);
  const articleLength = Number.parseInt(settings.ARTICLE_LENGTH, 10) || 2000;

  const genSettings = {
    geminiKey: settings.GEMINI_API_KEY,
    newsKey: settings.NEWS_API_KEY,
    unsplashKey: settings.UNSPLASH_ACCESS_KEY,
    articleLength,
    triggerType: isCronCall ? ("cron" as const) : ("manual" as const),
  };

  const results = [];
  for (const category of targetCategories) {
    try {
      const result = await generateForCategory(category, genSettings, () => {});
      results.push(result);
    } catch (error) {
      results.push({
        category,
        title: "-",
        status: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return NextResponse.json({ success: true, date: new Date().toISOString(), results });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
