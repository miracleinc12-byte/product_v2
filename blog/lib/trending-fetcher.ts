import { fetchNaverTrendKeywords } from "@/lib/naver-api";

export interface TrendingKeyword {
  keyword: string;
  traffic: string;
  category?: string;
  newsTitle?: string;
  newsUrl?: string;
  score?: number;
}

export async function fetchGoogleTrends(_country: string = "KR"): Promise<TrendingKeyword[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  try {
    return await fetchNaverTrendKeywords({ clientId, clientSecret }, 12);
  } catch {
    return [];
  }
}

export function matchTrendToCategory(keyword: string): string {
  const lower = keyword.toLowerCase();

  if (/(선거|대통령|국회|정당|총리|외교|정치)/.test(keyword)) return "정치";
  if (/(election|president|congress|senate|parliament|political|minister|prime minister)/.test(lower)) return "정치";

  if (/(경제|증시|주식|코스피|금리|부동산|기업|시장|환율)/.test(keyword)) return "경제";
  if (/(stock|market|economy|gdp|inflation|interest|bitcoin|crypto|nasdaq|dow|s&p)/.test(lower)) return "경제";

  if (/(사건|사고|범죄|복지|교육|의료|병원|사회|재난)/.test(keyword)) return "사회";
  if (/(accident|crime|arrest|fire|earthquake|disaster|lawsuit|trial|court|education|welfare)/.test(lower)) return "사회";

  if (/(ai|인공지능|반도체|it|스마트폰|삼성|애플|메타|오픈ai|기술|과학|로봇|우주)/i.test(keyword)) return "IT/과학";
  if (/(google|apple|microsoft|amazon|openai|chatgpt|nvidia|semiconductor|tech|robot|science|space)/.test(lower)) return "IT/과학";

  if (/(연예|드라마|영화|아이돌|배우|예능|문화|가수)/.test(keyword)) return "문화/연예";
  if (/(netflix|spotify|disney|marvel|kpop|concert|album|movie|film|celebrity|actor|singer|drama)/.test(lower)) return "문화/연예";

  if (/(축구|야구|농구|배구|골프|올림픽|월드컵|스포츠|경기|리그)/.test(keyword)) return "스포츠";
  if (/(nba|nfl|mlb|nhl|premier league|champions league|world cup|olympics|tennis|golf|match|tournament|sports)/.test(lower)) return "스포츠";

  if (/(건강|다이어트|맛집|여행|라이프|패션|뷰티|인테리어)/.test(keyword)) return "라이프";
  if (/(health|diet|food|recipe|travel|fashion|beauty|lifestyle|fitness)/.test(lower)) return "라이프";

  return "국제";
}