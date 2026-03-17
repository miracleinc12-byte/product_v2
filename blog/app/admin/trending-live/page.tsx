"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TrendItem {
  keyword: string;
  traffic: string;
  category: string;
  newsTitle?: string;
  newsUrl?: string;
}

interface TrendArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

interface MaskedSetting {
  masked: string;
  set: boolean;
}

const CATEGORY_OPTIONS = ["정치", "경제", "사회", "국제", "IT/과학", "문화/연예", "스포츠", "라이프"];
const DEFAULT_ARTICLE_TYPE = "news-analysis";

export default function TrendingLivePage() {
  const router = useRouter();
  const [adminSecret, setAdminSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [naverApiReady, setNaverApiReady] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORY_OPTIONS[0]);
  const [viewMode, setViewMode] = useState<"trend" | "category">("trend");
  const [articles, setArticles] = useState<TrendArticle[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openWriter = (article: TrendArticle, category: string) => {
    sessionStorage.setItem(
      "admin_draft_source",
      JSON.stringify({
        category,
        articleType: DEFAULT_ARTICLE_TYPE,
        referenceUrl: article.url,
        sourceTitle: article.title,
        sourceDescription: article.description,
        sourceName: article.source?.name,
      })
    );
    router.push("/admin");
  };

  const loadSettings = useCallback(async (secret: string) => {
    const response = await fetch("/api/settings", {
      headers: { "x-admin-secret": secret },
    });

    if (!response.ok) {
      setAuthed(false);
      setError("관리자 인증에 실패했습니다.");
      return false;
    }

    const data = (await response.json()) as { settings: Record<string, MaskedSetting> };
    const ready = Boolean(data.settings.NAVER_CLIENT_ID?.set && data.settings.NAVER_CLIENT_SECRET?.set);
    setNaverApiReady(ready);
    return true;
  }, []);

  const loadTrends = useCallback(async (secret: string) => {
    setLoadingTrends(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/trending", {
        headers: { "x-admin-secret": secret },
      });
      const data = (await response.json()) as { trends?: TrendItem[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "실시간 트렌드를 불러오지 못했습니다.");
        return;
      }

      const nextTrends = data.trends ?? [];
      setTrends(nextTrends);
      if (nextTrends.length > 0) {
        const nextSelected = nextTrends[0];
        setSelectedTrend(nextSelected);
        setSelectedCategory(nextSelected.category);
      }
    } catch {
      setError("실시간 트렌드를 불러오지 못했습니다.");
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const loadArticles = useCallback(async (secret: string, params: { keyword?: string; category: string }) => {
    setLoadingArticles(true);
    setError(null);
    try {
      const search = new URLSearchParams({ category: params.category });
      if (params.keyword) {
        search.set("keyword", params.keyword);
      }

      const response = await fetch(`/api/admin/trending?${search.toString()}`, {
        headers: { "x-admin-secret": secret },
      });
      const data = (await response.json()) as { articles?: TrendArticle[]; error?: string };
      if (!response.ok) {
        setArticles([]);
        setError(data.error ?? "관련 기사를 불러오지 못했습니다.");
        return;
      }
      setArticles(data.articles ?? []);
    } catch {
      setArticles([]);
      setError("관련 기사를 불러오지 못했습니다.");
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("admin_secret");
    if (!saved) return;
    setAdminSecret(saved);
    setAuthed(true);
    void (async () => {
      const ok = await loadSettings(saved);
      if (ok) {
        await loadTrends(saved);
      }
    })();
  }, [loadSettings, loadTrends]);

  useEffect(() => {
    if (!adminSecret || !naverApiReady) {
      setArticles([]);
      return;
    }

    if (viewMode === "trend" && selectedTrend) {
      setSelectedCategory(selectedTrend.category);
      void loadArticles(adminSecret, { keyword: selectedTrend.keyword, category: selectedTrend.category });
      return;
    }

    void loadArticles(adminSecret, { category: selectedCategory });
  }, [adminSecret, loadArticles, naverApiReady, selectedCategory, selectedTrend, viewMode]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem("admin_secret", adminSecret);
    setAuthed(true);
    const ok = await loadSettings(adminSecret);
    if (ok) {
      await loadTrends(adminSecret);
    }
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6 text-center">관리자 로그인</h1>
        <form onSubmit={handleAuth} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <input
            type="password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
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
    <section className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">트렌드 실시간</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">네이버 데이터랩과 네이버 뉴스로 카테고리별 인기 키워드와 최신 기사를 확인합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">설정으로 이동</Link>
          <button
            type="button"
            onClick={() => void loadTrends(adminSecret)}
            disabled={loadingTrends}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {loadingTrends ? "새로고침 중..." : "트렌드 새로고침"}
          </button>
        </div>
      </div>

      {!naverApiReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Naver Client ID와 Client Secret을 저장해야 트렌드와 최신 기사 목록을 가져올 수 있습니다.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5">
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">
            실시간 키워드
          </div>
          <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {loadingTrends && trends.length === 0 && (
              <div className="px-4 py-8 text-sm text-gray-400 text-center">트렌드를 불러오는 중입니다...</div>
            )}
            {!loadingTrends && trends.length === 0 && (
              <div className="px-4 py-8 text-sm text-gray-400 text-center">표시할 트렌드가 없습니다.</div>
            )}
            {trends.map((trend) => {
              const active = viewMode === "trend" && selectedTrend?.keyword === trend.keyword;
              return (
                <button
                  key={`${trend.category}-${trend.keyword}`}
                  type="button"
                  onClick={() => {
                    setSelectedTrend(trend);
                    setSelectedCategory(trend.category);
                    setViewMode("trend");
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    active ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wide opacity-70">{trend.category}</span>
                      <span className="block text-sm font-semibold leading-5 mt-1">{trend.keyword}</span>
                    </div>
                    <span className={`shrink-0 text-[11px] px-2 py-1 rounded-full ${active ? "bg-white/15 text-white dark:bg-gray-900/10 dark:text-gray-900" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                      {trend.traffic}
                    </span>
                  </div>
                  {trend.newsTitle && (
                    <p className={`mt-2 text-xs leading-5 ${active ? "text-white/75 dark:text-gray-700" : "text-gray-500 dark:text-gray-400"}`}>
                      {trend.newsTitle}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">관련 기사</div>
                <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                  {viewMode === "trend" && selectedTrend
                    ? `${selectedTrend.keyword} 최신 기사`
                    : `${selectedCategory} 최신 기사`}
                </h3>
              </div>
              <span className="text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-1">
                {viewMode === "trend" ? "키워드 기준" : "카테고리 기준"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((category) => {
                const active = viewMode === "category" && selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category);
                      setViewMode("category");
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 space-y-3 min-h-[640px]">
            {viewMode === "trend" && selectedTrend?.newsTitle && selectedTrend.newsUrl && (
              <article className="rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">선택 키워드 대표 기사</div>
                    <a href={selectedTrend.newsUrl} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 leading-6">
                      {selectedTrend.newsTitle}
                    </a>
                  </div>
                </div>
              </article>
            )}

            {loadingArticles && <div className="text-sm text-gray-400">관련 기사를 불러오는 중입니다...</div>}
            {!loadingArticles && !naverApiReady && (
              <div className="text-sm text-gray-500 dark:text-gray-400">네이버 API를 설정하면 여기서 실시간 기사 목록을 바로 볼 수 있습니다.</div>
            )}
            {!loadingArticles && naverApiReady && articles.length === 0 && !error && (
              <div className="text-sm text-gray-500 dark:text-gray-400">조건에 맞는 최신 기사가 없습니다.</div>
            )}
            {articles.map((article) => (
              <article key={`${article.url}-${article.publishedAt}`} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>{article.source?.name ?? "Naver News"}</span>
                  <span>•</span>
                  <span>{formatPublishedAt(article.publishedAt)}</span>
                </div>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 leading-6">
                  {article.title}
                </a>
                {article.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-6 line-clamp-3">{article.description}</p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openWriter(article, viewMode === "trend" && selectedTrend ? selectedTrend.category : selectedCategory)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    작성
                  </button>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    원문 보기
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatPublishedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}