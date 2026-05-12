const { fetchNews } = require('./lib/news-fetcher');
require('dotenv').config({ path: '.env' });

async function test() {
  const categories = ['정치', '경제', 'IT/과학'];
  for (const cat of categories) {
    console.log(`\nTesting category: ${cat}`);
    try {
      const articles = await fetchNews(cat, process.env.NEWS_API_KEY, 5);
      console.log(`Found ${articles.length} articles`);
      articles.forEach((a, i) => console.log(`${i+1}. ${a.title}`));
    } catch (e) {
      console.error(`Error for ${cat}:`, e.message);
    }
  }
}

test();
