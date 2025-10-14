-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "resolutionDue" TIMESTAMP(3),
ADD COLUMN     "responseDue" TIMESTAMP(3),
ADD COLUMN     "startSlaTime" TIMESTAMP(3);
