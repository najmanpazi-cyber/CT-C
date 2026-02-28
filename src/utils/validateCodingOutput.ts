import { z } from "zod";
import type { ValidationResult, ValidationIssue, RuleId } from "@/types/ruleEngine";
import {
  RuleEvaluationSchema,
  RULE_DOMAIN_MAP,
  RULE_ACTION_MAP,
} from "./validateRuleEvaluation";

// ---------------------------------------------------------------------------
// Zod sub-schemas
// ---------------------------------------------------------------------------

const RuleIdEnum = z.enum([
  "R-3.1.1", "R-3.1.2", "R-3.1.3", "R-3.1.4",
  "R-3.2.1", "R-3.2.2",
  "R-3.3.1", "R-3.3.2", "R-3.3.3",
  "R-3.4.1", "R-3.4.2", "R-3.4.3", "R-3.4.4",
  "R-3.5.1", "R-3.5.2", "R-3.5.3", "R-3.5.4", "R-3.5.5",
]);

const SuggestedCodeSchema = z.object({
  cpt_code: z.string(),
  description: z.string(),
});

const SuppressedCodeSchema = z.object({
  cpt_code: z.string(),
  description: z.string(),
  suppressed_by_rule: RuleIdEnum,
  reason: z.string(),
});

const ModifierEntrySchema = z.object({
  code: z.string(),
  description: z.string(),
  applied_by_rule: RuleIdEnum.nullable(),
});

const DiagnosisEntrySchema = z.object({
  icd10_code: z.string(),
  description: z.string(),
});

const DeterministicWarningSchema = z.object({
  type: z.enum(["warning", "info"]),
  rule_id: z.string(),
  message: z.string(),
  code_context: z.string().nullable(),
});

const ForceReviewItemSchema = z.object({
  rule_id: RuleIdEnum,
  message: z.string(),
  code_context: z.array(z.string()),
  resolved: z.boolean(),
});

const PayerContextAppliedSchema = z.object({
  payer_type: z.enum(["commercial", "medicare", "unknown"]),
  safe_defaults_used: z.boolean(),
});

const VersionMetadataSchema = z.object({
  ncci_ptp_edition: z.string(),
  mue_edition: z.string(),
  cpt_edition: z.string(),
  icd10_edition: z.string(),
  ruleset_version: z.string(),
  schema_version: z.string(),
  generated_at: z.string(),
});

const ConfidenceLevelEnum = z.enum(["high", "medium", "low"]);

// ---------------------------------------------------------------------------
// Top-level Zod schema
// ---------------------------------------------------------------------------

export const DeterministicCodingOutputSchema = z.object({
  suggested_codes: z.array(SuggestedCodeSchema),
  suppressed_codes: z.array(SuppressedCodeSchema),
  modifiers: z.array(ModifierEntrySchema),
  diagnoses: z.array(DiagnosisEntrySchema),
  missing_information: z.array(z.string()),
  warnings: z.array(DeterministicWarningSchema),
  force_review_items: z.array(ForceReviewItemSchema),
  force_review_pending: z.boolean(),
  clean_claim_ready: z.boolean(),
  confidence: ConfidenceLevelEnum,
  rule_evaluations: z.array(RuleEvaluationSchema),
  payer_context_applied: PayerContextAppliedSchema,
  version_metadata: VersionMetadataSchema,
});

// ---------------------------------------------------------------------------
// Semantic checks
// ---------------------------------------------------------------------------

type ParsedOutput = z.infer<typeof DeterministicCodingOutputSchema>;

