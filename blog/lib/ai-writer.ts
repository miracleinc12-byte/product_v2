import type { NewsArticle } from "./news-fetcher";

export interface GeneratedPost {
  title: string;
  summary: string;
  content: string;
  tags: string;
}

export interface SeoRewriteInput {
  articleType: string;
  category: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceContent?: string;
  referenceUrl?: string;
  sourceName?: string;
}

export interface SeoRewriteResult extends GeneratedPost {
  seoTitle: string;
  seoDescription: string;
}

function extractJson<T>(fullText: string): T {
  try {
    return JSON.parse(fullText) as T;
  } catch {
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`JSON parse failed: ${fullText.slice(0, 200)}`);
    }

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      const fixed = jsonMatch[0].replace(/(?<=:\s*")([\s\S]*?)(?="\s*[,}])/g, (match) =>
        match.replace(/(?<!\\)"/g, '\\"').replace(/\n/g, "\\n")
      );
      return JSON.parse(fixed) as T;
    }
  }
}

export async function generateArticle(
  news: NewsArticle,
  category: string,
  apiKey?: string,
  articleLength: number = 2000,
  trendKeyword?: string
): Promise<GeneratedPost> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured. Please set it in admin settings.");

  const source = `
Title: ${news.title}
Summary: ${news.description ?? ""}
Body: ${news.content ?? news.description ?? ""}
Source: ${news.source.name}
  `.trim();

  const minLen = articleLength;
  const maxLen = Math.round(articleLength * 1.3);
  const trendHint = trendKeyword ? `\nFocus keyword: "${trendKeyword}"` : "";

  const prompt = `You are a Korean newsroom editor writing an original blog article.${trendHint}

[Source Article]
${source}

[Requirements]
1. Category: ${category}
2. Create a Korean headline within 20 characters that remains factual but clickable.
3. Write a 2-3 sentence summary within roughly 100 characters.
4. Write the body in Markdown with ${minLen}-${maxLen} characters, using ## and ### headings, lists, and quotes when useful.
5. Include context, analysis, and practical implications.
6. Do not include the source URL or a [Source] section.
7. Return tags as 3-5 comma separated keywords.

Return JSON only:
{
  "title": "headline",
  "summary": "summary",
  "content": "markdown body",
  "tags": "tag1, tag2, tag3"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 1024 },
        },
      }),
    }
  );

  const data = (await response.json()) as {
    candidates?: { content: { parts: { text?: string; thought?: boolean }[] } }[];
    error?: { message: string };
  };

  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const fullText = parts.filter((part) => part.text && !part.thought).map((part) => part.text!).join("");
  if (!fullText) {
    throw new Error("Gemini response was empty");
  }

  const parsed = extractJson<GeneratedPost>(fullText);
  if (!parsed.title || !parsed.content) {
    throw new Error("Gemini response is missing required fields");
  }

  return parsed;
}

export async function rewriteArticleForSeo(
  input: SeoRewriteInput,
  apiKey?: string,
  articleLength: number = 2200
): Promise<SeoRewriteResult> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured. Please set it in admin settings.");

  const minLen = articleLength;
  const maxLen = Math.round(articleLength * 1.2);
  const prompt = `You are a Korean SEO editor for both Google SEO and Naver SEO.
Rewrite the referenced news into an original Korean article for a personal blog.
Do not translate literally. Do not copy the original wording. Keep facts accurate.

[Article Info]
Category: ${input.category}
Article Type: ${input.articleType}
Source Title: ${input.sourceTitle}
Source Summary: ${input.sourceDescription}
Source Body: ${input.sourceContent ?? input.sourceDescription}
Source Name: ${input.sourceName ?? "External news source"}
Reference URL: ${input.referenceUrl ?? ""}

[SEO Requirements]
1. Write a Google SEO and Naver SEO friendly title that is natural, specific, and contains the core keyword.
2. Write an SEO summary of 2-3 sentences that can be used as both meta description and preview text.
3. The body must be original Markdown, roughly ${minLen}-${maxLen} characters, structured with ## and ### headings.
4. The first paragraph should clarify the main keyword and why the topic matters today.
5. Include fact summary, background, implications, and a short reader takeaway section.
6. Avoid keyword stuffing, sensational claims, and verbatim copying from the source.
7. Provide 4-6 tags.
8. Create a separate SEO title and SEO description optimized for search snippets.
9. Do not output the reference URL inside the article body.

Return JSON only:
{
  "title": "blog title",
  "summary": "summary",
  "content": "markdown article",
  "tags": "tag1, tag2, tag3",
  "seoTitle": "seo title",
  "seoDescription": "seo description"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 1024 },
        },
      }),
    }
  );

  const data = (await response.json()) as {
    candidates?: { content: { parts: { text?: string; thought?: boolean }[] } }[];
    error?: { message: string };
  };

  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const fullText = parts.filter((part) => part.text && !part.thought).map((part) => part.text!).join("");
  if (!fullText) {
    throw new Error("Gemini response was empty");
  }

  const parsed = extractJson<SeoRewriteResult>(fullText);
  if (!parsed.title || !parsed.summary || !parsed.content) {
    throw new Error("Gemini response is missing required fields");
  }

  return {
    ...parsed,
    seoTitle: parsed.seoTitle || parsed.title,
    seoDescription: parsed.seoDescription || parsed.summary.slice(0, 160),
  };
}

export function insertImages(content: string, images: string[]): string {
  if (!images.length) return content;

  const lines = content.split("\n");
  const headingIndices: number[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (/^#{2,3}\s/.test(lines[index]) && index > 0) {
      headingIndices.push(index);
    }
  }

  const insertPoints: number[] = [];
  if (headingIndices.length >= 2) {
    const step = Math.floor(headingIndices.length / Math.min(images.length, headingIndices.length));
    for (let index = 0; index < Math.min(images.length, headingIndices.length); index++) {
      insertPoints.push(headingIndices[Math.min(index * step, headingIndices.length - 1)]);
    }
  } else {
    const totalLines = lines.length;
    for (let index = 0; index < images.length; index++) {
      insertPoints.push(Math.floor((totalLines * (index + 1)) / (images.length + 1)));
    }
  }

  insertPoints.sort((a, b) => b - a);

  for (let index = 0; index < insertPoints.length && index < images.length; index++) {
    const insertIndex = insertPoints[index];
    const imgTag = `\n![기사 이미지](${images[index]})\n`;
    lines.splice(insertIndex, 0, imgTag);
  }

  return lines.join("\n");
}