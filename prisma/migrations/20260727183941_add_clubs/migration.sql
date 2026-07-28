-- AlterTable
ALTER TABLE "User" ADD COLUMN "homeAddress" TEXT;
ALTER TABLE "User" ADD COLUMN "homeGeocodedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "homeLat" REAL;
ALTER TABLE "User" ADD COLUMN "homeLng" REAL;

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "lat" REAL,
    "lng" REAL,
    "distanceFromHomeMiles" REAL,
    "sourceQuery" TEXT,
    "discoverySource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CANDIDATE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Club_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClubSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT,
    "type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "distanceMiles" REAL,
    "paceSecondsPerMile" INTEGER,
    "meetingLocation" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClubSession_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClubSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plannedWorkoutId" TEXT NOT NULL,
    "clubSessionId" TEXT NOT NULL,
    "matchScore" REAL,
    "matchReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubSuggestion_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClubSuggestion_clubSessionId_fkey" FOREIGN KEY ("clubSessionId") REFERENCES "ClubSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Club_userId_status_idx" ON "Club"("userId", "status");

-- CreateIndex
CREATE INDEX "ClubSession_clubId_dayOfWeek_idx" ON "ClubSession"("clubId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSuggestion_plannedWorkoutId_key" ON "ClubSuggestion"("plannedWorkoutId");
