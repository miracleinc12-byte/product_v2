const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  await p.setting.upsert({
    where: { key: "CRON_SECRET" },
    update: { value: "test-cron-secret-1234" },
    create: { key: "CRON_SECRET", value: "test-cron-secret-1234" },
  });
  console.log("CRON_SECRET saved: test-cron-secret-1234");
  await p.$disconnect();
}
main();
