// ACC-10: Scorer R-3.2.2 tolerance tests
// Verifies narrow informational tolerance for R-3.2.2 (MUE at-limit warn)
// per ACC-01 §3.0 action semantics.

import { describe, it, expect } from "vitest";
import {
  classifyScenario,
  applyR322Tolerance,
  type AggregatedResult,
} from "../../scripts/lib/scorer";
import type { Scenario } from "../../scripts/lib/scenarioMapper";
import type { RuleEvaluation } from "@/types/ruleEngine";

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeRuleEval(overrides: Partial<RuleEvaluation> & { rule_id: string }): RuleEvaluation {
  return {
    domain: "MUE",
    action_type: "warn",
    severity: "Low",
    trigger_matched: true,
    message_user: "",
    message_internal: "",
    evidence_fields: [],
    missing_info_keys: [],
    payer_note: null,
    suppressed_code: null,
    payer_context: null,
    policy_anchor: null,
    ...overrides,
  } as RuleEvaluation;
}

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "TEST-001",
    domain: "MUE",
    sub_category: "test",
    complexity: "simple",
    payer_type: "commercial",
    clinical_vignette: "test",
    clinical_input: "test",
    structured_fields: {
      laterality: "right",
      patient_type: "established",
      setting: "office",
      payer_type: "commercial",
      global_period_status: "none",
      global_period_surgery_date: null,
      global_period_surgery_cpt: null,
      units_of_service: { "27447": 1 },
      modifiers_present: {},
      cpt_codes_submitted: ["27447"],
      icd10_codes: ["M17.11"],
      physician_id: "PHY-001",
    },
    expected_rule_hits: [],
    expected_action: "pass",
    expected_clean_claim_ready: true,
    expected_confidence: "high",
    expected_suppressed_codes: [],
    expected_missing_info_keys: [],
    edge_case_tags: [],
    domains_tested: ["MUE"],
    rationale: "test",
    ...overrides,
  } as Scenario;
}

