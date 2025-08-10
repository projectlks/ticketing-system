/*
  Warnings:

  - You are about to drop the column `categoryId` on the `audit` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `audit` table. All the data in the column will be lost.
  - You are about to drop the column `ticketId` on the `audit` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."audit" DROP CONSTRAINT "audit_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit" DROP CONSTRAINT "audit_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit" DROP CONSTRAINT "audit_ticketId_fkey";

-- AlterTable
ALTER TABLE "public"."audit" DROP COLUMN "categoryId",
DROP COLUMN "departmentId",
DROP COLUMN "ticketId";
