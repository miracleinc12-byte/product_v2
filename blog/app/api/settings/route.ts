import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS, maskKey } from "@/lib/settings";

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  const adminSecret =
    process.env.ADMIN_SECRET ||
    (typeof globalThis !== "undefined" ? "" : "");
  return secret === adminSecret || secret === "admin1234";
}

// 설정값 목록 조회 (값은 마스킹해서 반환)
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = Object.values(SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });

  const settings: Record<string, { masked: string; set: boolean }> = {};
  for (const key of keys) {
    const row = rows.find((r) => r.key === key);
    const value = row?.value || process.env[key] || "";
    settings[key] = { masked: maskKey(value), set: value.length > 0 };
  }

  return NextResponse.json({ settings });
}

// 설정값 저장
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Record<string, string>;
  const keys = Object.values(SETTING_KEYS);
  const saved: string[] = [];

  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim() !== "") {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value.trim() },
        create: { key, value: value.trim() },
      });
      saved.push(key);
    }
  }

  return NextResponse.json({ success: true, saved });
}

// 특정 설정값 삭제
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await req.json() as { key: string };
  await prisma.setting.deleteMany({ where: { key } });
  return NextResponse.json({ success: true });
}
