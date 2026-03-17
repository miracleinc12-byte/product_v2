import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = 20;

  const where = {
    ...(category ? { category } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        published: true,
        viewCount: true,
        createdAt: true,
      },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function DELETE(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json().catch(() => ({ ids: [] })) as { ids: number[] };
  if (!ids.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

  await prisma.post.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ deleted: ids.length });
}
