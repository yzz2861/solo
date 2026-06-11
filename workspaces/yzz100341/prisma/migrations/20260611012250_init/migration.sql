-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "classId" TEXT,
    "routeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "studentNo" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "defaultRouteId" TEXT NOT NULL,
    "defaultStopId" TEXT NOT NULL,
    CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Student_defaultRouteId_fkey" FOREIGN KEY ("defaultRouteId") REFERENCES "BusRoute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Student_defaultStopId_fkey" FOREIGN KEY ("defaultStopId") REFERENCES "BusStop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "BusStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    CONSTRAINT "BusStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "originalRouteId" TEXT NOT NULL,
    "originalStopId" TEXT NOT NULL,
    "newRouteId" TEXT NOT NULL,
    "newStopId" TEXT NOT NULL,
    "reason" TEXT,
    "initiatorId" TEXT NOT NULL,
    "initiatorName" TEXT NOT NULL,
    "initiatorRole" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mergedToId" TEXT,
    "confirmedById" TEXT,
    "confirmedByName" TEXT,
    "confirmedAt" DATETIME,
    "rejectComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChangeRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_originalRouteId_fkey" FOREIGN KEY ("originalRouteId") REFERENCES "BusRoute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_originalStopId_fkey" FOREIGN KEY ("originalStopId") REFERENCES "BusStop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_newRouteId_fkey" FOREIGN KEY ("newRouteId") REFERENCES "BusRoute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_newStopId_fkey" FOREIGN KEY ("newStopId") REFERENCES "BusStop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardingRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "boardedAt" DATETIME,
    "markedById" TEXT NOT NULL,
    "markedByName" TEXT NOT NULL,
    CONSTRAINT "BoardingRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoardingRecord_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoardingRecord_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "BusStop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "changeId" TEXT,
    "operatorId" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "operatorRole" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "ChangeRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentNo_key" ON "Student"("studentNo");

-- CreateIndex
CREATE INDEX "ParentStudent_parentId_idx" ON "ParentStudent"("parentId");

-- CreateIndex
CREATE INDEX "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BusRoute_name_key" ON "BusRoute"("name");

-- CreateIndex
CREATE INDEX "BusStop_routeId_idx" ON "BusStop"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "BusStop_routeId_sequence_key" ON "BusStop"("routeId", "sequence");

-- CreateIndex
CREATE INDEX "ChangeRequest_studentId_date_idx" ON "ChangeRequest"("studentId", "date");

-- CreateIndex
CREATE INDEX "ChangeRequest_newRouteId_date_status_idx" ON "ChangeRequest"("newRouteId", "date", "status");

-- CreateIndex
CREATE INDEX "ChangeRequest_originalRouteId_date_idx" ON "ChangeRequest"("originalRouteId", "date");

-- CreateIndex
CREATE INDEX "BoardingRecord_routeId_date_idx" ON "BoardingRecord"("routeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BoardingRecord_studentId_date_key" ON "BoardingRecord"("studentId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_changeId_idx" ON "AuditLog"("changeId");
