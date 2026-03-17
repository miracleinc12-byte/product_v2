import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");

  const where: Record<string, unknown> = { published: true };
  if (category) where.category = category;
  if (tag) where.tags = { contains: tag };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        category: true,
        tags: true,
        thumbnail: true,
        createdAt: true,
      },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, slug, content, summary, category, tags, thumbnail, published } = body;

  if (!title || !slug || !content || !summary || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: { title, slug, content, summary, category, tags: tags ?? "", thumbnail, published: published ?? false },
  });

  return NextResponse.json(post, { status: 201 });
}
