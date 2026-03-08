#!/usr/bin/env bun
// ACC-13: Evaluation Harness + Scoreboard
// One-command release benchmark: processes full ACC-02 scenario pack,
// evaluates 6 beta go/no-go gates, produces scoreboard markdown + JSON artifact.

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";

import { loadScenarios, runAllValidators } from "./lib/scenarioMapper";
import type { Scenario, ValidatorRunResult } from "./lib/scenarioMapper";
import {
  aggregateResults,
  classifyScenario,
  actionSeverity,
} from "./lib/scorer";
import type { Classification, AggregatedResult } from "./lib/scorer";
import {
  countClassifications,
  countDomainClassifications,
  classificationTable,
  buildRunMetadata,
} from "./lib/reportWriter";
import type { ClassificationCounts, RunMetadata } from "./lib/reportWriter";

import { validateCodingOutput } from "@/utils/validateCodingOutput";
import { EDITIONS, buildVersionMetadata } from "@/utils/versionMetadata";
import { RULE_ACTION_MAP } from "@/utils/validateRuleEvaluation";
import type { RuleDomain, RuleId, DeterministicCodingOutput } from "@/types/ruleEngine";

// ============================================================================
// Types
// ============================================================================

interface ScenarioResult {
  scenario_id: string;
  domain: string;
  classification: Classification;
  expected_action: string;
  actual_action: string;
  expected_clean_claim_ready: boolean;
  actual_clean_claim_ready: boolean;
  expected_confidence: string;
  actual_confidence: string;
  expected_rule_hits: string[];
  actual_rule_hits: string[];
  schema_valid: boolean;
  schema_errors: string[];
}

interface GateResult {
  gate_id: string;
  name: string;
  threshold: string;
  actual: string;
  passed: boolean;
}

// ============================================================================
// Schema validation — build synthetic DeterministicCodingOutput from run results
// ============================================================================

function buildSyntheticOutput(
  scenario: Scenario,
  run: ValidatorRunResult,
  agg: AggregatedResult,
): DeterministicCodingOutput {
  const sf = scenario.structured_fields;

  // Build suggested_codes from submitted CPTs minus suppressed
  const suppressedSet = new Set(run.suppressed_codes.map((sc) => sc.cpt_code));
  const suggestedCodes = sf.cpt_codes_submitted
    .filter((c) => !suppressedSet.has(c))
    .map((c) => ({ cpt_code: c, description: `Scenario ${scenario.id}` }));

  // Build modifiers from applied modifiers
  const modifiers: DeterministicCodingOutput["modifiers"] = [];
  for (const [cpt, mods] of Object.entries(sf.modifiers_present)) {
    for (const mod of mods) {
      modifiers.push({ code: mod, description: `Applied to ${cpt}`, applied_by_rule: null });
    }
  }

  // Build diagnoses from ICD-10 codes
  const diagnoses = sf.icd10_codes.map((c) => ({
    icd10_code: c,
    description: `Scenario ${scenario.id}`,
  }));

  // force_review_pending
  const forceReviewPending = run.force_review_items.some((i) => !i.resolved);

  return {
    suggested_codes: suggestedCodes,
    suppressed_codes: run.suppressed_codes,
    modifiers,
    diagnoses,
    missing_information: run.missing_information,
    warnings: run.warnings,
    force_review_items: run.force_review_items,
    force_review_pending: forceReviewPending,
    clean_claim_ready: agg.actual_clean_claim_ready,
    confidence: agg.actual_confidence as "high" | "medium" | "low",
    rule_evaluations: run.rule_evaluations,
    payer_context_applied: {
      payer_type: (["commercial", "medicare", "unknown"].includes(sf.payer_type)
        ? sf.payer_type
        : "unknown") as "commercial" | "medicare" | "unknown",
      safe_defaults_used: sf.payer_type === "unknown",
    },
    version_metadata: buildVersionMetadata(),
  };
}

// ============================================================================
// Gate evaluation
// ============================================================================

