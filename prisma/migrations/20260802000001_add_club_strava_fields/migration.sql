-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "memberCount" INTEGER,
ADD COLUMN     "stravaClubId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "Club_userId_stravaClubId_key" ON "Club"("userId", "stravaClubId");
