-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "emergency_contact" TEXT,
ADD COLUMN     "emergency_phone" TEXT,
ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "identification_no" TEXT,
ADD COLUMN     "job_position" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "manager" TEXT,
ADD COLUMN     "marital_status" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "number_of_children" INTEGER,
ADD COLUMN     "passport_no" TEXT,
ADD COLUMN     "personal_email" TEXT,
ADD COLUMN     "personal_phone" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "work_email" TEXT,
ADD COLUMN     "work_mobile" TEXT;

-- AlterTable
ALTER TABLE "public"."audit" ADD COLUMN     "actionType" TEXT;
