import { describe, it, expect } from "vitest";
import {
  validateMue,
  fromStructuredFields,
  type MueValidatorInput,
} from "@/validators/mueValidator";
import { buildTestCodingOutput } from "@/utils/applyMueValidation";
import { validateCodingOutput } from "@/utils/validateCodingOutput";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<MueValidatorInput> = {}): MueValidatorInput {
  return {
    cpt_codes_submitted: [],
    units_of_service: {},
    modifiers_present: {},
    payer_type: "commercial",
    laterality: "right",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MUE Validator — ACC-05", () => {
  // =========================================================================
  // Test 1: Below MUE — no trigger
  // =========================================================================
  it("1. reports no trigger when all codes are below MUE limits", () => {
    const input = makeInput({
      cpt_codes_submitted: ["99213"],
      units_of_service: { "99213": 2 },
    });
    const result = validateMue(input);

    expect(result.rule_evaluations).toHaveLength(2);
    for (const re of result.rule_evaluations) {
      expect(re.trigger_matched).toBe(false);
    }
    expect(result.mue_findings).toHaveLength(1);
    expect(result.mue_findings[0].status).toBe("within_limit");
    expect(result.suppressed_codes).toHaveLength(0);
  });

  // =========================================================================
  // Test 2: At MUE limit — R-3.2.2 warn (ACC02-031)
  // =========================================================================
  it("2. triggers R-3.2.2 warn when units are at MUE limit (ACC02-031)", () => {
    const input = makeInput({
      cpt_codes_submitted: ["20610"],
      units_of_service: { "20610": 1 },
      modifiers_present: { "20610": ["-RT"] },
    });
    const result = validateMue(input);

    const r322 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.2");
    expect(r322).toBeDefined();
    expect(r322!.trigger_matched).toBe(true);
    expect(r322!.action_type).toBe("warn");
    expect(r322!.policy_anchor).toBe("CMS MUE Values Q1 2026");

    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    expect(r321!.trigger_matched).toBe(false);

    expect(result.mue_findings).toHaveLength(1);
    expect(result.mue_findings[0].status).toBe("at_limit");
    expect(result.mue_findings[0].mue_limit).toBe(1);

    // Should have a warning for at-limit
    const warnEntries = result.warnings.filter((w) => w.rule_id === "R-3.2.2");
    expect(warnEntries).toHaveLength(1);
  });

  // =========================================================================
  // Test 3: Exceed MUE — R-3.2.1 block (ACC02-021)
  // =========================================================================
  it("3. triggers R-3.2.1 block when units exceed MUE (ACC02-021)", () => {
    const input = makeInput({
      cpt_codes_submitted: ["27447"],
      units_of_service: { "27447": 2 },
      payer_type: "commercial",
    });
    const result = validateMue(input);

    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    expect(r321).toBeDefined();
    expect(r321!.trigger_matched).toBe(true);
    expect(r321!.action_type).toBe("block");
    expect(r321!.severity).toBe("Critical");
    expect(r321!.policy_anchor).toBe("CMS MUE Values Q1 2026");

    expect(result.mue_findings).toHaveLength(1);
    expect(result.mue_findings[0].status).toBe("exceeds_limit");
    expect(result.mue_findings[0].submitted_units).toBe(2);
    expect(result.mue_findings[0].mue_limit).toBe(1);
    expect(result.suppressed_codes).toHaveLength(0);
  });

  // =========================================================================
  // Test 4: Medicare exceed (ACC02-022)
  // =========================================================================
  it("4. sets medicare_hard payer_handling for Medicare exceed (ACC02-022)", () => {
    const input = makeInput({
      cpt_codes_submitted: ["27130"],
      units_of_service: { "27130": 2 },
      payer_type: "medicare",
    });
    const result = validateMue(input);

    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    expect(r321!.trigger_matched).toBe(true);
    expect(r321!.payer_note).toContain("Medicare auto-adjudicates");

    expect(result.mue_findings[0].payer_handling).toBe("medicare_hard");
  });

  // =========================================================================
  // Test 5: Commercial exceed (ACC02-021)
  // =========================================================================
  it("5. sets commercial_conservative payer_handling for commercial exceed (ACC02-021)", () => {
    const input = makeInput({
      cpt_codes_submitted: ["27447"],
      units_of_service: { "27447": 2 },
      payer_type: "commercial",
    });
    const result = validateMue(input);

    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    expect(r321!.trigger_matched).toBe(true);
    expect(r321!.payer_note).toContain("Conservative MUE limit");

    expect(result.mue_findings[0].payer_handling).toBe("commercial_conservative");
  });

  // =========================================================================
  // Test 6: Unknown payer exceed
  // =========================================================================
  it("6. sets unknown_conservative payer_handling for unknown payer", () => {
    const input = makeInput({
      cpt_codes_submitted: ["29881"],
      units_of_service: { "29881": 2 },
      payer_type: "unknown",
    });
    const result = validateMue(input);

    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    expect(r321!.trigger_matched).toBe(true);
    expect(r321!.payer_note).toContain("Conservative MUE limit");

    expect(result.mue_findings[0].payer_handling).toBe("unknown_conservative");
  });

  // =========================================================================
  // Test 7: Unknown/null MUE — code not in data file
  // =========================================================================
  it("7. handles unknown MUE gracefully for codes not in data file", () => {
    const input = makeInput({
      cpt_codes_submitted: ["99999"],
      units_of_service: { "99999": 3 },
    });
    const result = validateMue(input);

    // Should NOT trigger R-3.2.1 or R-3.2.2
    for (const re of result.rule_evaluations) {
      expect(re.trigger_matched).toBe(false);
    }

    expect(result.mue_findings).toHaveLength(1);
    expect(result.mue_findings[0].status).toBe("unknown_limit");
    expect(result.mue_findings[0].mue_limit).toBeNull();
    expect(result.mue_findings[0].mai).toBe("unknown");

    // Should emit an info warning
    const infoWarnings = result.warnings.filter((w) => w.type === "info");
    expect(infoWarnings).toHaveLength(1);
    expect(infoWarnings[0].message).toContain("99999");
  });

  // =========================================================================
  // Test 8: Multiple codes, mixed results
  // =========================================================================
  it("8. handles multiple codes with mixed exceed and at-limit statuses", () => {
    // 29881 at 2 units (exceeds MUE 1), 20610 at 1 unit (at MUE 1)
    const input = makeInput({
      cpt_codes_submitted: ["29881", "20610"],
      units_of_service: { "29881": 2, "20610": 1 },
    });
    const result = validateMue(input);

    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    const r322 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.2");
    expect(r321!.trigger_matched).toBe(true);
    expect(r322!.trigger_matched).toBe(true);

    expect(result.mue_findings).toHaveLength(2);
    const finding29881 = result.mue_findings.find((f) => f.cpt_code === "29881");
    const finding20610 = result.mue_findings.find((f) => f.cpt_code === "20610");
    expect(finding29881!.status).toBe("exceeds_limit");
    expect(finding20610!.status).toBe("at_limit");
  });

  // =========================================================================
  // Test 9: ACC-02 structured_fields adapter
  // =========================================================================
  it("9. accepts full ACC-02 structured_fields via adapter (ACC02-021)", () => {
    const structuredFields = {
      laterality: "bilateral",
      patient_type: "established",
      setting: "outpatient",
      payer_type: "commercial",
      global_period_status: "none",
      global_period_surgery_date: null,
      global_period_surgery_cpt: null,
      units_of_service: { "27447": 2 },
      modifiers_present: {},
      cpt_codes_submitted: ["27447"],
      icd10_codes: ["M17.0"],
      physician_id: "PHY-001",
    };

    const input = fromStructuredFields(structuredFields);
    const result = validateMue(input);

    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    expect(r321!.trigger_matched).toBe(true);
    expect(result.mue_findings[0].status).toBe("exceeds_limit");
    expect(result.mue_findings[0].cpt_code).toBe("27447");
  });

  // =========================================================================
  // Test 10: ACC-03 semantic validation
  // =========================================================================
  it("10. produces output that passes ACC-03 validateCodingOutput()", () => {
    // Trigger R-3.2.1
    const input = makeInput({
      cpt_codes_submitted: ["27447"],
      units_of_service: { "27447": 2 },
    });
    const mueResult = validateMue(input);
    const fullOutput = buildTestCodingOutput(mueResult);

    const validation = validateCodingOutput(fullOutput);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  // =========================================================================
  // Test 11: Per-code independent evaluation
  // =========================================================================
  it("11. evaluates each code independently — mixed within/exceeds", () => {
    // 27447 at 1 unit (within/at limit), 29881 at 2 units (exceeds)
    const input = makeInput({
      cpt_codes_submitted: ["27447", "29881"],
      units_of_service: { "27447": 1, "29881": 2 },
    });
    const result = validateMue(input);

    expect(result.mue_findings).toHaveLength(2);

    const finding27447 = result.mue_findings.find((f) => f.cpt_code === "27447");
    const finding29881 = result.mue_findings.find((f) => f.cpt_code === "29881");

    expect(finding27447!.status).toBe("at_limit");
    expect(finding27447!.submitted_units).toBe(1);
    expect(finding27447!.mue_limit).toBe(1);

    expect(finding29881!.status).toBe("exceeds_limit");
    expect(finding29881!.submitted_units).toBe(2);
    expect(finding29881!.mue_limit).toBe(1);

    // R-3.2.1 triggers for 29881 exceeding
    const r321 = result.rule_evaluations.find((re) => re.rule_id === "R-3.2.1");
    expect(r321!.trigger_matched).toBe(true);
    expect(r321!.evidence_fields.some((e) => e.includes("29881"))).toBe(true);
  });
});