function evaluateGates(
  scenarios: Scenario[],
  results: ScenarioResult[],
  counts: ClassificationCounts,
): GateResult[] {
  const gates: GateResult[] = [];

  // Gate 1: Critical conflict visibility — all PTP block scenarios detected
  const ptpBlockScenarios = scenarios.filter((s) => {
    const ptpBlockRules = s.expected_rule_hits.filter((r) => {
      const rid = r as RuleId;
      return RULE_ACTION_MAP[rid] === "block" && rid.startsWith("R-3.1.");
    });
    return ptpBlockRules.length > 0;
  });
  const ptpBlockDetected = ptpBlockScenarios.filter((s) => {
    const result = results.find((r) => r.scenario_id === s.id)!;
    // Check that actual action is at least block level
    return actionSeverity(result.actual_action) >= actionSeverity("block");
  });
  const ptpVisibility = ptpBlockScenarios.length > 0
    ? (ptpBlockDetected.length / ptpBlockScenarios.length) * 100
    : 100;
  gates.push({
    gate_id: "G1",
    name: "Critical conflict visibility",
    threshold: "100%",
    actual: `${ptpVisibility.toFixed(1)}% (${ptpBlockDetected.length}/${ptpBlockScenarios.length})`,
    passed: ptpVisibility === 100,
  });

  // Gate 2: Silent false-pass rate — zero FALSE_PASS
  gates.push({
    gate_id: "G2",
    name: "Silent false-pass rate",
    threshold: "0",
    actual: String(counts.false_pass),
    passed: counts.false_pass === 0,
  });

  // Gate 3: Schema compliance — all outputs validate
  const schemaValid = results.filter((r) => r.schema_valid).length;
  const schemaRate = results.length > 0 ? (schemaValid / results.length) * 100 : 100;
  gates.push({
    gate_id: "G3",
    name: "Schema compliance",
    threshold: "100%",
    actual: `${schemaRate.toFixed(1)}% (${schemaValid}/${results.length})`,
    passed: schemaRate === 100,
  });

  // Gate 4: Doc-gap detection — DOC_SUFFICIENCY domain pass rate
  const docDomainResults = results.filter((r) => {
    const sc = scenarios.find((s) => s.id === r.scenario_id)!;
    return sc.domains_tested.includes("DOC_SUFFICIENCY");
  });
  const docPass = docDomainResults.filter((r) => r.classification === "PASS").length;
  const docRate = docDomainResults.length > 0 ? (docPass / docDomainResults.length) * 100 : 100;
  gates.push({
    gate_id: "G4",
    name: "Doc-gap detection",
    threshold: ">=80%",
    actual: `${docRate.toFixed(1)}% (${docPass}/${docDomainResults.length})`,
    passed: docRate >= 80,
  });

  // Gate 5: Overall pass rate
  const total = results.length;
  const passRate = total > 0 ? (counts.pass / total) * 100 : 0;
  gates.push({
    gate_id: "G5",
    name: "Overall pass rate",
    threshold: ">=85%",
    actual: `${passRate.toFixed(1)}% (${counts.pass}/${total})`,
    passed: passRate >= 85,
  });

  // Gate 6: Rule-data version pinned
  const vm = buildVersionMetadata();
  const pinned =
    vm.ncci_ptp_edition === EDITIONS.ncci_ptp &&
    vm.mue_edition === EDITIONS.mue &&
    vm.cpt_edition === EDITIONS.cpt &&
    vm.icd10_edition === EDITIONS.icd10 &&
    vm.ruleset_version === EDITIONS.ruleset &&
    vm.schema_version === EDITIONS.schema;
  gates.push({
    gate_id: "G6",
    name: "Rule-data version pinned",
    threshold: "yes",
    actual: pinned ? "yes" : "no",
    passed: pinned,
  });

  return gates;
}

// ============================================================================
// Markdown report generation
// ============================================================================

