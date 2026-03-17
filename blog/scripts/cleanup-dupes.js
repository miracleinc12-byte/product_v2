const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

function extractKeywords(s) {
  return s.replace(/[^가-힣a-z0-9\s]/gi, " ").toLowerCase().split(/\s+/).filter(w => w.length > 1);
}

function isSimilar(a, b) {
  const ka = new Set(extractKeywords(a));
  const kb = new Set(extractKeywords(b));
  if (!ka.size || !kb.size) return false;
  let overlap = 0;
  for (const w of ka) if (kb.has(w)) overlap++;
  return overlap / Math.min(ka.size, kb.size) >= 0.35;
}

async function main() {
  const posts = await p.post.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, title: true, category: true, createdAt: true } });
  const toDelete = [];
  const seen = [];

  for (const post of posts) {
    const dup = seen.find(s => s.category === post.category && isSimilar(s.title, post.title));
    if (dup) {
      console.log(`중복 발견: [${post.category}] "${post.title.slice(0,30)}" ← "${dup.title.slice(0,30)}"`);
      toDelete.push(post.id);
    } else {
      seen.push(post);
    }
  }

  if (toDelete.length) {
    console.log(`\n${toDelete.length}개 중복 기사 삭제 중...`);
    await p.post.deleteMany({ where: { id: { in: toDelete } } });
    console.log("완료!");
  } else {
    console.log("중복 기사 없음");
  }
  await p.$disconnect();
}
main();
