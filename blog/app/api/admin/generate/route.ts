import { NextRequest } from "next/server";
import { CATEGORY_MAP } from "@/lib/news-fetcher";
import { getSettings } from "@/lib/settings";
import { generateForCategory } from "@/lib/post-generator";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { categories?: string[] };
  const targetCategories = body.categories ?? Object.keys(CATEGORY_MAP);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const settings = await getSettings([
        "GEMINI_API_KEY",
        "NEWS_API_KEY",
        "UNSPLASH_ACCESS_KEY",
        "ARTICLE_LENGTH",
      ]);
      const articleLength = Number.parseInt(settings.ARTICLE_LENGTH, 10) || 2000;

      const genSettings = {
        geminiKey: settings.GEMINI_API_KEY,
        newsKey: settings.NEWS_API_KEY,
        unsplashKey: settings.UNSPLASH_ACCESS_KEY,
        articleLength,
        triggerType: "manual" as const,
      };

      send({ type: "start", total: targetCategories.length, categories: targetCategories });

      for (let index = 0; index < targetCategories.length; index++) {
        const category = targetCategories[index];
        send({ type: "category_start", index, category, step: "Starting..." });

        try {
          const result = await generateForCategory(
            category,
            genSettings,
            (data) => send({ type: "progress", index, category, ...data })
          );
          const { category: _category, ...restResult } = result;
          send({ type: "category_done", index, category, ...restResult });
        } catch (error) {
          send({
            type: "category_done",
            index,
            category,
            status: `Error: ${error instanceof Error ? error.message : String(error)}`,
            title: "-",
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
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
