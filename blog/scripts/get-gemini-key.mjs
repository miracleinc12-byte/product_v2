import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const setting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
  if (setting) {
    console.log(setting.value);
  }
  await prisma.$disconnect();
}
main();
