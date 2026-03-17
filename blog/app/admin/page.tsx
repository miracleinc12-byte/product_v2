"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const ARTICLE_TYPES = [
  { value: "news-analysis", label: "뉴스 분석" },
  { value: "issue-brief", label: "이슈 브리프" },
  { value: "trend-report", label: "트렌드 리포트" },
  { value: "deep-dive", label: "심층 해설" },
  { value: "opinion-summary", label: "관점 정리" },
];

interface DraftPayload {
  category: string;
  articleType: string;
  referenceUrl: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceName?: string;
}

interface GeneratedDraft {
  title: string;
  summary: string;
  content: string;
  tags: string;
  category: string;
  articleType: string;
  referenceUrl: string;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_CONTENT = "## 여기에 내용을 작성하세요";

export default function AdminPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    category: "",
    articleType: ARTICLE_TYPES[0].value,
    referenceUrl: "",
    tags: "",
    thumbnail: "",
    published: true,
  });
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("admin_secret");
    if (!saved) return;
    setSecret(saved);
    setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed || !secret) return;

    const raw = sessionStorage.getItem("admin_draft_source");
    if (!raw) return;

    const payload = JSON.parse(raw) as DraftPayload;
    sessionStorage.removeItem("admin_draft_source");

    setForm((current) => ({
      ...current,
      category: payload.category,
      articleType: payload.articleType,
      referenceUrl: payload.referenceUrl,
    }));

    void generateDraft(payload, secret);
  }, [authed, secret]);

  const handleAuth = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem("admin_secret", secret);
    setAuthed(true);
  };

  const handleSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  };

  const applyDraft = (draft: GeneratedDraft) => {
    setForm((current) => ({
      ...current,
      title: draft.title,
      slug: handleSlug(draft.title),
      summary: draft.summary,
      category: draft.category,
      articleType: draft.articleType,
      referenceUrl: draft.referenceUrl,
      tags: draft.tags,
    }));
    setContent(draft.content);
    setMessage("SEO 초안을 불러왔습니다. 내용을 검토한 뒤 게시하세요.");
  };

  const generateDraft = async (payload: DraftPayload, adminSecret: string) => {
    setDraftLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/rewrite-article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { draft?: GeneratedDraft; error?: string };
      if (!response.ok || !data.draft) {
        setMessage(`오류: ${data.error ?? "초안 생성에 실패했습니다."}`);
        return;
      }

      applyDraft(data.draft);
    } catch {
      setMessage("오류: 초안 생성 중 문제가 발생했습니다.");
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ ...form, content }),
    });

    if (response.ok) {
      setMessage("글이 성공적으로 저장되었습니다.");
      setForm({
        title: "",
        slug: "",
        summary: "",
        category: "",
        articleType: ARTICLE_TYPES[0].value,
        referenceUrl: "",
        tags: "",
        thumbnail: "",
        published: true,
      });
      setContent(EMPTY_CONTENT);
      router.refresh();
    } else {
      const data = await response.json();
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
            onChange={(event) => setSecret(event.target.value)}
            placeholder="관리자 시크릿"
            className="w-full px-4 py-2 mb-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">기사 작성</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">트렌드 화면에서 가져온 기사도 여기서 SEO 초안으로 편집할 수 있습니다.</p>
        </div>
        {draftLoading && <span className="text-sm text-blue-600 dark:text-blue-400">SEO 초안 생성 중...</span>}
      </div>

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
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: handleSlug(event.target.value) }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">슬러그 *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">카테고리 *</label>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">기사 유형 *</label>
            <select
              value={form.articleType}
              onChange={(event) => setForm((current) => ({ ...current, articleType: event.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {ARTICLE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">참고 URL</label>
            <input
              type="url"
              value={form.referenceUrl}
              onChange={(event) => setForm((current) => ({ ...current, referenceUrl: event.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">태그 (쉼표 구분)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="네이버, SEO, 트렌드"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">썸네일 URL</label>
            <input
              type="url"
              value={form.thumbnail}
              onChange={(event) => setForm((current) => ({ ...current, thumbnail: event.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">요약 *</label>
            <textarea
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              required
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">본문 (Markdown) *</label>
          <div data-color-mode="auto">
            <MDEditor value={content} onChange={(value) => setContent(value ?? "")} height={420} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">바로 공개</span>
          </label>
          <button
            type="submit"
            disabled={loading || draftLoading}
            className="ml-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "저장 중..." : "기사 게시"}
          </button>
        </div>
      </form>
    </div>
  );
}