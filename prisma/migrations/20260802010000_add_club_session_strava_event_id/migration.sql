-- AlterTable
ALTER TABLE "ClubSession" ADD COLUMN     "stravaEventId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "ClubSession_clubId_stravaEventId_key" ON "ClubSession"("clubId", "stravaEventId");
