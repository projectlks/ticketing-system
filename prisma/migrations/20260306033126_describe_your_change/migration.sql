-- DropForeignKey
ALTER TABLE "audit" DROP CONSTRAINT "audit_userId_fkey";

-- AlterTable
ALTER TABLE "audit" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "audit" ADD CONSTRAINT "audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
