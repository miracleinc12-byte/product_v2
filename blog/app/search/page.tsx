"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import PostCard from "@/components/PostCard";
import AdBanner from "@/components/AdBanner";

interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string;
  createdAt: string;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts ?? []);
        setSearched(true);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
        {q ? `"${q}" 검색 결과` : "검색"}
      </h1>
      {searched && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">총 {posts.length}개의 결과</p>
      )}

      <AdBanner className="mb-6 rounded-xl overflow-hidden" />

      {loading && <p className="text-center py-20 text-gray-400">검색 중...</p>}

      {!loading && searched && posts.length === 0 && (
        <p className="text-center py-20 text-gray-400 dark:text-gray-500">검색 결과가 없습니다.</p>
      )}

      {!loading && posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-center py-20 text-gray-400">로딩 중...</p>}>
      <SearchResults />
    </Suspense>
  );
}
