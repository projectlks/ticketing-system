-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_assigned_to_id_fkey";

-- AlterTable
ALTER TABLE "public"."Ticket" ALTER COLUMN "assigned_to_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
