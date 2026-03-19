/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { randomBytes, randomUUID, scryptSync } = require("node:crypto");

const DAY_MS = 24 * 60 * 60 * 1000;
const STUDENT_PASSWORD = "StudyApp2026!";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function isoDaysFromNow(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function normalizeLocalTcpDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") &&
      parsed.hostname === "localhost"
    ) {
      parsed.hostname = "127.0.0.1";
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}

function extractTcpUrlFromPrismaDevUrl(url) {
  if (!url.startsWith("prisma+postgres://")) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const apiKey = parsed.searchParams.get("api_key");
    if (!apiKey) {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(apiKey));
    if (
      payload.databaseUrl &&
      (payload.databaseUrl.startsWith("postgres://") ||
        payload.databaseUrl.startsWith("postgresql://"))
    ) {
      return normalizeLocalTcpDatabaseUrl(payload.databaseUrl);
    }
    return null;
  } catch {
    return null;
  }
}

function resolveDatabaseUrl() {
  const envPath = join(process.cwd(), ".env");
  const envFile = readFileSync(envPath, "utf8");
  const match = envFile.match(/^\s*DATABASE_URL\s*=\s*("?)(.+?)\1\s*$/m);
  if (!match?.[2]) {
    throw new Error("DATABASE_URL is not defined in .env");
  }

  const configured = match[2];
  const tcpUrl =
    extractTcpUrlFromPrismaDevUrl(configured) ??
    (configured.startsWith("postgres://") || configured.startsWith("postgresql://")
      ? normalizeLocalTcpDatabaseUrl(configured)
      : null);

  if (!tcpUrl) {
    throw new Error("Unable to resolve TCP DATABASE_URL from .env");
  }

  return tcpUrl;
}

function buildLog({ topic, pages, minutes, daysFromNow }) {
  return {
    minutesSpent: minutes,
    pagesCompleted: pages,
    topic,
    completedAt: isoDaysFromNow(daysFromNow),
  };
}

function buildSnapshot({
  examTitle,
  totalPages,
  pagesCompleted,
  weeklyAllocationHours,
  dailyTargetPages,
  affinityAdjustment,
  affinityLabel,
  affinityExplanation,
  risk = "medium",
  confidence = "medium",
  logs = [],
}) {
  const remainingPages = Math.max(totalPages - pagesCompleted, 0);
  const completionPercent = totalPages
    ? Math.min(100, Math.round((pagesCompleted / totalPages) * 100))
    : 0;
  const lastLog = logs[0];
  const minutesSpent = logs.reduce((sum, log) => sum + log.minutesSpent, 0) || weeklyAllocationHours * 60;

  return {
    paceLabel: affinityLabel,
    paceDescription: `${examTitle} keeps the highest-value material in focus.`,
    scopeSummary: `Plan covers ${totalPages} core pages and notes.`,
    scopeSource: "verified_workload",
    confidence,
    risk,
    urgency: "medium",
    totalScopePages: totalPages,
    completedPages: pagesCompleted,
    remainingPages,
    completionPercent,
    weeklyAllocationMinutes: weeklyAllocationHours * 60,
    weeklyAllocationHours,
    dailyTargetPages,
    dailyTargetMinutes: dailyTargetPages * 4,
    summaryPreferencePct: 35,
    intensityPreference: "balanced",
    paceLocked: false,
    affinityImpact: {
      adjustment: affinityAdjustment,
      label: affinityLabel,
      explanation: affinityExplanation,
    },
    studyLogSummary: {
      minutesSpent,
      pagesCompleted,
      sessionsCompleted: logs.length,
      lastTopic: lastLog?.topic ?? "No study logged yet.",
      lastCompletedAt: lastLog?.completedAt ?? isoDaysFromNow(-2),
    },
    explanationBullets: [
      "Follow the guided focus for the highest-leverage material.",
      "Log each study block so the planner can surface progress.",
      "Keep weekly minutes light to protect time for other activities.",
    ],
    nextSteps: ["Open the focus page after the today cards", "Report progress before you close the session"],
  };
}

function createExamDefinition(definition) {
  const logs = definition.studyLogs ?? [];
  const pagesCompleted =
    typeof definition.pagesCompleted === "number"
      ? definition.pagesCompleted
      : logs.reduce((sum, log) => sum + log.pagesCompleted, 0);
  const snapshot = buildSnapshot({
    examTitle: definition.title,
    totalPages: definition.totalPages,
    pagesCompleted,
    weeklyAllocationHours: definition.weeklyAllocationHours,
    dailyTargetPages: definition.dailyTargetPages,
    affinityAdjustment: definition.affinityAdjustment,
    affinityLabel: definition.affinityLabel,
    affinityExplanation: definition.affinityExplanation,
    risk: definition.snapshotRisk,
    confidence: definition.snapshotConfidence,
    logs,
  });

  return {
    title: definition.title,
    examDate: definition.examDate,
    targetGrade: definition.targetGrade,
    workloadReadiness: definition.workloadReadiness,
    materialType: definition.materialType,
    workloadPayload: definition.workloadPayload,
    planState: {
      create: {
        intensityPreference: definition.intensityPreference,
        summaryPreferencePct: definition.summaryPreferencePct,
        paceLocked: definition.paceLocked,
        lastRecommendationSnapshot: snapshot,
        lastGeneratedAt: new Date().toISOString(),
      },
    },
    studyLogs: logs.length
      ? {
          create: logs.map((log) => ({
            minutesSpent: log.minutesSpent,
            pagesCompleted: log.pagesCompleted,
            topic: log.topic,
            completedAt: log.completedAt,
          })),
        }
      : undefined,
  };
}

const students = [
  {
    email: "simulation-balanced@studyapp.local",
    fullName: "Balanced Learner",
    weeklyHours: 18,
    subjectAffinity: {
      easiestSubjects: ["Mathematics"],
      effortSubjects: ["History"],
    },
    subjects: [
      {
        name: "Mathematics",
        color: "#1d4ed8",
        exams: [
          createExamDefinition({
            title: "Calculus II Final",
            examDate: isoDaysFromNow(21),
            targetGrade: "29/30",
            workloadReadiness: "steady",
            materialType: "textbook",
            workloadPayload: {
              totalPages: 210,
              bookTitle: "Calculus Variation Notes",
            },
            totalPages: 210,
            pagesCompleted: 40,
            weeklyAllocationHours: 5,
            dailyTargetPages: 15,
            intensityPreference: "balanced",
            summaryPreferencePct: 35,
            paceLocked: false,
            affinityAdjustment: "preferred",
            affinityLabel: "Preferred pace",
            affinityExplanation: "Math comes easier, so the coach nudges a slightly faster flow.",
            snapshotRisk: "low",
            snapshotConfidence: "medium",
            studyLogs: [
              buildLog({
                topic: "Integration practice",
                pages: 22,
                minutes: 80,
                daysFromNow: -1,
              }),
              buildLog({
                topic: "Problem set",
                pages: 18,
                minutes: 65,
                daysFromNow: -2,
              }),
            ],
          }),
        ],
      },
      {
        name: "History",
        color: "#0f766e",
        exams: [
          createExamDefinition({
            title: "Modern History Review",
            examDate: isoDaysFromNow(34),
            targetGrade: "A",
            workloadReadiness: "calm",
            materialType: "notes",
            workloadPayload: {
              totalPages: 160,
              notesSummary: "Lecture highlights",
            },
            totalPages: 160,
            pagesCompleted: 25,
            weeklyAllocationHours: 4,
            dailyTargetPages: 12,
            intensityPreference: "lighter",
            summaryPreferencePct: 30,
            paceLocked: false,
            affinityAdjustment: "effort",
            affinityLabel: "Cautious buffer pace",
            affinityExplanation: "History needs a little extra margin this week.",
            snapshotRisk: "medium",
            snapshotConfidence: "medium",
            studyLogs: [
              buildLog({
                topic: "Timeline work",
                pages: 25,
                minutes: 70,
                daysFromNow: -3,
              }),
            ],
          }),
        ],
      },
    ],
  },
  {
    email: "simulation-overloaded@studyapp.local",
    fullName: "Overloaded Scholar",
    weeklyHours: 6,
    subjectAffinity: null,
    subjects: [
      {
        name: "Physics",
        color: "#b45309",
        exams: [
          createExamDefinition({
            title: "Quantum Mechanics Rush",
            examDate: isoDaysFromNow(12),
            targetGrade: "28/30",
            workloadReadiness: "urgent",
            materialType: "slides",
            workloadPayload: {
              totalPages: 340,
              materialDetails: "Slides and recorded office hours",
            },
            totalPages: 340,
            pagesCompleted: 55,
            weeklyAllocationHours: 3,
            dailyTargetPages: 22,
            intensityPreference: "stronger",
            summaryPreferencePct: 40,
            paceLocked: false,
            affinityAdjustment: "none",
            affinityLabel: "Conservative pace",
            affinityExplanation: "This run keeps a cautious fallback to limit burnout.",
            snapshotRisk: "high",
            snapshotConfidence: "low",
            studyLogs: [
              buildLog({
                topic: "Operator practice",
                pages: 30,
                minutes: 90,
                daysFromNow: -1,
              }),
              buildLog({
                topic: "Problem set 5",
                pages: 25,
                minutes: 80,
                daysFromNow: -3,
              }),
            ],
          }),
          createExamDefinition({
            title: "Systems Design Sprint",
            examDate: isoDaysFromNow(28),
            targetGrade: "Pass",
            workloadReadiness: "steady",
            materialType: "notes",
            workloadPayload: {
              totalPages: 220,
              materialDetails: "Architecture notebooks",
            },
            totalPages: 220,
            pagesCompleted: 28,
            weeklyAllocationHours: 2,
            dailyTargetPages: 16,
            intensityPreference: "stronger",
            summaryPreferencePct: 45,
            paceLocked: false,
            affinityAdjustment: "none",
            affinityLabel: "Controlled pace",
            affinityExplanation: "Buffering to keep the overall load manageable.",
            snapshotRisk: "medium",
            snapshotConfidence: "medium",
            studyLogs: [
              buildLog({
                topic: "Architecture review",
                pages: 28,
                minutes: 70,
                daysFromNow: -2,
              }),
            ],
          }),
        ],
      },
    ],
  },
  {
    email: "simulation-affinity@studyapp.local",
    fullName: "Affinity Coach",
    weeklyHours: 10,
    subjectAffinity: {
      easiestSubjects: ["Computer Science"],
      effortSubjects: ["Law", "Economics"],
    },
    subjects: [
      {
        name: "Law",
        color: "#6d28d9",
        exams: [
          createExamDefinition({
            title: "Civil Procedure Intensive",
            examDate: isoDaysFromNow(26),
            targetGrade: "A",
            workloadReadiness: "steady",
            materialType: "textbook",
            workloadPayload: {
              totalPages: 200,
              notesSummary: "Case law annotations",
            },
            totalPages: 200,
            pagesCompleted: 32,
            weeklyAllocationHours: 4,
            dailyTargetPages: 14,
            intensityPreference: "balanced",
            summaryPreferencePct: 32,
            paceLocked: false,
            affinityAdjustment: "effort",
            affinityLabel: "Effort buffer",
            affinityExplanation: "Law takes more depth, so the planner preserves a buffer.",
            snapshotRisk: "medium",
            snapshotConfidence: "medium",
            studyLogs: [
              buildLog({
                topic: "Procedural templates",
                pages: 18,
                minutes: 60,
                daysFromNow: -1,
              }),
              buildLog({
                topic: "Case walkthrough",
                pages: 14,
                minutes: 55,
                daysFromNow: -4,
              }),
            ],
          }),
        ],
      },
      {
        name: "Economics",
        color: "#0ea5e9",
        exams: [
          createExamDefinition({
            title: "Managerial Economics Sprint",
            examDate: isoDaysFromNow(18),
            targetGrade: "B+",
            workloadReadiness: "medium",
            materialType: "notes",
            workloadPayload: {
              totalPages: 180,
              notesSummary: "Wordy memos and calculators",
            },
            totalPages: 180,
            pagesCompleted: 18,
            weeklyAllocationHours: 3,
            dailyTargetPages: 12,
            intensityPreference: "balanced",
            summaryPreferencePct: 30,
            paceLocked: false,
            affinityAdjustment: "effort",
            affinityLabel: "Effort buffer",
            affinityExplanation: "Economics also asks for an extra margin of safety.",
            snapshotRisk: "high",
            snapshotConfidence: "low",
            studyLogs: [
              buildLog({
                topic: "Elasticity review",
                pages: 18,
                minutes: 50,
                daysFromNow: -2,
              }),
            ],
          }),
        ],
      },
    ],
  },
  {
    email: "simulation-mixed@studyapp.local",
    fullName: "Mixed Material Maven",
    weeklyHours: 14,
    subjectAffinity: {
      easiestSubjects: ["Biology"],
      effortSubjects: ["Physics"],
    },
    subjects: [
      {
        name: "Biology",
        color: "#15803d",
        exams: [
          createExamDefinition({
            title: "Molecular Biology Lab",
            examDate: isoDaysFromNow(15),
            targetGrade: "A",
            workloadReadiness: "steady",
            materialType: "slides",
            workloadPayload: {
              totalPages: 190,
              materialDetails: "Lab slides from every module",
            },
            totalPages: 190,
            pagesCompleted: 28,
            weeklyAllocationHours: 4,
            dailyTargetPages: 12,
            intensityPreference: "balanced",
            summaryPreferencePct: 33,
            paceLocked: false,
            affinityAdjustment: "preferred",
            affinityLabel: "Preferred pace",
            affinityExplanation: "Biology feels natural, so the plan nudges forward.",
            snapshotRisk: "low",
            snapshotConfidence: "high",
            studyLogs: [
              buildLog({
                topic: "Protein synthesis notes",
                pages: 15,
                minutes: 60,
                daysFromNow: -1,
              }),
              buildLog({
                topic: "Lab prep",
                pages: 13,
                minutes: 50,
                daysFromNow: -3,
              }),
            ],
          }),
        ],
      },
      {
        name: "Art",
        color: "#c026d3",
        exams: [
          createExamDefinition({
            title: "Modern Art Critique",
            examDate: isoDaysFromNow(40),
            targetGrade: "Pass",
            workloadReadiness: "light",
            materialType: "notes",
            workloadPayload: {
              totalPages: 130,
              notesSummary: "Sketchbook review",
            },
            totalPages: 130,
            pagesCompleted: 10,
            weeklyAllocationHours: 2,
            dailyTargetPages: 8,
            intensityPreference: "lighter",
            summaryPreferencePct: 30,
            paceLocked: false,
            affinityAdjustment: "preferred",
            affinityLabel: "Creative pace",
            affinityExplanation: "Art is lighter so the plan stays breezy.",
            snapshotRisk: "low",
            snapshotConfidence: "high",
            studyLogs: [
              buildLog({
                topic: "Sketchbook reflections",
                pages: 10,
                minutes: 40,
                daysFromNow: -4,
              }),
            ],
          }),
        ],
      },
    ],
  },
];

async function main() {
  const pool = new Pool({ connectionString: resolveDatabaseUrl() });
  const hashedPassword = hashPassword(STUDENT_PASSWORD);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const emails = students.map((student) => student.email);
    await client.query(`DELETE FROM "Student" WHERE email = ANY($1)`, [emails]);

    for (const student of students) {
      const studentId = randomUUID();
      const now = new Date();
      await client.query(
        `
        INSERT INTO "Student" (
          "id", "email", "fullName", "weeklyHours", "subjectAffinity", "passwordHash", "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
        [
          studentId,
          student.email,
          student.fullName,
          student.weeklyHours,
          student.subjectAffinity,
          hashedPassword,
          now.toISOString(),
          now.toISOString(),
        ],
      );

      for (const subject of student.subjects) {
        const subjectId = randomUUID();
        const subjectNow = new Date();
        await client.query(
          `
          INSERT INTO "Subject" (
            "id", "studentId", "name", "color", "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6)
        `,
          [
            subjectId,
            studentId,
            subject.name,
            subject.color,
            subjectNow.toISOString(),
            subjectNow.toISOString(),
          ],
        );

        for (const exam of subject.exams) {
          const examId = randomUUID();
          const examNow = new Date();
          await client.query(
            `
            INSERT INTO "Exam" (
              "id", "studentId", "subjectId", "title", "examDate", "targetGrade", "workloadReadiness",
              "materialType", "workloadPayload", "createdAt", "updatedAt"
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          `,
            [
              examId,
              studentId,
              subjectId,
              exam.title,
              exam.examDate,
              exam.targetGrade,
              exam.workloadReadiness,
              exam.materialType,
              exam.workloadPayload ? JSON.stringify(exam.workloadPayload) : null,
              examNow.toISOString(),
              examNow.toISOString(),
            ],
          );

          const planStateId = randomUUID();
          await client.query(
            `
            INSERT INTO "ExamPlanState" (
              "id", "studentId", "examId", "intensityPreference", "summaryPreferencePct", "paceLocked",
              "lastRecommendationSnapshot", "lastGeneratedAt", "createdAt", "updatedAt"
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          `,
            [
              planStateId,
              studentId,
              examId,
              exam.planState.create.intensityPreference,
              exam.planState.create.summaryPreferencePct,
              exam.planState.create.paceLocked,
              JSON.stringify(exam.planState.create.lastRecommendationSnapshot),
              exam.planState.create.lastGeneratedAt,
              examNow.toISOString(),
              examNow.toISOString(),
            ],
          );

          for (const log of exam.studyLogs?.create ?? []) {
            const logId = randomUUID();
            const logTime = new Date();
            await client.query(
              `
              INSERT INTO "ExamStudyLog" (
                "id", "studentId", "examId", "minutesSpent", "pagesCompleted", "topic",
                "completedAt", "createdAt", "updatedAt"
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `,
              [
                logId,
                studentId,
                examId,
                log.minutesSpent,
                log.pagesCompleted,
                log.topic,
                log.completedAt,
                logTime.toISOString(),
                logTime.toISOString(),
              ],
            );
          }
        }
      }
      console.log(`Seeded ${student.email}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed simulation students", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
