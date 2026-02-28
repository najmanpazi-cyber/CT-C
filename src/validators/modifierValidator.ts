// ACC-06: Modifier 59/X Validator
// Deterministic, stateless validator for modifier 59/X guardrails.
// Covers ACC-01 rules R-3.3.1 (force-review), R-3.3.2 (block), R-3.3.3 (warn).
// First validator in the system to produce force_review_items.

import type {
  RuleId,
  RuleEvaluation,
  SuppressedCode,
  DeterministicWarning,
  ForceReviewItem,
  SeverityTier,
} from "@/types/ruleEngine";
import { RULE_DOMAIN_MAP, RULE_ACTION_MAP } from "@/utils/validateRuleEvaluation";
import modifierRulesData from "@/data/modifiers/modifier59x.rules.orthopedics.v1.json";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ModifierValidatorInput {
  laterality: string;
  payer_type: "commercial" | "medicare" | "unknown";
  cpt_codes_submitted: string[];
  modifiers_present: Record<string, string[]>;
  physician_id: string;
  setting: string;
  patient_type: string;
  icd10_codes: string[];
  distinct_encounter_documented: boolean;
  distinct_site_documented: boolean;
  distinct_practitioner_documented: boolean;
  non_overlapping_service_documented: boolean;
}

export interface ModifierFinding {
  cpt_code: string;
  submitted_modifiers: string[];
  normalized_modifiers: string[];
  has_59: boolean;
  has_x_modifier: boolean;
  selected_x_modifier: "XE" | "XS" | "XP" | "XU" | null;
  documentation_support: "sufficient" | "insufficient" | "unknown";
  payer_handling: "medicare_strict" | "commercial_flexible" | "unknown_conservative";
  status: "valid" | "needs_review" | "unsupported";
}

export interface ModifierValidationResult {
  rule_evaluations: RuleEvaluation[];
  suppressed_codes: SuppressedCode[];
  warnings: DeterministicWarning[];
  force_review_items: ForceReviewItem[];
  modifier_findings: ModifierFinding[];
}

