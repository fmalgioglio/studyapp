export const EXAM_WORKLOAD_MATERIAL_SHAPES = [
  "mini_handout",
  "handout_set",
  "slides",
  "personal_notes",
  "mixed",
  "offline_approximate",
] as const;

export type ExamWorkloadMaterialShape =
  (typeof EXAM_WORKLOAD_MATERIAL_SHAPES)[number];

export const EXAM_WORKLOAD_APPROXIMATE_SCOPE_UNITS = [
  "pages",
  "slides",
  "handouts",
  "items",
] as const;

export type ExamWorkloadApproximateScopeUnit =
  (typeof EXAM_WORKLOAD_APPROXIMATE_SCOPE_UNITS)[number];
