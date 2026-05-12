interface NaverImageApiResponse {
  items?: Array<{
    title: string;
    link: string;
    thumbnail: string;
    sizeheight: string;
    sizewidth: string;
  }>;
}

async function fetchNaverImages(
  query: string,
  credentials: { clientId: string; clientSecret: string },
  count: number = 2
): Promise<string[]> {
  if (!credentials.clientId || !credentials.clientSecret) return [];
  try {
    const params = new URLSearchParams({
      query,
      display: String(count * 2),
      sort: "sim",
      filter: "large",
    });
    const res = await fetch(`https://openapi.naver.com/v1/search/image.json?${params.toString()}`, {
      headers: {
        "X-Naver-Client-Id": credentials.clientId,
        "X-Naver-Client-Secret": credentials.clientSecret,
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NaverImageApiResponse;
    // We can't strictly force 1:1 from Naver API, but we'll prefer large images
    return (data.items ?? []).map((item) => item.link).slice(0, count);
  } catch {
    return [];
  }
}

async function fetchUnsplashImages(keywords: string, unsplashKey: string, count: number = 2): Promise<string[]> {
  if (!unsplashKey) return [];
  try {
    const q = encodeURIComponent(keywords.split(",").slice(0, 3).join(" "));
    // Use orientation=squarish for 1:1 ratio
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=${count * 2}&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results: { urls: { regular: string } }[] };
    // Append width/height parameters to Unsplash URLs to ensure 1000x1000
    const urls = data.results?.map((r) => `${r.urls.regular}&w=1000&h=1000&fit=crop`) ?? [];
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
        prompt: `A high-quality editorial photo or professional illustration for: ${prompt}. Clean, modern, no text.`,
        n: 1,
        size: "1024x1024", // DALL-E 3 supports 1024x1024 for square
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: { url: string }[] };
    return data.data?.[0]?.url || null;
  } catch {
    return null;
  }
}

export async function generateIntelligentPrompt(title: string, content: string, geminiKey: string): Promise<string> {
  if (!geminiKey) return `A professional editorial photograph representing: ${title}`;
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this news article title and content. 
            Create a detailed, high-quality image generation prompt in English for a professional blog header. 
            
            CRITICAL GUIDELINES:
            1. Language: Use ONLY English. NEVER include Korean characters (Hangeul) in the prompt.
            2. Style: "Professional editorial news photography, Reuters style, award-winning journalism photo". 
            3. Context: If the title includes a nickname or metaphor (like "Devil" or "Monster"), do NOT interpret it literally. Create a realistic scene related to the ACTUAL news context (e.g., a courtroom, office, city street, or relevant objects).
            4. STRICT NO TEXT: Do not include any letters, signs, typography, watermarks, or text in the image. The image should be pure visual without any writing.
            5. Realism: Ensure the result looks like a real-world photograph, NOT a cartoon or digital art.
            
            Title: ${title}
            Summary: ${content.slice(0, 500)}
            
            Output ONLY the English prompt string, no other text.`
          }]
        }]
      })
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `Professional photography of ${title}`;
  } catch {
    return `Professional photography of ${title}`;
  }
}

async function generateFalImage(prompt: string, falKey: string): Promise<string | null> {
  if (!falKey) return null;
  try {
    const res = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: "square_hd", // Changed from landscape_4_3 to square_hd for 1:1
        num_inference_steps: 4,
        enable_safety_checker: true
      }),
    });
    
    if (!res.ok) return null;
    const { request_id } = await res.json();
    
    // Poll for result (Schnell is very fast, usually 1-2 polls)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/schnell/requests/${request_id}`, {
        headers: { Authorization: `Key ${falKey}` }
      });
      const statusData = await statusRes.json();
      if (statusData.status === "COMPLETED") return statusData.images?.[0]?.url;
      if (statusData.status === "FAILED") return null;
    }
    return null;
  } catch {
    return null;
  }
}

