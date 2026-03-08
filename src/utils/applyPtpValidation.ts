// ACC-04: PTP Validation Integration Helper
// Thin wrapper around validatePtp() plus a test utility for building
// full DeterministicCodingOutput objects that pass ACC-03 validation.

import type {
  DeterministicCodingOutput,
  RuleEvaluation,
  RuleId,
} from "@/types/ruleEngine";
import { ALL_RULE_IDS } from "@/utils/validateRuleEvaluation";
import { buildVersionMetadata, buildDefaultEvaluation } from "@/utils/versionMetadata";
import {
  validatePtp,
  type PtpValidatorInput,
  type PtpValidationResult,
} from "@/validators/ptpValidator";

// ---------------------------------------------------------------------------
// Integration wrapper
// ---------------------------------------------------------------------------

export function applyPtpValidation(input: PtpValidatorInput): PtpValidationResult {
  return validatePtp(input);
}

// ---------------------------------------------------------------------------
// Test utility: build a full DeterministicCodingOutput from PTP results
// ---------------------------------------------------------------------------

const PTP_RULE_IDS = new Set<string>(["R-3.1.1", "R-3.1.2", "R-3.1.3", "R-3.1.4"]);

export interface TestOutputOverrides {
  suggested_codes?: DeterministicCodingOutput["suggested_codes"];
  modifiers?: DeterministicCodingOutput["modifiers"];
  diagnoses?: DeterministicCodingOutput["diagnoses"];
  missing_information?: string[];
  payer_type?: "commercial" | "medicare" | "unknown";
}

export function buildTestCodingOutput(
  ptpResult: PtpValidationResult,
  overrides: TestOutputOverrides = {}
): DeterministicCodingOutput {
  // Merge PTP rule evaluations with default non-PTP evaluations
  const ptpEvalMap = new Map<string, RuleEvaluation>();
  for (const re of ptpResult.rule_evaluations) {
    ptpEvalMap.set(re.rule_id, re);
  }

  const allEvaluations: RuleEvaluation[] = ALL_RULE_IDS.map((ruleId) => {
    if (ptpEvalMap.has(ruleId)) return ptpEvalMap.get(ruleId)!;
    return buildDefaultEvaluation(ruleId);
  });

  // Derive clean_claim_ready and confidence from triggered rules
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
    suppressed_codes: ptpResult.suppressed_codes,
    modifiers: overrides.modifiers ?? [],
    diagnoses: overrides.diagnoses ?? [],
    missing_information: overrides.missing_information ?? [],
    warnings: ptpResult.warnings,
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
