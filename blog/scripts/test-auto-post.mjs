// 로컬에서 자동 게시 테스트
// 실행: node scripts/test-auto-post.mjs [카테고리명]
// 예시: node scripts/test-auto-post.mjs IT·과학
//       node scripts/test-auto-post.mjs         ← 전체 카테고리

const category = process.argv[2];
const CRON_SECRET = process.env.CRON_SECRET ?? "test-cron-secret-1234";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function run() {
  console.log(`\n[자동 게시 테스트 시작] ${new Date().toLocaleString("ko-KR")}`);
  if (category) console.log(`대상 카테고리: ${category}`);
  else console.log("대상 카테고리: 전체");

  const body = category ? { categories: [category] } : {};

  const res = await fetch(`${BASE_URL}/api/cron/auto-post`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[오류]", data);
    return;
  }

  console.log(`\n실행 완료: ${data.date}`);
  console.table(data.results);
}

run().catch(console.error);
