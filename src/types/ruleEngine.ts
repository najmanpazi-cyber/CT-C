// ACC-03: Schema & Error Contract — Type Definitions
// All types for the deterministic rule engine output contract.
// These are additive — existing CodingResult in coding.ts is NOT modified.

// ---------------------------------------------------------------------------
// Literal unions
// ---------------------------------------------------------------------------

export type RuleDomain =
  | "PTP"
  | "MUE"
  | "MODIFIER"
  | "GLOBAL"
  | "DOC_SUFFICIENCY";

export type ActionType = "block" | "force-review" | "warn";

export type SeverityTier = "Critical" | "High" | "Medium" | "Low";

export type ConfidenceLevel = "high" | "medium" | "low";

export type RuleId =
  | "R-3.1.1"
  | "R-3.1.2"
  | "R-3.1.3"
  | "R-3.1.4"
  | "R-3.2.1"
  | "R-3.2.2"
  | "R-3.3.1"
  | "R-3.3.2"
  | "R-3.3.3"
  | "R-3.4.1"
  | "R-3.4.2"
  | "R-3.4.3"
  | "R-3.4.4"
  | "R-3.5.1"
  | "R-3.5.2"
  | "R-3.5.3"
  | "R-3.5.4"
  | "R-3.5.5";

// ---------------------------------------------------------------------------
// Sub-objects
// ---------------------------------------------------------------------------

export interface VersionMetadata {
  ncci_ptp_edition: string;
  mue_edition: string;
  cpt_edition: string;
  icd10_edition: string;
  ruleset_version: string;
  schema_version: string;
  generated_at: string;
}

export interface PayerContextApplied {
  payer_type: "commercial" | "medicare" | "unknown";
  safe_defaults_used: boolean;
}

export interface DeterministicWarning {
  type: "warning" | "info";
  rule_id: string;
  message: string;
  code_context: string | null;
}

export interface ForceReviewItem {
  rule_id: RuleId;
  message: string;
  code_context: string[];
  resolved: boolean;
}

export interface SuggestedCode {
  cpt_code: string;
  description: string;
}

export interface SuppressedCode {
  cpt_code: string;
  description: string;
  suppressed_by_rule: RuleId;
  reason: string;
}

export interface ModifierEntry {
  code: string;
  description: string;
  applied_by_rule: RuleId | null;
}

export interface DiagnosisEntry {
  icd10_code: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------

export interface RuleEvaluation {
  rule_id: RuleId;
  domain: RuleDomain;
  action_type: ActionType;
  severity: SeverityTier;
  trigger_matched: boolean;
  message_user: string;
  message_internal: string;
  evidence_fields: string[];
  missing_info_keys: string[];
  payer_note: string | null;
  suppressed_code: string | null;
  payer_context: string | null;
  policy_anchor: string | null;
}

// ---------------------------------------------------------------------------
// Top-level output
// ---------------------------------------------------------------------------

export interface DeterministicCodingOutput {
  suggested_codes: SuggestedCode[];
  suppressed_codes: SuppressedCode[];
  modifiers: ModifierEntry[];
  diagnoses: DiagnosisEntry[];
  missing_information: string[];
  warnings: DeterministicWarning[];
  force_review_items: ForceReviewItem[];
  force_review_pending: boolean;
  clean_claim_ready: boolean;
  confidence: ConfidenceLevel;
  rule_evaluations: RuleEvaluation[];
  payer_context_applied: PayerContextApplied;
  version_metadata: VersionMetadata;
}

// ---------------------------------------------------------------------------
// Validation contract
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
