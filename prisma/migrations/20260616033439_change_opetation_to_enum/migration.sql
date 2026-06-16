/*
  Warnings:

  - Changed the type of `operation` on the `OtrsSyncQueue` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OtrsOperation" AS ENUM ('TicketCreate', 'TicketUpdate');

-- AlterTable
ALTER TABLE "OtrsSyncQueue" DROP COLUMN "operation",
ADD COLUMN     "operation" "OtrsOperation" NOT NULL;
