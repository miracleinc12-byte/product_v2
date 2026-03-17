"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

interface PostItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  published: boolean;
  viewCount: number;
  createdAt: string;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [secret] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("admin_secret") ?? "";
    return "";
  });

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (category) params.set("category", category);
    const res = await fetch(`/api/admin/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setSelected(new Set());
    setLoading(false);
  }, [page, category]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === posts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(posts.map((p) => p.id)));
    }
  };

  const handleDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`${selected.size}개의 기사를 삭제하시겠습니까?`)) return;

    await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    loadPosts();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-black text-[var(--nyt-black)]">기사 관리</h1>
        <span className="text-sm font-sans text-[var(--nyt-gray)]">총 {total}개</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-[var(--nyt-border)] bg-[var(--nyt-bg)] text-[var(--nyt-black)] font-sans"
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {selected.size > 0 && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 transition-colors font-sans"
          >
            선택 삭제 ({selected.size})
          </button>
        )}
      </div>

      <div className="border border-[var(--nyt-border)] bg-[var(--nyt-bg)]">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-[var(--nyt-border)] bg-[var(--nyt-bg-accent)] text-[11px] font-sans font-bold uppercase tracking-wider text-[var(--nyt-gray)]">
          <div className="col-span-1">
            <input type="checkbox" checked={selected.size === posts.length && posts.length > 0} onChange={toggleAll} />
          </div>
          <div className="col-span-5">제목</div>
          <div className="col-span-2">카테고리</div>
          <div className="col-span-1 text-center">조회</div>
          <div className="col-span-1 text-center">상태</div>
          <div className="col-span-2">작성일</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm font-sans text-[var(--nyt-gray)]">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-sm font-sans text-[var(--nyt-gray)]">기사가 없습니다</div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--nyt-border)] text-sm font-sans hover:bg-[var(--nyt-bg-accent)] transition-colors ${
                selected.has(post.id) ? "bg-blue-50 dark:bg-blue-950" : ""
              }`}
            >
              <div className="col-span-1 flex items-center">
                <input type="checkbox" checked={selected.has(post.id)} onChange={() => toggleSelect(post.id)} />
              </div>
              <div className="col-span-5">
                <Link href={`/posts/${post.slug}`} className="text-[var(--nyt-black)] hover:underline font-serif font-bold text-[13px] line-clamp-1">
                  {post.title}
                </Link>
              </div>
              <div className="col-span-2 text-[var(--nyt-gray)] text-xs flex items-center">{post.category}</div>
              <div className="col-span-1 text-center text-[var(--nyt-gray)] text-xs flex items-center justify-center">{post.viewCount}</div>
              <div className="col-span-1 text-center flex items-center justify-center">
                <span className={`inline-block w-2 h-2 rounded-full ${post.published ? "bg-green-500" : "bg-gray-400"}`} />
              </div>
              <div className="col-span-2 text-[var(--nyt-gray)] text-xs flex items-center">
                {new Date(post.createdAt).toLocaleDateString("ko-KR")}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-[var(--nyt-border)] text-[var(--nyt-gray)] hover:bg-[var(--nyt-bg-accent)] disabled:opacity-30 font-sans"
          >
            이전
          </button>
          <span className="text-sm font-sans text-[var(--nyt-gray)]">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-[var(--nyt-border)] text-[var(--nyt-gray)] hover:bg-[var(--nyt-bg-accent)] disabled:opacity-30 font-sans"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
