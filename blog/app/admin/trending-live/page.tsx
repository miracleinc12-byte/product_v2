"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface TrendItem {
  keyword: string;
  traffic: string;
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

export default function TrendingLivePage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [newsApiReady, setNewsApiReady] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [articles, setArticles] = useState<TrendArticle[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (secret: string) => {
    const res = await fetch("/api/settings", {
      headers: { "x-admin-secret": secret },
    });

    if (!res.ok) {
      setAuthed(false);
      setError("관리자 인증에 실패했습니다.");
      return false;
    }

    const data = (await res.json()) as { settings: Record<string, MaskedSetting> };
    setNewsApiReady(Boolean(data.settings.NEWS_API_KEY?.set));
    return true;
  }, []);

  const loadTrends = useCallback(async (secret: string) => {
    setLoadingTrends(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/trending", {
        headers: { "x-admin-secret": secret },
      });
      const data = (await res.json()) as { trends?: TrendItem[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "실시간 트렌드를 불러오지 못했습니다.");
        return;
      }
      const nextTrends = data.trends ?? [];
      setTrends(nextTrends);
      if (nextTrends.length > 0) {
        setSelectedTrend((current) => current && nextTrends.some((item) => item.keyword === current.keyword) ? current : nextTrends[0]);
      }
    } catch {
      setError("실시간 트렌드를 불러오지 못했습니다.");
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const loadArticles = useCallback(async (secret: string, trend: TrendItem) => {
    setLoadingArticles(true);
    setError(null);
    try {
      const params = new URLSearchParams({ keyword: trend.keyword, category: inferCategory(trend.keyword) });
      const res = await fetch(`/api/admin/trending?${params.toString()}`, {
        headers: { "x-admin-secret": secret },
      });
      const data = (await res.json()) as { articles?: TrendArticle[]; error?: string };
      if (!res.ok) {
        setArticles([]);
        setError(data.error === "NEWS_API_KEY is not configured." ? "NewsAPI Key를 먼저 저장해야 기사 검색이 가능합니다." : data.error ?? "관련 기사를 불러오지 못했습니다.");
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
    if (!selectedTrend || !adminSecret || !newsApiReady) {
      if (!newsApiReady) setArticles([]);
      return;
    }
    void loadArticles(adminSecret, selectedTrend);
  }, [adminSecret, loadArticles, newsApiReady, selectedTrend]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
            onChange={(e) => setAdminSecret(e.target.value)}
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">실시간 트렌드 키워드와 연결된 뉴스 기사를 바로 확인합니다.</p>
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

      {!newsApiReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          NewsAPI Key가 있어야 트렌드 키워드에 연결된 기사 목록을 가져올 수 있습니다.
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
              const active = selectedTrend?.keyword === trend.keyword;
              return (
                <button
                  key={trend.keyword}
                  type="button"
                  onClick={() => setSelectedTrend(trend)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    active ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold leading-5">{trend.keyword}</span>
                    <span className={`shrink-0 text-[11px] px-2 py-1 rounded-full ${active ? "bg-white/15 text-white dark:bg-gray-900/10 dark:text-gray-900" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                      {trend.traffic || "-"}
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
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">관련 기사</div>
                <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                  {selectedTrend ? `${selectedTrend.keyword} 기사` : "키워드를 선택해 주세요"}
                </h3>
              </div>
              {selectedTrend && (
                <span className="text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-1">
                  예상 카테고리: {inferCategory(selectedTrend.keyword)}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3 min-h-[640px]">
            {selectedTrend?.newsTitle && selectedTrend.newsUrl && (
              <article className="rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-4">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Google Trends 대표 기사</div>
                <a href={selectedTrend.newsUrl} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 leading-6">
                  {selectedTrend.newsTitle}
                </a>
              </article>
            )}

            {loadingArticles && (
              <div className="text-sm text-gray-400">관련 기사를 불러오는 중입니다...</div>
            )}
            {!loadingArticles && !newsApiReady && (
              <div className="text-sm text-gray-500 dark:text-gray-400">NewsAPI Key를 저장하면 여기서 실시간 기사 목록을 바로 볼 수 있습니다.</div>
            )}
            {!loadingArticles && newsApiReady && selectedTrend && articles.length === 0 && !error && (
              <div className="text-sm text-gray-500 dark:text-gray-400">이 키워드로 찾은 기사가 없습니다.</div>
            )}
            {articles.map((article) => (
              <article key={`${article.url}-${article.publishedAt}`} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>{article.source?.name ?? "Unknown source"}</span>
                  <span>•</span>
                  <span>{formatPublishedAt(article.publishedAt)}</span>
                </div>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 leading-6">
                  {article.title}
                </a>
                {article.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-6 line-clamp-3">{article.description}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function inferCategory(keyword: string) {
  const lower = keyword.toLowerCase();

  if (/(선거|대통령|국회|정당|총리|외교|정치)/.test(keyword) || /(election|president|parliament|politic)/.test(lower)) return "정치";
  if (/(주식|증시|환율|경제|금리|부동산|투자)/.test(keyword) || /(stock|market|economy|finance|gdp|inflation)/.test(lower)) return "경제";
  if (/(사건|사고|범죄|법원|교육|복지|사회)/.test(keyword) || /(crime|court|education|welfare|society|disaster)/.test(lower)) return "사회";
  if (/(ai|반도체|기술|it|과학|우주|로봇)/i.test(keyword) || /(openai|google|apple|microsoft|tech|semiconductor|robot|science)/.test(lower)) return "IT/과학";
  if (/(드라마|영화|가수|아이돌|배우|예능|문화|연예)/.test(keyword) || /(movie|drama|celebrity|music|kpop|entertainment)/.test(lower)) return "문화/연예";
  if (/(축구|야구|농구|배구|골프|올림픽|월드컵|스포츠)/.test(keyword) || /(nba|mlb|nfl|match|world cup|olympics|sports)/.test(lower)) return "스포츠";
  if (/(건강|맛집|여행|패션|라이프)/.test(keyword) || /(health|travel|food|fashion|lifestyle)/.test(lower)) return "라이프";
  return "국제";
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
