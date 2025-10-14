-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "slaId" TEXT;

-- CreateTable
CREATE TABLE "public"."SLA" (
    "id" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "rcaTime" INTEGER,
    "availability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SLA_priority_key" ON "public"."SLA"("priority");

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_slaId_fkey" FOREIGN KEY ("slaId") REFERENCES "public"."SLA"("id") ON DELETE SET NULL ON UPDATE CASCADE;
