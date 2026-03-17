async function main() {
  const res = await fetch("http://localhost:3000/api/settings", {
    headers: { "x-admin-secret": "admin1234" },
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
