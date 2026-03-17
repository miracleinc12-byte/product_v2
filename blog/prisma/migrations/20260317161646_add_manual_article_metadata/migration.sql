-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "articleType" TEXT NOT NULL DEFAULT 'news-analysis',
    "referenceUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "thumbnail" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "usedUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "sourceArticleId" INTEGER,
    "generationJobId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "SourceArticle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Post_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("category", "content", "createdAt", "generationJobId", "id", "published", "publishedAt", "seoDescription", "seoTitle", "slug", "sourceArticleId", "summary", "tags", "thumbnail", "title", "updatedAt", "usedUrl", "viewCount") SELECT "category", "content", "createdAt", "generationJobId", "id", "published", "publishedAt", "seoDescription", "seoTitle", "slug", "sourceArticleId", "summary", "tags", "thumbnail", "title", "updatedAt", "usedUrl", "viewCount" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
