import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json();
  const post = await prisma.post.update({ where: { slug }, data: body });
  return NextResponse.json(post);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  await prisma.post.delete({ where: { slug } });
  return NextResponse.json({ success: true });
}
