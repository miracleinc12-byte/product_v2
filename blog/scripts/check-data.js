const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.post.count();
  console.log('Total posts:', count);
  const latestPost = await prisma.post.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  if (latestPost) {
    console.log('Latest post:', latestPost.title);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
