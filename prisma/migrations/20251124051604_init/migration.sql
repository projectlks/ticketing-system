/*
  Warnings:

  - You are about to drop the column `field` on the `audit` table. All the data in the column will be lost.
  - You are about to drop the column `newValue` on the `audit` table. All the data in the column will be lost.
  - You are about to drop the column `oldValue` on the `audit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "audit" DROP COLUMN "field",
DROP COLUMN "newValue",
DROP COLUMN "oldValue",
ADD COLUMN     "changes" JSONB;
