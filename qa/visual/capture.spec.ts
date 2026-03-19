import { expect, test } from "@playwright/test";

import {
  ensureVisualArtifactDirs,
  screenshotFileName,
  seedSimulationData,
  signInSeededStudent,
} from "./helpers";
import { VISUAL_VIEWPORTS, VISUAL_VIEWS } from "./manifest";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  ensureVisualArtifactDirs();
  await seedSimulationData();
});

for (const view of VISUAL_VIEWS) {
  for (const viewport of VISUAL_VIEWPORTS) {
    test(`${view.name} ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      if (view.requiresAuth) {
        await signInSeededStudent(page);
      }

      await page.goto(view.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await page.screenshot({
        path: screenshotFileName(view.name, viewport.name),
        fullPage: true,
      });
    });
  }
}
