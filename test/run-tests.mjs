import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenariosSource = readFileSync(resolve(root, "src/scenarios.ts"), "utf8");
const workerSource = readFileSync(resolve(root, "src/worker.ts"), "utf8");
const promptSource = readFileSync(resolve(root, "src/prompt.ts"), "utf8");
const appSource = readFileSync(resolve(root, "public/app.js"), "utf8");
const indexSource = readFileSync(resolve(root, "public/index.html"), "utf8");
const expertSkillsSource = readFileSync(resolve(root, "src/generated/expert-skills.ts"), "utf8");
const skillContextsSource = readFileSync(resolve(root, "src/generated/skill-contexts.ts"), "utf8");

function findSkillsRoot() {
  const candidates = [
    resolve(root, "vendor/claude-for-legal-cn"),
    resolve(root, "../..")
  ];
  return candidates.find((candidate) => existsSync(resolve(candidate, "references/china-legal-foundation.md")));
}

function readGeneratedExpertSkills() {
  const match = expertSkillsSource.match(/export const EXPERT_SKILLS: ExpertSkill\[] = ([\s\S]*?);\n\nexport function getExpertSkill/);
  assert.ok(match, "generated expert skills must be parseable");
  return JSON.parse(match[1]);
}

const skillsRoot = findSkillsRoot();
assert.ok(skillsRoot, "skills repo or submodule must be available");

const scenarioBlocks = [...scenariosSource.matchAll(/id: "([^"]+)"[\s\S]*?skillPath: "([^"]+)"[\s\S]*?referencePaths: \[\.\.\.SHARED_REFERENCE_PATHS\]/g)];
assert.equal(scenarioBlocks.length, 8, "expected 8 curated scenarios");

for (const [, id, skillPath] of scenarioBlocks) {
  assert.ok(existsSync(resolve(skillsRoot, skillPath)), `scenario ${id} skillPath missing: ${skillPath}`);
  assert.match(skillContextsSource, new RegExp(`"${id}"`), `scenario context missing: ${id}`);
}

for (const ref of [
  "references/china-legal-foundation.md",
  "references/china-source-catalog.md",
  "references/china-plugin-workflow-map.md"
]) {
  assert.ok(existsSync(resolve(skillsRoot, ref)), `shared reference missing: ${ref}`);
  assert.match(skillContextsSource, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `shared context missing ${ref}`);
}

const expertSkills = readGeneratedExpertSkills();
assert.ok(expertSkills.length > 0, "expert catalog must be non-empty");

const includedPlugins = new Set([
  "commercial-legal",
  "corporate-legal",
  "privacy-legal",
  "litigation-legal",
  "regulatory-legal",
  "employment-legal",
  "ip-legal",
  "product-legal",
  "ai-governance-legal"
]);
const excludedPlugins = new Set(["legal-builder-hub", "law-student", "external_plugins"]);
const excludedSkillNames = new Set(["customize", "matter-workspace", "cold-start-interview"]);

for (const skill of expertSkills) {
  assert.ok(includedPlugins.has(skill.plugin), `expert skill plugin should be included: ${skill.plugin}`);
  assert.ok(!excludedPlugins.has(skill.plugin), `expert skill plugin should be excluded: ${skill.plugin}`);
  assert.ok(!excludedSkillNames.has(skill.skillPath.split("/")[2]), `expert skill should be hidden: ${skill.skillPath}`);
  assert.ok(existsSync(resolve(skillsRoot, skill.skillPath)), `expert skillPath missing: ${skill.skillPath}`);
  assert.match(skillContextsSource, new RegExp(`"${skill.id}"`), `expert context missing: ${skill.id}`);
}

assert.doesNotMatch(expertSkillsSource, /## China Localization|Matter context|Destination check/, "GET /api/skills metadata must not contain full skill prompt text");
assert.doesNotMatch(expertSkillsSource, /Delaware|FRCP|FRE|DMCA|FMLA/, "expert catalog must not expose US-law defaults");

assert.match(workerSource, /缺少 API Key/, "worker rejects missing API key");
assert.match(workerSource, /HTTPS/, "worker validates HTTPS provider URL");
assert.match(workerSource, /MAX_INPUT_CHARS/, "worker enforces input size");
assert.match(workerSource, /sanitizeError/, "worker sanitizes provider errors");
assert.match(workerSource, /\/api\/scenarios/, "worker exposes scenarios API");
assert.match(workerSource, /\/api\/skills/, "worker exposes skills API");
assert.match(workerSource, /\/api\/chat/, "worker exposes chat API");
assert.match(workerSource, /skillId/, "worker accepts skillId");
assert.match(workerSource, /请选择演示场景或专家技能/, "worker rejects missing target");
assert.match(workerSource, /未知专家技能/, "worker rejects unknown skillId");
assert.match(workerSource, /未知场景/, "worker rejects unknown scenarioId");
assert.doesNotMatch(workerSource, /localStorage/, "worker must not use localStorage");

assert.match(indexSource, /专家模式/, "UI has Expert Mode switch");
assert.match(appSource, /loadSkills/, "UI loads expert skills");
assert.match(appSource, /filteredSkills/, "UI supports expert skill search/filter");
assert.match(appSource, /skillSearch/, "UI includes skill search");
assert.match(appSource, /practiceFilter/, "UI includes practice-area filter");
assert.match(appSource, /sessionStorage/, "UI supports optional session-only retention");
assert.doesNotMatch(appSource, /localStorage/, "UI must not use localStorage");
assert.match(appSource, /clearAll/, "UI includes clear data behavior");
assert.match(appSource, /navigator\.clipboard\.writeText/, "UI can copy markdown output");

assert.match(scenariosSource, /中国大陆|PRC/, "scenario source includes PRC-mainland default language");
assert.match(promptSource, /供合格律师复核的工作草稿/, "legal safety wrapper requires lawyer review");
assert.match(promptSource, /法律依据与来源时效提示/, "expert prompts require source-currency warning");
assert.doesNotMatch(scenariosSource, /Delaware|FRCP|FRE|DMCA|FMLA/, "scenarios must not default to US law concepts");

console.log("All tests passed");
