// ACC-07: Global Period Validation Integration Helper
// Thin wrapper around validateGlobal() plus a test utility for building
// full DeterministicCodingOutput objects that pass ACC-03 validation.
// Force-review aware (R-3.4.2, R-3.4.3 produce force_review_items).

import type {
  DeterministicCodingOutput,
  RuleEvaluation,
  RuleId,
} from "@/types/ruleEngine";
import { ALL_RULE_IDS } from "@/utils/validateRuleEvaluation";
import { buildVersionMetadata, buildDefaultEvaluation } from "@/utils/versionMetadata";
import {
  validateGlobal,
  type GlobalValidatorInput,
  type GlobalValidationResult,
} from "@/validators/globalValidator";

// ---------------------------------------------------------------------------
// Integration wrapper
// ---------------------------------------------------------------------------

export function applyGlobalValidation(input: GlobalValidatorInput): GlobalValidationResult {
  return validateGlobal(input);
}

// ---------------------------------------------------------------------------
// Test utility: build a full DeterministicCodingOutput from global results
// ---------------------------------------------------------------------------

export interface TestOutputOverrides {
  suggested_codes?: DeterministicCodingOutput["suggested_codes"];
  modifiers?: DeterministicCodingOutput["modifiers"];
  diagnoses?: DeterministicCodingOutput["diagnoses"];
  missing_information?: string[];
  payer_type?: "commercial" | "medicare" | "unknown";
}

export function buildTestCodingOutput(
  globalResult: GlobalValidationResult,
  overrides: TestOutputOverrides = {}
): DeterministicCodingOutput {
  const evalMap = new Map<string, RuleEvaluation>();
  for (const re of globalResult.rule_evaluations) {
    evalMap.set(re.rule_id, re);
  }

  const allEvaluations: RuleEvaluation[] = ALL_RULE_IDS.map((ruleId) => {
    if (evalMap.has(ruleId)) return evalMap.get(ruleId)!;
    return buildDefaultEvaluation(ruleId);
  });

  const hasBlock = allEvaluations.some(
    (re) => re.trigger_matched && re.action_type === "block"
  );
  const hasForceReview = allEvaluations.some(
    (re) => re.trigger_matched && re.action_type === "force-review"
  );

  // force_review_pending = any unresolved force_review_items
  const forceReviewPending = globalResult.force_review_items.some((item) => !item.resolved);

  let confidence: "high" | "medium" | "low" = "high";
  if (hasBlock) confidence = "low";
  else if (hasForceReview) confidence = "medium";

  // ACC-01 §3.0: clean_claim_ready is false only on block; force-review leaves it unchanged
  const cleanClaimReady = !hasBlock;

  return {
    suggested_codes: overrides.suggested_codes ?? [],
    suppressed_codes: globalResult.suppressed_codes,
    modifiers: overrides.modifiers ?? [],
    diagnoses: overrides.diagnoses ?? [],
    missing_information: overrides.missing_information ?? [],
    warnings: globalResult.warnings,
    force_review_items: globalResult.force_review_items,
    force_review_pending: forceReviewPending,
    clean_claim_ready: cleanClaimReady,
    confidence,
    rule_evaluations: allEvaluations,
    payer_context_applied: {
      payer_type: overrides.payer_type ?? "commercial",
      safe_defaults_used: false,
    },
    version_metadata: buildVersionMetadata(),
  };
}
