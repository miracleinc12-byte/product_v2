-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SourceArticle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "author" TEXT,
    "publishedAt" DATETIME,
    "contentHash" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TrendKeyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword" TEXT NOT NULL,
    "category" TEXT,
    "score" REAL,
    "sourceArticleId" INTEGER,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrendKeyword_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "SourceArticle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "error" TEXT,
    "selectedTrend" TEXT,
    "selectedTitle" TEXT,
    "publishMode" TEXT NOT NULL DEFAULT 'auto',
    "articleLength" INTEGER,
    "sourceArticleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenerationJob_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "SourceArticle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedDraft" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "qualityScore" REAL,
    "duplicateScore" REAL,
    "reviewNotes" TEXT,
    "thumbnail" TEXT,
    "sourceArticleId" INTEGER,
    "generationJobId" INTEGER,
    "postId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedDraft_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "SourceArticle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedDraft_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedDraft_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "runsPerDay" INTEGER NOT NULL DEFAULT 3,
    "minIntervalMin" INTEGER NOT NULL DEFAULT 180,
    "targetLength" INTEGER,
    "publishMode" TEXT NOT NULL DEFAULT 'auto',
    "requireReview" BOOLEAN NOT NULL DEFAULT false,
    "excludedKeywords" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
INSERT INTO "new_Post" ("category", "content", "createdAt", "id", "published", "slug", "summary", "tags", "thumbnail", "title", "updatedAt") SELECT "category", "content", "createdAt", "id", "published", "slug", "summary", "tags", "thumbnail", "title", "updatedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SourceArticle_sourceUrl_key" ON "SourceArticle"("sourceUrl");

-- CreateIndex
CREATE INDEX "TrendKeyword_keyword_collectedAt_idx" ON "TrendKeyword"("keyword", "collectedAt");

-- CreateIndex
CREATE INDEX "TrendKeyword_category_collectedAt_idx" ON "TrendKeyword"("category", "collectedAt");

-- CreateIndex
CREATE INDEX "GenerationJob_category_startedAt_idx" ON "GenerationJob"("category", "startedAt");

-- CreateIndex
CREATE INDEX "GenerationJob_status_startedAt_idx" ON "GenerationJob"("status", "startedAt");

-- CreateIndex
CREATE INDEX "GeneratedDraft_category_createdAt_idx" ON "GeneratedDraft"("category", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDraft_status_createdAt_idx" ON "GeneratedDraft"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRule_category_key" ON "AutomationRule"("category");
