import * as cheerio from "cheerio";

interface ArticleImageCandidate {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  score?: number;
}

function toAbsoluteUrl(src: string, baseUrl: string) {
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return src;
  }
}

export function scoreImageCandidate(image: ArticleImageCandidate, title: string = "", parentContext: string = "") {
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  const aspect = width && height ? width / height : 0;

  // 1. Harsh filtering for small or oddly shaped images (likely UI elements)
  if (width > 0 && width < 300) return -200; 
  if (height > 0 && height < 200) return -200;
  // Adjusted aspect filter to be more lenient for square (1:1)
  if (aspect > 0 && (aspect < 0.5 || aspect > 3.0)) return -100;

  let score = 0;
  
  // 2. Size-based scoring (bigger is usually better)
  if (width >= 1000 && height >= 1000) score += 60; // Extra points for large square-ready images
  else if (width >= 800) score += 25;
  else if (width >= 600) score += 15;

  // 3. Aspect ratio (Now prefers square 1:1 for Naver Blog optimization)
  if (aspect >= 0.8 && aspect <= 1.2) score += 40; // High priority for 1:1
  else if (aspect >= 1.3 && aspect <= 1.8) score += 20; // Good fallback for landscape
  
  // 4. Content-based scoring (alt text relevance)
  if (title && image.alt) {
    const titleWords = title.toLowerCase().split(/[^\w\d가-힣]+/).filter(w => w.length > 1);
    const altLower = image.alt.toLowerCase();
    const matchCount = titleWords.filter(word => altLower.includes(word)).length;
    score += matchCount * 10;
    
    // Penalty for generic alt text
    if (image.alt.length < 4 || /^(image|photo|사진|이미지)$/i.test(image.alt)) {
      score -= 20;
    }
  } else if (!image.alt) {
    score -= 30; // Strong penalty for no alt text (junk images rarely have them)
  }

  // 5. Parent Context Filtering (Crucial for avoiding sidebar/footer junk)
  const junkContextRegex = /(sidebar|footer|aside|nav|menu|related|recommend|widget|ad-|banner|comment|social|share|profile|author|pagination)/i;
  if (junkContextRegex.test(parentContext)) {
    score -= 150; // Heavy penalty for junk areas
  }

  // 6. URL keyword penalty
  const junkUrlRegex = /(logo|icon|sprite|avatar|profile|banner|ads?|thumb|nav|footer|header|menu|btn|button|loading|placeholder|pixel|tracking|analytics)/i;
  if (junkUrlRegex.test(image.url)) {
    score -= 120;
  }

  return score;
}

export function extractArticleImages(html: string, baseUrl: string, title: string = "") {
  const $ = cheerio.load(html);
  const images: ArticleImageCandidate[] = [];
  const seen = new Set<string>();

  // 1. Try OG Image first (usually high quality)
  const ogImage = $('meta[property="og:image"]').attr("content") || 
                  $('meta[name="twitter:image"]').attr("content");
  if (ogImage) {
    const url = toAbsoluteUrl(ogImage, baseUrl);
    if (/^https?:\/\//i.test(url)) {
      images.push({ url, score: 150 }); // Higher base score for verified OG image
      seen.add(url);
    }
  }

  // 2. Look for images in main content areas
  const mainSelectors = ["article", "main", "[role='main']", ".content", ".post-body", "#article-body", ".article-content", ".view-content"];
  let mainContainer = null;
  for (const selector of mainSelectors) {
    const found = $(selector);
    if (found.length > 0) {
      mainContainer = found;
      break;
    }
  }

  const searchRoot = mainContainer || $("body");
  
  searchRoot.find("img").each((_, el) => {
    const $img = $(el);
    
    // Get parent context (classes and IDs of parents up to 4 levels)
    let parentContext = "";
    let $parent = $img.parent();
    for (let i = 0; i < 4; i++) {
      if (!$parent.length) break;
      parentContext += ($parent.attr("class") || "") + " " + ($parent.attr("id") || "") + " ";
      $parent = $parent.parent();
    }

    const src = $img.attr("src") || 
                $img.attr("data-src") || 
                $img.attr("data-lazy-src") || 
                $img.attr("srcset")?.split(",")[0].split(" ")[0];
    
    if (!src) return;

    const url = toAbsoluteUrl(src, baseUrl);
    if (!/^https?:\/\//i.test(url) || seen.has(url)) return;

    // Filter out known tracking pixels and tiny icons immediately
    if (url.includes("pixel") || url.includes("tracking") || url.includes("/1x1.")) return;

    const width = parseInt($img.attr("width") || "0", 10) || undefined;
    const height = parseInt($img.attr("height") || "0", 10) || undefined;
    const alt = $img.attr("alt") || "";
    
    const candidate: ArticleImageCandidate = { url, width, height, alt };
    candidate.score = scoreImageCandidate(candidate, title, parentContext);

    // Strict threshold: Must have a significant positive score to be considered a "main content" image
    // This filters out "Other News" thumbnails that often have scores near 0 or slightly above.
    if (candidate.score > 40) { 
      images.push(candidate);
      seen.add(url);
    }
  });

  // Sort by score and filter out duplicates or near-duplicates (simple URL check)
  return images.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
}


export function stripHtml(html: string) {
  const $ = cheerio.load(html);
  // Remove scripts, styles, and ads
  $("script, style, ins, adsense, iframe").remove();
  return $.text().replace(/\s+/g, " ").trim();
}

export async function fetchArticleAssets(url?: string, title: string = "") {
  if (!url) return { content: "", images: [] as ArticleImageCandidate[] };
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.google.com/",
      },
      cache: "no-store",
    });

    if (!response.ok) return { content: "", images: [] as ArticleImageCandidate[] };
    const html = await response.text();
    
    return {
      content: stripHtml(html).slice(0, 8000),
      images: extractArticleImages(html, url, title),
    };
  } catch (error) {
    console.error("Asset extraction failed:", error);
    return { content: "", images: [] as ArticleImageCandidate[] };
  }
}

