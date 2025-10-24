/*
  Warnings:

  - The `problemSeverity` column on the `logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Severity" AS ENUM ('INFORMATION', 'WARNING', 'AVERAGE', 'HIGH', 'DISASTER');

-- AlterTable
ALTER TABLE "public"."logs" DROP COLUMN "problemSeverity",
ADD COLUMN     "problemSeverity" "public"."Severity" NOT NULL DEFAULT 'INFORMATION';
