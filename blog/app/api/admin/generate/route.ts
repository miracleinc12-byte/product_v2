import { NextRequest } from "next/server";
import { CATEGORY_MAP } from "@/lib/news-fetcher";
import { getSettings } from "@/lib/settings";
import { generateForCategory } from "@/lib/post-generator";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({})) as { categories?: string[] };
  const targetCategories = body.categories ?? Object.keys(CATEGORY_MAP);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const settings = await getSettings([
        "GEMINI_API_KEY", "NEWS_API_KEY", "UNSPLASH_ACCESS_KEY", "ARTICLE_LENGTH",
      ]);
      const articleLength = parseInt(settings.ARTICLE_LENGTH, 10) || 2000;

      const genSettings = {
        geminiKey: settings.GEMINI_API_KEY,
        newsKey: settings.NEWS_API_KEY,
        unsplashKey: settings.UNSPLASH_ACCESS_KEY,
        articleLength,
      };

      send({ type: "start", total: targetCategories.length, categories: targetCategories });

      for (let ci = 0; ci < targetCategories.length; ci++) {
        const category = targetCategories[ci];
        send({ type: "category_start", index: ci, category, step: "시작..." });

        try {
          const result = await generateForCategory(
            category,
            genSettings,
            (data) => send({ type: "progress", index: ci, category, ...data })
          );
          const { category: _cat, ...restResult } = result;
          send({ type: "category_done", index: ci, category, ...restResult });
        } catch (err) {
          send({
            type: "category_done", index: ci, category,
            status: `오류: ${err instanceof Error ? err.message : String(err)}`,
            title: "-",
          });
        }

        await new Promise((r) => setTimeout(r, 1500));
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
