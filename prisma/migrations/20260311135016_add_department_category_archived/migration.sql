-- AlterTable
ALTER TABLE "category" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "department" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "category_isArchived_idx" ON "category"("isArchived");

-- CreateIndex
CREATE INDEX "department_isArchived_idx" ON "department"("isArchived");
