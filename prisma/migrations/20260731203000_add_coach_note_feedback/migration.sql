-- AlterTable
ALTER TABLE "CoachNote" ADD COLUMN     "helpful" BOOLEAN;

-- CreateIndex
CREATE INDEX "CoachNote_kind_helpful_idx" ON "CoachNote"("kind", "helpful");
