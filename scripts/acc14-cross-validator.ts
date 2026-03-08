// ACC-14 Phase 3: Cross-validator interaction testing
import * as fs from "fs";
import * as path from "path";
import { loadScenarios, runAllValidators } from "./lib/scenarioMapper";
import { aggregateResults } from "./lib/scorer";
import type { RuleEvaluation } from "@/types/ruleEngine";

const PROJECT_ROOT = path.resolve(import.meta.dir, "..");
const scenarios = loadScenarios(path.join(PROJECT_ROOT, "specs/ACC-02-scenarios.jsonl"));

interface InteractionResult {
  pattern: string;
  scenario_id: string;
  domains_firing: string[];
  rules_fired: string[];
  final_action: string;
  ccr: boolean;
  confidence: string;
  correct: boolean;
  note: string;
}

const results: InteractionResult[] = [];

for (const s of scenarios) {
  const run = runAllValidators(s.structured_fields);
  const agg = aggregateResults(s, run);
  const triggered = run.rule_evaluations.filter((re: RuleEvaluation) => re.trigger_matched);
  const domains = [...new Set(triggered.map((re: RuleEvaluation) => re.domain))];

  // Skip single-domain or no-trigger scenarios
  if (domains.length < 2) continue;

  // Pattern A: PTP + MODIFIER
  if (domains.includes("PTP") && domains.includes("MODIFIER")) {
    const ptpRules = triggered.filter((re: RuleEvaluation) => re.domain === "PTP");
    const modRules = triggered.filter((re: RuleEvaluation) => re.domain === "MODIFIER");
    const hasPtpBlock = ptpRules.some((re: RuleEvaluation) => re.action_type === "block");
    const hasModBlock = modRules.some((re: RuleEvaluation) => re.action_type === "block");

    // PTP block must dominate — modifier should NOT neutralize it
    const correct = hasPtpBlock ? agg.actual_action === "block" : true;
    results.push({
      pattern: "A: PTP+MODIFIER",
      scenario_id: s.id,
      domains_firing: domains,
      rules_fired: triggered.map((re: RuleEvaluation) => re.rule_id),
      final_action: agg.actual_action,
      ccr: agg.actual_clean_claim_ready,
      confidence: agg.actual_confidence,
      correct,
      note: hasPtpBlock
        ? (correct ? "PTP block dominates correctly" : "BUG: Modifier neutralized PTP block!")
        : "No PTP block to test dominance"
    });
  }

  // Pattern B: GLOBAL + DOC_SUFFICIENCY
  if (domains.includes("GLOBAL") && domains.includes("DOC_SUFFICIENCY")) {
    const globalRules = triggered.filter((re: RuleEvaluation) => re.domain === "GLOBAL");
    const docRules = triggered.filter((re: RuleEvaluation) => re.domain === "DOC_SUFFICIENCY");

    // Both should be surfaced (neither suppresses the other)
    const correct = globalRules.length > 0 && docRules.length > 0;
    results.push({
      pattern: "B: GLOBAL+DOC",
      scenario_id: s.id,
      domains_firing: domains,
      rules_fired: triggered.map((re: RuleEvaluation) => re.rule_id),
      final_action: agg.actual_action,
      ccr: agg.actual_clean_claim_ready,
      confidence: agg.actual_confidence,
      correct,
      note: correct ? "Both domains surfaced correctly" : "BUG: One domain suppressed the other!"
    });
  }

  // Pattern C: MUE + PTP
  if (domains.includes("MUE") && domains.includes("PTP")) {
    const mueRules = triggered.filter((re: RuleEvaluation) => re.domain === "MUE");
    const ptpRules = triggered.filter((re: RuleEvaluation) => re.domain === "PTP");

    // Both should be reflected
    const correct = mueRules.length > 0 && ptpRules.length > 0;
    results.push({
      pattern: "C: MUE+PTP",
      scenario_id: s.id,
      domains_firing: domains,
      rules_fired: triggered.map((re: RuleEvaluation) => re.rule_id),
      final_action: agg.actual_action,
      ccr: agg.actual_clean_claim_ready,
      confidence: agg.actual_confidence,
      correct,
      note: correct ? "Both domains reflected correctly" : "BUG: One domain shadows the other!"
    });
  }

  // Pattern D: Confidence/final state aggregation
  // If any block fires, confidence must be low and CCR must be false
  const hasBlock = triggered.some((re: RuleEvaluation) => re.action_type === "block");
  const hasFR = triggered.some((re: RuleEvaluation) => re.action_type === "force-review");

  if (domains.length >= 2) {
    let confCorrect = true;
    let note = "";

    if (hasBlock) {
      confCorrect = agg.actual_action === "block" && !agg.actual_clean_claim_ready && agg.actual_confidence === "low";
      note = confCorrect ? "Block dominates correctly (CCR=false, conf=low)" : "BUG: Block present but state incorrect!";
    } else if (hasFR) {
      confCorrect = agg.actual_action === "force-review" && agg.actual_clean_claim_ready && agg.actual_confidence === "medium";
      note = confCorrect ? "Force-review dominates correctly (CCR=true, conf=medium)" : "BUG: Force-review state incorrect!";
    }

    if (hasBlock || hasFR) {
      results.push({
        pattern: "D: AGGREGATION",
        scenario_id: s.id,
        domains_firing: domains,
        rules_fired: triggered.map((re: RuleEvaluation) => re.rule_id),
        final_action: agg.actual_action,
        ccr: agg.actual_clean_claim_ready,
        confidence: agg.actual_confidence,
        correct: confCorrect,
        note,
      });
    }
  }
}

// Print results grouped by pattern
const patterns = ["A: PTP+MODIFIER", "B: GLOBAL+DOC", "C: MUE+PTP", "D: AGGREGATION"];
for (const p of patterns) {
  const pResults = results.filter(r => r.pattern === p);
  console.log(`\n${"=".repeat(80)}`);
  console.log(`${p} — ${pResults.length} scenarios tested`);
  console.log("=".repeat(80));

  const correct = pResults.filter(r => r.correct).length;
  const bugs = pResults.filter(r => !r.correct);
  console.log(`  Correct: ${correct}/${pResults.length}`);

  if (bugs.length > 0) {
    console.log(`  BUGS FOUND:`);
    for (const b of bugs) {
      console.log(`    ${b.scenario_id}: ${b.note}`);
      console.log(`      rules: ${b.rules_fired.join(", ")}`);
      console.log(`      action=${b.final_action} ccr=${b.ccr} conf=${b.confidence}`);
    }
  }

  // Show first 5 examples
  for (const r of pResults.slice(0, 5)) {
    console.log(`  ${r.scenario_id}: rules=[${r.rules_fired.join(",")}] action=${r.final_action} ccr=${r.ccr} conf=${r.confidence} — ${r.note}`);
  }
  if (pResults.length > 5) console.log(`  ... and ${pResults.length - 5} more`);
}

// Summary
const totalBugs = results.filter(r => !r.correct).length;
console.log(`\n${"=".repeat(80)}`);
console.log(`CROSS-VALIDATOR SUMMARY: ${results.length} interaction tests, ${totalBugs} bugs found`);
console.log("=".repeat(80));
