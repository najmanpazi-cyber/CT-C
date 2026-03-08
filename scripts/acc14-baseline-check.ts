// ACC-14: Run validators against committed baseline scenarios to identify regressions
import * as fs from "fs";
import * as path from "path";
import { loadScenarios, runAllValidators } from "./lib/scenarioMapper";
import { aggregateResults, classifyScenario } from "./lib/scorer";

const PROJECT_ROOT = path.resolve(import.meta.dir, "..");

// Load committed baseline scenarios
const baselineLines = fs.readFileSync(
  path.join(PROJECT_ROOT, "scripts/acc02-committed-baseline.jsonl"), "utf8"
).trim().split("\n");
const baselineScenarios = baselineLines.map((l) => JSON.parse(l));

// Load current scenarios
const currentScenarios = loadScenarios(path.join(PROJECT_ROOT, "specs/ACC-02-scenarios.jsonl"));

console.log("=== ACC-14 Regression Check ===\n");

// Run validators against COMMITTED baseline scenarios (using committed expectations)
const baselineResults: { id: string; cls: string }[] = [];
for (const s of baselineScenarios) {
  const run = runAllValidators(s.structured_fields);
  const agg = aggregateResults(s, run);
  const cls = classifyScenario(s, agg);
  baselineResults.push({ id: s.id, cls });
}

// Run validators against CURRENT scenarios
const currentResults: { id: string; cls: string }[] = [];
for (const s of currentScenarios) {
  const run = runAllValidators(s.structured_fields);
  const agg = aggregateResults(s, run);
  const cls = classifyScenario(s, agg);
  currentResults.push({ id: s.id, cls });
}

// Find regressions: was PASS in baseline, not PASS now
const regressions: string[] = [];
const improvements: string[] = [];
const baselinePassCount = baselineResults.filter(r => r.cls === "PASS").length;
const currentPassCount = currentResults.filter(r => r.cls === "PASS").length;

for (let i = 0; i < baselineResults.length; i++) {
  const b = baselineResults[i];
  const c = currentResults[i];
  if (b.cls === "PASS" && c.cls !== "PASS") {
    regressions.push(`${b.id}: PASS -> ${c.cls} (REGRESSION)`);
  }
  if (b.cls !== "PASS" && c.cls === "PASS") {
    improvements.push(`${b.id}: ${b.cls} -> PASS`);
  }
}

console.log(`Baseline (committed scenarios): ${baselinePassCount} PASS`);
console.log(`Current (enriched scenarios):   ${currentPassCount} PASS`);
console.log(`\nRegressions (was PASS, now not): ${regressions.length}`);
for (const r of regressions) console.log(`  ${r}`);
console.log(`\nImprovements (was not PASS, now PASS): ${improvements.length}`);
for (const imp of improvements.slice(0, 20)) console.log(`  ${imp}`);
if (improvements.length > 20) console.log(`  ... and ${improvements.length - 20} more`);

// Count baseline classifications
const baselineCounts: Record<string, number> = {};
for (const r of baselineResults) baselineCounts[r.cls] = (baselineCounts[r.cls] || 0) + 1;
console.log("\nBaseline classification counts:");
for (const [k, v] of Object.entries(baselineCounts).sort()) console.log(`  ${k}: ${v}`);

const currentCounts: Record<string, number> = {};
for (const r of currentResults) currentCounts[r.cls] = (currentCounts[r.cls] || 0) + 1;
console.log("\nCurrent classification counts:");
for (const [k, v] of Object.entries(currentCounts).sort()) console.log(`  ${k}: ${v}`);
