import { PrismaClient } from "@prisma/client";
import { fetchImage } from "../lib/image-fetcher.ts";

const prisma = new PrismaClient();

async function testGeminiImage() {
  console.log("--- Gemini (Imagen 3) Image Generation Test ---");
  
  try {
    const geminiSetting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
    const geminiKey = geminiSetting?.value;
    
    if (!geminiKey) {
      console.error("Error: GEMINI_API_KEY is not set in the database.");
      return;
    }

    const testTitle = "Apple's New AI Innovation and Future Strategy";
    const testKeyword = "Apple AI";
    const testContent = "Apple is set to unveil its latest AI features at the upcoming WWDC conference. The company aims to integrate advanced machine learning models across its ecosystem.";

    console.log(`Title: ${testTitle}`);
    console.log(`Keyword: ${testKeyword}`);
    console.log("Generating image...");

    const result = await fetchImage(testKeyword, testTitle, {
      geminiKey,
      content: testContent,
      useAi: true
    });

    if (result.url) {
      console.log(`\nSuccess! Image generated via: ${result.source}`);
      console.log(`Prompt used: ${result.prompt || "Default prompt"}`);
      console.log(`URL/Data prefix: ${result.url.slice(0, 50)}...`);
      
      if (result.url.startsWith("data:image/jpeg;base64,")) {
        console.log("\n[Note] Received Base64 data (Imagen 3)");
      } else {
        console.log(`\n[Note] Received URL: ${result.url}`);
      }
    } else {
      console.log("\nFailed to generate image. Please check the API key and logs.");
    }

  } catch (error) {
    console.error("\n[Error]", error);
  } finally {
    await prisma.$disconnect();
  }
}

testGeminiImage();
