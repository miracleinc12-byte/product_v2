import { CATEGORY_MAP } from "@/lib/news-fetcher";

export interface NaverApiCredentials {
  clientId: string;
  clientSecret: string;
}

export interface NaverNewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

export interface NaverTrendItem {
  keyword: string;
  traffic: string;
  category: string;
  score: number;
  newsTitle?: string;
  newsUrl?: string;
}

interface DatalabResponse {
  results?: Array<{
    title: string;
    keywords: string[];
    data: Array<{ period: string; ratio: number }>;
  }>;
}

interface NaverNewsApiResponse {
  items?: Array<{
    title: string;
    originallink?: string;
    link: string;
    description: string;
    pubDate: string;
  }>;
}

interface TrendCandidate {
  keyword: string;
  category: string;
  keywords: string[];
}

const TREND_ANCHOR: TrendCandidate = {
  keyword: "날씨",
  category: "라이프",
  keywords: ["날씨", "기온", "미세먼지"],
};

const TREND_CANDIDATES: TrendCandidate[] = [
  { keyword: "대통령", category: "정치", keywords: ["대통령", "국회", "정당"] },
  { keyword: "총선", category: "정치", keywords: ["총선", "선거", "공천"] },
  { keyword: "외교", category: "정치", keywords: ["외교", "정상회담", "국방"] },
  { keyword: "증시", category: "경제", keywords: ["증시", "코스피", "코스닥"] },
  { keyword: "환율", category: "경제", keywords: ["환율", "달러", "원화"] },
  { keyword: "부동산", category: "경제", keywords: ["부동산", "아파트", "청약"] },
  { keyword: "사건사고", category: "사회", keywords: ["사건", "사고", "경찰"] },
  { keyword: "교육", category: "사회", keywords: ["교육", "수능", "입시"] },
  { keyword: "복지", category: "사회", keywords: ["복지", "연금", "지원금"] },
  { keyword: "국제정세", category: "국제", keywords: ["국제", "전쟁", "외신"] },
  { keyword: "미국", category: "국제", keywords: ["미국", "백악관", "워싱턴"] },
  { keyword: "중국", category: "국제", keywords: ["중국", "베이징", "시진핑"] },
  { keyword: "AI", category: "IT/과학", keywords: ["AI", "인공지능", "생성형AI"] },
  { keyword: "반도체", category: "IT/과학", keywords: ["반도체", "삼성전자", "엔비디아"] },
  { keyword: "우주", category: "IT/과학", keywords: ["우주", "발사체", "NASA"] },
  { keyword: "드라마", category: "문화/연예", keywords: ["드라마", "배우", "OTT"] },
  { keyword: "아이돌", category: "문화/연예", keywords: ["아이돌", "컴백", "콘서트"] },
  { keyword: "영화", category: "문화/연예", keywords: ["영화", "박스오피스", "감독"] },
  { keyword: "축구", category: "스포츠", keywords: ["축구", "손흥민", "국가대표"] },
  { keyword: "야구", category: "스포츠", keywords: ["야구", "KBO", "메이저리그"] },
  { keyword: "농구", category: "스포츠", keywords: ["농구", "NBA", "KBL"] },
  { keyword: "건강", category: "라이프", keywords: ["건강", "운동", "식단"] },
  { keyword: "여행", category: "라이프", keywords: ["여행", "항공", "호텔"] },
  { keyword: "맛집", category: "라이프", keywords: ["맛집", "카페", "외식"] },
];

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function getHeaders(credentials: NaverApiCredentials) {
  return {
    "X-Naver-Client-Id": credentials.clientId,
    "X-Naver-Client-Secret": credentials.clientSecret,
  };
}

function getCategoryQuery(category: string) {
  const mapping = CATEGORY_MAP[category as keyof typeof CATEGORY_MAP];
  return mapping?.keywords ?? category;
}

