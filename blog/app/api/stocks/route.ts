import { NextResponse } from "next/server";

export const revalidate = 300;

const SYMBOLS = ["^KS11", "^KQ11", "^GSPC", "^IXIC", "^DJI", "USDKRW=X", "BTC-USD"];

const LABELS: Record<string, string> = {
  "^KS11":    "코스피",
  "^KQ11":    "코스닥",
  "^GSPC":    "S&P 500",
  "^IXIC":    "나스닥",
  "^DJI":     "다우존스",
  "USDKRW=X": "달러/원",
  "BTC-USD":  "비트코인",
};

export interface StockItem {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export async function GET() {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS.join(",")}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,currency`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as {
      quoteResponse?: {
        result?: {
          symbol: string;
          regularMarketPrice: number;
          regularMarketChange: number;
          regularMarketChangePercent: number;
          currency: string;
        }[];
      };
    };

    const results = data.quoteResponse?.result ?? [];
    const stocks: StockItem[] = results.map((q) => ({
      symbol: q.symbol,
      label: LABELS[q.symbol] ?? q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      currency: q.currency ?? "USD",
    }));

    return NextResponse.json(stocks);
  } catch {
    return NextResponse.json([]);
  }
}