function generateScoreboard(
  metadata: RunMetadata,
  scenarios: Scenario[],
  results: ScenarioResult[],
  counts: ClassificationCounts,
  gates: GateResult[],
): string {
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  // Title
  w("# ACC-13 — Evaluation Scoreboard");
  w("");
  w(`> Generated: ${metadata.run_timestamp}`);
  w(`> Commit: ${metadata.git_commit_sha}`);
  w(`> Ruleset: ${metadata.rule_engine_version}`);
  w("");

  // Beta Go/No-Go Gates
  w("## Beta Go/No-Go Gates");
  w("");
  w("| Gate | Name | Threshold | Actual | Status |");
  w("|------|------|-----------|--------|--------|");
  for (const g of gates) {
    const status = g.passed ? "PASS" : "FAIL";
    w(`| ${g.gate_id} | ${g.name} | ${g.threshold} | ${g.actual} | **${status}** |`);
  }
  w("");
  const allGatesPass = gates.every((g) => g.passed);
  w(`**Overall: ${allGatesPass ? "GO" : "NO-GO"}**`);
  w("");

  // Run Metadata
  w("## Run Metadata");
  w("");
  w("| Field | Value |");
  w("|-------|-------|");
  for (const [k, v] of Object.entries(metadata)) {
    w(`| ${k} | ${v} |`);
  }
  w("");

  // Classification Summary
  w("## Classification Summary");
  w("");
  w(classificationTable(counts, scenarios.length));
  w("");

  // Domain Scoreboard
  w("## Domain Scoreboard");
  w("");
  const domainNames: RuleDomain[] = ["PTP", "MUE", "MODIFIER", "GLOBAL", "DOC_SUFFICIENCY"];
  w("| Domain | Total | PASS | FALSE_PASS | FALSE_FAIL | WRONG_ACTION | PARTIAL | UNEVALUABLE | Pass% |");
  w("|--------|-------|------|------------|------------|--------------|---------|-------------|-------|");
  for (const domain of domainNames) {
    const dc = countDomainClassifications(domain, results, scenarios);
    const domTotal = dc.pass + dc.false_pass + dc.false_fail + dc.wrong_action + dc.partial + dc.unevaluable;
    const domPct = domTotal > 0 ? ((dc.pass / domTotal) * 100).toFixed(1) : "N/A";
    w(`| ${domain} | ${domTotal} | ${dc.pass} | ${dc.false_pass} | ${dc.false_fail} | ${dc.wrong_action} | ${dc.partial} | ${dc.unevaluable} | ${domPct}% |`);
  }
  w("");

  // Schema Compliance Detail
  const schemaFailures = results.filter((r) => !r.schema_valid);
  w("## Schema Compliance");
  w("");
  if (schemaFailures.length === 0) {
    w("All outputs pass schema validation.");
  } else {
    w(`${schemaFailures.length} scenario(s) failed schema validation:`);
    w("");
    w("| Scenario | Errors |");
    w("|----------|--------|");
    for (const f of schemaFailures.slice(0, 20)) {
      w(`| ${f.scenario_id} | ${f.schema_errors.join("; ")} |`);
    }
    if (schemaFailures.length > 20) {
      w(`| ... | (${schemaFailures.length - 20} more) |`);
    }
  }
  w("");

  // Non-PASS Scenario Details
  const nonPass = results.filter((r) => r.classification !== "PASS");
  w("## Non-PASS Scenarios");
  w("");
  if (nonPass.length === 0) {
    w("All scenarios passed.");
  } else {
    w("| Scenario | Classification | Expected | Actual | Expected Rules | Actual Rules |");
    w("|----------|---------------|----------|--------|----------------|--------------|");
    for (const r of nonPass) {
      w(`| ${r.scenario_id} | ${r.classification} | ${r.expected_action} | ${r.actual_action} | ${r.expected_rule_hits.join(",")} | ${r.actual_rule_hits.join(",")} |`);
    }
  }
  w("");

  // Version Metadata
  w("## Version Metadata");
  w("");
  w("| Edition | Value |");
  w("|---------|-------|");
  w(`| NCCI PTP | ${EDITIONS.ncci_ptp} |`);
  w(`| MUE | ${EDITIONS.mue} |`);
  w(`| CPT | ${EDITIONS.cpt} |`);
  w(`| ICD-10 | ${EDITIONS.icd10} |`);
  w(`| Ruleset | ${EDITIONS.ruleset} |`);
  w(`| Schema | ${EDITIONS.schema} |`);
  w("");

  return lines.join("\n");
}

// ============================================================================
// JSON artifact generation
// ============================================================================

