export const VISUAL_VIEWPORTS = [
  {
    name: "desktop",
    width: 1440,
    height: 960,
  },
  {
    name: "mobile",
    width: 390,
    height: 844,
  },
] as const;

export const VISUAL_VIEWS = [
  { name: "home", path: "/", requiresAuth: false },
  { name: "login", path: "/login", requiresAuth: false },
  { name: "signup", path: "/signup", requiresAuth: false },
  { name: "planner", path: "/planner", requiresAuth: true },
  { name: "study-today", path: "/planner/focus", requiresAuth: true },
  { name: "subjects", path: "/planner/subjects", requiresAuth: true },
  { name: "obiettivi", path: "/planner/exams", requiresAuth: true },
  { name: "profile", path: "/planner/students", requiresAuth: true },
] as const;

export const DEMO_STEPS = [
  { name: "planner-hero", path: "/planner" },
  { name: "study-today", path: "/planner/focus" },
  { name: "obiettivi", path: "/planner/exams" },
  { name: "materials", path: "/planner/exams?view=materials" },
] as const;

export const SEEDED_VISUAL_LOGIN = {
  email: "simulation-balanced@studyapp.local",
  password: "StudyApp2026!",
} as const;
