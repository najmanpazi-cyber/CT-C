// ACC-06: Modifier Validation Integration Helper
// Thin wrapper around validateModifiers() plus a test utility for building
// full DeterministicCodingOutput objects that pass ACC-03 validation.
// CRITICAL: First integration helper to handle force_review_items.

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
  validateModifiers,
  type ModifierValidatorInput,
  type ModifierValidationResult,
} from "@/validators/modifierValidator";

// ---------------------------------------------------------------------------
// Integration wrapper
// ---------------------------------------------------------------------------

export function applyModifierValidation(input: ModifierValidatorInput): ModifierValidationResult {
  return validateModifiers(input);
}

// ---------------------------------------------------------------------------
// Test utility: build a full DeterministicCodingOutput from modifier results
// ---------------------------------------------------------------------------

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
  modifierResult: ModifierValidationResult,
  overrides: TestOutputOverrides = {}
): DeterministicCodingOutput {
  const evalMap = new Map<string, RuleEvaluation>();
  for (const re of modifierResult.rule_evaluations) {
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
  const forceReviewPending = modifierResult.force_review_items.some((item) => !item.resolved);

  let confidence: "high" | "medium" | "low" = "high";
  if (hasBlock) confidence = "low";
  else if (hasForceReview) confidence = "medium";

  // clean_claim_ready is false if any block OR pending force-review
  const cleanClaimReady = !hasBlock && !forceReviewPending;

  return {
    suggested_codes: overrides.suggested_codes ?? [],
    suppressed_codes: modifierResult.suppressed_codes,
    modifiers: overrides.modifiers ?? [],
    diagnoses: overrides.diagnoses ?? [],
    missing_information: overrides.missing_information ?? [],
    warnings: modifierResult.warnings,
    force_review_items: modifierResult.force_review_items,
    force_review_pending: forceReviewPending,
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