async function requestDatalab(
  credentials: NaverApiCredentials,
  keywordGroups: Array<{ groupName: string; keywords: string[] }>
) {
  const endDate = new Date();
  const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

  const response = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      ...getHeaders(credentials),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      timeUnit: "date",
      keywordGroups,
    }),
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`Naver DataLab request failed with ${response.status}`);
  }

  return (await response.json()) as DatalabResponse;
}

function computeTrendScore(
  candidateSeries: Array<{ period: string; ratio: number }>,
  anchorSeries: Array<{ period: string; ratio: number }>
) {
  const latestCandidate = candidateSeries.at(-1)?.ratio ?? 0;
  const previousCandidate = candidateSeries.at(-2)?.ratio ?? latestCandidate;
  const latestAnchor = anchorSeries.at(-1)?.ratio ?? 1;
  const previousAnchor = anchorSeries.at(-2)?.ratio ?? latestAnchor;

  const normalized = latestAnchor > 0 ? (latestCandidate / latestAnchor) * 100 : latestCandidate;
  const delta = Math.max(latestCandidate - previousCandidate, 0);
  const anchorDelta = Math.max(latestAnchor - previousAnchor, 0);
  return Math.round((normalized + delta * 0.35 - anchorDelta * 0.1) * 10) / 10;
}

export async function fetchNaverTrendKeywords(
  credentials: NaverApiCredentials,
  limit: number = 12
): Promise<NaverTrendItem[]> {
  const ranked: NaverTrendItem[] = [];

  for (let index = 0; index < TREND_CANDIDATES.length; index += 4) {
    const batch = TREND_CANDIDATES.slice(index, index + 4);
    const datalab = await requestDatalab(credentials, [
      { groupName: TREND_ANCHOR.keyword, keywords: TREND_ANCHOR.keywords },
      ...batch.map((candidate) => ({ groupName: candidate.keyword, keywords: candidate.keywords })),
    ]);

    const anchorSeries = datalab.results?.find((item) => item.title === TREND_ANCHOR.keyword)?.data ?? [];
    if (!anchorSeries.length) continue;

    for (const candidate of batch) {
      const series = datalab.results?.find((item) => item.title === candidate.keyword)?.data ?? [];
      if (!series.length) continue;
      const score = computeTrendScore(series, anchorSeries);
      ranked.push({
        keyword: candidate.keyword,
        category: candidate.category,
        score,
        traffic: score > 0 ? score.toFixed(1) : "0.0",
      });
    }
  }

  const topItems = ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const item of topItems) {
    const [headline] = await fetchNaverNewsArticles(item.keyword, credentials, { display: 1, sort: "date" });
    if (headline) {
      item.newsTitle = headline.title;
      item.newsUrl = headline.url;
    }
  }

  return topItems;
}

export async function fetchNaverNewsArticles(
  query: string,
  credentials: NaverApiCredentials,
  options?: { display?: number; start?: number; sort?: "date" | "sim" }
): Promise<NaverNewsItem[]> {
  const params = new URLSearchParams({
    query,
    display: String(options?.display ?? 10),
    start: String(options?.start ?? 1),
    sort: options?.sort ?? "date",
  });

  const response = await fetch(`https://openapi.naver.com/v1/search/news.json?${params.toString()}`, {
    headers: getHeaders(credentials),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Naver News request failed with ${response.status}`);
  }

  const data = (await response.json()) as NaverNewsApiResponse;

  return (data.items ?? []).map((item) => ({
    title: decodeHtml(item.title),
    description: decodeHtml(item.description),
    url: item.originallink || item.link,
    publishedAt: item.pubDate,
    source: { name: "Naver News" },
  }));
}

export async function fetchLatestCategoryNews(
  category: string,
  credentials: NaverApiCredentials,
  limit: number = 8,
  keyword?: string
) {
  const categoryQuery = getCategoryQuery(category);
  const query = keyword?.trim() ? `${keyword} ${categoryQuery.split(" ").slice(0, 2).join(" ")}`.trim() : categoryQuery;
  return fetchNaverNewsArticles(query, credentials, { display: limit, sort: "date" });
}