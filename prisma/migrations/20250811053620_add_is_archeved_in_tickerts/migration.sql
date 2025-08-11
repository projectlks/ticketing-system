/*
  Warnings:

  - You are about to drop the column `channel_id` on the `Ticket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Ticket" DROP COLUMN "channel_id";
