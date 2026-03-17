"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

export default function CategoryNav() {
  const pathname = usePathname();

  const isActive = (slug: string) => {
    if (pathname.startsWith("/categories/")) {
      return decodeURIComponent(pathname.split("/categories/")[1]) === slug;
    }
    return false;
  };

  const isHome = pathname === "/";

  return (
    <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
      <span className="flex items-center shrink-0">
        <Link
          href="/"
          className={`px-3 py-3 text-sm md:text-[15px] font-sans font-semibold tracking-[0.12em] uppercase transition-colors ${
            isHome
              ? "text-[var(--nyt-black)] underline underline-offset-4"
              : "text-[var(--nyt-light)] hover:text-[var(--nyt-black)]"
          }`}
        >
          Home
        </Link>
        <span className="text-[var(--nyt-border)]">|</span>
      </span>
      {CATEGORIES.map((cat, i) => (
        <span key={cat.slug} className="flex items-center shrink-0">
          <Link
            href={`/categories/${encodeURIComponent(cat.slug)}`}
            className={`px-3 py-3 text-sm md:text-[15px] font-sans font-semibold tracking-[0.02em] transition-colors ${
              isActive(cat.slug)
                ? "text-[var(--nyt-black)] underline underline-offset-4"
                : "text-[var(--nyt-light)] hover:text-[var(--nyt-black)]"
            }`}
          >
            {cat.name}
          </Link>
          {i < CATEGORIES.length - 1 && (
            <span className="text-[var(--nyt-border)]">|</span>
          )}
        </span>
      ))}
    </nav>
  );
}
