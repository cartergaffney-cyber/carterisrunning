-- CreateEnum
CREATE TYPE "RaceDistance" AS ENUM ('FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON', 'FIFTY_K', 'FIFTY_MILE', 'HUNDRED_K', 'HUNDRED_MILE');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrainingPhase" AS ENUM ('BASE', 'BUILD', 'PEAK', 'TAPER');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('REST', 'EASY', 'LONG_RUN', 'TEMPO', 'INTERVAL', 'RACE_PACE', 'BACK_TO_BACK_LONG', 'CROSS_TRAIN', 'RACE');

-- CreateEnum
CREATE TYPE "RaceSource" AS ENUM ('RUNSIGNUP', 'WEB_SEARCH', 'MANUAL');

-- CreateEnum
CREATE TYPE "TerrainType" AS ENUM ('ROAD', 'TRAIL', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MileageTrend" AS ENUM ('INCREASING', 'STABLE', 'DECREASING');

-- CreateEnum
CREATE TYPE "PaceBasis" AS ENUM ('GOAL_TIME', 'CURRENT_FITNESS', 'BLENDED');

-- CreateEnum
CREATE TYPE "ClubDiscoverySource" AS ENUM ('WEB_SEARCH', 'RUNNING_STORE', 'RRCA_DIRECTORY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('CANDIDATE', 'TRACKED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ClubSessionType" AS ENUM ('EASY', 'TEMPO', 'INTERVAL', 'LONG_RUN', 'SOCIAL', 'TRACK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClubSuggestionStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "stravaAthleteId" BIGINT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "profileImageUrl" TEXT,
    "unitPreference" TEXT NOT NULL DEFAULT 'MILES',
    "stravaAccessToken" TEXT NOT NULL,
    "stravaRefreshToken" TEXT NOT NULL,
    "stravaTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "homeAddress" TEXT,
    "homeLat" DOUBLE PRECISION,
    "homeLng" DOUBLE PRECISION,
    "homeCity" TEXT,
    "homeState" TEXT,
    "homeGeocodedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raceId" TEXT,
    "raceDistance" "RaceDistance" NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "currentWeeklyMileageMiles" DOUBLE PRECISION NOT NULL,
    "goalTimeSeconds" INTEGER,
    "fitnessSnapshotId" TEXT,
    "paceBasis" "PaceBasis",
    "easyPaceSecondsPerMile" INTEGER,
    "tempoPaceSecondsPerMile" INTEGER,
    "intervalPaceSecondsPerMile" INTEGER,
    "longRunPaceSecondsPerMile" INTEGER,
    "racePaceSecondsPerMile" INTEGER,
    "totalWeeks" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "windowWeeks" INTEGER NOT NULL DEFAULT 12,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avgWeeklyMileageMiles" DOUBLE PRECISION NOT NULL,
    "mileageTrend" "MileageTrend" NOT NULL,
    "typicalEasyPaceSecondsPerMile" INTEGER,
    "bestRecentEffortDistanceMiles" DOUBLE PRECISION,
    "bestRecentEffortSeconds" INTEGER,
    "bestRecentEffortDate" TIMESTAMP(3),
    "riegelEstimatedPaceSecondsPerMile" INTEGER,
    "roadMileageMiles" DOUBLE PRECISION,
    "trailMileageMiles" DOUBLE PRECISION,
    "avgElevationGainFeetPerMile" DOUBLE PRECISION,

    CONSTRAINT "FitnessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "RaceSource" NOT NULL,
    "externalId" TEXT,
    "raceDate" TIMESTAMP(3),
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipcode" TEXT,
    "distanceMeters" DOUBLE PRECISION,
    "terrainType" "TerrainType" NOT NULL DEFAULT 'UNKNOWN',
    "elevationGainMeters" DOUBLE PRECISION,
    "courseUrl" TEXT,
    "sourceUrl" TEXT,
    "raw" TEXT,
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "phase" "TrainingPhase" NOT NULL,
    "isStepBack" BOOLEAN NOT NULL DEFAULT false,
    "workoutType" "WorkoutType" NOT NULL,
    "targetDistanceMiles" DOUBLE PRECISION,
    "targetDurationMinutes" INTEGER,
    "targetPaceSecondsPerMile" INTEGER,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlannedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedRoute" (
    "id" TEXT NOT NULL,
    "plannedWorkoutId" TEXT NOT NULL,
    "targetDistanceMiles" DOUBLE PRECISION NOT NULL,
    "actualDistanceMiles" DOUBLE PRECISION,
    "elevationGainFeet" DOUBLE PRECISION,
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLng" DOUBLE PRECISION NOT NULL,
    "gpxContent" TEXT,
    "fileName" TEXT,
    "mapboxRaw" TEXT,
    "status" "RouteStatus" NOT NULL DEFAULT 'GENERATING',
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "distanceFromHomeMiles" DOUBLE PRECISION,
    "sourceQuery" TEXT,
    "discoverySource" "ClubDiscoverySource" NOT NULL,
    "status" "ClubStatus" NOT NULL DEFAULT 'CANDIDATE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSession" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT,
    "type" "ClubSessionType" NOT NULL DEFAULT 'UNKNOWN',
    "distanceMiles" DOUBLE PRECISION,
    "paceSecondsPerMile" INTEGER,
    "meetingLocation" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSuggestion" (
    "id" TEXT NOT NULL,
    "plannedWorkoutId" TEXT NOT NULL,
    "clubSessionId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "matchReason" TEXT,
    "status" "ClubSuggestionStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedWorkoutId" TEXT,
    "stravaActivityId" BIGINT NOT NULL,
    "name" TEXT,
    "sportType" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "distanceMiles" DOUBLE PRECISION NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "avgPaceSecondsPerMile" INTEGER NOT NULL,
    "elevationGainFeet" DOUBLE PRECISION,
    "sufferScore" INTEGER,
    "perceivedExertion" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaAthleteId_key" ON "User"("stravaAthleteId");

-- CreateIndex
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "FitnessSnapshot_userId_computedAt_idx" ON "FitnessSnapshot"("userId", "computedAt");

-- CreateIndex
CREATE INDEX "PlannedWorkout_trainingPlanId_weekNumber_idx" ON "PlannedWorkout"("trainingPlanId", "weekNumber");

-- CreateIndex
CREATE INDEX "PlannedWorkout_trainingPlanId_date_idx" ON "PlannedWorkout"("trainingPlanId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedRoute_plannedWorkoutId_key" ON "GeneratedRoute"("plannedWorkoutId");

-- CreateIndex
CREATE INDEX "Club_userId_status_idx" ON "Club"("userId", "status");

-- CreateIndex
CREATE INDEX "ClubSession_clubId_dayOfWeek_idx" ON "ClubSession"("clubId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSuggestion_plannedWorkoutId_key" ON "ClubSuggestion"("plannedWorkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Run_plannedWorkoutId_key" ON "Run"("plannedWorkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Run_stravaActivityId_key" ON "Run"("stravaActivityId");

-- CreateIndex
CREATE INDEX "Run_userId_date_idx" ON "Run"("userId", "date");

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_fitnessSnapshotId_fkey" FOREIGN KEY ("fitnessSnapshotId") REFERENCES "FitnessSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessSnapshot" ADD CONSTRAINT "FitnessSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedRoute" ADD CONSTRAINT "GeneratedRoute_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSession" ADD CONSTRAINT "ClubSession_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSuggestion" ADD CONSTRAINT "ClubSuggestion_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSuggestion" ADD CONSTRAINT "ClubSuggestion_clubSessionId_fkey" FOREIGN KEY ("clubSessionId") REFERENCES "ClubSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
