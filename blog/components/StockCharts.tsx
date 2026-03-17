"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

const CHARTS = [
  { symbol: "KRX:KOSPI",        label: "코스피",   dateRange: "1M" },
  { symbol: "KRX:KOSDAQ",       label: "코스닥",   dateRange: "1M" },
  { symbol: "FOREXCOM:SPXUSD",  label: "S&P 500",  dateRange: "1M" },
  { symbol: "NASDAQ:NDX",       label: "나스닥",   dateRange: "1M" },
  { symbol: "BITSTAMP:BTCUSD",  label: "비트코인", dateRange: "1M" },
];

const RANGES = ["1D", "1W", "1M", "3M", "1Y"] as const;
type Range = typeof RANGES[number];
const RANGE_LABELS: Record<Range, string> = {
  "1D": "1일", "1W": "1주", "1M": "1달", "3M": "3달", "1Y": "1년",
};

function MiniChart({ symbol, label, dateRange, colorTheme }: {
  symbol: string; label: string; dateRange: string; colorTheme: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "height:160px;width:100%";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.cssText = "height:160px;width:100%";
    wrapper.appendChild(inner);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      height: 160,
      locale: "kr",
      dateRange,
      colorTheme,
      isTransparent: true,
      autosize: true,
      largeChartUrl: "",
      noTimeScale: false,
      chartOnly: false,
    });
    wrapper.appendChild(script);
    ref.current.appendChild(wrapper);
  }, [symbol, dateRange, colorTheme]);

  return (
    <div className="border border-[var(--nyt-border)] rounded overflow-hidden bg-[var(--nyt-bg-accent)]">
      <div className="px-3 pt-2 pb-0">
        <span className="text-[11px] font-sans font-bold text-[var(--nyt-gray)] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div ref={ref} style={{ height: 160 }} />
    </div>
  );
}

export default function StockCharts() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<Range>("1M");

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <section className="my-6">
        <div className="nyt-divider-thick mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-black text-[var(--nyt-black)] pt-2">증시 차트</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {CHARTS.map((c) => (
            <div key={c.symbol} className="border border-[var(--nyt-border)] rounded bg-[var(--nyt-bg-accent)] animate-pulse" style={{ height: 180 }} />
          ))}
        </div>
      </section>
    );
  }

  const colorTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <section className="my-6">
      <div className="nyt-divider-thick mb-4">
        <div className="flex items-center justify-between pt-2">
          <h2 className="font-serif text-xl font-black text-[var(--nyt-black)]">증시 차트</h2>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-[11px] font-sans font-bold rounded transition-colors ${
                  range === r
                    ? "bg-[var(--nyt-black)] text-[var(--nyt-bg)]"
                    : "text-[var(--nyt-light)] hover:text-[var(--nyt-black)] hover:bg-[var(--nyt-bg-accent)]"
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CHARTS.map((c) => (
          <MiniChart
            key={`${c.symbol}-${range}-${colorTheme}`}
            symbol={c.symbol}
            label={c.label}
            dateRange={range}
            colorTheme={colorTheme}
          />
        ))}
      </div>
    </section>
  );
}
