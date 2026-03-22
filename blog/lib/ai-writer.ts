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
  personaMode?: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceContent?: string;
  referenceUrl?: string;
  sourceName?: string;
}
export interface SeoRewriteOptions {
  provider: "gemini" | "openai";
  apiKey: string;
  articleLength?: number;
}

export interface SeoRewriteResult extends GeneratedPost {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  persona: string;
  imageKeywords: string[];
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
function buildPersonaInstruction(personaMode?: string) {
  switch (personaMode) {
    case "investor":
      return "Use an investor persona. Focus on market impact, uncertainty, timing, and decision signals.";
    case "consumer":
      return "Use a consumer persona. Focus on everyday effects, costs, convenience, and practical choices.";
    case "operator":
      return "Use a working-level operator persona. Focus on execution risk, workflow changes, and operational implications.";
    case "policymaker":
      return "Use a policymaker persona. Focus on policy goals, tradeoffs, public impact, and unintended consequences.";
    case "beginner":
      return "Use a beginner-reader persona. Explain the issue clearly, define context, and reduce jargon without oversimplifying.";
    default:
      return "Choose the single most relevant persona based on the article and explain the issue from that perspective.";
  }
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
      const fixed = jsonMatch[0]
        .replace(/(?<=:\s*")([\s\S]*?)(?="\s*[,}])/g, (match) => match.replace(/(?<!\\)"/g, '\\"').replace(/\n/g, "\\n"));
      return JSON.parse(fixed) as T;
    }
  }
}

async function callGemini(prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
  if (!fullText) throw new Error("Gemini response was empty");
  return fullText;
}

async function callOpenAI(prompt: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a Korean SEO newsroom editor. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenAI error: ${response.status}`);
  }

  const fullText = data.choices?.[0]?.message?.content ?? "";
  if (!fullText) throw new Error("OpenAI response was empty");
  return fullText;
}

async function callModel(prompt: string, options: SeoRewriteOptions) {
  if (options.provider === "openai") {
    return callOpenAI(prompt, options.apiKey);
  }
  return callGemini(prompt, options.apiKey);
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

  const fullText = await callGemini(prompt, key);
  const parsed = extractJson<GeneratedPost>(fullText);
  if (!parsed.title || !parsed.content) throw new Error("Gemini response is missing required fields");
  return parsed;
}

export async function rewriteArticleForSeo(input: SeoRewriteInput, options: SeoRewriteOptions): Promise<SeoRewriteResult> {
  if (!options.apiKey) throw new Error("Selected AI provider API key is not configured.");

  const articleLength = options.articleLength ?? 2200;
  const minLen = articleLength;
  const maxLen = Math.round(articleLength * 1.2);

  const prompt = `You are a Korean SEO editor and feature writer working for both Google SEO and Naver SEO.
Analyze the referenced article first, then create an original Korean blog draft.
Do not translate literally and do not copy source phrasing.

[Article Info]
Category: ${input.category}
Article Type: ${input.articleType}
Source Title: ${input.sourceTitle}
Source Summary: ${input.sourceDescription}
Source Body: ${input.sourceContent ?? input.sourceDescription}
Source Name: ${input.sourceName ?? "External news source"}
Reference URL: ${input.referenceUrl ?? ""}
Selected Persona Technique: ${input.personaMode ?? "auto"}

[Writing Requirements]
1. First infer the core issue, key actors, audience intent, search intent, and primary keyword from the source article.
Persona Technique Rule: ${buildPersonaInstruction(input.personaMode)}
2. Title Creation: Write a natural Korean title optimized for both Google SEO and Naver SEO.
   - Put the primary keyword or issue near the front when natural.
   - Make it look like a trustworthy Korean blog headline, not a breaking-news headline (within 25 characters).
3. Slug Creation: Create a Korean slug based on the core issue and title. Use lowercase letters, numbers, Korean text, and hyphens only.
4. Summary Creation: Write a 2-3 sentence summary (around 150 characters) that works as a search snippet and accurately reflects the source article.
5. Body Length: Write a comprehensive, long-form Markdown article of roughly ${minLen}-${maxLen} characters. The article MUST be substantial and deep.
6. Persona Reinterpretation: Reinterpret the article using the chosen persona technique:
   - choose one clear persona who would care about this issue most,
   - explain the issue from that persona's concerns, decisions, and risks,
   - keep the article factual and analytical, not fictional.
7. Advanced SEO Structure: Use a Korean information-blog structure that performs well in Google SEO and Naver SEO.
   - 'Answer-First' Opening: Immediately answer the reader's main question or provide the core takeaway in the first paragraph.
   - Short, scannable paragraphs (2-3 sentences max).
   - Use explicit headings (H2, H3) with search-friendly wording and long-tail keywords.
   - Use bullet points, bold text for emphasis, and blockquotes for key insights.
8. Body Flow (Mandatory Structure):
   - ## [Intro] 왜 지금 이 이슈가 중요한가? (Context & Hook)
   - ## 핵심 내용 요약 (Answer First)
   - ## 상세 분석 및 배경 (Deep Dive)
   - ## [Persona] 관점에서의 영향 및 시사점 (Implications)
   - ## 향후 전망 및 실질적 대비책 (Takeaways & Next Steps)
   - ## 요약 및 결론 (Conclusion)
9. Writing Style:
   - Easy to scan, confident but not sensational.
   - Clear transitions between paragraphs.
   - Practical, expert, and reader-oriented.
10. Constraints:
   - Avoid keyword stuffing, sensational language, and direct source phrasing.
   - Do NOT print the reference URL inside the article body.
   - Do NOT mention that the article was rewritten by AI.
11. Metadata: Provide 4-6 highly relevant tags. Create a separate seoTitle (max 60 chars) and seoDescription (max 150 chars).
12. Imagery: Provide 3-5 imageKeywords in English for searching related articles that may contain reusable contextual images.

Return JSON only:
{
  "title": "blog title",
  "slug": "blog-slug",
  "summary": "summary",
  "content": "markdown article",
  "tags": "tag1, tag2, tag3",
  "seoTitle": "seo title",
  "seoDescription": "seo description",
  "persona": "chosen persona",
  "imageKeywords": ["keyword1", "keyword2", "keyword3"]
}`;

  const fullText = await callModel(prompt, options);
  const parsed = extractJson<SeoRewriteResult>(fullText);
  if (!parsed.title || !parsed.summary || !parsed.content) {
    throw new Error("AI response is missing required fields");
  }

  return {
    ...parsed,
    slug: sanitizeSlug(parsed.slug || parsed.title),
    seoTitle: parsed.seoTitle || parsed.title,
    seoDescription: parsed.seoDescription || parsed.summary.slice(0, 160),
    persona: parsed.persona || "일반 독자",
    imageKeywords: (parsed.imageKeywords ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 5),
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
    lines.splice(insertPoints[index], 0, `\n![기사 이미지](${images[index]})\n`);
  }

  return lines.join("\n");
}
