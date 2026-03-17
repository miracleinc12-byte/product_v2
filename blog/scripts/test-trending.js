async function main() {
  const res = await fetch("http://localhost:3000/api/trending");
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Count:", data.length);
  if (data.length) {
    data.slice(0, 3).forEach((d, i) => console.log(i+1, d.keyword, d.traffic));
  } else {
    console.log("데이터 없음:", JSON.stringify(data));
  }
}
main().catch(console.error);
