-- AlterEnum
ALTER TYPE "RaceSource" ADD VALUE 'CURATED';

-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "commonName" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "participantCount" INTEGER,
ADD COLUMN     "registrationUrl" TEXT,
ADD COLUMN     "slogan" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- CreateIndex
CREATE INDEX "Race_raceDate_idx" ON "Race"("raceDate");

-- CreateIndex
CREATE INDEX "Race_name_idx" ON "Race"("name");

-- CreateIndex
CREATE INDEX "Race_commonName_idx" ON "Race"("commonName");

-- CreateIndex
CREATE UNIQUE INDEX "Race_source_externalId_key" ON "Race"("source", "externalId");

