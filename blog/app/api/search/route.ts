import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) return NextResponse.json({ posts: [] });

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q } },
        { summary: { contains: q } },
        { content: { contains: q } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      category: true,
      tags: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ posts });
}
