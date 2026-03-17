import Link from "next/link";
import { formatDate, parseTags } from "@/lib/utils";

interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string;
  thumbnail?: string | null;
  createdAt: string;
}

interface Props {
  post: Post;
  variant?: "hero" | "standard" | "compact" | "sidebar";
}

export default function PostCard({ post, variant = "standard" }: Props) {
  const tags = parseTags(post.tags);

  // 히어로: 메인 톱기사
  if (variant === "hero") {
    return (
      <article>
        {post.thumbnail && (
          <Link href={`/posts/${post.slug}`} className="block mb-4">
            <img src={post.thumbnail} alt={post.title} className="w-full h-auto max-h-[480px] object-cover" />
          </Link>
        )}
        <Link href={`/categories/${encodeURIComponent(post.category)}`}>
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-[var(--nyt-light)] hover:text-[var(--nyt-black)] transition-colors">
            {post.category}
          </span>
        </Link>
        <Link href={`/posts/${post.slug}`}>
          <h2 className="font-serif text-3xl md:text-4xl font-black leading-tight mt-2 mb-3 text-[var(--nyt-black)] hover:text-[var(--nyt-gray)] transition-colors">
            {post.title}
          </h2>
        </Link>
        <p className="font-sans text-base text-[var(--nyt-gray)] leading-relaxed mb-2 line-clamp-3">{post.summary}</p>
        <time className="text-xs font-sans text-[var(--nyt-light)]">{formatDate(post.createdAt)}</time>
      </article>
    );
  }

  // 스탠다드: 일반 기사 카드 (이미지 + 텍스트)
  if (variant === "standard") {
    return (
      <article className="group">
        {post.thumbnail && (
          <Link href={`/posts/${post.slug}`} className="block mb-3">
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
            />
          </Link>
        )}
        <Link href={`/categories/${encodeURIComponent(post.category)}`}>
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--nyt-light)] hover:text-[var(--nyt-black)]">
            {post.category}
          </span>
        </Link>
        <Link href={`/posts/${post.slug}`}>
          <h3 className="font-serif text-lg font-bold leading-snug mt-1 mb-1.5 text-[var(--nyt-black)] group-hover:text-[var(--nyt-gray)] transition-colors line-clamp-3">
            {post.title}
          </h3>
        </Link>
        <p className="font-sans text-sm text-[var(--nyt-gray)] leading-relaxed line-clamp-2 mb-2">{post.summary}</p>
        <time className="text-[11px] font-sans text-[var(--nyt-light)]">{formatDate(post.createdAt)}</time>
      </article>
    );
  }

  // 컴팩트: 텍스트만 (사이드, 목록)
  if (variant === "compact") {
    return (
      <article className="py-3 group">
        <Link href={`/categories/${encodeURIComponent(post.category)}`}>
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--nyt-light)]">
            {post.category}
          </span>
        </Link>
        <Link href={`/posts/${post.slug}`}>
          <h3 className="font-serif text-base font-bold leading-snug mt-0.5 text-[var(--nyt-black)] group-hover:text-[var(--nyt-gray)] transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>
        <p className="font-sans text-sm text-[var(--nyt-light)] line-clamp-1 mt-1">{post.summary}</p>
      </article>
    );
  }

  // 사이드바: 이미지 + 텍스트 가로
  return (
    <article className="flex gap-3 py-3 group">
      {post.thumbnail && (
        <Link href={`/posts/${post.slug}`} className="shrink-0">
          <img src={post.thumbnail} alt={post.title} className="w-28 h-20 object-cover" />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/categories/${encodeURIComponent(post.category)}`}>
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--nyt-light)]">
            {post.category}
          </span>
        </Link>
        <Link href={`/posts/${post.slug}`}>
          <h3 className="font-serif text-sm font-bold leading-snug mt-0.5 text-[var(--nyt-black)] group-hover:text-[var(--nyt-gray)] transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>
        <time className="text-[10px] font-sans text-[var(--nyt-light)] mt-1 block">{formatDate(post.createdAt)}</time>
      </div>
    </article>
  );
}
