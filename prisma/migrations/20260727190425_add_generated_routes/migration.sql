-- CreateTable
CREATE TABLE "GeneratedRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plannedWorkoutId" TEXT NOT NULL,
    "targetDistanceMiles" REAL NOT NULL,
    "actualDistanceMiles" REAL,
    "elevationGainFeet" REAL,
    "startLat" REAL NOT NULL,
    "startLng" REAL NOT NULL,
    "gpxContent" TEXT,
    "fileName" TEXT,
    "mapboxRaw" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "errorMessage" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedRoute_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedRoute_plannedWorkoutId_key" ON "GeneratedRoute"("plannedWorkoutId");
