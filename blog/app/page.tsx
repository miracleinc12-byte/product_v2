import Link from "next/link";
import PostCard from "@/components/PostCard";
import AdBanner from "@/components/AdBanner";
import NewsSlider from "@/components/NewsSlider";
import TrendingRank from "@/components/TrendingRank";
import StockTicker from "@/components/StockTicker";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";

export const revalidate = 60;

export default async function Home() {
  const allPosts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
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
  });

  const serialize = (p: (typeof allPosts)[0]) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  });

  const sliderPosts = allPosts.slice(0, 5);
  const leftPosts = allPosts.slice(5, 9);
  const rightPosts = allPosts.slice(9, 13);
  const latest = allPosts.slice(13, 19);

  const categoryMap: Record<string, typeof allPosts> = {};
  CATEGORIES.forEach((cat) => {
    categoryMap[cat.slug] = allPosts.filter((p) => p.category === cat.slug).slice(0, 4);
  });
  const activeCats = CATEGORIES.filter((cat) => (categoryMap[cat.slug]?.length ?? 0) > 0);

  if (!allPosts.length) {
    return (
      <div className="text-center py-24 text-[var(--nyt-light)] font-sans">
        <p className="text-lg">아직 게시글이 없습니다.</p>
        <p className="text-sm mt-2">
          <Link href="/admin" className="underline">
            관리자 페이지
          </Link>
          에서 첫 글을 작성해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-[var(--nyt-border)] pb-6">
        <div className="hidden lg:block lg:col-span-3 lg:pr-5 border-r border-[var(--nyt-border)]">
          {leftPosts.map((post, i) => (
            <div key={post.id}>
              <article className="py-4 group">
                <Link href={`/categories/${encodeURIComponent(post.category)}`}>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--nyt-light)] hover:text-[var(--nyt-black)]">
                    {post.category}
                  </span>
                </Link>
                <Link href={`/posts/${post.slug}`}>
                  <h3 className="font-serif text-[15px] font-bold leading-snug mt-1 mb-1.5 text-[var(--nyt-black)] group-hover:text-[var(--nyt-gray)] transition-colors line-clamp-3">
                    {post.title}
                  </h3>
                </Link>
                <p className="font-sans text-[13px] text-[var(--nyt-gray)] leading-relaxed line-clamp-2">
                  {post.summary}
                </p>
              </article>
              {i < leftPosts.length - 1 && <div className="nyt-divider" />}
            </div>
          ))}
        </div>

        <div className="lg:col-span-6 lg:px-5">
          {sliderPosts.length > 0 && (
            <>
              <NewsSlider posts={sliderPosts.map(serialize)} />
              <div className="mt-4">
                <StockTicker />
              </div>
            </>
          )}
        </div>

        <div className="hidden lg:block lg:col-span-3 lg:pl-5 border-l border-[var(--nyt-border)]">
          <TrendingRank />
        </div>
      </section>

      <section className="lg:hidden mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {[...leftPosts, ...rightPosts].slice(0, 4).map((post) => (
            <div key={post.id} className="py-3 border-b border-[var(--nyt-border)]">
              <PostCard post={serialize(post)} variant="compact" />
            </div>
          ))}
        </div>
      </section>

      <div className="my-8 nyt-divider" />

      <AdBanner className="my-6" />

      {latest.length > 0 && (
        <section>
          <div className="nyt-divider-thick mb-4">
            <h2 className="font-serif text-xl font-black text-[var(--nyt-black)] pt-2">최신 기사</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0">
            {latest.map((post, i) => (
              <div key={post.id}>
                <div className="py-4">
                  <PostCard post={serialize(post)} variant="standard" />
                </div>
                {i < latest.length - 1 && <div className="nyt-divider lg:hidden" />}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="my-8 nyt-divider" />

      <AdBanner className="my-6" />

      {activeCats.map((cat) => {
        const catPosts = categoryMap[cat.slug];
        if (!catPosts.length) return null;
        const first = catPosts[0];
        const catRest = catPosts.slice(1);

        return (
          <section key={cat.slug} className="mb-10">
            <div className="nyt-divider-thick mb-4">
              <div className="flex items-center justify-between pt-2">
                <h2 className="font-serif text-xl font-black text-[var(--nyt-black)]">{cat.name}</h2>
                <Link
                  href={`/categories/${encodeURIComponent(cat.slug)}`}
                  className="text-xs font-sans text-[var(--nyt-light)] hover:text-[var(--nyt-black)] transition-colors"
                >
                  전체 보기 →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-8 lg:pr-5">
                <PostCard post={serialize(first)} variant="standard" />
              </div>
              {catRest.length > 0 && (
                <div className="lg:col-span-4 lg:pl-5 border-l border-[var(--nyt-border)]">
                  {catRest.map((post, i) => (
                    <div key={post.id}>
                      <PostCard post={serialize(post)} variant="compact" />
                      {i < catRest.length - 1 && <div className="nyt-divider" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}