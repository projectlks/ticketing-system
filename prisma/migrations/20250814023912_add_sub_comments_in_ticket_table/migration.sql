-- AlterTable
ALTER TABLE "public"."Comment" ADD COLUMN     "parentId" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
