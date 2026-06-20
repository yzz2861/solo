-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "headTeacher" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Class_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Textbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "isbn" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "supplierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Textbook_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Textbook_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "originalQty" INTEGER NOT NULL DEFAULT 0,
    "supplementQty" INTEGER NOT NULL DEFAULT 0,
    "returnQty" INTEGER NOT NULL DEFAULT 0,
    "finalQty" INTEGER NOT NULL DEFAULT 0,
    "deliveredQty" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "term" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "beforeQty" INTEGER NOT NULL,
    "afterQty" INTEGER NOT NULL,
    "beforeEditionId" TEXT,
    "afterEditionId" TEXT,
    "transferIds" TEXT,
    "operator" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedChangeId" TEXT,
    CONSTRAINT "OrderChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderChange_beforeEditionId_fkey" FOREIGN KEY ("beforeEditionId") REFERENCES "Textbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderChange_afterEditionId_fkey" FOREIGN KEY ("afterEditionId") REFERENCES "Textbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderChange_linkedChangeId_fkey" FOREIGN KEY ("linkedChangeId") REFERENCES "OrderChange" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferStudent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "studentNo" TEXT,
    "transferType" TEXT NOT NULL,
    "transferDate" DATETIME NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderChangeTransfer" (
    "orderChangeId" TEXT NOT NULL,
    "transferStudentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("orderChangeId", "transferStudentId"),
    CONSTRAINT "OrderChangeTransfer_orderChangeId_fkey" FOREIGN KEY ("orderChangeId") REFERENCES "OrderChange" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderChangeTransfer_transferStudentId_fkey" FOREIGN KEY ("transferStudentId") REFERENCES "TransferStudent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "deliveryNo" TEXT NOT NULL,
    "deliveryDate" DATETIME NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryItem_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "receiptDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signedBy" TEXT,
    "signedAt" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferMarked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Receipt_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "actualQty" INTEGER NOT NULL,
    "shortageQty" INTEGER NOT NULL DEFAULT 0,
    "isTransfer" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReceiptItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReceiptItem_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Grade_name_key" ON "Grade"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Class_gradeId_name_key" ON "Class"("gradeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Textbook_courseId_edition_key" ON "Textbook"("courseId", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "Order_term_classId_textbookId_key" ON "Order"("term", "classId", "textbookId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_deliveryNo_key" ON "Delivery"("deliveryNo");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNo_key" ON "Receipt"("receiptNo");
