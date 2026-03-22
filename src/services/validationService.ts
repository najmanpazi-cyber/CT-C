// Service layer that transforms ValidationFormData into validator inputs
// and runs all 5 validators, returning a unified result.

import type { ValidationFormData } from "@/components/ValidationForm";
import type { RuleEvaluation, DeterministicWarning } from "@/types/ruleEngine";

import { validatePtp, fromStructuredFields as ptpFromSF } from "@/validators/ptpValidator";
import { validateMue, fromStructuredFields as mueFromSF } from "@/validators/mueValidator";
import { validateModifiers, fromStructuredFields as modFromSF } from "@/validators/modifierValidator";
import { validateGlobal, fromStructuredFields as globalFromSF } from "@/validators/globalValidator";
import { validateDocumentation, fromStructuredFields as docFromSF } from "@/validators/documentationValidator";

import globalCptData from "@/data/global/global.orthopedics.v1.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModuleStatus = "pass" | "fail" | "warning" | "not_applicable";

export interface ModuleResult {
  name: string;
  key: string;
  status: ModuleStatus;
  triggered: RuleEvaluation[];
  warnings: DeterministicWarning[];
  summary: string;
}

export interface ValidationResult {
  modules: ModuleResult[];
  totalChecks: number;
  passes: number;
  fails: number;
  warnings: number;
  overallStatus: "clean" | "issues_found";
}

// ---------------------------------------------------------------------------
// Global period helpers
// ---------------------------------------------------------------------------

function lookupGlobalDays(cptCode: string): number | null {
  const entry = (globalCptData as Array<{ cpt_code: string; global_days: number }>)
    .find((e) => e.cpt_code === cptCode);
  return entry ? entry.global_days : null;
}

function computeGlobalStatus(
  priorCpt: string,
  priorDate: string,
  encounterDate: string,
): { status: string; surgeryDate: string | null; surgeryCpt: string | null } {
  if (!priorCpt || !priorDate) {
    return { status: "none", surgeryDate: null, surgeryCpt: null };
  }

  const globalDays = lookupGlobalDays(priorCpt);
  if (globalDays === null || globalDays === 0) {
    return { status: "none", surgeryDate: priorDate, surgeryCpt: priorCpt };
  }

  const surgery = new Date(priorDate);
  const encounter = new Date(encounterDate);
  const elapsed = Math.floor((encounter.getTime() - surgery.getTime()) / (1000 * 60 * 60 * 24));

  if (elapsed > globalDays) {
    return { status: "none", surgeryDate: priorDate, surgeryCpt: priorCpt };
  }

  const statusKey = `active_${globalDays}` as string;
  return { status: statusKey, surgeryDate: priorDate, surgeryCpt: priorCpt };
}

// ---------------------------------------------------------------------------
// Adapter: form data → structured fields (common shape for all validators)
// ---------------------------------------------------------------------------

function buildStructuredFields(data: ValidationFormData) {
  const modifiers_present: Record<string, string[]> = {};
  for (const code of data.cptCodes) {
    modifiers_present[code] = data.modifiers.map((m) => `-${m}`);
  }

  const units_of_service: Record<string, number> = {};
  for (const code of data.cptCodes) {
    units_of_service[code] = (units_of_service[code] || 0) + 1;
  }

  const uniqueCpts = [...new Set(data.cptCodes)];

  // Compute global period from prior surgery fields
  const gp = computeGlobalStatus(
    data.priorSurgeryCpt,
    data.priorSurgeryDate,
    data.dateOfService,
  );

  return {
    laterality: data.laterality,
    payer_type: data.payerType,
    cpt_codes_submitted: uniqueCpts,
    modifiers_present,
    units_of_service,
    icd10_codes: data.icd10Code ? [data.icd10Code] : [],
    setting: "office" as const,
    patient_type: "established",
    physician_id: "default",
    global_period_status: gp.status,
    global_period_surgery_date: gp.surgeryDate,
    global_period_surgery_cpt: gp.surgeryCpt,
    encounter_date: data.dateOfService,
    prior_surgery_related: gp.status !== "none",
    decision_for_surgery_documented: false,
    em_separately_identifiable: false,
    distinct_encounter_documented: false,
    distinct_site_documented: false,
    distinct_practitioner_documented: false,
    non_overlapping_service_documented: false,
    diagnosis_text: null,
    anatomic_site: null,
    approach: null,
  };
}

