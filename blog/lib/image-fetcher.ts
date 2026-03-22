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

async function generateDalleImage(prompt: string, openAiKey: string): Promise<string | null> {
  if (!openAiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `An editorial illustration for a blog post about: ${prompt}. The image should be modern, clean, and highly relevant. Do not include any text.`,
        n: 1,
        size: "1024x1024",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data: { url: string }[] };
    return data.data?.[0]?.url || null;
  } catch {
    return null;
  }
}

export async function fetchImage(
  keyword: string,
  title: string,
  opts: { falKey?: string; unsplashKey?: string; openAiKey?: string }
): Promise<string | null> {
  const query = `${keyword} ${title}`;
  
  // Try DALL-E first if key is provided
  if (opts.openAiKey) {
    const dalleImage = await generateDalleImage(query, opts.openAiKey);
    if (dalleImage) return dalleImage;
  }

  // Fallback to Unsplash
  if (opts.unsplashKey) {
    const imgs = await fetchUnsplashImages(query, opts.unsplashKey, 1);
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
