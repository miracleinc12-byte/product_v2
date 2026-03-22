"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNav = [
  { href: "/admin", label: "✍️ 글 작성", desc: "새 기사 작성 및 AI 초안" },
  { href: "/admin/posts", label: "📂 기사 관리", desc: "발행된 기사 및 초안 관리" },
  { href: "/admin/generate", label: "⚡ 자동 기사 생성", desc: "주제별 AI 자동 포스팅" },
  { href: "/admin/trending-live", label: "📈 트렌드 실시간", desc: "실시간 검색어 및 이슈 모니터링" },
  { href: "/admin/settings", label: "⚙️ 설정", desc: "API 키 및 시스템 설정" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f9fa]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 shadow-sm md:min-h-screen flex flex-col sticky top-0">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl text-gray-900 tracking-tight">Admin Dashboard</h2>
            <p className="text-xs text-gray-500 mt-1">블로그 관리 시스템</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {adminNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex flex-col px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-blue-50 border border-blue-100 shadow-sm"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div className={`font-semibold text-sm ${active ? "text-blue-700" : "text-gray-700 group-hover:text-gray-900"}`}>
                  {item.label}
                </div>
                <div className={`text-xs mt-1 ${active ? "text-blue-500/80" : "text-gray-400"}`}>
                  {item.desc}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <Link href="/" className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
            블로그 홈으로 가기
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full p-4 md:p-8 lg:p-10 max-w-[1200px] mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}