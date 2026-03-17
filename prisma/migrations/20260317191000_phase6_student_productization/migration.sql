-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('EXAM', 'TEST', 'ORAL', 'SELF_STUDY');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('ACTIVE', 'POSTPONED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StudyTargetImportance" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'UNIVERSITY', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "SchoolProfile" AS ENUM ('LICEO', 'TECHNICAL', 'PROFESSIONAL', 'UNIVERSITY', 'SELF_STUDY', 'OTHER');

-- CreateEnum
CREATE TYPE "StudyMaterialType" AS ENUM ('TEXTBOOK', 'NOTES', 'HANDOUTS', 'COURSE_LINK', 'PERSONAL_FILE', 'OPEN_RESOURCE');

-- CreateEnum
CREATE TYPE "StudyMaterialOrigin" AS ENUM ('OPEN_VERIFIED', 'OFFICIAL_SOURCE', 'USER_LINK', 'USER_UPLOAD');

-- CreateEnum
CREATE TYPE "StudyMaterialVerificationLevel" AS ENUM ('VERIFIED', 'OFFICIAL', 'USER_PROVIDED', 'DISCOVERED');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "assessmentType" "AssessmentType" NOT NULL DEFAULT 'EXAM',
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "importance" "StudyTargetImportance" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "rescheduledFromDate" TIMESTAMP(3),
ADD COLUMN     "status" "ExamStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "educationLevel" "EducationLevel" NOT NULL DEFAULT 'INDEPENDENT',
ADD COLUMN     "schoolProfile" "SchoolProfile" NOT NULL DEFAULT 'SELF_STUDY';

-- CreateTable
CREATE TABLE "StudyMaterial" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT,
    "examId" TEXT,
    "type" "StudyMaterialType" NOT NULL,
    "origin" "StudyMaterialOrigin" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileMimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "fileContent" BYTEA,
    "licenseHint" TEXT,
    "availabilityHint" TEXT,
    "verificationLevel" "StudyMaterialVerificationLevel" NOT NULL DEFAULT 'USER_PROVIDED',
    "estimatedScopePages" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyMaterial_fileKey_key" ON "StudyMaterial"("fileKey");

-- CreateIndex
CREATE INDEX "StudyMaterial_studentId_idx" ON "StudyMaterial"("studentId");

-- CreateIndex
CREATE INDEX "StudyMaterial_subjectId_idx" ON "StudyMaterial"("subjectId");

-- CreateIndex
CREATE INDEX "StudyMaterial_examId_idx" ON "StudyMaterial"("examId");

-- CreateIndex
CREATE INDEX "StudyMaterial_origin_idx" ON "StudyMaterial"("origin");

-- CreateIndex
CREATE INDEX "StudyMaterial_verificationLevel_idx" ON "StudyMaterial"("verificationLevel");

-- CreateIndex
CREATE INDEX "Exam_status_idx" ON "Exam"("status");

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