function generateJsonArtifact(
  metadata: RunMetadata,
  scenarios: Scenario[],
  results: ScenarioResult[],
  counts: ClassificationCounts,
  gates: GateResult[],
): object {
  const domainNames: RuleDomain[] = ["PTP", "MUE", "MODIFIER", "GLOBAL", "DOC_SUFFICIENCY"];
  const domainSummary: Record<string, ClassificationCounts & { total: number }> = {};
  for (const domain of domainNames) {
    const dc = countDomainClassifications(domain, results, scenarios);
    domainSummary[domain] = {
      total: dc.pass + dc.false_pass + dc.false_fail + dc.wrong_action + dc.partial + dc.unevaluable,
      ...dc,
    };
  }

  return {
    run_metadata: metadata,
    gates,
    gates_all_pass: gates.every((g) => g.passed),
    overall_summary: {
      total: scenarios.length,
      ...counts,
    },
    domain_summary: domainSummary,
    schema_compliance: {
      total: results.length,
      valid: results.filter((r) => r.schema_valid).length,
      invalid: results.filter((r) => !r.schema_valid).length,
      failures: results
        .filter((r) => !r.schema_valid)
        .map((r) => ({ scenario_id: r.scenario_id, errors: r.schema_errors })),
    },
    version_metadata: {
      editions: EDITIONS,
      generated_at: metadata.run_timestamp,
    },
    scenario_results: results,
  };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const t0 = performance.now();
  const projectRoot = resolve(import.meta.dir, "..");
  const scenarioPath = join(projectRoot, "specs", "ACC-02-scenarios.jsonl");
  const scoreboardPath = join(projectRoot, "docs", "ACC-13-scoreboard.md");
  const artifactPath = join(projectRoot, "artifacts", "acc13-results.json");

  // Ensure output dirs exist
  for (const dir of [join(projectRoot, "docs"), join(projectRoot, "artifacts")]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // Build run metadata
  const metadata = buildRunMetadata(projectRoot, {
    harness_file_path: "scripts/evaluate-acc13.ts",
  });

  // Load scenarios
  console.log("Loading scenarios...");
  const scenarios = loadScenarios(scenarioPath);
  metadata.scenario_count_loaded = String(scenarios.length);
  console.log(`Loaded ${scenarios.length} scenarios.`);

  // Process each scenario
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    // Run all validators
    const runResult = runAllValidators(scenario.structured_fields);

    // Aggregate
    const agg = aggregateResults(scenario, runResult);

    // Classify
    const classification = classifyScenario(scenario, agg);

    // Schema validation — build synthetic output and validate
    const syntheticOutput = buildSyntheticOutput(scenario, runResult, agg);
    const schemaResult = validateCodingOutput(syntheticOutput);

    results.push({
      scenario_id: scenario.id,
      domain: scenario.domain,
      classification,
      expected_action: scenario.expected_action,
      actual_action: agg.actual_action,
      expected_clean_claim_ready: scenario.expected_clean_claim_ready,
      actual_clean_claim_ready: agg.actual_clean_claim_ready,
      expected_confidence: scenario.expected_confidence,
      actual_confidence: agg.actual_confidence,
      expected_rule_hits: scenario.expected_rule_hits,
      actual_rule_hits: agg.actual_rule_hits,
      schema_valid: schemaResult.valid,
      schema_errors: schemaResult.errors.map((e) => `${e.path}: ${e.message}`),
    });
  }

  // Count classifications
  const counts = countClassifications(results);

  // Evaluate gates
  const gates = evaluateGates(scenarios, results, counts);

  // Generate scoreboard markdown
  console.log("Generating scoreboard...");
  const mdReport = generateScoreboard(metadata, scenarios, results, counts, gates);
  writeFileSync(scoreboardPath, mdReport, "utf-8");
  console.log(`  → ${scoreboardPath}`);

  // Generate JSON artifact
  console.log("Generating JSON artifact...");
  const jsonArtifact = generateJsonArtifact(metadata, scenarios, results, counts, gates);
  writeFileSync(artifactPath, JSON.stringify(jsonArtifact, null, 2), "utf-8");
  console.log(`  → ${artifactPath}`);

  // Elapsed time
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

  // Stdout summary
  const allGatesPass = gates.every((g) => g.passed);
  console.log("");
  console.log("=".repeat(60));
  console.log("ACC-13 EVALUATION SCOREBOARD");
  console.log("=".repeat(60));
  console.log(`Total scenarios:     ${scenarios.length}`);
  console.log(`PASS:                ${counts.pass}`);
  console.log(`FALSE_PASS:          ${counts.false_pass}`);
  console.log(`FALSE_FAIL:          ${counts.false_fail}`);
  console.log(`WRONG_ACTION:        ${counts.wrong_action}`);
  console.log(`PARTIAL:             ${counts.partial}`);
  console.log(`UNEVALUABLE:         ${counts.unevaluable}`);
  console.log("---");
  console.log("Gates:");
  for (const g of gates) {
    const icon = g.passed ? "PASS" : "FAIL";
    console.log(`  ${g.gate_id} ${g.name}: ${g.actual} [${icon}]`);
  }
  console.log("---");
  console.log(`Verdict:             ${allGatesPass ? "GO" : "NO-GO"}`);
  console.log(`Elapsed:             ${elapsed}s`);
  console.log(`Scoreboard:          docs/ACC-13-scoreboard.md`);
  console.log(`Artifact:            artifacts/acc13-results.json`);
  console.log("=".repeat(60));
}

main();
