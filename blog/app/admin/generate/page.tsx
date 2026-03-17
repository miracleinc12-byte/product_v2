"use client";

import { useState, useRef } from "react";
import { CATEGORIES } from "@/lib/categories";

interface LogEntry {
  type: string;
  index?: number;
  category?: string;
  step?: string;
  status?: string;
  title?: string;
  source?: string;
  images?: number;
  total?: number;
}

export default function AdminGeneratePage() {
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const secret = typeof window !== "undefined" ? localStorage.getItem("admin_secret") ?? "" : "";

  const toggleCat = (slug: string) => {
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const selectAll = () => {
    if (selectedCats.length === CATEGORIES.length) {
      setSelectedCats([]);
    } else {
      setSelectedCats(CATEGORIES.map((c) => c.slug));
    }
  };

  const handleGenerate = async () => {
    if (!selectedCats.length) return;
    setRunning(true);
    setDone(false);
    setLogs([]);

    const res = await fetch("/api/admin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ categories: selectedCats }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (reader) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const match = line.match(/^data:\s*(.+)$/m);
        if (match) {
          try {
            const data = JSON.parse(match[1]) as LogEntry;
            setLogs((prev) => [...prev, data]);
            if (data.type === "done") setDone(true);
          } catch {}
        }
      }
    }

    setRunning(false);
    setDone(true);
  };

  const getStatusColor = (entry: LogEntry) => {
    if (entry.status?.includes("완료")) return "text-green-600 dark:text-green-400";
    if (entry.status?.includes("오류")) return "text-red-600 dark:text-red-400";
    if (entry.status?.includes("없음")) return "text-yellow-600 dark:text-yellow-400";
    return "text-[var(--nyt-gray)]";
  };

  const completedCount = logs.filter((l) => l.type === "category_done").length;
  const totalCount = logs.find((l) => l.type === "start")?.total ?? selectedCats.length;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-serif text-2xl font-black text-[var(--nyt-black)] mb-6">기사 자동 생성</h1>

      <div className="border border-[var(--nyt-border)] p-4 mb-6 bg-[var(--nyt-bg)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-sans text-sm font-bold text-[var(--nyt-black)]">카테고리 선택</h2>
          <button onClick={selectAll} className="text-xs font-sans text-blue-600 hover:underline">
            {selectedCats.length === CATEGORIES.length ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => toggleCat(cat.slug)}
              disabled={running}
              className={`px-3 py-1.5 text-xs font-sans border transition-colors ${
                selectedCats.includes(cat.slug)
                  ? "bg-[var(--nyt-black)] text-white border-[var(--nyt-black)]"
                  : "bg-[var(--nyt-bg)] text-[var(--nyt-gray)] border-[var(--nyt-border)] hover:border-[var(--nyt-black)]"
              } ${running ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={running || !selectedCats.length}
        className="w-full py-3 mb-6 font-sans font-bold text-sm text-white bg-[var(--nyt-black)] hover:opacity-90 disabled:opacity-30 transition-all"
      >
        {running ? `생성 중... (${completedCount}/${totalCount})` : `선택한 ${selectedCats.length}개 카테고리 기사 생성`}
      </button>

      {running && (
        <div className="mb-4">
          <div className="h-1.5 bg-[var(--nyt-bg-accent)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--nyt-black)] transition-all duration-500"
              style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="border border-[var(--nyt-border)] bg-[var(--nyt-bg)] max-h-[500px] overflow-y-auto">
          <div className="p-3 border-b border-[var(--nyt-border)] bg-[var(--nyt-bg-accent)]">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[var(--nyt-light)]">생성 로그</h3>
          </div>
          <div className="p-3 space-y-1 font-mono text-xs">
            {logs.map((entry, i) => (
              <div key={i} className="py-1">
                {entry.type === "start" && (
                  <span className="text-blue-600">▶ {entry.total}개 카테고리 생성 시작</span>
                )}
                {entry.type === "category_start" && (
                  <span className="text-[var(--nyt-black)]">
                    [{entry.category}] {entry.step}
                  </span>
                )}
                {entry.type === "progress" && (
                  <span className="text-[var(--nyt-gray)]">
                    &nbsp;&nbsp;↳ {entry.step}
                    {entry.source && <span className="text-[var(--nyt-light)]"> ({entry.source})</span>}
                  </span>
                )}
                {entry.type === "category_done" && (
                  <span className={getStatusColor(entry)}>
                    [{entry.category}] {entry.status}
                    {entry.title && entry.title !== "-" && ` — "${entry.title}"`}
                    {entry.images ? ` (이미지 ${entry.images}장)` : ""}
                  </span>
                )}
                {entry.type === "done" && (
                  <span className="text-green-600 font-bold">✓ 모든 카테고리 생성 완료</span>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {done && (
        <div className="mt-4 p-4 border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <p className="text-sm font-sans text-green-700 dark:text-green-300">
            생성이 완료되었습니다.{" "}
            <a href="/admin/posts" className="underline font-bold">기사 관리</a>에서 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
}
