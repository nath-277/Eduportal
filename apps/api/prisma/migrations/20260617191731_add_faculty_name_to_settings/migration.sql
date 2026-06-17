-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('REGISTRATION', 'RESULTS', 'BUG', 'OTHER');

-- AlterEnum
ALTER TYPE "Level" ADD VALUE 'GRADUATED';

-- AlterTable
ALTER TABLE "AcademicSession" ADD COLUMN     "currentSemester" "Semester" NOT NULL DEFAULT 'FIRST';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "programmeId" TEXT;

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "facultyName" TEXT NOT NULL DEFAULT 'Computing & Information Sciences';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "programmeId" TEXT;

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'LOW',
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromLevel" "Level" NOT NULL,
    "toLevel" "Level" NOT NULL,
    "cgpa" DOUBLE PRECISION NOT NULL,
    "sessionName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "easeOfUse" INTEGER NOT NULL,
    "interfaceDesign" INTEGER NOT NULL,
    "reliability" INTEGER NOT NULL,
    "functionality" INTEGER NOT NULL,
    "performance" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "PromotionHistory_studentId_idx" ON "PromotionHistory"("studentId");

-- CreateIndex
CREATE INDEX "PlatformFeedback_userId_idx" ON "PlatformFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_name_key" ON "Programme"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_code_key" ON "Programme"("code");

-- CreateIndex
CREATE INDEX "Programme_departmentId_idx" ON "Programme"("departmentId");

-- CreateIndex
CREATE INDEX "Course_programmeId_idx" ON "Course"("programmeId");

-- CreateIndex
CREATE INDEX "User_programmeId_idx" ON "User"("programmeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFeedback" ADD CONSTRAINT "PlatformFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
