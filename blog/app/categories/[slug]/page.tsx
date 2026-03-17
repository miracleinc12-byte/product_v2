import PostCard from "@/components/PostCard";
import AdBanner from "@/components/AdBanner";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = decodeURIComponent(slug);

  const posts = await prisma.post.findMany({
    where: { published: true, category },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, summary: true, category: true, tags: true, thumbnail: true, createdAt: true },
  });

  const first = posts[0];
  const rest = posts.slice(1);

  return (
    <div>
      <div className="nyt-divider-thick mb-6">
        <h1 className="font-serif text-3xl font-black text-[var(--nyt-black)] pt-2">{category}</h1>
        <p className="text-xs font-sans text-[var(--nyt-light)] mt-1">{posts.length}개의 기사</p>
      </div>

      <AdBanner className="mb-6" />

      {posts.length === 0 ? (
        <p className="text-center py-20 text-[var(--nyt-light)] font-sans">해당 카테고리에 기사가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {first && (
            <div className="lg:col-span-8 lg:pr-6 lg:nyt-divider-v mb-8">
              <PostCard post={{ ...first, createdAt: first.createdAt.toISOString() }} variant="hero" />
            </div>
          )}
          <div className="lg:col-span-4 lg:pl-6">
            {rest.slice(0, 5).map((post, i) => (
              <div key={post.id}>
                <PostCard post={{ ...post, createdAt: post.createdAt.toISOString() }} variant="compact" />
                {i < Math.min(rest.length, 5) - 1 && <div className="nyt-divider" />}
              </div>
            ))}
          </div>
          {rest.length > 5 && (
            <div className="lg:col-span-12 mt-8 pt-6 nyt-divider">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {rest.slice(5).map((post) => (
                  <PostCard key={post.id} post={{ ...post, createdAt: post.createdAt.toISOString() }} variant="standard" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
