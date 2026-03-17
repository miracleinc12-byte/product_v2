const BASE = "http://localhost:3000";
const SECRET = "test-cron-secret-1234";

async function test() {
  console.log("Testing auto-post API with CRON_SECRET...\n");

  const res = await fetch(BASE + "/api/cron/auto-post", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categories: ["IT·과학"] }),
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

test().catch(console.error);
