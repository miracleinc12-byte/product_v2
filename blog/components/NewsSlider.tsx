"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

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
  posts: Post[];
  autoPlayInterval?: number;
}

export default function NewsSlider({ posts, autoPlayInterval = 5000 }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = posts.length;

  const go = useCallback((index: number) => {
    setCurrent((index + total) % total);
  }, [total]);

  const next = useCallback(() => go(current + 1), [go, current]);
  const prev = useCallback(() => go(current - 1), [go, current]);

  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setTimeout(next, autoPlayInterval);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, next, autoPlayInterval, total]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(false);
    dragStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const diff = e.clientX - dragStartX.current;
    if (Math.abs(diff) > 40) {
      setDragging(true);
      diff < 0 ? next() : prev();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - dragStartX.current;
    if (Math.abs(diff) > 40) diff < 0 ? next() : prev();
  };

  if (!posts.length) return null;

  const post = posts[current];

  return (
    <div
      className="select-none relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative overflow-hidden" style={{ height: "480px" }}>
        {posts.map((p, i) => (
          <div
            key={p.id}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
          >
            {p.thumbnail ? (
              <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[var(--nyt-bg-accent)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ))}

        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black rounded-full transition-all"
          style={{ opacity: paused ? 0.9 : 0, transition: "opacity 0.3s" }}
          aria-label="이전"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black rounded-full transition-all"
          style={{ opacity: paused ? 0.9 : 0, transition: "opacity 0.3s" }}
          aria-label="다음"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 md:p-6">
          <Link href={`/categories/${encodeURIComponent(post.category)}`}>
            <span className="inline-block text-[10px] font-sans font-bold uppercase tracking-widest text-white/60 hover:text-white/90 mb-2">
              {post.category}
            </span>
          </Link>
          <Link
            href={`/posts/${post.slug}`}
            onClick={(e) => dragging && e.preventDefault()}
          >
            <h2 className="font-serif text-2xl md:text-3xl font-black text-white leading-tight mb-2 hover:underline decoration-1 underline-offset-4 line-clamp-3">
              {post.title}
            </h2>
          </Link>
          <p className="font-sans text-sm text-white/75 leading-relaxed line-clamp-2 mb-3">
            {post.summary}
          </p>

          <div className="flex items-center gap-3">
            <time className="text-[11px] font-sans text-white/50">{formatDate(post.createdAt)}</time>
            <div className="flex gap-1.5">
              {posts.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); go(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === current ? "bg-white w-4" : "bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`슬라이드 ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
            {!paused && (
              <div
                key={`progress-${current}`}
                className="h-full bg-white/50"
                style={{ animation: `progress ${autoPlayInterval}ms linear forwards` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