interface ModifierRuleConfig {
  rule_id: string;
  trigger_payer: string[];
  trigger_modifier: string[];
  action: string;
  description: string;
  payer_note: string | null;
  x_modifier_mapping: Record<string, { evidence_field: string; priority: number }> | null;
  missing_info_keys?: string[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const modifierRules: ModifierRuleConfig[] = modifierRulesData as ModifierRuleConfig[];

const MODIFIER_RULE_IDS: RuleId[] = ["R-3.3.1", "R-3.3.2", "R-3.3.3"];

const SEVERITY_MAP: Record<string, SeverityTier> = {
  "R-3.3.1": "High",
  "R-3.3.2": "Critical",
  "R-3.3.3": "Low",
};

const RULE_DESCRIPTIONS: Record<string, { user: string; internal: string }> = {
  "R-3.3.1": {
    user: "Medicare requires a specific X-modifier (XE, XS, XP, or XU) instead of generic -59. Please select the appropriate X-modifier based on the clinical documentation.",
    internal: "Medicare -59 detected. Requires conversion to specific X-modifier per CMS policy.",
  },
  "R-3.3.2": {
    user: "A 59/X modifier is present but documentation does not sufficiently support the distinctness claim. The claim may be denied on audit.",
    internal: "59/X modifier present without matching documentation evidence. Block pending documentation review.",
  },
  "R-3.3.3": {
    user: "Commercial payer accepts -59 but using a specific X-modifier (XE, XS, XP, XU) provides better audit protection.",
    internal: "Commercial -59 detected. Accepted but X-modifier specificity recommended.",
  },
};

const POLICY_ANCHOR = "CMS NCCI Modifier Policy Q1 2026";

const X_MODIFIERS = ["XE", "XS", "XP", "XU"] as const;
type XModifier = typeof X_MODIFIERS[number];

const X_MODIFIER_EVIDENCE_MAP: Record<XModifier, keyof Pick<
  ModifierValidatorInput,
  "distinct_encounter_documented" | "distinct_site_documented" | "distinct_practitioner_documented" | "non_overlapping_service_documented"
>> = {
  XP: "distinct_practitioner_documented",
  XE: "distinct_encounter_documented",
  XS: "distinct_site_documented",
  XU: "non_overlapping_service_documented",
};

// Priority order: XP(1) > XE(2) > XS(3) > XU(4)
const X_MODIFIER_PRIORITY: XModifier[] = ["XP", "XE", "XS", "XU"];

// ---------------------------------------------------------------------------
// ACC-02 structured_fields adapter
// ---------------------------------------------------------------------------

export function fromStructuredFields(sf: {
  laterality: string;
  payer_type: string;
  cpt_codes_submitted: string[];
  modifiers_present: Record<string, string[]>;
  physician_id: string;
  setting: string;
  patient_type: string;
  icd10_codes: string[];
  distinct_encounter_documented?: boolean;
  distinct_site_documented?: boolean;
  distinct_practitioner_documented?: boolean;
  non_overlapping_service_documented?: boolean;
  [key: string]: unknown;
}): ModifierValidatorInput {
  return {
    laterality: sf.laterality,
    payer_type: (sf.payer_type === "commercial" || sf.payer_type === "medicare")
      ? sf.payer_type : "unknown",
    cpt_codes_submitted: sf.cpt_codes_submitted,
    modifiers_present: sf.modifiers_present,
    physician_id: sf.physician_id,
    setting: sf.setting,
    patient_type: sf.patient_type,
    icd10_codes: sf.icd10_codes,
    distinct_encounter_documented: sf.distinct_encounter_documented ?? false,
    distinct_site_documented: sf.distinct_site_documented ?? false,
    distinct_practitioner_documented: sf.distinct_practitioner_documented ?? false,
    non_overlapping_service_documented: sf.non_overlapping_service_documented ?? false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeModifier(mod: string): string {
  return mod.replace(/^-/, "").toUpperCase();
}

function getPayerHandling(payerType: "commercial" | "medicare" | "unknown"): ModifierFinding["payer_handling"] {
  if (payerType === "medicare") return "medicare_strict";
  if (payerType === "commercial") return "commercial_flexible";
  return "unknown_conservative";
}

function selectXModifier(input: ModifierValidatorInput): XModifier | null {
  for (const xMod of X_MODIFIER_PRIORITY) {
    const field = X_MODIFIER_EVIDENCE_MAP[xMod];
    if (input[field]) return xMod;
  }
  return null;
}

function hasDocumentationEvidence(input: ModifierValidatorInput): boolean {
  return (
    input.distinct_encounter_documented ||
    input.distinct_site_documented ||
    input.distinct_practitioner_documented ||
    input.non_overlapping_service_documented
  );
}

function xModifierEvidenceMatches(xMod: string, input: ModifierValidatorInput): boolean {
  const normalized = xMod.toUpperCase() as XModifier;
  const field = X_MODIFIER_EVIDENCE_MAP[normalized];
  if (!field) return false;
  return input[field] === true;
}

// ---------------------------------------------------------------------------
// Per-code evaluation
// ---------------------------------------------------------------------------

interface CodeEvalResult {
  finding: ModifierFinding;
  triggers331: boolean;
  triggers332: boolean;
  triggers333: boolean;
}

function evaluateCode(
  code: string,
  modifiers: string[],
  input: ModifierValidatorInput
): CodeEvalResult {
  const normalized = modifiers.map(normalizeModifier);
  const has59 = normalized.includes("59");
  const presentXMods = normalized.filter((m) => (X_MODIFIERS as readonly string[]).includes(m));
  const hasXModifier = presentXMods.length > 0;
  const payerHandling = getPayerHandling(input.payer_type);

  let triggers331 = false;
  let triggers332 = false;
  let triggers333 = false;
  let selectedXModifier: XModifier | null = null;
  let documentationSupport: ModifierFinding["documentation_support"] = "unknown";
  let status: ModifierFinding["status"] = "valid";

  const isMedicare = input.payer_type === "medicare";
  const isCommercialOrUnknown = input.payer_type === "commercial" || input.payer_type === "unknown";

  if (has59) {
    // R-3.3.1: Medicare + -59 → force-review (convert to X-modifier)
    if (isMedicare) {
      triggers331 = true;
      selectedXModifier = selectXModifier(input);
      status = "needs_review";

      if (!hasDocumentationEvidence(input)) {
        // No documentation evidence → also trigger R-3.3.2
        triggers332 = true;
        documentationSupport = "insufficient";
        status = "unsupported";
      } else {
        documentationSupport = "sufficient";
      }
    }

    // R-3.3.3: Commercial/unknown + -59 → warn
    if (isCommercialOrUnknown) {
      triggers333 = true;

      if (!hasDocumentationEvidence(input)) {
        // No documentation → also trigger R-3.3.2
        triggers332 = true;
        documentationSupport = "insufficient";
        status = "unsupported";
      } else {
        documentationSupport = "sufficient";
        selectedXModifier = selectXModifier(input);
      }
    }
  } else if (hasXModifier) {
    // X-modifier present (not -59): validate documentation match
    const primaryXMod = presentXMods[0];
    if (xModifierEvidenceMatches(primaryXMod, input)) {
      documentationSupport = "sufficient";
      selectedXModifier = primaryXMod as XModifier;
      status = "valid";
    } else {
      // R-3.3.2: X-modifier without matching evidence → block
      triggers332 = true;
      documentationSupport = "insufficient";
      selectedXModifier = null;
      status = "unsupported";
    }
  }

  return {
    finding: {
      cpt_code: code,
      submitted_modifiers: modifiers,
      normalized_modifiers: normalized,
      has_59: has59,
      has_x_modifier: hasXModifier,
      selected_x_modifier: selectedXModifier,
      documentation_support: documentationSupport,
      payer_handling: payerHandling,
      status,
    },
    triggers331,
    triggers332,
    triggers333,
  };
}

// ---------------------------------------------------------------------------
// Rule evaluation builders
// ---------------------------------------------------------------------------

function buildTriggeredEvaluation(
  ruleId: RuleId,
  findings: ModifierFinding[],
  input: ModifierValidatorInput
): RuleEvaluation {
  const desc = RULE_DESCRIPTIONS[ruleId];
  const ruleConfig = modifierRules.find((r) => r.rule_id === ruleId);
  const evidenceFields: string[] = [];
  const missingInfoKeys: string[] = [];

  for (const f of findings) {
    evidenceFields.push(`${f.cpt_code}: modifiers=[${f.normalized_modifiers.join(",")}]`);
    if (f.selected_x_modifier) {
      evidenceFields.push(`${f.cpt_code}: recommended=${f.selected_x_modifier}`);
    }
  }

  if (ruleId === "R-3.3.2") {
    if (ruleConfig?.missing_info_keys) {
      missingInfoKeys.push(...ruleConfig.missing_info_keys);
    }
  }

  const payerNote = ruleConfig?.payer_note ?? null;

  return {
    rule_id: ruleId,
    domain: RULE_DOMAIN_MAP[ruleId],
    action_type: RULE_ACTION_MAP[ruleId],
    severity: SEVERITY_MAP[ruleId],
    trigger_matched: true,
    message_user: desc.user,
    message_internal: desc.internal,
    evidence_fields: evidenceFields,
    missing_info_keys: missingInfoKeys,
    payer_note: payerNote,
    suppressed_code: null,
    payer_context: null,
    policy_anchor: POLICY_ANCHOR,
  };
}

function buildPassEvaluation(ruleId: RuleId): RuleEvaluation {
  return {
    rule_id: ruleId,
    domain: RULE_DOMAIN_MAP[ruleId],
    action_type: RULE_ACTION_MAP[ruleId],
    severity: SEVERITY_MAP[ruleId],
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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function validateModifiers(input: ModifierValidatorInput): ModifierValidationResult {
  const findings: ModifierFinding[] = [];
  const warnings: DeterministicWarning[] = [];
  const forceReviewItems: ForceReviewItem[] = [];

  // Track which rules are triggered across all codes
  const trigger331Findings: ModifierFinding[] = [];
  const trigger332Findings: ModifierFinding[] = [];
  const trigger333Findings: ModifierFinding[] = [];

  // Evaluate each code that has modifiers with 59/X
  for (const code of input.cpt_codes_submitted) {
    const codeMods = input.modifiers_present[code];
    if (!codeMods || codeMods.length === 0) continue;

    const normalizedMods = codeMods.map(normalizeModifier);
    const has59OrX = normalizedMods.some(
      (m) => m === "59" || (X_MODIFIERS as readonly string[]).includes(m)
    );
    if (!has59OrX) continue;

    const evalResult = evaluateCode(code, codeMods, input);
    findings.push(evalResult.finding);

    if (evalResult.triggers331) trigger331Findings.push(evalResult.finding);
    if (evalResult.triggers332) trigger332Findings.push(evalResult.finding);
    if (evalResult.triggers333) trigger333Findings.push(evalResult.finding);
  }

  // Build rule evaluations
  const ruleEvaluations: RuleEvaluation[] = [];

  // R-3.3.1: force-review
  if (trigger331Findings.length > 0) {
    ruleEvaluations.push(buildTriggeredEvaluation("R-3.3.1", trigger331Findings, input));
    for (const f of trigger331Findings) {
      const xRec = f.selected_x_modifier
        ? `Recommended: -${f.selected_x_modifier}`
        : "No documentation evidence to select X-modifier";
      forceReviewItems.push({
        rule_id: "R-3.3.1",
        message: `CPT ${f.cpt_code}: Medicare -59 requires conversion to X-modifier. ${xRec}.`,
        code_context: [f.cpt_code],
        resolved: false,
      });
    }
  } else {
    ruleEvaluations.push(buildPassEvaluation("R-3.3.1"));
  }

  // R-3.3.2: block
  if (trigger332Findings.length > 0) {
    ruleEvaluations.push(buildTriggeredEvaluation("R-3.3.2", trigger332Findings, input));
  } else {
    ruleEvaluations.push(buildPassEvaluation("R-3.3.2"));
  }

  // R-3.3.3: warn
  if (trigger333Findings.length > 0) {
    ruleEvaluations.push(buildTriggeredEvaluation("R-3.3.3", trigger333Findings, input));
    for (const f of trigger333Findings) {
      warnings.push({
        type: "warning",
        rule_id: "R-3.3.3",
        message: `CPT ${f.cpt_code}: Commercial -59 accepted. Consider specific X-modifier for audit protection.`,
        code_context: f.cpt_code,
      });
    }
  } else {
    ruleEvaluations.push(buildPassEvaluation("R-3.3.3"));
  }

  return {
    rule_evaluations: ruleEvaluations,
    suppressed_codes: [],
    warnings,
    force_review_items: forceReviewItems,
    modifier_findings: findings,
  };
}
