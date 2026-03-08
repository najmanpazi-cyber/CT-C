// ACC-05: MUE Unit Limit Validator
// Deterministic, stateless validator for MUE (Medically Unlikely Edits) rules.
// Covers ACC-01 rules R-3.2.1 (block) and R-3.2.2 (warn).
// BETA SCOPE: Orthopedics v1 only. Do not expand specialty scope without explicit ACC approval.

import type {
  RuleId,
  RuleEvaluation,
  SuppressedCode,
  DeterministicWarning,
  SeverityTier,
} from "@/types/ruleEngine";
import { RULE_DOMAIN_MAP, RULE_ACTION_MAP } from "@/utils/validateRuleEvaluation";
import mueDataRaw from "@/data/mue/mue.orthopedics.q1-2026.json";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MueValidatorInput {
  cpt_codes_submitted: string[];
  units_of_service: Record<string, number>;
  modifiers_present: Record<string, string[]>;
  payer_type: "commercial" | "medicare" | "unknown";
  laterality: string;
}

export interface MueFinding {
  cpt_code: string;
  submitted_units: number;
  mue_limit: number | null;
  mai: "1" | "2" | "3" | "unknown";
  status: "within_limit" | "at_limit" | "exceeds_limit" | "unknown_limit";
  payer_handling: "medicare_hard" | "commercial_conservative" | "unknown_conservative";
}

export interface MueValidationResult {
  rule_evaluations: RuleEvaluation[];
  suppressed_codes: SuppressedCode[];
  warnings: DeterministicWarning[];
  mue_findings: MueFinding[];
}

