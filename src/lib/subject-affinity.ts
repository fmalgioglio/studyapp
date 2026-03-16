export type SubjectAffinity = {
  easiestSubjects: string[];
  effortSubjects: string[];
};

export type SubjectAffinityAdjustment = "none" | "preferred" | "effort";
export type SubjectAffinityExplanation = {
  title: string;
  body: string;
};

const SUBJECT_ALIAS_GROUPS: Record<string, string[]> = {
  mathematics: [
    "mathematics",
    "math",
    "maths",
    "matematica",
    "algebra",
    "calculus",
    "statistics",
  ],
  physics: [
    "physics",
    "fisica",
    "mechanics",
    "thermodynamics",
    "quantum",
  ],
  chemistry: [
    "chemistry",
    "chem",
    "chimica",
    "organic",
    "inorganic",
    "stoichiometry",
  ],
  biology: [
    "biology",
    "bio",
    "biologia",
    "biochemistry",
    "genetics",
    "anatomy",
  ],
  history: ["history", "hist", "storia", "modern history", "world history"],
  literature: [
    "literature",
    "letteratura",
    "lit",
    "poetry",
    "novel",
    "anthology",
  ],
  english: ["english", "inglese", "english language"],
  law: [
    "law",
    "diritto",
    "jurisprudence",
    "civil law",
    "private law",
    "constitutional law",
  ],
  economics: [
    "economics",
    "economia",
    "econ",
    "microeconomics",
    "macroeconomics",
    "finance",
  ],
  computer_science: [
    "computer science",
    "computer-science",
    "comp sci",
    "cs",
    "informatica",
    "informatics",
    "computing",
    "algorithms",
    "programming",
    "software",
    "software engineering",
    "ai",
  ],
  philosophy: ["philosophy", "filosofia", "philo", "ethics", "logic"],
  art_design: [
    "art",
    "arte",
    "design",
    "art design",
    "visual design",
    "graphic design",
    "history of art",
  ],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTokenSet(value: string) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

function resolveAlias(subjectName: string): string | null {
  const normalized = normalizeText(subjectName);
  if (!normalized) return null;
  const padded = ` ${normalized} `;
  const tokens = normalizeTokenSet(subjectName);

  for (const [key, aliases] of Object.entries(SUBJECT_ALIAS_GROUPS)) {
    if (
      aliases.some((alias) => {
        const normalizedAlias = normalizeText(alias);
        if (!normalizedAlias) return false;
        if (normalized === normalizedAlias) return true;
        if (normalizedAlias.includes(" ")) {
          return padded.includes(` ${normalizedAlias} `);
        }
        return tokens.has(normalizedAlias);
      })
    ) {
      return key;
    }
  }

  return null;
}

function normalizeSubjectList(values: string[]) {
  const normalized = values
    .map((entry) => resolveAlias(entry))
    .filter((entry): entry is string => Boolean(entry));
  return [...new Set(normalized)];
}

export function normalizeSubjectAffinity(raw: unknown): SubjectAffinity | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as {
    easiestSubjects?: unknown;
    effortSubjects?: unknown;
  };

  const easiestRaw = Array.isArray(candidate.easiestSubjects)
    ? candidate.easiestSubjects
    : [];
  const effortRaw = Array.isArray(candidate.effortSubjects)
    ? candidate.effortSubjects
    : [];

  const easiestSubjects = normalizeSubjectList(
    easiestRaw.filter((entry): entry is string => typeof entry === "string"),
  );
  const effortSubjects = normalizeSubjectList(
    effortRaw.filter((entry): entry is string => typeof entry === "string"),
  );

  if (easiestSubjects.length === 0 && effortSubjects.length === 0) {
    return null;
  }

  return {
    easiestSubjects,
    effortSubjects,
  };
}

export function getSubjectAffinityAdjustment(
  subjectName: string,
  affinity: SubjectAffinity | null | undefined,
): SubjectAffinityAdjustment {
  if (!affinity) return "none";
  const resolvedSubject = resolveAlias(subjectName);
  if (!resolvedSubject) return "none";

  if (affinity.effortSubjects.includes(resolvedSubject)) {
    return "effort";
  }

  if (affinity.easiestSubjects.includes(resolvedSubject)) {
    return "preferred";
  }

  return "none";
}

export function getSubjectAffinityFactors(adjustment: SubjectAffinityAdjustment) {
  if (adjustment === "effort") {
    return {
      paceMultiplier: 0.92,
      dailyPagesMultiplier: 0.95,
      missionMinutesMultiplier: 1.1,
      urgencyWeightMultiplier: 1.08,
    };
  }

  if (adjustment === "preferred") {
    return {
      paceMultiplier: 1.06,
      dailyPagesMultiplier: 1.05,
      missionMinutesMultiplier: 0.96,
      urgencyWeightMultiplier: 0.97,
    };
  }

  return {
    paceMultiplier: 1,
    dailyPagesMultiplier: 1,
    missionMinutesMultiplier: 1,
    urgencyWeightMultiplier: 1,
  };
}

export function getSubjectAffinityExplanation(
  adjustment: SubjectAffinityAdjustment,
  language: "en" | "it" = "en",
): SubjectAffinityExplanation | null {
  if (adjustment === "none") return null;

  if (language === "it") {
    if (adjustment === "effort") {
      return {
        title: "Nota piano",
        body: "Questo piano lascia un piccolo margine in piu, perche questa materia di solito richiede piu impegno per te.",
      };
    }

    return {
      title: "Nota piano",
      body: "Questo piano usa un ritmo leggermente piu diretto, perche questa materia di solito ti risulta piu naturale.",
    };
  }

  if (adjustment === "effort") {
    return {
      title: "Plan note",
      body: "This plan keeps a small extra buffer because this subject usually takes more effort for you.",
    };
  }

  return {
    title: "Plan note",
    body: "This plan uses a slightly more direct pace because this subject usually feels more natural for you.",
  };
}

export function getNextStepAffinityExplanation(
  adjustment: SubjectAffinityAdjustment,
  language: "en" | "it" = "en",
): string | null {
  if (adjustment === "none") return null;

  if (language === "it") {
    return adjustment === "effort"
      ? "Questo passaggio include un piccolo margine in piu, perche questa materia di solito richiede piu impegno per te."
      : "Questo passaggio usa un ritmo leggermente piu diretto, perche questa materia di solito ti risulta piu naturale.";
  }

  return adjustment === "effort"
    ? "This step includes a small extra buffer because this subject usually takes more effort for you."
    : "This step uses a slightly faster pace because this subject usually feels more natural for you.";
}
