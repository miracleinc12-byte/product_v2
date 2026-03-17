import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import DarkModeToggle from "@/components/DarkModeToggle";
import SearchBar from "@/components/SearchBar";
import CategoryNav from "@/components/CategoryNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Daily Post",
  description: "나만의 뉴스와 이슈 블로그",
};

function todayDate() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8394607607930774"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="bg-[var(--nyt-bg)]">
            {/* 상단 유틸 바 */}
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-xs text-[var(--nyt-light)]">
              <div className="flex items-center gap-4">
                <Link href="/admin" className="hover:text-[var(--nyt-black)] transition-colors font-sans">글 작성</Link>
                <Link href="/admin/settings" className="hover:text-[var(--nyt-black)] transition-colors font-sans">설정</Link>
              </div>
              <span className="font-sans hidden md:block">{todayDate()}</span>
              <div className="flex items-center gap-3">
                <DarkModeToggle />
              </div>
            </div>

            {/* 로고 */}
            <div className="nyt-divider">
              <div className="max-w-7xl mx-auto px-4 py-4 text-center">
                <Link href="/" className="inline-block">
                  <h1 className="font-serif text-4xl md:text-5xl font-black tracking-tight text-[var(--nyt-black)]">
                    The Daily Post
                  </h1>
                </Link>
              </div>
            </div>

            {/* 카테고리 네비 + 검색 */}
            <div className="nyt-divider-thick">
              <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
                <CategoryNav />
                <div className="w-48 shrink-0 hidden md:block">
                  <SearchBar />
                </div>
              </div>
            </div>
            <div className="nyt-divider" />
          </header>

          <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

          <footer className="nyt-divider mt-16">
            <div className="max-w-7xl mx-auto px-4 py-8 text-center">
              <p className="font-serif text-xl font-black text-[var(--nyt-black)] mb-2">The Daily Post</p>
              <p className="text-xs text-[var(--nyt-light)] font-sans">© {new Date().getFullYear()} The Daily Post. All rights reserved.</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
