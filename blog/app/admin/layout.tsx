"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNav = [
  { href: "/admin", label: "글 작성" },
  { href: "/admin/posts", label: "기사 관리" },
  { href: "/admin/generate", label: "기사 생성" },
  { href: "/admin/trending-live", label: "트렌드 실시간" },
  { href: "/admin/settings", label: "설정" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav className="flex items-center gap-2 mb-8 pb-3 border-b-2 border-[var(--nyt-black)] flex-wrap">
        <span className="font-serif font-black text-lg text-[var(--nyt-black)] mr-4">관리자</span>
        {adminNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 text-xs font-sans font-bold border rounded-sm transition-colors ${
                active
                  ? "bg-[var(--nyt-black)] text-[var(--nyt-bg)] border-[var(--nyt-black)]"
                  : "bg-[var(--nyt-paper)] text-[var(--nyt-black)] border-[var(--nyt-border)] hover:bg-[var(--nyt-bg-accent)] hover:border-[var(--nyt-gray)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}