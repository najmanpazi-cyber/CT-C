// ACC-04: PTP Validation Integration Helper
// Thin wrapper around validatePtp() plus a test utility for building
// full DeterministicCodingOutput objects that pass ACC-03 validation.

import type {
  DeterministicCodingOutput,
  RuleEvaluation,
  RuleId,
} from "@/types/ruleEngine";
import {
  ALL_RULE_IDS,
  RULE_DOMAIN_MAP,
  RULE_ACTION_MAP,
} from "@/utils/validateRuleEvaluation";
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

function buildDefaultEvaluation(ruleId: RuleId): RuleEvaluation {
  return {
    rule_id: ruleId,
    domain: RULE_DOMAIN_MAP[ruleId],
    action_type: RULE_ACTION_MAP[ruleId],
    severity: "Low",
    trigger_matched: false,
    message_user: "",
    message_internal: "",
    evidence_fields: [],
    missing_info_keys: [],
    payer_note: null,
    suppressed_code: null,
    payer_context: null,
    policy_anchor: null,
  };
}

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

  const cleanClaimReady = !hasBlock && !hasForceReview;

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
    version_metadata: {
      ncci_ptp_edition: "Q1 2026",
      mue_edition: "Q1 2026",
      cpt_edition: "2026",
      icd10_edition: "FY2026",
      ruleset_version: "orthopedics-v1-beta",
      schema_version: "1.0.0",
      generated_at: new Date().toISOString(),
    },
  };
}
