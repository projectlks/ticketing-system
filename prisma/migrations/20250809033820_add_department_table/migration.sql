-- CreateTable
CREATE TABLE "public"."department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."department" ADD CONSTRAINT "department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department" ADD CONSTRAINT "department_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
