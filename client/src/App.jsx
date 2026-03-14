// client/src/App.jsx
import React, { useState } from "react";

const BACKEND_URL = "http://localhost:4000";

function App() {
  const [password, setPassword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [tabs, setTabs] = useState(["", "", "", ""]);
  const [tabLinks, setTabLinks] = useState(["", "", "", ""]);
  const [adsenseCode, setAdsenseCode] = useState("");
  const [generatedContent, setGeneratedContent] = useState({ version1: "", version2: "" });
  const [isGenerating, setIsGenerating] = useState({ version1: false, version2: false });
  const [activeVersion, setActiveVersion] = useState(2);
  const [version1Url, setVersion1Url] = useState("");
  const [version2Url, setVersion2Url] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(
      now.getDate()
    ).padStart(2, "0")}`;
  };

  const handleTabChange = (index, value) => {
    const newTabs = [...tabs];
    newTabs[index] = value;
    setTabs(newTabs);
    const activeTabs = newTabs.filter((t) => t.trim() !== "");
    if (activeTabs.length > 0) setCurrentStep(3);
  };

  const handleTabLinkChange = (index, value) => {
    const newTabLinks = [...tabLinks];
    newTabLinks[index] = value;
    setTabLinks(newTabLinks);
  };

  const validateInputs = () => {
    const newErrors = {};

    if (!password.trim()) {
      newErrors.password = "접속 비밀번호를 입력해주세요 (.env의 ACCESS_PASSWORD와 동일해야 합니다)";
    }
    if (!keyword.trim()) {
      newErrors.keyword = "키워드를 입력해주세요";
    }
    const activeTabs = tabs.filter((tab) => tab.trim() !== "");
    if (activeTabs.length === 0) {
      newErrors.tabs = "최소 1개의 탭을 입력해주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateVersion = async (version) => {
    if (!validateInputs()) return;

    setIsGenerating((prev) => ({ ...prev, [version]: true }));
    setErrors({});

    const versionUrl = version === "version1" ? version1Url : version2Url;

    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          keyword,
          tabs,
          tabLinks,
          adsenseCode,
          version,
          versionUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setErrors({ api: "비밀번호가 올바르지 않습니다. server/.env의 ACCESS_PASSWORD 확인 필요" });
        } else {
          setErrors({ api: data.error || "서버 오류가 발생했습니다." });
        }
        return;
      }

      const data = await res.json();
      const content = (data.html || "").trim();

      setGeneratedContent((prev) => ({ ...prev, [version]: content }));
      setActiveVersion(version === "version1" ? 1 : 2);
    } catch (e) {
      console.error(e);
      setErrors({ api: "서버와 연결할 수 없습니다. 서버 실행 여부를 확인하세요." });
    } finally {
      setIsGenerating((prev) => ({ ...prev, [version]: false }));
    }
  };

  const copyToClipboard = async () => {
    try {
      const content = activeVersion === 1 ? generatedContent.version1 : generatedContent.version2;
      if (!content) return setErrors({ copy: "복사할 내용이 없습니다" });

      await navigator.clipboard.writeText(content);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#fdf2f8,#ffe4e6)" }}>
      {/* 헤더 */}
      <div
        style={{
          background: "linear-gradient(90deg,#f97373,#ec4899,#db2777)",
          color: "#fff",
          padding: "48px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 40,
              width: 120,
              height: 120,
              background: "#fff",
              borderRadius: 999,
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 40,
              right: 40,
              width: 160,
              height: 160,
              background: "#fff",
              borderRadius: 999,
              filter: "blur(40px)",
            }}
          />
        </div>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.2)", padding: 12, borderRadius: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  💻
                </div>
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>스마트 홈페이지 스킨 생성기</h1>
                <p style={{ fontSize: 14, opacity: 0.9 }}>AI 기반 자동 콘텐츠 생성 도구</p>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.2)", padding: "6px 16px", borderRadius: 999, fontSize: 12 }}>
              ✨ {getCurrentDate()}
            </div>
          </div>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
          {[{ num: 1, label: "키워드" }, { num: 2, label: "탭 설정" }, { num: 3, label: "생성" }].map((step, idx) => (
            <React.Fragment key={step.num}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: currentStep >= step.num ? 1 : 0.35 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: currentStep >= step.num ? "#ec4899" : "#d1d5db",
                    color: currentStep >= step.num ? "#fff" : "#4b5563",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {step.num}
                </div>
                <span style={{ fontSize: 13 }}>{step.label}</span>
              </div>
              {idx < 2 && <span style={{ color: "#9ca3af" }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 에러 메시지 */}
      {Object.keys(errors).length > 0 && (
        <div style={{ maxWidth: 960, margin: "16px auto", padding: "0 24px" }}>
          <div
            style={{
              background: "#fef2f2",
              borderLeft: "4px solid #ef4444",
              padding: 12,
              borderRadius: 10,
              fontSize: 13,
              color: "#991b1b",
            }}
          >
            {Object.values(errors).map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* 메인 (반응형 적용된 부분) */}
      <div className="app-main">
        <div className="app-grid">
          {/* 좌측 입력 세트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 접속 비밀번호 */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                border: "1px solid #fecaca",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#111827",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  0
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>접속 비밀번호</h2>
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=".env의 ACCESS_PASSWORD 입력"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `2px solid ${errors.password ? "#fca5a5" : "#e5e7eb"}`,
                  fontSize: 13,
                }}
              />
            </div>

            {/* 1. 키워드 */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                border: "1px solid #fecaca",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#ec4899",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  1
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>키워드 입력</h2>
              </div>

              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  if (e.target.value) setCurrentStep(2);
                }}
                placeholder="예: 근로장려금, 청년도약계좌, 여행..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `2px solid ${errors.keyword ? "#fca5a5" : "#fecdd3"}`,
                  fontSize: 13,
                }}
              />
            </div>

            {/* 2. 탭 */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                border: "1px solid #fecaca",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#ec4899",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  2
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>탭 메뉴 (최대 4개)</h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tabs.map((tab, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <input
                      type="text"
                      value={tab}
                      onChange={(e) => handleTabChange(idx, e.target.value)}
                      placeholder={`탭 ${idx + 1} (예: 신청방법, 요약)`} 
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "2px solid #fecdd3",
                        fontSize: 13,
                      }}
                    />
                    <input
                      type="url"
                      value={tabLinks[idx]}
                      onChange={(e) => handleTabLinkChange(idx, e.target.value)}
                      placeholder="링크 URL (선택)"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. 애드센스 */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                border: "1px solid #fecaca",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 16 }}>⚡</div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>애드센스 코드 (선택)</h2>
              </div>

              <textarea
                value={adsenseCode}
                onChange={(e) => setAdsenseCode(e.target.value)}
                rows={5}
                placeholder="Google Adsense 코드 입력"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "2px solid #fecdd3",
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
              />
            </div>
          </div>

          {/* 우측 버전 생성 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 버전 1 */}
            {generatedContent.version2 && (
              <div
                style={{
                  background: "linear-gradient(135deg,#faf5ff,#ede9fe)",
                  borderRadius: 16,
                  padding: 16,
                  border: "2px solid #ddd6fe",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#7c3aed",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    💰
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#4c1d95" }}>버전 1 (혜택 중심)</h3>
                </div>

                <input
                  type="url"
                  value={version1Url}
                  onChange={(e) => setVersion1Url(e.target.value)}
                  placeholder="버튼 링크 URL"
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 10,
                    border: "2px solid #c4b5fd",
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                />

                <button
                  onClick={() => generateVersion("version1")}
                  disabled={isGenerating.version1}
                  style={{
                    width: "100%",
                    padding: "11px 0",
                    border: "none",
                    borderRadius: 999,
                    background: isGenerating.version1
                      ? "#9ca3af"
                      : "linear-gradient(90deg,#7c3aed,#6d28d9)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {isGenerating.version1 ? "생성 중..." : "버전 1 생성하기"}
                </button>
              </div>
            )}

            {/* 버전 2 */}
            <div
              style={{
                background: "linear-gradient(135deg,#fff1f2,#ffe4e6)",
                borderRadius: 16,
                padding: 16,
                border: "2px solid #fecaca",
                boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#e11d48",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  📋
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#9f1239" }}>버전 2 (절차 중심)</h3>
              </div>

              <input
                type="url"
                value={version2Url}
                onChange={(e) => setVersion2Url(e.target.value)}
                placeholder="버튼 링크 URL"
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: "2px solid #fecaca",
                  fontSize: 13,
                  marginBottom: 10,
                }}
              />

              <button
                onClick={() => generateVersion("version2")}
                disabled={isGenerating.version2}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  border: "none",
                  borderRadius: 999,
                  background: isGenerating.version2
                    ? "#9ca3af"
                    : "linear-gradient(90deg,#ec4899,#db2777)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {isGenerating.version2 ? "생성 중..." : "버전 2 생성하기"}
              </button>
            </div>

            {/* 안내 카드 */}
            {!generatedContent.version1 && !generatedContent.version2 && (
              <div
                style={{
                  background: "#fff",
                  padding: 24,
                  borderRadius: 16,
                  border: "1px solid #fecaca",
                  textAlign: "center",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    background: "#fee2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    fontSize: 26,
                  }}
                >
                  🧩
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>준비 완료!</h3>
                <p style={{ fontSize: 13, color: "#4b5563" }}>
                  비밀번호, 키워드, 탭 입력 후  
                  <br />
                  <strong>버전 2 생성하기</strong> 버튼을 눌러 주세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 생성결과 */}
        {(generatedContent.version1 || generatedContent.version2) && (
          <div
            style={{
              marginTop: 24,
              background: "#fff",
              padding: 16,
              borderRadius: 16,
              border: "2px solid #fecaca",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>생성된 HTML 코드</h2>

              <button
                onClick={copyToClipboard}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    copyStatus === "copied" ? "#22c55e" : copyStatus === "error" ? "#ef4444" : "#ec4899",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {copyStatus === "copied" ? "복사 완료" : "복사하기"}
              </button>
            </div>

            <textarea
              readOnly
              rows={18}
              value={activeVersion === 1 ? generatedContent.version1 : generatedContent.version2}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            />

            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                background: activeVersion === 1 ? "#f5f3ff" : "#fef2f2",
                border: `1px solid ${activeVersion === 1 ? "#ddd6fe" : "#fecaca"}`,
                fontSize: 13,
              }}
            >
              {activeVersion === 1
                ? "💰 버전 1: 혜택·조건 중심 랜딩"
                : "📋 버전 2: 신청·절차 중심 랜딩"}
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <footer
        style={{
          marginTop: 48,
          background: "linear-gradient(90deg,#111827,#030712)",
          color: "#9ca3af",
          padding: "24px 0",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>스마트 홈페이지 스킨 생성기</div>
              <div style={{ fontSize: 12 }}>정부지원금/혜택형 랜딩 자동 스킨 생성 도구</div>
            </div>
            <div style={{ fontSize: 12 }}>© 2025 All rights reserved</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
