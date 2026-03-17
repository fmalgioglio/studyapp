-- CreateTable
CREATE TABLE "ExamPlanState" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "intensityPreference" TEXT DEFAULT 'balanced',
    "summaryPreferencePct" INTEGER NOT NULL DEFAULT 30,
    "paceLocked" BOOLEAN NOT NULL DEFAULT false,
    "lastRecommendationSnapshot" JSONB,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPlanState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamStudyLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "minutesSpent" INTEGER NOT NULL,
    "pagesCompleted" INTEGER NOT NULL DEFAULT 0,
    "topic" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamStudyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamPlanState_examId_key" ON "ExamPlanState"("examId");

-- CreateIndex
CREATE INDEX "ExamPlanState_studentId_idx" ON "ExamPlanState"("studentId");

-- CreateIndex
CREATE INDEX "ExamStudyLog_studentId_idx" ON "ExamStudyLog"("studentId");

-- CreateIndex
CREATE INDEX "ExamStudyLog_examId_idx" ON "ExamStudyLog"("examId");

-- CreateIndex
CREATE INDEX "ExamStudyLog_completedAt_idx" ON "ExamStudyLog"("completedAt");

-- AddForeignKey
ALTER TABLE "ExamPlanState" ADD CONSTRAINT "ExamPlanState_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPlanState" ADD CONSTRAINT "ExamPlanState_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStudyLog" ADD CONSTRAINT "ExamStudyLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStudyLog" ADD CONSTRAINT "ExamStudyLog_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
