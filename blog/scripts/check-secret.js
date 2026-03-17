const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const row = await p.setting.findFirst({ where: { key: "CRON_SECRET" } });
  if (row) {
    console.log("CRON_SECRET is set: ***" + row.value.slice(-4));
    console.log("FULL:" + row.value);
  } else {
    console.log("NOT SET");
  }
  await p.$disconnect();
}
main();
