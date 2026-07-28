-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stravaAthleteId" BIGINT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "profileImageUrl" TEXT,
    "unitPreference" TEXT NOT NULL DEFAULT 'MILES',
    "stravaAccessToken" TEXT NOT NULL,
    "stravaRefreshToken" TEXT NOT NULL,
    "stravaTokenExpiresAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "raceDistance" TEXT NOT NULL,
    "raceDate" DATETIME NOT NULL,
    "startDate" DATETIME NOT NULL,
    "currentWeeklyMileageMiles" REAL NOT NULL,
    "goalTimeSeconds" INTEGER,
    "totalWeeks" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainingPlanId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "phase" TEXT NOT NULL,
    "isStepBack" BOOLEAN NOT NULL DEFAULT false,
    "workoutType" TEXT NOT NULL,
    "targetDistanceMiles" REAL,
    "targetDurationMinutes" INTEGER,
    "targetPaceSecondsPerMile" INTEGER,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PlannedWorkout_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plannedWorkoutId" TEXT,
    "stravaActivityId" BIGINT NOT NULL,
    "name" TEXT,
    "date" DATETIME NOT NULL,
    "distanceMiles" REAL NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "avgPaceSecondsPerMile" INTEGER NOT NULL,
    "elevationGainFeet" REAL,
    "sufferScore" INTEGER,
    "perceivedExertion" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Run_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaAthleteId_key" ON "User"("stravaAthleteId");

-- CreateIndex
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "PlannedWorkout_trainingPlanId_weekNumber_idx" ON "PlannedWorkout"("trainingPlanId", "weekNumber");

-- CreateIndex
CREATE INDEX "PlannedWorkout_trainingPlanId_date_idx" ON "PlannedWorkout"("trainingPlanId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Run_plannedWorkoutId_key" ON "Run"("plannedWorkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Run_stravaActivityId_key" ON "Run"("stravaActivityId");

-- CreateIndex
CREATE INDEX "Run_userId_date_idx" ON "Run"("userId", "date");
