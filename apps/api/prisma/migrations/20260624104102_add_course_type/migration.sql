-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('CORE', 'ELECTIVE');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "type" "CourseType" NOT NULL DEFAULT 'CORE';
