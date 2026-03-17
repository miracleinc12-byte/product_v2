const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const posts = await p.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, title: true, category: true, usedUrl: true, createdAt: true },
  });
  posts.forEach((x) => {
    console.log(`[${x.category}] usedUrl=${x.usedUrl ? "있음" : "없음"} | ${x.title.slice(0, 40)}`);
  });
  await p.$disconnect();
}
main();
