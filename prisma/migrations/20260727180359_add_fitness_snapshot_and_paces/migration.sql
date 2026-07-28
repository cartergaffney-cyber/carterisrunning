-- AlterTable
ALTER TABLE "Run" ADD COLUMN "sportType" TEXT;

-- CreateTable
CREATE TABLE "FitnessSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "windowWeeks" INTEGER NOT NULL DEFAULT 12,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avgWeeklyMileageMiles" REAL NOT NULL,
    "mileageTrend" TEXT NOT NULL,
    "typicalEasyPaceSecondsPerMile" INTEGER,
    "bestRecentEffortDistanceMiles" REAL,
    "bestRecentEffortSeconds" INTEGER,
    "bestRecentEffortDate" DATETIME,
    "riegelEstimatedPaceSecondsPerMile" INTEGER,
    "roadMileageMiles" REAL,
    "trailMileageMiles" REAL,
    "avgElevationGainFeetPerMile" REAL,
    CONSTRAINT "FitnessSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "fitnessSnapshotId" TEXT,
    "paceBasis" TEXT,
    "easyPaceSecondsPerMile" INTEGER,
    "tempoPaceSecondsPerMile" INTEGER,
    "intervalPaceSecondsPerMile" INTEGER,
    "longRunPaceSecondsPerMile" INTEGER,
    "racePaceSecondsPerMile" INTEGER,
    "totalWeeks" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrainingPlan_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingPlan_fitnessSnapshotId_fkey" FOREIGN KEY ("fitnessSnapshotId") REFERENCES "FitnessSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingPlan" ("createdAt", "currentWeeklyMileageMiles", "goalTimeSeconds", "id", "raceDate", "raceDistance", "raceId", "startDate", "status", "totalWeeks", "updatedAt", "userId") SELECT "createdAt", "currentWeeklyMileageMiles", "goalTimeSeconds", "id", "raceDate", "raceDistance", "raceId", "startDate", "status", "totalWeeks", "updatedAt", "userId" FROM "TrainingPlan";
DROP TABLE "TrainingPlan";
ALTER TABLE "new_TrainingPlan" RENAME TO "TrainingPlan";
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FitnessSnapshot_userId_computedAt_idx" ON "FitnessSnapshot"("userId", "computedAt");
