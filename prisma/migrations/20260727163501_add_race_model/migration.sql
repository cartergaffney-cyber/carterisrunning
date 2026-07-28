-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "raceDate" DATETIME,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipcode" TEXT,
    "distanceMeters" REAL,
    "terrainType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "elevationGainMeters" REAL,
    "courseUrl" TEXT,
    "sourceUrl" TEXT,
    "raw" TEXT,
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrainingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "raceId" TEXT,
    "raceDistance" TEXT NOT NULL,
    "raceDate" DATETIME NOT NULL,
    "startDate" DATETIME NOT NULL,
    "currentWeeklyMileageMiles" REAL NOT NULL,
    "goalTimeSeconds" INTEGER,
    "totalWeeks" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrainingPlan_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingPlan" ("createdAt", "currentWeeklyMileageMiles", "goalTimeSeconds", "id", "raceDate", "raceDistance", "startDate", "status", "totalWeeks", "updatedAt", "userId") SELECT "createdAt", "currentWeeklyMileageMiles", "goalTimeSeconds", "id", "raceDate", "raceDistance", "startDate", "status", "totalWeeks", "updatedAt", "userId" FROM "TrainingPlan";
DROP TABLE "TrainingPlan";
ALTER TABLE "new_TrainingPlan" RENAME TO "TrainingPlan";
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