// ---------------------------------------------------------------------------
// Classify a module's result
// ---------------------------------------------------------------------------

function classifyModule(
  name: string,
  key: string,
  evals: RuleEvaluation[],
  warnings: DeterministicWarning[],
): ModuleResult {
  const triggered = evals.filter((e) => e.trigger_matched);

  const hasBlock = triggered.some((e) => e.action_type === "block");
  const hasForceReview = triggered.some((e) => e.action_type === "force-review");
  const hasWarn = triggered.some((e) => e.action_type === "warn") || warnings.length > 0;

  let status: ModuleStatus;
  let summary: string;

  if (hasBlock) {
    status = "fail";
    const msgs = triggered.filter((e) => e.action_type === "block").map((e) => e.message_user);
    summary = msgs.join(" ");
  } else if (hasForceReview) {
    status = "warning";
    const msgs = triggered.filter((e) => e.action_type === "force-review").map((e) => e.message_user);
    summary = msgs.join(" ");
  } else if (hasWarn) {
    status = "warning";
    const warnMsgs = triggered.filter((e) => e.action_type === "warn").map((e) => e.message_user);
    const detWarnMsgs = warnings.map((w) => w.message);
    summary = [...warnMsgs, ...detWarnMsgs].join(" ");
  } else if (triggered.length === 0 && evals.length === 0) {
    status = "not_applicable";
    summary = "No rules applicable for this input.";
  } else {
    status = "pass";
    summary = "All checks passed.";
  }

  return { name, key, status, triggered, warnings, summary };
}

// ---------------------------------------------------------------------------
// Run all validators
// ---------------------------------------------------------------------------

export function runValidation(data: ValidationFormData): ValidationResult {
  const sf = buildStructuredFields(data);

  // 1. PTP
  const ptpInput = ptpFromSF(sf);
  const ptpResult = validatePtp(ptpInput);
  const ptpModule = classifyModule("PTP Pair Check", "ptp", ptpResult.rule_evaluations, ptpResult.warnings);

  // 2. MUE
  const mueInput = mueFromSF(sf);
  const mueResult = validateMue(mueInput);
  const mueModule = classifyModule("MUE Limit Check", "mue", mueResult.rule_evaluations, mueResult.warnings);

  // 3. Modifier
  const modInput = modFromSF(sf);
  const modResult = validateModifiers(modInput);
  const modModule = classifyModule("Modifier 59/X", "modifier", modResult.rule_evaluations, modResult.warnings);

  // 4. Global Period
  const globalInput = globalFromSF(sf);
  const globalResult = validateGlobal(globalInput);
  const globalModule = classifyModule("Global Period", "global", globalResult.rule_evaluations, globalResult.warnings);

  // 5. Documentation
  const docInput = docFromSF(sf);
  const docResult = validateDocumentation(docInput);
  const docModule = classifyModule("Documentation", "doc", docResult.rule_evaluations, docResult.warnings);

  const modules = [ptpModule, mueModule, modModule, globalModule, docModule];

  const fails = modules.filter((m) => m.status === "fail").length;
  const warnings = modules.filter((m) => m.status === "warning").length;
  const passes = modules.filter((m) => m.status === "pass").length;

  return {
    modules,
    totalChecks: modules.length,
    passes,
    fails,
    warnings,
    overallStatus: fails > 0 ? "issues_found" : "clean",
  };
}
