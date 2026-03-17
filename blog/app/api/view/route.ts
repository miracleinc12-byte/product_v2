import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { slug } = await req.json().catch(() => ({ slug: "" }));
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  await prisma.post.updateMany({
    where: { slug },
    data: { viewCount: { increment: 1 } },
  });
  return NextResponse.json({ ok: true });
}
