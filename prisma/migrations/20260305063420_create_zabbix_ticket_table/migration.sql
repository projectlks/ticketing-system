-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('REQUEST', 'MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFORMATION', 'WARNING', 'AVERAGE', 'HIGH', 'DISASTER');

-- CreateEnum
CREATE TYPE "CreationMode" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "ZabbixStatus" AS ENUM ('PROBLEM', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "ZabbixTicket" (
    "id" SERIAL NOT NULL,
    "eventid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "clock" TIMESTAMP(3) NOT NULL,
    "triggerId" TEXT NOT NULL,
    "triggerName" TEXT,
    "triggerDesc" TEXT,
    "triggerStatus" TEXT,
    "triggerSeverity" TEXT,
    "hostName" TEXT NOT NULL,
    "hostTag" TEXT,
    "hostGroup" TEXT,
    "itemId" TEXT,
    "itemName" TEXT,
    "itemDescription" TEXT,
    "last5Values" TEXT,
    "tags" TEXT,
    "otrsTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZabbixTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LEVEL_1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "profileUrl" TEXT,
    "creatorId" TEXT,
    "updaterId" TEXT,
    "departmentId" TEXT NOT NULL,
    "jobPositionId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "creatorId" TEXT,
    "updaterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "departmentId" TEXT,
    "requesterId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attached" TEXT,
    "priority" "Priority",
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "slaId" TEXT,
    "categoryId" TEXT,
    "remark" TEXT,
    "isSlaViolated" BOOLEAN NOT NULL DEFAULT false,
    "creationMode" "CreationMode" NOT NULL DEFAULT 'MANUAL',
    "problemId" TEXT,
    "zabbixStatus" "ZabbixStatus",
    "startSlaTime" TIMESTAMP(3),
    "responseDue" TIMESTAMP(3),
    "resolutionDue" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLA" (
    "id" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "rcaTime" INTEGER,
    "availability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketView" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "ticketId" TEXT NOT NULL,
    "commenterId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit" (
    "id" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,

    CONSTRAINT "audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZabbixTicket_otrsTicketId_key" ON "ZabbixTicket"("otrsTicketId");

-- CreateIndex
CREATE INDEX "ZabbixTicket_eventid_idx" ON "ZabbixTicket"("eventid");

-- CreateIndex
CREATE INDEX "ZabbixTicket_status_idx" ON "ZabbixTicket"("status");

-- CreateIndex
CREATE INDEX "ZabbixTicket_clock_idx" ON "ZabbixTicket"("clock");

-- CreateIndex
CREATE UNIQUE INDEX "ZabbixTicket_triggerId_hostName_key" ON "ZabbixTicket"("triggerId", "hostName");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_creatorId_idx" ON "User"("creatorId");

-- CreateIndex
CREATE INDEX "User_updaterId_idx" ON "User"("updaterId");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "department_name_key" ON "department"("name");

-- CreateIndex
CREATE INDEX "department_creatorId_idx" ON "department"("creatorId");

-- CreateIndex
CREATE INDEX "department_updaterId_idx" ON "department"("updaterId");

-- CreateIndex
CREATE INDEX "department_createdAt_idx" ON "department"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_problemId_key" ON "Ticket"("problemId");

-- CreateIndex
CREATE INDEX "Ticket_departmentId_idx" ON "Ticket"("departmentId");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_idx" ON "Ticket"("requesterId");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "Ticket"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_slaId_idx" ON "Ticket"("slaId");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Ticket_isSlaViolated_idx" ON "Ticket"("isSlaViolated");

-- CreateIndex
CREATE INDEX "Ticket_isArchived_status_createdAt_idx" ON "Ticket"("isArchived", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_isArchived_status_idx" ON "Ticket"("assignedToId", "isArchived", "status");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_isArchived_status_idx" ON "Ticket"("requesterId", "isArchived", "status");

-- CreateIndex
CREATE INDEX "Ticket_departmentId_isArchived_status_idx" ON "Ticket"("departmentId", "isArchived", "status");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_isArchived_status_updatedAt_idx" ON "Ticket"("assignedToId", "isArchived", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Ticket_priority_isArchived_status_idx" ON "Ticket"("priority", "isArchived", "status");

-- CreateIndex
CREATE INDEX "Ticket_creationMode_idx" ON "Ticket"("creationMode");

-- CreateIndex
CREATE UNIQUE INDEX "SLA_priority_key" ON "SLA"("priority");

-- CreateIndex
CREATE INDEX "TicketImage_ticketId_idx" ON "TicketImage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketView_userId_idx" ON "TicketView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketView_ticketId_userId_key" ON "TicketView"("ticketId", "userId");

-- CreateIndex
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_commenterId_idx" ON "Comment"("commenterId");

-- CreateIndex
CREATE INDEX "CommentLike_userId_idx" ON "CommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLike_commentId_userId_key" ON "CommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "audit_entity_entityId_idx" ON "audit"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_changedAt_idx" ON "audit"("changedAt");

-- CreateIndex
CREATE INDEX "audit_entity_entityId_changedAt_idx" ON "audit"("entity", "entityId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "audit_userId_idx" ON "audit"("userId");

-- CreateIndex
CREATE INDEX "category_departmentId_idx" ON "category"("departmentId");

-- CreateIndex
CREATE INDEX "category_departmentId_name_idx" ON "category"("departmentId", "name");

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "category"("parentId");

-- CreateIndex
CREATE INDEX "category_name_createdAt_idx" ON "category"("name", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_slaId_fkey" FOREIGN KEY ("slaId") REFERENCES "SLA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketImage" ADD CONSTRAINT "TicketImage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketView" ADD CONSTRAINT "TicketView_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketView" ADD CONSTRAINT "TicketView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_commenterId_fkey" FOREIGN KEY ("commenterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit" ADD CONSTRAINT "audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