function makeAgg(overrides: Partial<AggregatedResult> = {}): AggregatedResult {
  return {
    actual_action: "pass",
    actual_clean_claim_ready: true,
    actual_confidence: "high",
    actual_rule_hits: [],
    actual_suppressed_codes: [],
    actual_missing_info_keys: [],
    all_rule_evaluations: [],
    all_suppressed_codes: [],
    all_force_review_items: [],
    all_warnings: [],
    domain_results: [],
    unevaluable_domains: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// applyR322Tolerance unit tests
// ---------------------------------------------------------------------------

describe("applyR322Tolerance", () => {
  const r322Eval = makeRuleEval({ rule_id: "R-3.2.2", action_type: "warn", domain: "MUE" });

  it("returns tolerance when R-3.2.2 is sole unexpected extra", () => {
    const result = applyR322Tolerance(
      [],                     // expRules: no rules expected
      ["R-3.2.2"],            // actRules: only R-3.2.2 fired
      "warn",                 // actAction
      true,                   // actCCR (unchanged by warn)
      "high",                 // actConf (unchanged by warn)
      [r322Eval],
    );
    expect(result).not.toBeNull();
    expect(result!.effectiveAction).toBe("pass");
    expect(result!.effectiveRules).toEqual([]);
  });

  it("returns tolerance when R-3.2.2 is extra alongside block rules", () => {
    const blockEval = makeRuleEval({
      rule_id: "R-3.1.1",
      action_type: "block",
      domain: "PTP",
    });
    const result = applyR322Tolerance(
      ["R-3.1.1"],                    // expRules
      ["R-3.1.1", "R-3.2.2"],        // actRules: R-3.2.2 is extra
      "block",                        // actAction (from R-3.1.1)
      false,                          // actCCR (from block)
      "low",                          // actConf (from block)
      [blockEval, r322Eval],
    );
    expect(result).not.toBeNull();
    expect(result!.effectiveAction).toBe("block");
    expect(result!.effectiveRules).toEqual(["R-3.1.1"]);
  });

  it("returns null when R-3.2.2 is expected (not extra)", () => {
    const result = applyR322Tolerance(
      ["R-3.2.2"],            // R-3.2.2 IS expected
      ["R-3.2.2"],
      "warn",
      true,
      "high",
      [r322Eval],
    );
    expect(result).toBeNull();
  });

  it("returns null when R-3.2.2 is not in actual rules", () => {
    const result = applyR322Tolerance(
      [],
      [],                     // R-3.2.2 not present
      "pass",
      true,
      "high",
      [],
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// classifyScenario integration tests — R-3.2.2 tolerance
// ---------------------------------------------------------------------------

describe("classifyScenario — R-3.2.2 tolerance", () => {
  const r322Eval = makeRuleEval({ rule_id: "R-3.2.2", action_type: "warn", domain: "MUE" });

  it("expected-pass + only R-3.2.2 extra => PASS", () => {
    const scenario = makeScenario({
      expected_action: "pass",
      expected_rule_hits: [],
      expected_clean_claim_ready: true,
      expected_confidence: "high",
    });
    const agg = makeAgg({
      actual_action: "warn",
      actual_clean_claim_ready: true,
      actual_confidence: "high",
      actual_rule_hits: ["R-3.2.2"],
      all_rule_evaluations: [r322Eval],
    });
    expect(classifyScenario(scenario, agg)).toBe("PASS");
  });

  it("expected-block + extra R-3.2.2 => not penalized (stays PASS if rules otherwise match)", () => {
    const blockEval = makeRuleEval({
      rule_id: "R-3.1.1",
      action_type: "block",
      domain: "PTP",
    });
    const scenario = makeScenario({
      expected_action: "block",
      expected_rule_hits: ["R-3.1.1"],
      expected_clean_claim_ready: false,
      expected_confidence: "low",
    });
    const agg = makeAgg({
      actual_action: "block",
      actual_clean_claim_ready: false,
      actual_confidence: "low",
      actual_rule_hits: ["R-3.1.1", "R-3.2.2"],
      all_rule_evaluations: [blockEval, r322Eval],
    });
    expect(classifyScenario(scenario, agg)).toBe("PASS");
  });

  it("expected-force-review + extra R-3.2.2 => not penalized", () => {
    const frEval = makeRuleEval({
      rule_id: "R-3.3.1",
      action_type: "force-review",
      domain: "MODIFIER",
    });
    const scenario = makeScenario({
      expected_action: "force-review",
      expected_rule_hits: ["R-3.3.1"],
      expected_clean_claim_ready: true,
      expected_confidence: "medium",
    });
    const agg = makeAgg({
      actual_action: "force-review",
      actual_clean_claim_ready: true,
      actual_confidence: "medium",
      actual_rule_hits: ["R-3.2.2", "R-3.3.1"],
      all_rule_evaluations: [r322Eval, frEval],
    });
    expect(classifyScenario(scenario, agg)).toBe("PASS");
  });

  it("unexpected warn rule OTHER than R-3.2.2 => existing behavior unchanged (WRONG_ACTION)", () => {
    // R-3.3.3 is also a warn rule but should NOT be tolerated
    const r333Eval = makeRuleEval({
      rule_id: "R-3.3.3",
      action_type: "warn",
      domain: "MODIFIER",
    });
    const scenario = makeScenario({
      expected_action: "pass",
      expected_rule_hits: [],
      expected_clean_claim_ready: true,
      expected_confidence: "high",
    });
    const agg = makeAgg({
      actual_action: "warn",
      actual_clean_claim_ready: true,
      actual_confidence: "high",
      actual_rule_hits: ["R-3.3.3"],
      all_rule_evaluations: [r333Eval],
    });
    expect(classifyScenario(scenario, agg)).toBe("WRONG_ACTION");
  });

  it("unexpected R-3.5.5 warn => existing behavior unchanged (WRONG_ACTION)", () => {
    const r355Eval = makeRuleEval({
      rule_id: "R-3.5.5",
      action_type: "warn",
      domain: "DOC_SUFFICIENCY",
    });
    const scenario = makeScenario({
      expected_action: "pass",
      expected_rule_hits: [],
      expected_clean_claim_ready: true,
      expected_confidence: "high",
    });
    const agg = makeAgg({
      actual_action: "warn",
      actual_clean_claim_ready: true,
      actual_confidence: "high",
      actual_rule_hits: ["R-3.5.5"],
      all_rule_evaluations: [r355Eval],
    });
    expect(classifyScenario(scenario, agg)).toBe("WRONG_ACTION");
  });

  it("R-3.2.2 tolerance does NOT mask FALSE_PASS", () => {
    // Expected block, got only R-3.2.2 warn => still FALSE_PASS
    const scenario = makeScenario({
      expected_action: "block",
      expected_rule_hits: ["R-3.2.1"],
      expected_clean_claim_ready: false,
      expected_confidence: "low",
    });
    const agg = makeAgg({
      actual_action: "warn",
      actual_clean_claim_ready: true,
      actual_confidence: "high",
      actual_rule_hits: ["R-3.2.2"],
      all_rule_evaluations: [r322Eval],
    });
    expect(classifyScenario(scenario, agg)).toBe("FALSE_PASS");
  });

  it("R-3.2.2 tolerance does NOT mask FALSE_FAIL", () => {
    // Expected pass, got block + R-3.2.2 => still FALSE_FAIL
    const blockEval = makeRuleEval({
      rule_id: "R-3.2.1",
      action_type: "block",
      domain: "MUE",
    });
    const scenario = makeScenario({
      expected_action: "pass",
      expected_rule_hits: [],
      expected_clean_claim_ready: true,
      expected_confidence: "high",
    });
    const agg = makeAgg({
      actual_action: "block",
      actual_clean_claim_ready: false,
      actual_confidence: "low",
      actual_rule_hits: ["R-3.2.1", "R-3.2.2"],
      all_rule_evaluations: [blockEval, r322Eval],
    });
    expect(classifyScenario(scenario, agg)).toBe("FALSE_FAIL");
  });

  it("R-3.2.2 + other extra rule => only R-3.2.2 is tolerated, PARTIAL remains", () => {
    const r355Eval = makeRuleEval({
      rule_id: "R-3.5.5",
      action_type: "warn",
      domain: "DOC_SUFFICIENCY",
    });
    const scenario = makeScenario({
      expected_action: "warn",
      expected_rule_hits: ["R-3.5.5"],
      expected_clean_claim_ready: true,
      expected_confidence: "high",
    });
    // R-3.2.2 is extra but R-3.1.3 is also extra => PARTIAL
    const r313Eval = makeRuleEval({
      rule_id: "R-3.1.3",
      action_type: "warn",
      domain: "PTP",
    });
    const agg = makeAgg({
      actual_action: "warn",
      actual_clean_claim_ready: true,
      actual_confidence: "high",
      actual_rule_hits: ["R-3.1.3", "R-3.2.2", "R-3.5.5"],
      all_rule_evaluations: [r313Eval, r322Eval, r355Eval],
    });
    // R-3.2.2 is tolerated, but R-3.1.3 is still extra => PARTIAL
    expect(classifyScenario(scenario, agg)).toBe("PARTIAL");
  });
});
