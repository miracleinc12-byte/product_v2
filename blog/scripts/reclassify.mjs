// 기존 테스트 글 카테고리를 새 분류 체계에 맞게 업데이트
const updates = [
  { slug: "ai-it-trend-2026", category: "IT·과학" },
  { slug: "global-economy-2026", category: "경제" },
  { slug: "carbon-neutral-2050", category: "사회" },
  { slug: "smartphone-foldable-2026", category: "IT·과학" },
  { slug: "korean-culture-wave-2026", category: "문화·연예" },
];

async function reclassify() {
  for (const item of updates) {
    const res = await fetch(`http://localhost:3000/api/posts/${item.slug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": "admin1234",
      },
      body: JSON.stringify({ category: item.category }),
    });
    const data = await res.json();
    console.log(res.ok ? `OK: ${item.slug} → ${item.category}` : `FAIL: ${JSON.stringify(data)}`);
  }
}

reclassify();
