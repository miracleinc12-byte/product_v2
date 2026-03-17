"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface Comment {
  id: number;
  author: string;
  content: string;
  createdAt: string;
}

interface Props {
  postId: number;
  initialComments: Comment[];
}

export default function CommentSection({ postId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      setError("이름과 댓글을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, author, content }),
    });

    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setAuthor("");
      setContent("");
    } else {
      setError("댓글 작성에 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        댓글 {comments.length}개
      </h2>

      <div className="space-y-4 mb-8">
        {comments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">첫 댓글을 남겨보세요.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{c.author}</span>
                <time className="text-xs text-gray-400 dark:text-gray-500">{formatDate(c.createdAt)}</time>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">댓글 작성</h3>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="이름"
          className="w-full mb-3 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요..."
          rows={4}
          className="w-full mb-3 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "등록 중..." : "댓글 등록"}
        </button>
      </form>
    </section>
  );
}
