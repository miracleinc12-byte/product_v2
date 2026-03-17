const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const posts = await p.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, slug: true, title: true, createdAt: true },
  });
  for (const post of posts) {
    console.log(`ID: ${post.id}`);
    console.log(`  slug: "${post.slug}"`);
    console.log(`  title: ${post.title}`);
    console.log(`  encoded: ${encodeURIComponent(post.slug)}`);
    console.log("");
  }
  await p.$disconnect();
}
main();
