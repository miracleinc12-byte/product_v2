async function main() {
  const urls = [
    "https://trends.google.com/trending/rss?geo=KR",
    "https://trends.google.com/trends/trendingsearches/realtime/rss?geo=KR&category=all",
    "https://trends.google.com/trends/api/dailytrends?hl=ko&tz=-540&geo=KR&ns=15",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" }
      });
      const text = await res.text();
      console.log(`\n=== ${url} ===`);
      console.log("Status:", res.status);
      console.log("Preview:", text.slice(0, 300));
    } catch (e) {
      console.log(`${url} - Error: ${e.message}`);
    }
  }
}
main();
