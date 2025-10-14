-- AlterTable
ALTER TABLE "public"."Ticket" ALTER COLUMN "priority" DROP NOT NULL,
ALTER COLUMN "priority" DROP DEFAULT;
