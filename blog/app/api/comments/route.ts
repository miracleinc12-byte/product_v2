import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = parseInt(searchParams.get("postId") ?? "0");

  if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { postId, author, content } = body;

  if (!postId || !author || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { postId: parseInt(postId), author, content },
  });

  return NextResponse.json(comment, { status: 201 });
}
