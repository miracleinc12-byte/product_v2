"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    category: "",
    tags: "",
    thumbnail: "",
    published: true,
  });
  const [content, setContent] = useState("## 여기에 내용을 작성하세요");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthed(true);
  };

  const handleSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ ...form, content }),
    });

    if (res.ok) {
      setMessage("글이 성공적으로 작성되었습니다!");
      setForm({ title: "", slug: "", summary: "", category: "", tags: "", thumbnail: "", published: true });
      setContent("## 여기에 내용을 작성하세요");
    } else {
      const data = await res.json();
      setMessage(`오류: ${data.error}`);
    }
    setLoading(false);
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6 text-center">관리자 로그인</h1>
        <form onSubmit={handleAuth} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="관리자 시크릿 키"
            className="w-full px-4 py-2 mb-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            입장
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">글 작성</h1>

      {message && (
        <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${message.startsWith("오류") ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: handleSlug(e.target.value) }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">슬러그 *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">카테고리 *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">태그 (쉼표 구분)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="예: 뉴스, AI, 경제"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">요약 *</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              required
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">썸네일 URL</label>
            <input
              type="url"
              value={form.thumbnail}
              onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">본문 (Markdown) *</label>
          <div data-color-mode="auto">
            <MDEditor value={content} onChange={(v) => setContent(v ?? "")} height={400} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">바로 공개</span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="ml-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "저장 중..." : "글 게시"}
          </button>
        </div>
      </form>
    </div>
  );
}
