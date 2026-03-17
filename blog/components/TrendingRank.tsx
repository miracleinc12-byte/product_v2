"use client";

import { useEffect, useState } from "react";

interface TrendItem {
  keyword: string;
  traffic: string;
  category?: string;
}

export default function TrendingRank() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<string>("");

  useEffect(() => {
    const load = () => {
      fetch("/api/trending")
        .then((response) => response.json())
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
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-5 bg-[var(--nyt-bg-accent)] rounded" />
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
            실시간 트렌드
          </h3>
        </div>
        {updated && <span className="text-[10px] font-sans text-[var(--nyt-light)]">{updated} 기준</span>}
      </div>

      <div>
        {trends.map((item, index) => (
          <div key={`${item.keyword}-${index}`}>
            <div className="flex items-start gap-2.5 py-2 group">
              <span
                className={`font-sans text-xs font-black shrink-0 w-5 text-right leading-none pt-0.5 ${
                  index < 3 ? "text-red-500" : index < 6 ? "text-orange-400" : "text-[var(--nyt-border)]"
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-sans text-[13px] font-bold text-[var(--nyt-black)] block leading-snug">
                  {item.keyword}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {item.category && (
                    <span className="text-[10px] font-sans text-[var(--nyt-light)]">{item.category}</span>
                  )}
                  {item.traffic && (
                    <span className="text-[10px] font-sans text-[var(--nyt-light)]">지수 {item.traffic}</span>
                  )}
                </div>
              </div>
            </div>
            {index < trends.length - 1 && <div className="nyt-divider" />}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-[var(--nyt-border)]">
        <span className="text-[10px] font-sans text-[var(--nyt-light)]">출처: Naver DataLab + Naver News</span>
      </div>
    </div>
  );
}