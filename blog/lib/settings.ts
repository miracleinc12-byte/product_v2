import { prisma } from "./prisma";

export const SETTING_KEYS = {
  GEMINI_API_KEY: "GEMINI_API_KEY",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  NEWS_API_KEY: "NEWS_API_KEY",
  NAVER_CLIENT_ID: "NAVER_CLIENT_ID",
  NAVER_CLIENT_SECRET: "NAVER_CLIENT_SECRET",
  FAL_KEY: "FAL_KEY",
  UNSPLASH_ACCESS_KEY: "UNSPLASH_ACCESS_KEY",
  CRON_SECRET: "CRON_SECRET",
  ADMIN_SECRET: "ADMIN_SECRET",
  ARTICLE_LENGTH: "ARTICLE_LENGTH",
} as const;

export type SettingKey = keyof typeof SETTING_KEYS;

export async function getSetting(key: SettingKey): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch {}
  return process.env[key] ?? null;
}

export async function getSettings(keys: SettingKey[]): Promise<Record<string, string>> {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const result: Record<string, string> = {};
    for (const key of keys) {
      const row = rows.find((item) => item.key === key);
      result[key] = row?.value || process.env[key] || "";
    }
    return result;
  } catch {
    const result: Record<string, string> = {};
    for (const key of keys) result[key] = process.env[key] || "";
    return result;
  }
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export function maskKey(value: string): string {
  if (!value || value.length < 8) return value ? "••••••••" : "";
  return `${value.slice(0, 6)}••••••••••••${value.slice(-4)}`;
}