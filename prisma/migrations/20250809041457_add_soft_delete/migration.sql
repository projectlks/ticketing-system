-- DropForeignKey
ALTER TABLE "public"."department" DROP CONSTRAINT "department_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."department" DROP CONSTRAINT "department_managerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."department" DROP CONSTRAINT "department_updaterId_fkey";

-- AlterTable
ALTER TABLE "public"."department" ALTER COLUMN "managerId" DROP NOT NULL,
ALTER COLUMN "creatorId" DROP NOT NULL,
ALTER COLUMN "updaterId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "department_isArchived_idx" ON "public"."department"("isArchived");

-- AddForeignKey
ALTER TABLE "public"."department" ADD CONSTRAINT "department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department" ADD CONSTRAINT "department_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department" ADD CONSTRAINT "department_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
