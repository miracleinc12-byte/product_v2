export const CATEGORY_MAP: Record<string, { newsCategory: string; keywords: string; englishKeywords: string }> = {
  "정치": {
    newsCategory: "general",
    keywords: "한국 정치 국회 정부 외교",
    englishKeywords: "South Korea politics government parliament diplomacy",
  },
  "경제": {
    newsCategory: "business",
    keywords: "한국 경제 증시 금융 투자 부동산",
    englishKeywords: "South Korea economy finance market investment real estate",
  },
  "사회": {
    newsCategory: "general",
    keywords: "한국 사회 교육 복지 사건 사고",
    englishKeywords: "South Korea society education welfare incidents crime",
  },
  "국제": {
    newsCategory: "general",
    keywords: "국제 뉴스 외교 전쟁 글로벌",
    englishKeywords: "world international news diplomacy conflict global",
  },
  "IT/과학": {
    newsCategory: "technology",
    keywords: "AI 기술 반도체 스타트업 과학",
    englishKeywords: "artificial intelligence technology semiconductor startup science",
  },
  "문화/연예": {
    newsCategory: "entertainment",
    keywords: "K-pop 드라마 영화 연예 문화",
    englishKeywords: "K-pop Korean drama movie entertainment culture celebrity",
  },
  "스포츠": {
    newsCategory: "sports",
    keywords: "스포츠 축구 야구 농구 배구",
    englishKeywords: "sports soccer baseball basketball volleyball match",
  },
  "라이프": {
    newsCategory: "health",
    keywords: "건강 여행 맛집 패션 라이프",
    englishKeywords: "health travel food fashion lifestyle wellness",
  },
} as const;

const CATEGORY_ALIASES: Record<string, keyof typeof CATEGORY_MAP> = {
  "?뺤튂": "정치",
  "寃쎌젣": "경제",
  "?ы쉶": "사회",
  "?멸퀎": "국제",
  "IT쨌怨쇳븰": "IT/과학",
  "臾명솕쨌?곗삁": "문화/연예",
  "?ㅽ룷痢?": "스포츠",
  "?쇱씠??": "라이프",
};

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
}

function normalizeCategory(category: string) {
  return CATEGORY_ALIASES[category] ?? (category as keyof typeof CATEGORY_MAP);
}

async function requestNews(query: string, language: "ko" | "en", pageSize: number, apiKey: string, fromDate: string) {
  const params = new URLSearchParams({
    q: query,
    language,
    sortBy: "publishedAt",
    from: fromDate,
    pageSize: String(pageSize),
    apiKey,
  });

  const res = await fetch(`https://newsapi.org/v2/everything?${params}`);
  return (await res.json()) as { articles?: NewsArticle[]; status?: string; message?: string };
}

export async function fetchNews(
  category: string,
  apiKey?: string,
  pageSize: number = 10,
  trendKeyword?: string
): Promise<NewsArticle[]> {
  const key = apiKey || process.env.NEWS_API_KEY;
  if (!key) {
    throw new Error("NEWS_API_KEY is not configured. Please set it in admin settings.");
  }

  const normalizedCategory = normalizeCategory(category);
  const mapping = CATEGORY_MAP[normalizedCategory];
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const primaryQuery = trendKeyword?.trim() || mapping?.keywords || category;

  let data = await requestNews(primaryQuery, "ko", pageSize, key, fromDate);

  if (!data.articles?.length) {
    const fallbackQuery = trendKeyword?.trim() || mapping?.englishKeywords || primaryQuery;
    data = await requestNews(fallbackQuery, "en", pageSize, key, fromDate);
  }

  const cutoffDate = new Date(fromDate);
  return (data.articles ?? [])
    .filter((article) => {
      if (!article.title || !article.description || article.title.includes("[Removed]")) {
        return false;
      }
      const published = new Date(article.publishedAt);
      return published >= cutoffDate;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function collectImages(articles: NewsArticle[], exclude?: string | null): string[] {
  const images: string[] = [];
  const seen = new Set<string>();
  if (exclude) seen.add(exclude);

  for (const article of articles) {
    if (article.urlToImage && !seen.has(article.urlToImage)) {
      seen.add(article.urlToImage);
      images.push(article.urlToImage);
    }
  }

  return images;
}
