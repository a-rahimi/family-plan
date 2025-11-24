-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarkdownSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledDate" DATETIME,
    "timeOfDay" TEXT,
    "timezone" TEXT,
    "sourceId" TEXT,
    "sourceKey" TEXT,
    "sourceLine" INTEGER,
    "metadata" JSONB,
    "recurrenceRuleId" TEXT,
    "wasGeneratedFromRecurring" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "clearedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Todo_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Todo_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarkdownSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Todo_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "RecurringRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "daysOfWeek" JSONB,
    "dayOfMonth" INTEGER,
    "timeOfDay" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "startsOn" DATETIME,
    "endsOn" DATETIME,
    "sourceId" TEXT,
    "sourceKey" TEXT,
    "metadata" JSONB,
    "lastOccurrence" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringRule_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringRule_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarkdownSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_slug_key" ON "FamilyMember"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarkdownSource_path_key" ON "MarkdownSource"("path");

-- CreateIndex
CREATE INDEX "Todo_memberId_status_idx" ON "Todo"("memberId", "status");

-- CreateIndex
CREATE INDEX "Todo_scheduledDate_idx" ON "Todo"("scheduledDate");

-- CreateIndex
CREATE INDEX "Todo_recurrenceRuleId_idx" ON "Todo"("recurrenceRuleId");

-- CreateIndex
CREATE INDEX "Todo_sourceId_idx" ON "Todo"("sourceId");

-- CreateIndex
CREATE INDEX "RecurringRule_memberId_idx" ON "RecurringRule"("memberId");

-- CreateIndex
CREATE INDEX "RecurringRule_frequency_idx" ON "RecurringRule"("frequency");