export interface MueDataEntry {
  cpt_code: string;
  mue_value: number | null;
  mai: string;
  adjudication_note: string;
  effective_date: string;
  edition: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const mueData: MueDataEntry[] = mueDataRaw as MueDataEntry[];
const mueMap = new Map<string, MueDataEntry>();
for (const entry of mueData) {
  mueMap.set(entry.cpt_code, entry);
}

const MUE_RULE_IDS: RuleId[] = ["R-3.2.1", "R-3.2.2"];

const SEVERITY_MAP: Record<string, SeverityTier> = {
  "R-3.2.1": "Critical",
  "R-3.2.2": "Low",
};

const RULE_DESCRIPTIONS: Record<string, { user: string; internal: string }> = {
  "R-3.2.1": {
    user: "Units billed exceed the MUE (Medically Unlikely Edits) limit for this code. The claim line will be denied.",
    internal: "MUE unit overage detected. Submitted units exceed CMS MUE threshold.",
  },
  "R-3.2.2": {
    user: "Units billed are at the MUE limit. No action required, but additional units would be denied.",
    internal: "MUE near-threshold: submitted units equal MUE limit.",
  },
};

const POLICY_ANCHOR = "CMS MUE Values Q1 2026";

const PAYER_NOTES: Record<string, Record<string, string>> = {
  "R-3.2.1": {
    medicare: "Medicare auto-adjudicates MUE violations. Units exceeding MUE will be denied automatically.",
    commercial: "Conservative MUE limit applied. Some commercial payers allow override with documentation. Review payer-specific policy.",
    unknown: "Conservative MUE limit applied. Some commercial payers allow override with documentation. Review payer-specific policy.",
  },
  "R-3.2.2": {
    medicare: "Medicare MUE is a hard cap. Additional units beyond the current count will be auto-denied.",
    commercial: "At MUE threshold. Some commercial payers may allow additional units with supporting documentation.",
    unknown: "At MUE threshold. Additional units may be denied. Review payer-specific policy.",
  },
};

const PAYER_CONTEXT: Record<string, string> = {
  medicare: "Payer: medicare; hard auto-adjudication",
  commercial: "Payer: commercial; conservative MUE enforcement",
  unknown: "Payer: unknown; conservative defaults applied",
};

// ---------------------------------------------------------------------------
// ACC-02 structured_fields adapter
// ---------------------------------------------------------------------------

export function fromStructuredFields(sf: {
  cpt_codes_submitted: string[];
  units_of_service: Record<string, number>;
  modifiers_present: Record<string, string[]>;
  payer_type: string;
  laterality: string;
  [key: string]: unknown;
}): MueValidatorInput {
  return {
    cpt_codes_submitted: sf.cpt_codes_submitted,
    units_of_service: sf.units_of_service,
    modifiers_present: sf.modifiers_present,
    payer_type: (sf.payer_type === "commercial" || sf.payer_type === "medicare")
      ? sf.payer_type : "unknown",
    laterality: sf.laterality,
  };
}

// ---------------------------------------------------------------------------
// Payer handling
// ---------------------------------------------------------------------------

function getPayerHandling(payerType: "commercial" | "medicare" | "unknown"): MueFinding["payer_handling"] {
  if (payerType === "medicare") return "medicare_hard";
  if (payerType === "commercial") return "commercial_conservative";
  return "unknown_conservative";
}

// ---------------------------------------------------------------------------
// Per-code evaluation
// ---------------------------------------------------------------------------

function evaluateCode(
  code: string,
  units: number,
  payerType: "commercial" | "medicare" | "unknown"
): MueFinding {
  const entry = mueMap.get(code);
  const payerHandling = getPayerHandling(payerType);

  if (!entry || entry.mue_value === null) {
    return {
      cpt_code: code,
      submitted_units: units,
      mue_limit: null,
      mai: "unknown",
      status: "unknown_limit",
      payer_handling: payerHandling,
    };
  }

  const mai = (entry.mai === "1" || entry.mai === "2" || entry.mai === "3")
    ? entry.mai as "1" | "2" | "3"
    : "unknown" as const;

  let status: MueFinding["status"];
  if (units > entry.mue_value) {
    status = "exceeds_limit";
  } else if (units === entry.mue_value) {
    status = "at_limit";
  } else {
    status = "within_limit";
  }

  return {
    cpt_code: code,
    submitted_units: units,
    mue_limit: entry.mue_value,
    mai,
    status,
    payer_handling: payerHandling,
  };
}

// ---------------------------------------------------------------------------
// Rule evaluation builders
// ---------------------------------------------------------------------------

function buildTriggeredEvaluation(
  ruleId: RuleId,
  findings: MueFinding[],
  payerType: "commercial" | "medicare" | "unknown"
): RuleEvaluation {
  const desc = RULE_DESCRIPTIONS[ruleId];
  const evidenceFields: string[] = [];

  for (const f of findings) {
    if (ruleId === "R-3.2.1" && f.status === "exceeds_limit") {
      evidenceFields.push(`${f.cpt_code}: ${f.submitted_units} units > MUE ${f.mue_limit}`);
      evidenceFields.push(`${f.cpt_code}: MAI=${f.mai}`);
    } else if (ruleId === "R-3.2.2" && f.status === "at_limit") {
      evidenceFields.push(`${f.cpt_code}: ${f.submitted_units} units = MUE ${f.mue_limit}`);
      evidenceFields.push(`${f.cpt_code}: MAI=${f.mai}`);
    }
  }

  return {
    rule_id: ruleId,
    domain: RULE_DOMAIN_MAP[ruleId],
    action_type: RULE_ACTION_MAP[ruleId],
    severity: SEVERITY_MAP[ruleId],
    trigger_matched: true,
    message_user: desc.user,
    message_internal: desc.internal,
    evidence_fields: evidenceFields,
    missing_info_keys: [],
    payer_note: PAYER_NOTES[ruleId]?.[payerType] ?? null,
    suppressed_code: null,
    payer_context: PAYER_CONTEXT[payerType] ?? null,
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

export function validateMue(input: MueValidatorInput): MueValidationResult {
  const findings: MueFinding[] = [];
  const warnings: DeterministicWarning[] = [];

  // Evaluate each code in units_of_service independently
  for (const [code, units] of Object.entries(input.units_of_service)) {
    const finding = evaluateCode(code, units, input.payer_type);
    findings.push(finding);

    // Unknown limit → info warning
    if (finding.status === "unknown_limit") {
      warnings.push({
        type: "info",
        rule_id: "R-3.2.1",
        message: `MUE limit unknown for CPT ${code}. Unable to validate unit count.`,
        code_context: code,
      });
    }
  }

  // Determine which rules trigger
  const exceedingFindings = findings.filter((f) => f.status === "exceeds_limit");
  const exceedingCodes = new Set(exceedingFindings.map((f) => f.cpt_code));
  // at_limit only triggers R-3.2.2 if the code does NOT also exceed (which can't happen for same code, but guard for clarity)
  const atLimitFindings = findings.filter(
    (f) => f.status === "at_limit" && !exceedingCodes.has(f.cpt_code)
  );

  const ruleEvaluations: RuleEvaluation[] = [];

  // R-3.2.1: block if any code exceeds MUE
  if (exceedingFindings.length > 0) {
    ruleEvaluations.push(buildTriggeredEvaluation("R-3.2.1", findings, input.payer_type));
  } else {
    ruleEvaluations.push(buildPassEvaluation("R-3.2.1"));
  }

  // R-3.2.2: warn if any code is at MUE limit (and not exceeding)
  if (atLimitFindings.length > 0) {
    ruleEvaluations.push(buildTriggeredEvaluation("R-3.2.2", findings, input.payer_type));
    for (const f of atLimitFindings) {
      warnings.push({
        type: "warning",
        rule_id: "R-3.2.2",
        message: `CPT ${f.cpt_code}: ${f.submitted_units} unit(s) at MUE limit of ${f.mue_limit}. Additional units would be denied.`,
        code_context: f.cpt_code,
      });
    }
  } else {
    ruleEvaluations.push(buildPassEvaluation("R-3.2.2"));
  }

  return {
    rule_evaluations: ruleEvaluations,
    suppressed_codes: [],
    warnings,
    mue_findings: findings,
  };
}
