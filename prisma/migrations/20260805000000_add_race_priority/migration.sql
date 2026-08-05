-- CreateEnum
CREATE TYPE "RacePriority" AS ENUM ('A', 'B', 'C');

-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN     "priority" "RacePriority" NOT NULL DEFAULT 'A';
