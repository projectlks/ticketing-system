-- CreateIndex
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_commenterId_idx" ON "Comment"("commenterId");

-- CreateIndex
CREATE INDEX "CommentLike_userId_idx" ON "CommentLike"("userId");

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
CREATE INDEX "TicketImage_ticketId_idx" ON "TicketImage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketView_userId_idx" ON "TicketView"("userId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_creatorId_idx" ON "User"("creatorId");

-- CreateIndex
CREATE INDEX "User_updaterId_idx" ON "User"("updaterId");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE INDEX "ZabbixTicket_eventid_idx" ON "ZabbixTicket"("eventid");

-- CreateIndex
CREATE INDEX "ZabbixTicket_status_idx" ON "ZabbixTicket"("status");

-- CreateIndex
CREATE INDEX "ZabbixTicket_clock_idx" ON "ZabbixTicket"("clock");

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

-- CreateIndex
CREATE INDEX "department_creatorId_idx" ON "department"("creatorId");

-- CreateIndex
CREATE INDEX "department_updaterId_idx" ON "department"("updaterId");

-- CreateIndex
CREATE INDEX "department_createdAt_idx" ON "department"("createdAt");
