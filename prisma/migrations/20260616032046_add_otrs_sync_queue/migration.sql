-- CreateTable
CREATE TABLE "OtrsSyncQueue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtrsSyncQueue_pkey" PRIMARY KEY ("id")
);