async function generateGeminiImage(prompt: string, geminiKey: string): Promise<string | null> {
  if (!geminiKey) return null;
  try {
    // Using Imagen 4.0 via Gemini API (v1beta) - Latest high-quality model
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: prompt.slice(0, 480) }], // Imagen 4.0 limit is 480 tokens
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1", // Changed from 16:9 to 1:1
          outputMimeType: "image/jpeg",
        }
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.log(`[Gemini Image API Error] Status: ${res.status}`, JSON.stringify(errorData));

      // Fallback to Imagen 4.0 Fast
      const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: prompt.slice(0, 480) }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1", // Changed from 16:9 to 1:1
            outputMimeType: "image/jpeg",
          }
        })
      });
      if (!fallbackRes.ok) {
        const fallbackError = await fallbackRes.json().catch(() => ({}));
        console.log(`[Gemini Fallback Error] Status: ${fallbackRes.status}`, JSON.stringify(fallbackError));
        return null;
      }
      const data = await fallbackRes.json();
      const base64 = data.predictions?.[0]?.bytesBase64Encoded;
      return base64 ? `data:image/jpeg;base64,${base64}` : null;
    }

    const data = await res.json();
    const base64 = data.predictions?.[0]?.bytesBase64Encoded;
    return base64 ? `data:image/jpeg;base64,${base64}` : null;
  } catch (err) {
    console.error(`[Gemini Image Exception]`, err);
    return null;
  }
}

export async function fetchImage(
  keyword: string,
  title: string,
  opts: { 
    falKey?: string; 
    unsplashKey?: string; 
    openAiKey?: string;
    naverClientId?: string;
    naverClientSecret?: string;
    geminiKey?: string;
    content?: string;
    useAi?: boolean;
  }
): Promise<{ url: string | null; prompt?: string; source: string }> {
  const query = `${keyword} ${title}`.trim();
  
  // 1. Intelligent AI Generation Flow (Used for abstract topics like Economy, Tech)
  if (opts.useAi && opts.geminiKey) {
    const intelligentPrompt = await generateIntelligentPrompt(title, opts.content || "", opts.geminiKey);
    
    // Try Gemini Imagen 3 first
    const geminiUrl = await generateGeminiImage(intelligentPrompt, opts.geminiKey);
    if (geminiUrl) return { url: geminiUrl, prompt: intelligentPrompt, source: "gemini (Imagen 3)" };

    // Try Fal.ai (Flux)
    if (opts.falKey) {
      const falUrl = await generateFalImage(intelligentPrompt, opts.falKey);
      if (falUrl) return { url: falUrl, prompt: intelligentPrompt, source: "fal-ai (Flux)" };
    }
  }

  // 2. Search-based Flow (Used for Celebrities, Sports, Politics or as fallback)
  // This ensures real photos of people like 'Lee Chan-won' are used.
  if (opts.naverClientId && opts.naverClientSecret) {
    // For specific people, the title alone is often the best search query
    const searchResults = await fetchNaverImages(title.slice(0, 50), {
      clientId: opts.naverClientId,
      clientSecret: opts.naverClientSecret
    }, 1);
    
    if (searchResults.length) return { url: searchResults[0], source: "naver-search" };

    // Fallback search with keyword
    const fallbackResults = await fetchNaverImages(query, {
      clientId: opts.naverClientId,
      clientSecret: opts.naverClientSecret
    }, 1);
    if (fallbackResults.length) return { url: fallbackResults[0], source: "naver-search" };
  }

  if (opts.unsplashKey) {
    const imgs = await fetchUnsplashImages(query, opts.unsplashKey, 1);
    if (imgs.length) return { url: imgs[0], source: "unsplash" };
  }
  
  return { url: null, source: "none" };
}

export async function fetchBodyImages(
  tags: string,
  title: string,
  opts: {
    unsplashKey?: string;
    naverClientId?: string;
    naverClientSecret?: string;
  },
  count: number = 2
): Promise<string[]> {
  const firstTag = tags.split(",")[0]?.trim() ?? "";
  const query = `${firstTag} ${title.slice(0, 30)}`.trim();
  
  let results: string[] = [];

  // Try Naver first for body images if it's likely a news topic
  if (opts.naverClientId && opts.naverClientSecret) {
    const naverResults = await fetchNaverImages(query, {
      clientId: opts.naverClientId,
      clientSecret: opts.naverClientSecret
    }, count);
    results.push(...naverResults);
  }

  // If not enough, fill with Unsplash
  if (results.length < count && opts.unsplashKey) {
    const unsplashResults = await fetchUnsplashImages(query, opts.unsplashKey, count - results.length);
    results.push(...unsplashResults);
  }

  return results.slice(0, count);
}

