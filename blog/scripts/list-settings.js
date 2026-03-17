const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const all = await p.setting.findMany();
  for (const s of all) {
    const masked = s.value.length > 6 ? s.value.slice(0, 3) + "***" + s.value.slice(-3) : "***";
    console.log(s.key + " = " + masked);
  }
  await p.$disconnect();
}
main();
