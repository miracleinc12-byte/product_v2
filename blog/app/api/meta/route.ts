import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { category: true, tags: true },
  });

  const categories = [...new Set(posts.map((p) => p.category))].sort();
  const tagSet = new Set<string>();
  posts.forEach((p) => {
    p.tags.split(",").forEach((t) => {
      const trimmed = t.trim();
      if (trimmed) tagSet.add(trimmed);
    });
  });
  const tags = [...tagSet].sort();

  return NextResponse.json({ categories, tags });
}
