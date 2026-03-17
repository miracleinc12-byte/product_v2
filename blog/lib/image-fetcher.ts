async function fetchUnsplashImages(keywords: string, unsplashKey: string, count: number = 2): Promise<string[]> {
  if (!unsplashKey) return [];
  try {
    const q = encodeURIComponent(keywords.split(",").slice(0, 2).join(" "));
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=${count * 2}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { results: { urls: { regular: string } }[] };
    const urls = data.results?.map((r) => r.urls.regular) ?? [];
    return [...new Set(urls)].slice(0, count);
  } catch {
    return [];
  }
}

export async function fetchImage(
  keyword: string,
  title: string,
  opts: { falKey?: string; unsplashKey?: string }
): Promise<string | null> {
  if (opts.unsplashKey) {
    const imgs = await fetchUnsplashImages(`${keyword} ${title}`, opts.unsplashKey, 1);
    if (imgs.length) return imgs[0];
  }
  return null;
}

export async function fetchBodyImages(
  tags: string,
  title: string,
  unsplashKey: string,
  count: number = 2
): Promise<string[]> {
  if (!unsplashKey) return [];
  const query = `${tags.split(",")[0]?.trim() ?? ""} ${title.slice(0, 20)}`.trim();
  return fetchUnsplashImages(query, unsplashKey, count);
}
