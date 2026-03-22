"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
const MarkdownPreview = dynamic(() => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown), { ssr: false });

const ARTICLE_TYPES = [
  { value: "news-analysis", label: "뉴스 분석" },
  { value: "issue-brief", label: "이슈 브리프" },
  { value: "trend-report", label: "트렌드 리포트" },
  { value: "deep-dive", label: "심층 해설" },
  { value: "opinion-summary", label: "관점 정리" },
];

const IMAGE_COUNT_OPTIONS = [0, 1, 2, 3, 4];
const PERSONA_OPTIONS = [
  { value: "auto", label: "자동 선택" },
  { value: "investor", label: "투자자 관점" },
  { value: "consumer", label: "소비자 관점" },
  { value: "operator", label: "실무자 관점" },
  { value: "policymaker", label: "정책 담당자 관점" },
  { value: "beginner", label: "초보 독자 관점" },
];
const EMPTY_CONTENT = "## Start writing here";

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
  slug: string;
  summary: string;
  content: string;
  tags: string;
  category: string;
  articleType: string;
  referenceUrl: string;
  seoTitle: string;
  seoDescription: string;
  provider: "gemini" | "openai";
  personaMode?: string;
  imageCount: number;
  imageCandidates: string[];
  imageKeywords?: string[];
  persona?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<DraftPayload | null>(null);
  const [imageCandidates, setImageCandidates] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    category: "",
    articleType: ARTICLE_TYPES[0].value,
    referenceUrl: "",
    aiProvider: "gemini" as "gemini" | "openai",
    personaMode: "auto",
    imageCount: 1,
    articleLength: 2200,
    tags: "",
    thumbnail: "",
    published: true,
  });
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedImage, setExpandedImage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("admin_secret");
    if (!saved) return;
    setSecret(saved);
    setAuthed(true);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("admin_draft_source");
    if (!raw) return;

    const payload = JSON.parse(raw) as DraftPayload;
    sessionStorage.removeItem("admin_draft_source");
    setSourceInfo(payload);
    setForm((current) => ({
      ...current,
      category: payload.category,
      articleType: payload.articleType,
      referenceUrl: payload.referenceUrl,
    }));
    setMessage("참고 기사 정보를 불러왔습니다. 초안 생성을 눌러 이어서 작성하세요.");
  }, []);

  const candidateImages = [...new Set(imageCandidates.map((image) => image.trim()).filter(Boolean))];

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
    const nextCandidates = [...new Set((draft.imageCandidates ?? []).map((image) => image.trim()).filter(Boolean))];
    const nextThumbnail = nextCandidates[0] ?? "";

    setForm((current) => ({
      ...current,
      title: draft.title,
      slug: draft.slug || handleSlug(draft.title),
      summary: draft.summary,
      category: draft.category,
      articleType: draft.articleType,
      referenceUrl: draft.referenceUrl,
      aiProvider: draft.provider,
      personaMode: draft.personaMode ?? current.personaMode,
      imageCount: draft.imageCount,
      tags: draft.tags,
      thumbnail: nextThumbnail || current.thumbnail,
    }));
    setContent(draft.content);
    setImageCandidates(nextCandidates);
    setExpandedImage("");
    setMessage("기사 초안을 생성했습니다. 후보 이미지를 눌러 대표 이미지를 바로 바꿀 수 있습니다.");
  };

  const handleGenerate = async () => {
    if (!form.category || !form.articleType || !form.referenceUrl) {
      setMessage("오류: 카테고리, 기사 유형, 참고 URL을 먼저 입력하세요.");
      return;
    }

    setDraftLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/rewrite-article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          category: form.category,
          articleType: form.articleType,
          provider: form.aiProvider,
          personaMode: form.personaMode,
          imageCount: form.imageCount,
          articleLength: form.articleLength,
          referenceUrl: form.referenceUrl,
          sourceTitle: sourceInfo?.sourceTitle,
          sourceDescription: sourceInfo?.sourceDescription,
          sourceName: sourceInfo?.sourceName,
        }),
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
      setMessage("기사를 저장했습니다.");
      setSourceInfo(null);
      setImageCandidates([]);
      setExpandedImage("");
      setForm({
        title: "",
        slug: "",
        summary: "",
        category: "",
        articleType: ARTICLE_TYPES[0].value,
        referenceUrl: "",
        aiProvider: "gemini",
        personaMode: "auto",
        imageCount: 1,
        articleLength: 2200,
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
        <h1 className="text-2xl font-extrabold text-[var(--nyt-black)] mb-6 text-center">관리자 로그인</h1>
        <form onSubmit={handleAuth} className="bg-[var(--nyt-paper)] rounded-xl p-6 border border-[var(--nyt-border)] shadow-sm">
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="관리자 시크릿"
            className="w-full px-4 py-2 mb-4 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-bg)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--nyt-black)]">기사 작성</h1>
          <p className="text-sm text-[var(--nyt-gray)] mt-1">AI 초안을 만들고 후보 이미지를 바로 대표 이미지로 적용할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((value) => !value)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] hover:bg-[var(--nyt-bg-accent)]"
          >
            {showPreview ? "미리보기 닫기" : "미리보기"}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={draftLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
          >
            {draftLoading ? "생성 중.." : "초안 생성"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.startsWith("오류") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {message}
        </div>
      )}

      {sourceInfo && (
        <div className="rounded-xl border border-[var(--nyt-border)] bg-[var(--nyt-paper)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--nyt-light)] mb-2">참고 기사</div>
          <div className="text-sm font-semibold text-[var(--nyt-black)]">{sourceInfo.sourceTitle}</div>
          <p className="text-sm text-[var(--nyt-gray)] mt-2 leading-6">{sourceInfo.sourceDescription}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: handleSlug(event.target.value) }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">슬러그 *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">카테고리 *</label>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">기사 유형 *</label>
            <select
              value={form.articleType}
              onChange={(event) => setForm((current) => ({ ...current, articleType: event.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {ARTICLE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">AI 모델 *</label>
            <select
              value={form.aiProvider}
              onChange={(event) => setForm((current) => ({ ...current, aiProvider: event.target.value as "gemini" | "openai" }))}
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="gemini">Gemini</option>
              <option value="openai">ChatGPT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">페르소나 기법</label>
            <select
              value={form.personaMode}
              onChange={(event) => setForm((current) => ({ ...current, personaMode: event.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {PERSONA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">글자 수</label>
            <input
              type="number"
              min={500}
              step={100}
              value={form.articleLength}
              onChange={(event) => setForm((current) => ({ ...current, articleLength: Number(event.target.value) || 2200 }))}
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">기사 이미지 수</label>
            <select
              value={String(form.imageCount)}
              onChange={(event) => setForm((current) => ({ ...current, imageCount: Number(event.target.value) }))}
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {IMAGE_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}장
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">참고 URL</label>
            <input
              type="url"
              value={form.referenceUrl}
              onChange={(event) => setForm((current) => ({ ...current, referenceUrl: event.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">태그</label>
            <input
              type="text"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="예: 네이버 SEO, 경제, 시장"
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">대표 이미지 URL</label>
            <input
              type="url"
              value={form.thumbnail}
              onChange={(event) => setForm((current) => ({ ...current, thumbnail: event.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">요약 *</label>
            <textarea
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              required
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-[var(--nyt-border)] bg-[var(--nyt-paper)] text-[var(--nyt-black)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>
        </div>

        {candidateImages.length > 0 && (
          <div className="rounded-xl border border-[var(--nyt-border)] bg-[var(--nyt-paper)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--nyt-light)]">가져온 이미지 후보</div>
                <p className="text-xs text-[var(--nyt-gray)] mt-1">중복 이미지는 제거했습니다. 이미지를 클릭하면 대표 이미지가 바로 바뀌고 크게 표시됩니다.</p>
              </div>
              {form.imageCount > 0 && form.thumbnail && (
                <div className="text-xs text-blue-600 font-semibold">대표 이미지 선택됨</div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {candidateImages.slice(0, 10).map((image) => {
                const isSelected = form.thumbnail === image;
                return (
                  <button
                    key={image}
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, thumbnail: image }));
                      setExpandedImage(image);
                    }}
                    disabled={form.imageCount < 1}
                    className={`rounded-lg border p-2 text-left transition-colors ${isSelected ? "border-blue-600 ring-2 ring-blue-200" : "border-[var(--nyt-border)]"} ${form.imageCount < 1 ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400"}`}
                  >
                    <div className="rounded bg-[var(--nyt-bg-accent)] p-2 min-h-[148px] flex items-center justify-center">
                      <img src={image} alt="article candidate" className="max-w-full max-h-32 h-auto object-contain rounded mx-auto" />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[var(--nyt-gray)] truncate">{isSelected ? "현재 대표 이미지" : "이미지 후보"}</span>
                      <span className={`text-[11px] font-semibold ${isSelected ? "text-blue-600" : "text-[var(--nyt-light)]"}`}>
                        {isSelected ? "선택됨" : "선택"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--nyt-gray)] mb-1">본문 (Markdown) *</label>
          <div data-color-mode="light">
            <MDEditor value={content} onChange={(value) => setContent(value ?? "")} height={420} preview="edit" />
          </div>
        </div>

        {showPreview && (
          <div className="rounded-xl border border-[var(--nyt-border)] bg-[var(--nyt-paper)] p-5 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--nyt-light)]">미리보기</div>
              <h2 className="text-2xl font-extrabold text-[var(--nyt-black)] mt-2">{form.title || "제목을 입력하면 여기에 표시됩니다."}</h2>
              {form.thumbnail && (
                <div className="mt-4 flex items-center justify-center">
                  <img
                    src={form.thumbnail}
                    alt={form.title || "article thumbnail"}
                    className="max-w-full max-h-[360px] h-auto object-contain rounded-lg bg-[var(--nyt-bg-accent)] mx-auto"
                  />
                </div>
              )}
              <p className="text-[var(--nyt-gray)] mt-3 leading-7">{form.summary || "요약을 입력하면 여기에 표시됩니다."}</p>
            </div>
            <div className="admin-preview-markdown prose max-w-none prose-headings:text-[var(--nyt-black)] prose-p:text-[var(--nyt-gray)] prose-strong:text-[var(--nyt-black)]" data-color-mode="light">
              <MarkdownPreview source={content} />
            </div>
          </div>
        )}

        {expandedImage && (
          <button
            type="button"
            onClick={() => setExpandedImage("")}
            className="fixed inset-0 z-50 bg-black/70 p-6 flex items-center justify-center"
          >
            <img
              src={expandedImage}
              alt="expanded article candidate"
              className="max-w-[90vw] max-h-[90vh] h-auto object-contain rounded-xl bg-white p-2 mx-auto"
            />
          </button>
        )}

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-[var(--nyt-gray)]">바로 공개</span>
          </label>
          <button
            type="submit"
            disabled={loading || draftLoading}
            className="ml-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "게시 중.." : "기사 게시"}
          </button>
        </div>
      </form>
    </div>
  );
}
