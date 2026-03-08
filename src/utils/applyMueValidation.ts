// ACC-05: MUE Validation Integration Helper
// Thin wrapper around validateMue() plus a test utility for building
// full DeterministicCodingOutput objects that pass ACC-03 validation.

import type {
  DeterministicCodingOutput,
  RuleEvaluation,
  RuleId,
} from "@/types/ruleEngine";
import { ALL_RULE_IDS } from "@/utils/validateRuleEvaluation";
import { buildVersionMetadata, buildDefaultEvaluation } from "@/utils/versionMetadata";
import {
  validateMue,
  type MueValidatorInput,
  type MueValidationResult,
} from "@/validators/mueValidator";

// ---------------------------------------------------------------------------
// Integration wrapper
// ---------------------------------------------------------------------------

export function applyMueValidation(input: MueValidatorInput): MueValidationResult {
  return validateMue(input);
}

// ---------------------------------------------------------------------------
// Test utility: build a full DeterministicCodingOutput from MUE results
// ---------------------------------------------------------------------------

export interface TestOutputOverrides {
  suggested_codes?: DeterministicCodingOutput["suggested_codes"];
  modifiers?: DeterministicCodingOutput["modifiers"];
  diagnoses?: DeterministicCodingOutput["diagnoses"];
  missing_information?: string[];
  payer_type?: "commercial" | "medicare" | "unknown";
}

export function buildTestCodingOutput(
  mueResult: MueValidationResult,
  overrides: TestOutputOverrides = {}
): DeterministicCodingOutput {
  const mueEvalMap = new Map<string, RuleEvaluation>();
  for (const re of mueResult.rule_evaluations) {
    mueEvalMap.set(re.rule_id, re);
  }

  const allEvaluations: RuleEvaluation[] = ALL_RULE_IDS.map((ruleId) => {
    if (mueEvalMap.has(ruleId)) return mueEvalMap.get(ruleId)!;
    return buildDefaultEvaluation(ruleId);
  });

  const hasBlock = allEvaluations.some(
    (re) => re.trigger_matched && re.action_type === "block"
  );
  const hasForceReview = allEvaluations.some(
    (re) => re.trigger_matched && re.action_type === "force-review"
  );

  let confidence: "high" | "medium" | "low" = "high";
  if (hasBlock) confidence = "low";
  else if (hasForceReview) confidence = "medium";

  // ACC-01 §3.0: clean_claim_ready is false only on block; force-review leaves it unchanged
  const cleanClaimReady = !hasBlock;

  return {
    suggested_codes: overrides.suggested_codes ?? [],
    suppressed_codes: mueResult.suppressed_codes,
    modifiers: overrides.modifiers ?? [],
    diagnoses: overrides.diagnoses ?? [],
    missing_information: overrides.missing_information ?? [],
    warnings: mueResult.warnings,
    force_review_items: [],
    force_review_pending: false,
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
