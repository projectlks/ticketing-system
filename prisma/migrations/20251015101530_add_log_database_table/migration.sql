-- CreateTable
CREATE TABLE "public"."logs" (
    "id" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "recoveryTime" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "description" TEXT,
    "problemSeverity" TEXT NOT NULL,
    "duration" TEXT,
    "contact" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
