import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runSimulationSeed() {
  const scriptPath = join(process.cwd(), "scripts", "seed-simulation.js");
  await execFileAsync("node", [scriptPath], {
    env: process.env,
    stdio: "inherit",
  });
}

test.describe("Daily planner loop", () => {
  test.beforeAll(async () => {
    await runSimulationSeed();
  });

  test("shows the study coach daily loop for a seeded balanced student", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill("simulation-balanced@studyapp.local");
    await page.getByLabel("Password").fill("StudyApp2026!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/planner/);
    await expect(
      page.getByRole("heading", {
        name: "Study one exam at a time, without losing the full week.",
      }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Today focus" })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Mathematics Calculus II Final/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("Daily target").first()).toBeVisible();
    await expect(page.getByText("Pace").first()).toBeVisible();

    const weeklyToggle = page.getByRole("button", { name: "Show weekly view" });
    await expect(weeklyToggle).toBeVisible();
    await weeklyToggle.click();
    await expect(page.getByRole("heading", { name: "Weekly view" })).toBeVisible();
  });
});
