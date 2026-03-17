"use client";

import { useEffect, useState } from "react";

interface TrendItem {
  keyword: string;
  traffic: string;
  newsTitle?: string;
  newsUrl?: string;
}

export default function TrendingRank() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<string>("");

  useEffect(() => {
    const load = () => {
      fetch("/api/trending")
        .then((r) => r.json())
        .then((data: TrendItem[]) => {
          setTrends(data);
          setUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-5 bg-[var(--nyt-bg-accent)] rounded" />
        ))}
      </div>
    );
  }

  if (!trends.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[var(--nyt-light)]">
            실시간 급상승 검색어
          </h3>
        </div>
        {updated && (
          <span className="text-[10px] font-sans text-[var(--nyt-light)]">{updated} 기준</span>
        )}
      </div>

      <div>
        {trends.map((item, i) => (
          <div key={i}>
            <div className="flex items-start gap-2.5 py-2 group">
              <span className={`font-sans text-xs font-black shrink-0 w-5 text-right leading-none pt-0.5 ${
                i < 3 ? "text-red-500" : i < 6 ? "text-orange-400" : "text-[var(--nyt-border)]"
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-sans text-[13px] font-bold text-[var(--nyt-black)] block leading-snug">
                  {item.keyword}
                </span>
                {item.traffic && (
                  <span className="text-[10px] font-sans text-[var(--nyt-light)]">
                    검색 {item.traffic}+
                  </span>
                )}
              </div>
            </div>
            {i < trends.length - 1 && <div className="nyt-divider" />}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-[var(--nyt-border)]">
        <span className="text-[10px] font-sans text-[var(--nyt-light)]">
          출처: Google 트렌드 (대한민국)
        </span>
      </div>
    </div>
  );
}
