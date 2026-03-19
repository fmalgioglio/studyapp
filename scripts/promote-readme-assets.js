/* eslint-disable @typescript-eslint/no-require-imports */
const { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = process.cwd();
const DEMO_DIR = join(ROOT, "qa", "artifacts", "demos");
const SCREENSHOT_DIR = join(ROOT, "qa", "artifacts", "screenshots");
const README_ASSET_DIR = join(ROOT, "docs", "readme-assets");

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function latestDemoRunDir() {
  if (!existsSync(DEMO_DIR)) {
    throw new Error("Demo artifacts directory does not exist yet.");
  }

  const candidates = readdirSync(DEMO_DIR)
    .map((entry) => join(DEMO_DIR, entry))
    .filter((path) => statSync(path).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (candidates.length === 0) {
    throw new Error("No demo runs were found under qa/artifacts/demos.");
  }

  return candidates[0];
}

function copyIfPresent(source, destination) {
  if (!existsSync(source)) {
    return false;
  }
  copyFileSync(source, destination);
  return true;
}

function main() {
  ensureDir(README_ASSET_DIR);

  const latestRun = latestDemoRunDir();
  const copied = [];

  const demoGif = join(latestRun, "studyapp-demo.gif");
  const homeShot = join(SCREENSHOT_DIR, "home-desktop.png");

  if (copyIfPresent(homeShot, join(README_ASSET_DIR, "home-desktop.png"))) {
    copied.push("home-desktop.png");
  }
  if (copyIfPresent(demoGif, join(README_ASSET_DIR, "studyapp-demo.gif"))) {
    copied.push("studyapp-demo.gif");
  }

  if (copied.length === 0) {
    throw new Error("No README assets were copied. Generate screenshots or demo artifacts first.");
  }

  console.log(`Promoted README assets from ${latestRun}`);
  for (const file of copied) {
    console.log(`- ${file}`);
  }
}

main();
