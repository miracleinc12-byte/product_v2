"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface SettingInfo {
  key: string;
  label: string;
  description: string;
  link: string;
  linkLabel: string;
  placeholder: string;
}

interface MaskedSetting {
  masked: string;
  set: boolean;
}

const SETTING_CONFIGS: SettingInfo[] = [
  {
    key: "GEMINI_API_KEY",
    label: "Google Gemini API Key",
    description: "AI 기사 생성을 위한 키입니다.",
    link: "https://aistudio.google.com/app/apikey",
    linkLabel: "Google AI Studio에서 발급",
    placeholder: "AIza...",
  },
  {
    key: "NEWS_API_KEY",
    label: "NewsAPI Key",
    description: "실시간 뉴스와 트렌드 기사 검색에 사용합니다.",
    link: "https://newsapi.org/register",
    linkLabel: "NewsAPI에서 발급",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    key: "NAVER_CLIENT_ID",
    label: "Naver Client ID",
    description: "네이버 검색/뉴스 API 호출에 사용하는 클라이언트 ID입니다.",
    link: "https://developers.naver.com/apps/#/register",
    linkLabel: "네이버 개발자센터에서 발급",
    placeholder: "xxxxxxxxxx",
  },
  {
    key: "NAVER_CLIENT_SECRET",
    label: "Naver Client Secret",
    description: "네이버 API 인증에 사용하는 클라이언트 시크릿입니다.",
    link: "https://developers.naver.com/apps/#/register",
    linkLabel: "네이버 개발자센터에서 발급",
    placeholder: "xxxxxxxxxxxx",
  },
  {
    key: "FAL_KEY",
    label: "fal.ai API Key",
    description: "기사 썸네일 이미지 생성에 사용합니다.",
    link: "https://fal.ai/dashboard/keys",
    linkLabel: "fal.ai에서 발급",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxx",
  },
  {
    key: "UNSPLASH_ACCESS_KEY",
    label: "Unsplash Access Key",
    description: "대체 이미지 소스로 사용합니다.",
    link: "https://unsplash.com/developers",
    linkLabel: "Unsplash에서 발급",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    key: "CRON_SECRET",
    label: "Cron Secret",
    description: "자동 게시 API 보호용 시크릿입니다.",
    link: "",
    linkLabel: "",
    placeholder: "my-cron-secret-2026",
  },
  {
    key: "ARTICLE_LENGTH",
    label: "기사 글자 수",
    description: "AI가 생성할 기사 길이의 기준값입니다.",
    link: "",
    linkLabel: "",
    placeholder: "2000",
  },
];

const TEST_CATEGORIES = ["정치", "경제", "사회", "국제", "IT/과학", "문화/연예", "스포츠", "라이프"];

export default function SettingsPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<Record<string, MaskedSetting>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettings = useCallback(async (secret: string) => {
    setFetchLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        headers: { "x-admin-secret": secret },
      });

      if (!res.ok) {
        setMessage({ type: "error", text: "관리자 인증에 실패했습니다. 비밀번호를 다시 확인해 주세요." });
        setAuthed(false);
        return;
      }

      const data = (await res.json()) as { settings: Record<string, MaskedSetting> };
      setCurrentSettings(data.settings);
    } catch {
      setMessage({ type: "error", text: "설정 정보를 불러오지 못했습니다." });
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("admin_secret");
    if (!saved) return;
    setAdminSecret(saved);
    setAuthed(true);
    void loadSettings(saved);
  }, [loadSettings]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("admin_secret", adminSecret);
    setAuthed(true);
    await loadSettings(adminSecret);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify(formValues),
      });

      const data = (await res.json()) as { success?: boolean; saved?: string[]; error?: string };
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error ?? "설정 저장에 실패했습니다." });
        return;
      }

      setMessage({ type: "success", text: `저장 완료: ${(data.saved ?? []).join(", ")}` });
      setFormValues({});
      await loadSettings(adminSecret);
    } catch {
      setMessage({ type: "error", text: "설정 저장 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`${key} 설정을 삭제할까요?`)) return;
    await fetch("/api/settings", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": adminSecret,
      },
      body: JSON.stringify({ key }),
    });
    await loadSettings(adminSecret);
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6 text-center">관리자 로그인</h1>
        <form onSubmit={handleAuth} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="관리자 시크릿"
            className="w-full px-4 py-2 mb-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">API 및 운영 설정</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">기사 생성과 자동 게시에 필요한 키를 관리합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/trending-live" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">트렌드 실시간 보기</Link>
          <Link href="/admin" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">글 작성으로 돌아가기</Link>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${
          message.type === "success"
            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {fetchLoading ? (
        <div className="text-center py-12 text-gray-400">설정을 불러오는 중입니다...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {SETTING_CONFIGS.map((cfg) => {
            const current = currentSettings[cfg.key];
            const isSet = current?.set ?? false;

            return (
              <div key={cfg.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{cfg.label}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isSet
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}>
                        {isSet ? "설정됨" : "미설정"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cfg.description}</p>
                    {cfg.link && (
                      <a href={cfg.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">
                        {cfg.linkLabel}
                      </a>
                    )}
                  </div>
                  {isSet && (
                    <button
                      type="button"
                      onClick={() => handleDelete(cfg.key)}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shrink-0"
                    >
                      삭제
                    </button>
                  )}
                </div>

                {isSet && (
                  <div className="mb-3 flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <code className="text-xs text-gray-600 dark:text-gray-300 flex-1 font-mono break-all">
                      {showValues[cfg.key] ? formValues[cfg.key] || current.masked : current.masked}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowValues((s) => ({ ...s, [cfg.key]: !s[cfg.key] }))}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showValues[cfg.key] ? "숨기기" : "보기"}
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={formValues[cfg.key] ?? ""}
                  onChange={(e) => setFormValues((f) => ({ ...f, [cfg.key]: e.target.value }))}
                  placeholder={isSet ? "새 값으로 변경하려면 입력" : cfg.placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            );
          })}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || Object.values(formValues).every((v) => !v)}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "저장 중..." : "설정 저장"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">자동 게시 테스트</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">설정을 저장한 뒤 선택한 카테고리로 자동 게시 API를 바로 시험할 수 있습니다.</p>
        <AutoPostTester adminSecret={adminSecret} />
      </div>
    </div>
  );
}

function AutoPostTester({ adminSecret }: { adminSecret: string }) {
  const [category, setCategory] = useState(TEST_CATEGORIES[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTest = async () => {
    setRunning(true);
    setResult(null);

    try {
      const settingsRes = await fetch("/api/settings", {
        headers: { "x-admin-secret": adminSecret },
      });
      const settingsData = (await settingsRes.json()) as { settings: Record<string, MaskedSetting> };
      const cronSet = settingsData.settings?.CRON_SECRET?.set;

      if (!cronSet) {
        setResult("오류: CRON_SECRET을 먼저 설정해 주세요.");
        return;
      }

      const res = await fetch("/api/cron/auto-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ categories: [category], adminSecret }),
      });

      const data = (await res.json()) as { results?: { category: string; title: string; status: string }[]; error?: string };
      if (data.results?.length) {
        const first = data.results[0];
        setResult(`[${first.status}] ${first.title}`);
      } else {
        setResult(data.error ?? "결과가 없습니다.");
      }
    } catch {
      setResult("자동 게시 테스트 중 오류가 발생했습니다.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {TEST_CATEGORIES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleTest}
        disabled={running}
        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {running ? "실행 중..." : "테스트 실행"}
      </button>
      {result && (
        <span className={`text-xs font-medium ${result.startsWith("오류") ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
