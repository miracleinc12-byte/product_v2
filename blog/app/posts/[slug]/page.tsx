import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { markdownToHtml, formatDate, parseTags } from "@/lib/utils";
import CommentSection from "@/components/CommentSection";
import AdBanner from "@/components/AdBanner";
import ViewCounter from "@/components/ViewCounter";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({ where: { published: true }, select: { slug: true } });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const post = await prisma.post.findUnique({ where: { slug: decoded, published: true } });
  if (!post) return {};
  return { title: `${post.title} - The Daily Post`, description: post.summary };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const post = await prisma.post.findUnique({
    where: { slug: decoded, published: true },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });

  if (!post) notFound();

  const contentHtml = await markdownToHtml(post.content);
  const tags = parseTags(post.tags);

  const related = await prisma.post.findMany({
    where: { published: true, category: post.category, NOT: { slug: post.slug } },
    take: 4,
    orderBy: { createdAt: "desc" },
    select: { title: true, slug: true, summary: true, createdAt: true, category: true, thumbnail: true },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
      <ViewCounter slug={post.slug} />
      {/* 본문 */}
      <article className="lg:col-span-8 lg:pr-8 lg:nyt-divider-v">
        {/* 브레드크럼 */}
        <nav className="text-xs font-sans text-[var(--nyt-light)] mb-6">
          <Link href="/" className="hover:text-[var(--nyt-black)]">홈</Link>
          <span className="mx-2">/</span>
          <Link href={`/categories/${encodeURIComponent(post.category)}`} className="hover:text-[var(--nyt-black)]">
            {post.category}
          </Link>
        </nav>

        {/* 헤더 */}
        <header className="mb-8">
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-[var(--nyt-light)]">
            {post.category}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-black leading-tight mt-2 mb-4 text-[var(--nyt-black)]">
            {post.title}
          </h1>
          <p className="font-sans text-lg text-[var(--nyt-gray)] leading-relaxed mb-4">{post.summary}</p>
          <div className="flex items-center gap-4 text-xs font-sans text-[var(--nyt-light)] nyt-divider pt-4">
            <time>{formatDate(post.createdAt)}</time>
          </div>
        </header>

        {post.thumbnail && (
          <figure className="mb-8">
            <img src={post.thumbnail} alt={post.title} className="w-full h-auto max-h-[500px] object-cover" />
          </figure>
        )}

        <AdBanner className="mb-8" />

        {/* 본문 내용 */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-serif prose-headings:text-[var(--nyt-black)]
            prose-p:font-sans prose-p:text-[var(--nyt-gray)] prose-p:leading-[1.8]
            prose-a:text-[var(--nyt-black)] prose-a:underline
            prose-blockquote:border-l-[var(--nyt-black)] prose-blockquote:text-[var(--nyt-gray)]
            prose-strong:text-[var(--nyt-black)]"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 nyt-divider">
            {tags.map((tag) => (
              <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}
                className="text-xs font-sans px-3 py-1 border border-[var(--nyt-border)] text-[var(--nyt-gray)] hover:bg-[var(--nyt-bg-accent)] transition-colors">
                {tag}
              </Link>
            ))}
          </div>
        )}

        <AdBanner className="mt-8" />

        {/* 댓글 */}
        <div className="mt-8 pt-6 nyt-divider">
          <CommentSection
            postId={post.id}
            initialComments={post.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
          />
        </div>
      </article>

      {/* 사이드바 */}
      <aside className="lg:col-span-4 lg:pl-6 mt-10 lg:mt-0">
        <AdBanner slot="SIDEBAR_SLOT_ID" format="rectangle" className="mb-6" />

        {related.length > 0 && (
          <div>
            <div className="nyt-divider-thick mb-4">
              <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--nyt-black)] pt-2">
                관련 기사
              </h3>
            </div>
            <div>
              {related.map((r, i) => (
                <div key={r.slug}>
                  <article className="flex gap-3 py-3 group">
                    {r.thumbnail && (
                      <Link href={`/posts/${r.slug}`} className="shrink-0">
                        <img src={r.thumbnail} alt={r.title} className="w-28 h-20 object-cover" />
                      </Link>
                    )}
                    <div>
                      <Link href={`/posts/${r.slug}`}>
                        <h4 className="font-serif text-sm font-bold leading-snug text-[var(--nyt-black)] group-hover:text-[var(--nyt-gray)] transition-colors line-clamp-2">
                          {r.title}
                        </h4>
                      </Link>
                      <time className="text-[10px] font-sans text-[var(--nyt-light)] mt-1 block">{formatDate(r.createdAt)}</time>
                    </div>
                  </article>
                  {i < related.length - 1 && <div className="nyt-divider" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
