"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색..."
        className="w-full pl-8 pr-3 py-1.5 bg-transparent border border-[var(--nyt-border)] text-[var(--nyt-black)] placeholder-[var(--nyt-light)] focus:outline-none focus:border-[var(--nyt-black)] text-xs font-sans"
      />
      <button type="submit" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--nyt-light)]">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  );
}
