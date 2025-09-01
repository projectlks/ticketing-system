/*
  Warnings:

  - You are about to drop the column `device` on the `UserActivity` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `UserActivity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UserActivity" DROP COLUMN "device",
DROP COLUMN "ip";
