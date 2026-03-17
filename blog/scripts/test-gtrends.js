async function main() {
  try {
    const res = await fetch("https://trends.google.com/trends/trendingsearches/daily/rss?geo=KR", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Length:", text.length);
    console.log("Preview:", text.slice(0, 500));
  } catch (e) {
    console.error("Error:", e.message);
  }
}
main();
