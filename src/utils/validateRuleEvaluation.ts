import { z } from "zod";
import type { ValidationResult, ValidationIssue, RuleId, RuleDomain, ActionType } from "@/types/ruleEngine";

// ---------------------------------------------------------------------------
// Canonical maps — source of truth for rule↔domain and rule↔action
// ---------------------------------------------------------------------------

export const RULE_DOMAIN_MAP: Record<RuleId, RuleDomain> = {
  "R-3.1.1": "PTP",
  "R-3.1.2": "PTP",
  "R-3.1.3": "PTP",
  "R-3.1.4": "PTP",
  "R-3.2.1": "MUE",
  "R-3.2.2": "MUE",
  "R-3.3.1": "MODIFIER",
  "R-3.3.2": "MODIFIER",
  "R-3.3.3": "MODIFIER",
  "R-3.4.1": "GLOBAL",
  "R-3.4.2": "GLOBAL",
  "R-3.4.3": "GLOBAL",
  "R-3.4.4": "GLOBAL",
  "R-3.5.1": "DOC_SUFFICIENCY",
  "R-3.5.2": "DOC_SUFFICIENCY",
  "R-3.5.3": "DOC_SUFFICIENCY",
  "R-3.5.4": "DOC_SUFFICIENCY",
  "R-3.5.5": "DOC_SUFFICIENCY",
};

export const RULE_ACTION_MAP: Record<RuleId, ActionType> = {
  "R-3.1.1": "block",
  "R-3.1.2": "block",
  "R-3.1.3": "warn",
  "R-3.1.4": "block",
  "R-3.2.1": "block",
  "R-3.2.2": "warn",
  "R-3.3.1": "force-review",
  "R-3.3.2": "block",
  "R-3.3.3": "warn",
  "R-3.4.1": "block",
  "R-3.4.2": "force-review",
  "R-3.4.3": "force-review",
  "R-3.4.4": "block",
  "R-3.5.1": "block",
  "R-3.5.2": "block",
  "R-3.5.3": "warn",
  "R-3.5.4": "block",
  "R-3.5.5": "warn",
};

export const ALL_RULE_IDS: RuleId[] = Object.keys(RULE_DOMAIN_MAP) as RuleId[];

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const RuleIdEnum = z.enum([
  "R-3.1.1", "R-3.1.2", "R-3.1.3", "R-3.1.4",
  "R-3.2.1", "R-3.2.2",
  "R-3.3.1", "R-3.3.2", "R-3.3.3",
  "R-3.4.1", "R-3.4.2", "R-3.4.3", "R-3.4.4",
  "R-3.5.1", "R-3.5.2", "R-3.5.3", "R-3.5.4", "R-3.5.5",
]);

const RuleDomainEnum = z.enum(["PTP", "MUE", "MODIFIER", "GLOBAL", "DOC_SUFFICIENCY"]);
const ActionTypeEnum = z.enum(["block", "force-review", "warn"]);
const SeverityTierEnum = z.enum(["Critical", "High", "Medium", "Low"]);

export const RuleEvaluationSchema = z.object({
  rule_id: RuleIdEnum,
  domain: RuleDomainEnum,
  action_type: ActionTypeEnum,
  severity: SeverityTierEnum,
  trigger_matched: z.boolean(),
  message_user: z.string(),
  message_internal: z.string(),
  evidence_fields: z.array(z.string()),
  missing_info_keys: z.array(z.string()),
  payer_note: z.string().nullable(),
  suppressed_code: z.string().nullable(),
  payer_context: z.string().nullable(),
  policy_anchor: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Semantic checks
// ---------------------------------------------------------------------------

function semanticChecks(data: z.infer<typeof RuleEvaluationSchema>): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const ruleId = data.rule_id as RuleId;

  // 1. Rule-domain consistency
  const expectedDomain = RULE_DOMAIN_MAP[ruleId];
  if (expectedDomain && data.domain !== expectedDomain) {
    errors.push({
      path: "domain",
      code: "SEMANTIC_RULE_DOMAIN_MISMATCH",
      message: `Rule ${ruleId} belongs to domain "${expectedDomain}" but got "${data.domain}".`,
    });
  }

  // 2. Rule-action consistency
  const expectedAction = RULE_ACTION_MAP[ruleId];
  if (expectedAction && data.action_type !== expectedAction) {
    errors.push({
      path: "action_type",
      code: "SEMANTIC_RULE_ACTION_MISMATCH",
      message: `Rule ${ruleId} should have action "${expectedAction}" but got "${data.action_type}".`,
    });
  }

  // 3. suppressed_code set → trigger_matched must be true
  if (data.suppressed_code !== null && !data.trigger_matched) {
    errors.push({
      path: "suppressed_code",
      code: "SEMANTIC_SUPPRESSED_WITHOUT_TRIGGER",
      message: `Rule ${ruleId} has suppressed_code "${data.suppressed_code}" but trigger_matched is false.`,
    });
  }

  // 4. missing_info_keys non-empty → trigger_matched must be true
  if (data.missing_info_keys.length > 0 && !data.trigger_matched) {
    errors.push({
      path: "missing_info_keys",
      code: "SEMANTIC_MISSING_INFO_WITHOUT_TRIGGER",
      message: `Rule ${ruleId} has missing_info_keys but trigger_matched is false.`,
    });
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateRuleEvaluation(data: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const parsed = RuleEvaluationSchema.safeParse(data);
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

export function validateRuleEvaluations(data: unknown[]): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (let i = 0; i < data.length; i++) {
    const result = validateRuleEvaluation(data[i]);
    for (const e of result.errors) {
      errors.push({ ...e, path: `[${i}].${e.path}` });
    }
    for (const w of result.warnings) {
      warnings.push({ ...w, path: `[${i}].${w.path}` });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
