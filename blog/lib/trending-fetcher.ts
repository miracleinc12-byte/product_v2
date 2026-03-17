export interface TrendingKeyword {
  keyword: string;
  traffic: string;
  newsTitle?: string;
  newsUrl?: string;
}

export async function fetchGoogleTrends(country: string = "KR"): Promise<TrendingKeyword[]> {
  try {
    const res = await fetch(
      `https://trends.google.com/trending/rss?geo=${country}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return [];
    const xml = await res.text();

    const items: TrendingKeyword[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const block = match[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? block.match(/<title>(.*?)<\/title>/)?.[1];
      const traffic = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1]
        ?? block.match(/<ht:traffic>(.*?)<\/ht:traffic>/)?.[1]
        ?? "";
      const newsTitle = block.match(/<ht:news_item_title><!\[CDATA\[(.*?)\]\]>/)?.[1]
        ?? block.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1];
      const newsUrl = block.match(/<ht:news_item_url><!\[CDATA\[(.*?)\]\]>/)?.[1]
        ?? block.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/)?.[1];

      if (title) items.push({ keyword: title, traffic, newsTitle, newsUrl });
      if (items.length >= 20) break;
    }

    return items;
  } catch {
    return [];
  }
}

export function matchTrendToCategory(keyword: string): string {
  const lower = keyword.toLowerCase();

  if (/국회|대통령|선거|정당|여당|야당|국무|총리|외교|정치|대선|탄핵/.test(lower)) return "정치";
  if (/election|president|congress|senate|parliament|democrat|republican|political|minister|prime minister/.test(lower)) return "정치";

  if (/경제|증시|주식|코스피|원달러|환율|금리|부동산|아파트|기업|시장|gdp/.test(lower)) return "경제";
  if (/stock|market|economy|gdp|inflation|interest rate|bitcoin|crypto|nasdaq|dow|nasdaq|s&p/.test(lower)) return "경제";

  if (/사건|사고|범죄|화재|지진|재난|복지|교육|의료|병원|노동|사회/.test(lower)) return "사회";
  if (/accident|crime|arrest|fire|earthquake|disaster|lawsuit|trial|court/.test(lower)) return "사회";

  if (/ai|인공지능|반도체|it|앱|스마트폰|삼성|lg|네이버|카카오|구글|애플|메타|테슬라|기술|sw|스타트업/.test(lower)) return "IT·과학";
  if (/google|apple|microsoft|amazon|openai|chatgpt|nvidia|semiconductor|tech|robot|launch|update/.test(lower)) return "IT·과학";

  if (/연예|드라마|영화|k팝|idol|아이돌|스포티파이|bts|넷플릭스|유튜브|웹툰|게임|콘텐츠/.test(lower)) return "문화·연예";
  if (/netflix|spotify|disney|marvel|kpop|concert|album|movie|film|celebrity|actor|singer/.test(lower)) return "문화·연예";

  if (/야구|축구|농구|골프|올림픽|월드컵|스포츠|경기|선수|리그|토트넘|손흥민/.test(lower)) return "스포츠";
  if (/ vs | versus /.test(lower) || /\bvs\b/.test(lower)) return "스포츠";
  if (/nba|nfl|mlb|nhl|premier league|champions league|world cup|olympics|cricket|tennis|golf|match|tournament|championship/.test(lower)) return "스포츠";

  if (/건강|다이어트|음식|맛집|여행|라이프|패션|뷰티|육아|레시피|인테리어/.test(lower)) return "라이프";
  if (/health|diet|food|recipe|travel|fashion|beauty|lifestyle|fitness/.test(lower)) return "라이프";

  return "세계";
}
