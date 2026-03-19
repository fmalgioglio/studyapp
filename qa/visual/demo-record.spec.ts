import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import {
  DEMO_DIR,
  demoFramePath,
  demoManifestPath,
  demoReportPath,
  encodeDemoArtifacts,
  ensureVisualArtifactDirs,
  seedSimulationData,
  signInSeededStudent,
} from "./helpers";
import { DEMO_STEPS } from "./manifest";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  ensureVisualArtifactDirs();
  try {
    await seedSimulationData();
  } catch {
    // Visual flows can still run when the seeded account already exists.
  }
});

test("@demo record a website-ready planner flow", async ({ page }) => {
  const runId = `${Date.now()}`;
  const runDir = join(DEMO_DIR, runId);
  mkdirSync(runDir, { recursive: true });

  await page.setViewportSize({ width: 1440, height: 960 });
  await signInSeededStudent(page);

  const frames: Array<{ name: string; path: string }> = [];

  for (const [index, step] of DEMO_STEPS.entries()) {
    await page.goto(step.path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    const path = demoFramePath(runId, `frame-${String(index + 1).padStart(3, "0")}`);
    await page.screenshot({
      path,
      fullPage: true,
    });
    frames.push({ name: step.name, path });
  }

  const outputs = await encodeDemoArtifacts(runId);

  const manifest = {
    generatedAt: new Date().toISOString(),
    runId,
    frames,
    outputs,
  };

  writeFileSync(demoManifestPath(runId), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(
    demoReportPath(runId),
    [
      "StudyApp demo recording",
      "",
      "This run stores a frame sequence under qa/artifacts/demos/",
      outputs.note,
    ].join("\n"),
    "utf8",
  );
});
