ALTER TABLE "Exam"
ADD COLUMN "workloadReadiness" TEXT,
ADD COLUMN "materialType" TEXT,
ADD COLUMN "workloadPayload" JSONB;
