const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Automation Rules ---');
  const rules = await prisma.automationRule.findMany();
  rules.forEach(r => console.log(`[${r.category}] Enabled: ${r.enabled}, Mode: ${r.publishMode}`));

  console.log('\n--- Recent Generation Jobs (Last 5) ---');
  const jobs = await prisma.generationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  jobs.forEach(j => console.log(`[${j.createdAt.toISOString()}] ${j.category}: ${j.status} (Error: ${j.error ?? 'None'})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
