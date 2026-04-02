import { fetchArticleAssets } from '../lib/article-extractor.js';

// 테스트할 뉴스 URL (최신 IT 기사 예시)
const testUrl = "https://n.news.naver.com/mnews/article/001/0014587640"; 

async function test() {
  console.log(`[추출 테스트 시작] URL: ${testUrl}`);
  try {
    const assets = await fetchArticleAssets(testUrl);
    
    console.log("\n[1. 추출된 본문 요약 (처음 300자)]");
    console.log(assets.content.slice(0, 300) + "...");
    
    console.log(`\n[2. 추출된 이미지 (${assets.images.length}개)]`);
    if (assets.images.length === 0) {
      console.log("추출된 이미지가 없습니다.");
    } else {
      assets.images.forEach((img, idx) => {
        console.log(`${idx + 1}. ${img.url}`);
        if (img.width || img.height) {
          console.log(`   크기: ${img.width || '?'}x${img.height || '?'}`);
        }
        if (img.alt) {
          console.log(`   Alt: ${img.alt}`);
        }
      });
    }
  } catch (error) {
    console.error("[오류 발생]", error);
  }
}

test();
