import type { NewsArticle } from "./news-fetcher";

export interface GeneratedPost {
  title: string;
  summary: string;
  content: string;
  tags: string;
}

export async function generateArticle(
  news: NewsArticle,
  category: string,
  apiKey?: string,
  articleLength: number = 2000,
  trendKeyword?: string
): Promise<GeneratedPost> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 관리자 설정에서 입력해주세요.");

  const source = `
제목: ${news.title}
요약: ${news.description ?? ""}
본문: ${news.content ?? news.description ?? ""}
출처: ${news.source.name}
  `.trim();

  const minLen = articleLength;
  const maxLen = Math.round(articleLength * 1.3);
  const trendHint = trendKeyword ? `\n주요 키워드: "${trendKeyword}" (이 키워드를 중심으로 작성)` : "";

  const prompt = `당신은 한국 뉴스 블로그의 전문 기자입니다.
아래 뉴스 원문을 바탕으로 한국어 뉴스 기사를 작성해주세요.${trendHint}

[원문 뉴스]
${source}

[작성 규칙]
1. 카테고리: ${category}
2. 제목: 흥미롭고 클릭을 유도하는 20자 내외의 한국어 제목 (주요 키워드 반영)
3. 요약: 핵심 내용을 담은 2~3문장 (100자 내외)
4. 본문: Markdown 형식으로 ${minLen}~${maxLen}자 분량. 소제목(##, ###), 목록, 인용구(>) 활용. 배경 설명, 전문가 분석, 향후 전망 포함
5. 태그: 관련 키워드 3~5개, 쉼표로 구분
6. 출처 URL, "[출처]" 문구 포함 금지
7. 사실에 기반하되 독자 친화적인 문체

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "제목",
  "summary": "요약",
  "content": "본문(마크다운)",
  "tags": "태그1, 태그2, 태그3"
}`;

  const res = await fetch(
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

  const data = await res.json() as {
    candidates?: { content: { parts: { text?: string; thought?: boolean }[] } }[];
    error?: { message: string };
  };

  if (data.error) throw new Error(`Gemini 오류: ${data.error.message}`);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const textParts = parts.filter((p) => p.text && !p.thought).map((p) => p.text!);
  const fullText = textParts.join("");

  if (!fullText) {
    throw new Error("Gemini 응답이 비어 있습니다");
  }

  let parsed: GeneratedPost;
  try {
    parsed = JSON.parse(fullText) as GeneratedPost;
  } catch {
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Gemini 응답 파싱 실패: ${fullText.slice(0, 200)}`);
    }
    try {
      parsed = JSON.parse(jsonMatch[0]) as GeneratedPost;
    } catch {
      const fixed = jsonMatch[0]
        .replace(/(?<=:\s*")([\s\S]*?)(?="\s*[,}])/g, (m) =>
          m.replace(/(?<!\\)"/g, '\\"').replace(/\n/g, '\\n')
        );
      try {
        parsed = JSON.parse(fixed) as GeneratedPost;
      } catch {
        const titleM = fullText.match(/"title"\s*:\s*"([^"]+)"/);
        const summaryM = fullText.match(/"summary"\s*:\s*"([^"]+)"/);
        const tagsM = fullText.match(/"tags"\s*:\s*"([^"]+)"/);
        const contentM = fullText.match(/"content"\s*:\s*"([\s\S]+?)"\s*[,}]\s*"(?:tags|$)/);

        if (!titleM) {
          throw new Error(`Gemini JSON 복구 실패: ${fullText.slice(0, 300)}`);
        }

        parsed = {
          title: titleM[1],
          summary: summaryM?.[1] ?? "",
          content: contentM?.[1]?.replace(/\\n/g, "\n").replace(/\\"/g, '"') ?? "",
          tags: tagsM?.[1] ?? "",
        };
      }
    }
  }

  if (!parsed.title || !parsed.content) {
    throw new Error("Gemini 응답에 필수 필드(title, content)가 없습니다");
  }

  return parsed;
}

export function insertImages(content: string, images: string[]): string {
  if (!images.length) return content;

  const lines = content.split("\n");
  const headingIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{2,3}\s/.test(lines[i]) && i > 0) {
      headingIndices.push(i);
    }
  }

  const insertPoints: number[] = [];
  if (headingIndices.length >= 2) {
    const step = Math.floor(headingIndices.length / Math.min(images.length, headingIndices.length));
    for (let i = 0; i < Math.min(images.length, headingIndices.length); i++) {
      insertPoints.push(headingIndices[Math.min(i * step, headingIndices.length - 1)]);
    }
  } else {
    const totalLines = lines.length;
    for (let i = 0; i < images.length; i++) {
      insertPoints.push(Math.floor((totalLines * (i + 1)) / (images.length + 1)));
    }
  }

  insertPoints.sort((a, b) => b - a);

  for (let i = 0; i < insertPoints.length && i < images.length; i++) {
    const idx = insertPoints[i];
    const imgTag = `\n![기사 이미지](${images[i]})\n`;
    lines.splice(idx, 0, imgTag);
  }

  return lines.join("\n");
}
