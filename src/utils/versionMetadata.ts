// ACC-12: Centralized version_metadata assembly
// Single source of truth for edition strings and version metadata construction.
// All apply*.ts helpers and mock data import from here.

import type { VersionMetadata, RuleEvaluation, RuleId } from "@/types/ruleEngine";
import { RULE_DOMAIN_MAP, RULE_ACTION_MAP } from "@/utils/validateRuleEvaluation";

// ---------------------------------------------------------------------------
// Edition constants — update these when data files change
// ---------------------------------------------------------------------------

export const EDITIONS = {
  ncci_ptp: "Q1 2026",
  mue: "Q1 2026",
  cpt: "2026",
  icd10: "FY2026",
  ruleset: "orthopedics-v1-beta",
  schema: "1.0.0",
} as const;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildVersionMetadata(): VersionMetadata {
  return {
    ncci_ptp_edition: EDITIONS.ncci_ptp,
    mue_edition: EDITIONS.mue,
    cpt_edition: EDITIONS.cpt,
    icd10_edition: EDITIONS.icd10,
    ruleset_version: EDITIONS.ruleset,
    schema_version: EDITIONS.schema,
    generated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Shared default evaluation builder (used by all apply*.ts test utilities)
// ---------------------------------------------------------------------------

export function buildDefaultEvaluation(ruleId: RuleId): RuleEvaluation {
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
