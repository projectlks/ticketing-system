-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "syncState" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "OtrsSyncQueue" ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT;

-- CreateIndex
CREATE INDEX "OtrsSyncQueue_ticketId_idx" ON "OtrsSyncQueue"("ticketId");

-- CreateIndex
CREATE INDEX "OtrsSyncQueue_status_idx" ON "OtrsSyncQueue"("status");
