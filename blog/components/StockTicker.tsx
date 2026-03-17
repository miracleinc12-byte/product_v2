"use client";

import { useEffect, useRef } from "react";

export default function StockTicker() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "KRX:KOSPI",      displayName: "코스피" },
        { proName: "KRX:KOSDAQ",     displayName: "코스닥" },
        { proName: "FOREXCOM:SPXUSD",displayName: "S&P 500" },
        { proName: "NASDAQ:NDX",     displayName: "나스닥" },
        { proName: "INDEX:DJI",      displayName: "다우존스" },
        { proName: "FX_IDC:USDKRW",  displayName: "달러/원" },
        { proName: "BITSTAMP:BTCUSD",displayName: "비트코인" },
        { proName: "COMEX:GC1!",     displayName: "금" },
        { proName: "NYMEX:CL1!",     displayName: "원유" },
      ],
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "light",
      locale: "kr",
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="border-t border-b border-[var(--nyt-border)] bg-[var(--nyt-bg-accent)] overflow-hidden">
      <div className="flex items-stretch">
        {/* 증시 라벨 */}
        <div className="shrink-0 flex items-center px-3 py-0 border-r border-[var(--nyt-border)] bg-[var(--nyt-black)] z-10">
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--nyt-bg)]">
            증시
          </span>
        </div>
        {/* TradingView Ticker Tape */}
        <div className="flex-1 overflow-hidden" style={{ height: "46px" }}>
          <div
            className="tradingview-widget-container"
            style={{ height: "46px", width: "100%" }}
          >
            <div
              ref={containerRef}
              className="tradingview-widget-container__widget"
              style={{ height: "46px", width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
