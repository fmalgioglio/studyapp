import { mkdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

import type { Page } from "@playwright/test";
import ffmpegPath from "ffmpeg-static";

import { SEEDED_VISUAL_LOGIN } from "./manifest";

const execFileAsync = promisify(execFile);

export const SCREENSHOT_DIR = join(process.cwd(), "qa", "artifacts", "screenshots");
export const DEMO_DIR = join(process.cwd(), "qa", "artifacts", "demos");

export function ensureVisualArtifactDirs() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  mkdirSync(DEMO_DIR, { recursive: true });
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function seedSimulationData() {
  const scriptPath = join(process.cwd(), "scripts", "seed-simulation.js");
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await execFileAsync("node", [scriptPath], {
        env: process.env,
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw lastError;
}

export async function signInSeededStudent(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(SEEDED_VISUAL_LOGIN.email);
  await page.getByLabel("Password").fill(SEEDED_VISUAL_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("domcontentloaded");
}

export function screenshotFileName(routeName: string, viewportName: string) {
  return join(
    SCREENSHOT_DIR,
    `${slugify(routeName)}-${slugify(viewportName)}.png`,
  );
}

export function demoFramePath(runId: string, frameName: string) {
  return join(DEMO_DIR, runId, `${slugify(frameName)}.png`);
}

export function demoManifestPath(runId: string) {
  return join(DEMO_DIR, runId, "manifest.json");
}

export function demoReportPath(runId: string) {
  return join(DEMO_DIR, runId, "README.txt");
}

export async function encodeDemoArtifacts(runId: string) {
  if (!ffmpegPath) {
    return {
      encoded: false,
      mp4Path: join(DEMO_DIR, runId, "studyapp-demo.mp4"),
      gifPath: join(DEMO_DIR, runId, "studyapp-demo.gif"),
      note: "ffmpeg-static is unavailable in this runtime, so only frame images were recorded.",
    };
  }

  const framePattern = join(DEMO_DIR, runId, "frame-%03d.png");
  const mp4Path = join(DEMO_DIR, runId, "studyapp-demo.mp4");
  const gifPath = join(DEMO_DIR, runId, "studyapp-demo.gif");

  await execFileAsync(ffmpegPath, [
    "-y",
    "-framerate",
    "1/2",
    "-i",
    framePattern,
    "-vf",
    "fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p",
    "-movflags",
    "+faststart",
    mp4Path,
  ]);

  await execFileAsync(ffmpegPath, [
    "-y",
    "-framerate",
    "1/2",
    "-i",
    framePattern,
    "-vf",
    "fps=12,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    gifPath,
  ]);

  return {
    encoded: true,
    mp4Path,
    gifPath,
    note: "MP4 and GIF artifacts were encoded from the recorded planner frames.",
  };
}
