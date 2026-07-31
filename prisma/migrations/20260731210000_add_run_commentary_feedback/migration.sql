-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "commentaryCategory" TEXT,
ADD COLUMN     "commentaryHelpful" BOOLEAN;

-- CreateIndex
CREATE INDEX "Run_commentaryCategory_commentaryHelpful_idx" ON "Run"("commentaryCategory", "commentaryHelpful");