function semanticChecks(data: ParsedOutput): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const triggeredRules = new Set<string>();
  const triggeredBlockRules = new Set<string>();
  const triggeredForceReviewRules = new Set<string>();

  for (const re of data.rule_evaluations) {
    if (re.trigger_matched) {
      triggeredRules.add(re.rule_id);
      if (re.action_type === "block") triggeredBlockRules.add(re.rule_id);
      if (re.action_type === "force-review") triggeredForceReviewRules.add(re.rule_id);
    }
  }

  const hasBlock = triggeredBlockRules.size > 0;
  const hasForceReview = triggeredForceReviewRules.size > 0;

  // 1. block → clean_claim_ready must be false
  if (hasBlock && data.clean_claim_ready) {
    errors.push({
      path: "clean_claim_ready",
      code: "SEMANTIC_BLOCK_CLEAN_CONTRADICTION",
      message: "A block rule fired but clean_claim_ready is true. Block rules must set clean_claim_ready to false.",
    });
  }

  // 2. block → confidence must be "low"
  if (hasBlock && data.confidence !== "low") {
    errors.push({
      path: "confidence",
      code: "SEMANTIC_BLOCK_CONFIDENCE_CONTRADICTION",
      message: `A block rule fired but confidence is "${data.confidence}". Block rules must set confidence to "low".`,
    });
  }

  // 3. force-review triggered → confidence cannot be "high"
  if (hasForceReview && data.confidence === "high") {
    errors.push({
      path: "confidence",
      code: "SEMANTIC_FORCE_REVIEW_CONFIDENCE_CONTRADICTION",
      message: 'A force-review rule fired but confidence is "high". Force-review must lower confidence to "medium" or "low".',
    });
  }

  // 4. force_review_pending must equal force_review_items.some(i => !i.resolved)
  const expectedPending = data.force_review_items.some((i) => !i.resolved);
  if (data.force_review_pending !== expectedPending) {
    errors.push({
      path: "force_review_pending",
      code: "SEMANTIC_FORCE_REVIEW_PENDING_MISMATCH",
      message: `force_review_pending is ${data.force_review_pending} but should be ${expectedPending} based on force_review_items.`,
    });
  }

  // 5. force_review_pending: true → clean_claim_ready must be false
  if (data.force_review_pending && data.clean_claim_ready) {
    errors.push({
      path: "clean_claim_ready",
      code: "SEMANTIC_PENDING_REVIEW_CLEAN_CONTRADICTION",
      message: "force_review_pending is true but clean_claim_ready is true. Pending reviews must block clean claim.",
    });
  }

  // 6. suppressed_codes[].suppressed_by_rule must reference a triggered rule
  for (let i = 0; i < data.suppressed_codes.length; i++) {
    const sc = data.suppressed_codes[i];
    if (!triggeredRules.has(sc.suppressed_by_rule)) {
      errors.push({
        path: `suppressed_codes[${i}].suppressed_by_rule`,
        code: "SEMANTIC_SUPPRESSED_REF_UNTRIGGERED",
        message: `Suppressed code "${sc.cpt_code}" references rule "${sc.suppressed_by_rule}" which is not triggered.`,
      });
    }
  }

  // 7. warnings[].rule_id must reference a triggered rule
  for (let i = 0; i < data.warnings.length; i++) {
    const w = data.warnings[i];
    if (!triggeredRules.has(w.rule_id)) {
      warnings.push({
        path: `warnings[${i}].rule_id`,
        code: "SEMANTIC_WARNING_REF_UNTRIGGERED",
        message: `Warning references rule "${w.rule_id}" which is not triggered in rule_evaluations.`,
      });
    }
  }

  // 8. rule_evaluations[].domain must match the known domain for that rule_id
  for (let i = 0; i < data.rule_evaluations.length; i++) {
    const re = data.rule_evaluations[i];
    const ruleId = re.rule_id as RuleId;
    const expectedDomain = RULE_DOMAIN_MAP[ruleId];
    if (expectedDomain && re.domain !== expectedDomain) {
      errors.push({
        path: `rule_evaluations[${i}].domain`,
        code: "SEMANTIC_RULE_DOMAIN_MISMATCH",
        message: `Rule ${ruleId} belongs to domain "${expectedDomain}" but got "${re.domain}".`,
      });
    }
    const expectedAction = RULE_ACTION_MAP[ruleId];
    if (expectedAction && re.action_type !== expectedAction) {
      errors.push({
        path: `rule_evaluations[${i}].action_type`,
        code: "SEMANTIC_RULE_ACTION_MISMATCH",
        message: `Rule ${ruleId} should have action "${expectedAction}" but got "${re.action_type}".`,
      });
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateCodingOutput(data: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const parsed = DeterministicCodingOutputSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        path: issue.path.join("."),
        code: "STRUCTURAL_" + issue.code.toUpperCase(),
        message: issue.message,
      });
    }
    return { valid: false, errors, warnings };
  }

  const semantic = semanticChecks(parsed.data);
  errors.push(...semantic.errors);
  warnings.push(...semantic.warnings);

  return { valid: errors.length === 0, errors, warnings };
}
