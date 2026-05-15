import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenariosSource = readFileSync(resolve(root, "src/scenarios.ts"), "utf8");
const workerSource = readFileSync(resolve(root, "src/worker.ts"), "utf8");
const appSource = readFileSync(resolve(root, "public/app.js"), "utf8");

function findSkillsRoot() {
  const candidates = [
    resolve(root, "vendor/claude-for-legal-cn"),
    resolve(root, "../..")
  ];
  return candidates.find((candidate) => existsSync(resolve(candidate, "references/china-legal-foundation.md")));
}

const skillsRoot = findSkillsRoot();
assert.ok(skillsRoot, "skills repo or submodule must be available");

const scenarioBlocks = [...scenariosSource.matchAll(/id: "([^"]+)"[\s\S]*?skillPath: "([^"]+)"[\s\S]*?referencePaths: \[\.\.\.SHARED_REFERENCE_PATHS\]/g)];
assert.equal(scenarioBlocks.length, 8, "expected 8 curated scenarios");

for (const [, id, skillPath] of scenarioBlocks) {
  assert.ok(existsSync(resolve(skillsRoot, skillPath)), `scenario ${id} skillPath missing: ${skillPath}`);
}

for (const ref of [
  "references/china-legal-foundation.md",
  "references/china-source-catalog.md",
  "references/china-plugin-workflow-map.md"
]) {
  assert.ok(existsSync(resolve(skillsRoot, ref)), `shared reference missing: ${ref}`);
}

assert.match(workerSource, /缺少 API Key/, "worker rejects missing API key");
assert.match(workerSource, /HTTPS/, "worker validates HTTPS provider URL");
assert.match(workerSource, /MAX_INPUT_CHARS/, "worker enforces input size");
assert.match(workerSource, /sanitizeError/, "worker sanitizes provider errors");
assert.match(workerSource, /\/api\/scenarios/, "worker exposes scenarios API");
assert.match(workerSource, /\/api\/chat/, "worker exposes chat API");
assert.doesNotMatch(workerSource, /localStorage/, "worker must not use localStorage");

assert.match(appSource, /sessionStorage/, "UI supports optional session-only retention");
assert.doesNotMatch(appSource, /localStorage/, "UI must not use localStorage");
assert.match(appSource, /clearAll/, "UI includes clear data behavior");
assert.match(appSource, /navigator\.clipboard\.writeText/, "UI can copy markdown output");

assert.match(scenariosSource, /中国大陆|PRC/, "scenario/prompt source includes PRC-mainland default language");
assert.match(readFileSync(resolve(root, "src/prompt.ts"), "utf8"), /供合格律师复核的工作草稿/, "legal safety wrapper requires lawyer review");
assert.doesNotMatch(scenariosSource, /Delaware|FRCP|FRE|DMCA|FMLA/, "scenarios must not default to US law concepts");

console.log("All tests passed");
