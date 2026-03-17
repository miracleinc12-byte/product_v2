import PostCard from "@/components/PostCard";
import AdBanner from "@/components/AdBanner";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = decodeURIComponent(slug);

  const posts = await prisma.post.findMany({
    where: { published: true, tags: { contains: tag } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, summary: true, category: true, tags: true, thumbnail: true, createdAt: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
        태그: <span className="text-blue-600 dark:text-blue-400">#{tag}</span>
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">총 {posts.length}개의 글</p>

      <AdBanner className="mb-6 rounded-xl overflow-hidden" />

      {posts.length === 0 ? (
        <p className="text-center py-20 text-gray-400 dark:text-gray-500">해당 태그에 글이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={{ ...post, createdAt: post.createdAt.toISOString() }} />
          ))}
        </div>
      )}
    </div>
  );
}
