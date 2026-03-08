import { describe, it, expect } from "vitest";
import {
  validateModifiers,
  fromStructuredFields,
  type ModifierValidatorInput,
} from "@/validators/modifierValidator";
import { buildTestCodingOutput } from "@/utils/applyModifierValidation";
import { validateCodingOutput } from "@/utils/validateCodingOutput";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<ModifierValidatorInput> = {}): ModifierValidatorInput {
  return {
    laterality: "right",
    payer_type: "commercial",
    cpt_codes_submitted: [],
    modifiers_present: {},
    physician_id: "PHY-001",
    setting: "ASC",
    patient_type: "established",
    icd10_codes: ["M17.11"],
    distinct_encounter_documented: false,
    distinct_site_documented: false,
    distinct_practitioner_documented: false,
    non_overlapping_service_documented: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Modifier 59/X Validator — ACC-06", () => {
  // =========================================================================
  // Test 1: Medicare + -59 → R-3.3.1 force-review (ACC02-033 pattern)
  // =========================================================================
  it("1. triggers R-3.3.1 force-review for Medicare + -59 (ACC02-033 pattern)", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29881", "29877"],
      modifiers_present: { "29877": ["-59", "-RT"] },
      distinct_site_documented: true,
    });
    const result = validateModifiers(input);

    const r331 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.1");
    expect(r331).toBeDefined();
    expect(r331!.trigger_matched).toBe(true);
    expect(r331!.action_type).toBe("force-review");
    expect(r331!.severity).toBe("High");
    expect(r331!.policy_anchor).toBe("CMS NCCI Modifier Policy Q1 2026");

    expect(result.force_review_items).toHaveLength(1);
    expect(result.force_review_items[0].rule_id).toBe("R-3.3.1");
    expect(result.force_review_items[0].resolved).toBe(false);
    expect(result.force_review_items[0].code_context).toContain("29877");

    expect(result.modifier_findings).toHaveLength(1);
    expect(result.modifier_findings[0].status).toBe("needs_review");
    expect(result.modifier_findings[0].payer_handling).toBe("medicare_strict");
  });

  // =========================================================================
  // Test 2: Commercial + -59 → R-3.3.3 warn (ACC02-044 pattern)
  // =========================================================================
  it("2. triggers R-3.3.3 warn for commercial + -59 (ACC02-044 pattern)", () => {
    const input = makeInput({
      payer_type: "commercial",
      cpt_codes_submitted: ["20610"],
      modifiers_present: { "20610": ["-59", "-LT"] },
      distinct_site_documented: true,
    });
    const result = validateModifiers(input);

    const r333 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.3");
    expect(r333).toBeDefined();
    expect(r333!.trigger_matched).toBe(true);
    expect(r333!.action_type).toBe("warn");

    const r331 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.1");
    expect(r331!.trigger_matched).toBe(false);

    expect(result.force_review_items).toHaveLength(0);
    expect(result.warnings.some((w) => w.rule_id === "R-3.3.3")).toBe(true);

    expect(result.modifier_findings[0].payer_handling).toBe("commercial_flexible");
  });

  // =========================================================================
  // Test 3: 59/X + no documentation → R-3.3.2 block
  // =========================================================================
  it("3. triggers R-3.3.2 block for X-modifier without documentation", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29822", "29825"],
      modifiers_present: { "29825": ["-XS"] },
      distinct_site_documented: false,
    });
    const result = validateModifiers(input);

    const r332 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.2");
    expect(r332).toBeDefined();
    expect(r332!.trigger_matched).toBe(true);
    expect(r332!.action_type).toBe("block");
    expect(r332!.severity).toBe("Critical");
    expect(r332!.missing_info_keys.length).toBeGreaterThan(0);

    expect(result.modifier_findings[0].status).toBe("unsupported");
    expect(result.modifier_findings[0].documentation_support).toBe("insufficient");
  });

  // =========================================================================
  // Test 4: Valid XS with sufficient evidence
  // =========================================================================
  it("4. reports valid finding for XS with matching documentation", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29881", "29877"],
      modifiers_present: { "29877": ["-XS", "-RT"] },
      distinct_site_documented: true,
    });
    const result = validateModifiers(input);

    // No rules should trigger for this code
    for (const re of result.rule_evaluations) {
      expect(re.trigger_matched).toBe(false);
    }

    expect(result.modifier_findings).toHaveLength(1);
    expect(result.modifier_findings[0].status).toBe("valid");
    expect(result.modifier_findings[0].documentation_support).toBe("sufficient");
    expect(result.modifier_findings[0].selected_x_modifier).toBe("XS");
  });

  // =========================================================================
  // Test 5: XP selection — distinct practitioner
  // =========================================================================
  it("5. selects XP when distinct_practitioner_documented is true", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29881", "20610"],
      modifiers_present: { "20610": ["-59", "-RT"] },
      distinct_practitioner_documented: true,
    });
    const result = validateModifiers(input);

    expect(result.modifier_findings[0].selected_x_modifier).toBe("XP");
    expect(result.force_review_items[0].message).toContain("XP");
  });

  // =========================================================================
  // Test 6: XE selection — distinct encounter
  // =========================================================================
  it("6. selects XE when distinct_encounter_documented is true", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["20610", "99214"],
      modifiers_present: { "99214": ["-59"] },
      distinct_encounter_documented: true,
    });
    const result = validateModifiers(input);

    expect(result.modifier_findings[0].selected_x_modifier).toBe("XE");
  });

  // =========================================================================
  // Test 7: XU fallback — non-overlapping service
  // =========================================================================
  it("7. selects XU when only non_overlapping_service_documented is true", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["20610", "99213"],
      modifiers_present: { "20610": ["-59"] },
      non_overlapping_service_documented: true,
    });
    const result = validateModifiers(input);

    expect(result.modifier_findings[0].selected_x_modifier).toBe("XU");
  });

  // =========================================================================
  // Test 8: No evidence → null selection + R-3.3.2
  // =========================================================================
  it("8. triggers R-3.3.1 + R-3.3.2 for Medicare -59 with no documentation", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29881", "29877"],
      modifiers_present: { "29877": ["-59"] },
      // all distinct_* default false
    });
    const result = validateModifiers(input);

    const r331 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.1");
    const r332 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.2");
    expect(r331!.trigger_matched).toBe(true);
    expect(r332!.trigger_matched).toBe(true);

    expect(result.modifier_findings[0].selected_x_modifier).toBeNull();
    expect(result.modifier_findings[0].status).toBe("unsupported");
    expect(result.force_review_items).toHaveLength(1);
  });

  // =========================================================================
  // Test 9: Priority order — XP beats XS
  // =========================================================================
  it("9. selects XP (highest priority) when multiple evidence fields are true", () => {
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29881", "20610"],
      modifiers_present: { "20610": ["-59"] },
      distinct_practitioner_documented: true,
      distinct_site_documented: true,
    });
    const result = validateModifiers(input);

    expect(result.modifier_findings[0].selected_x_modifier).toBe("XP");
  });

  // =========================================================================
  // Test 10: Unknown payer = commercial behavior
  // =========================================================================
  it("10. treats unknown payer as commercial (R-3.3.3 warn for -59)", () => {
    const input = makeInput({
      payer_type: "unknown",
      cpt_codes_submitted: ["29877"],
      modifiers_present: { "29877": ["-59"] },
      distinct_site_documented: true,
    });
    const result = validateModifiers(input);

    const r333 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.3");
    expect(r333!.trigger_matched).toBe(true);

    const r331 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.1");
    expect(r331!.trigger_matched).toBe(false);

    expect(result.modifier_findings[0].payer_handling).toBe("unknown_conservative");
  });

  // =========================================================================
  // Test 11: Code without 59/X modifier — no finding
  // =========================================================================
  it("11. produces no findings for codes without 59/X modifiers", () => {
    const input = makeInput({
      cpt_codes_submitted: ["29881", "27447"],
      modifiers_present: { "29881": ["-RT"], "27447": ["-LT"] },
    });
    const result = validateModifiers(input);

    expect(result.modifier_findings).toHaveLength(0);
    for (const re of result.rule_evaluations) {
      expect(re.trigger_matched).toBe(false);
    }
    expect(result.force_review_items).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  // =========================================================================
  // Test 12: ACC-02 structured_fields adapter
  // =========================================================================
  it("12. adapter defaults distinct_* fields to false from ACC-02 structured_fields", () => {
    const structuredFields = {
      laterality: "right",
      patient_type: "established",
      setting: "ASC",
      payer_type: "medicare",
      global_period_status: "none",
      global_period_surgery_date: null,
      global_period_surgery_cpt: null,
      units_of_service: { "29877": 1, "29881": 1 },
      modifiers_present: { "29877": ["-59", "-RT"] },
      cpt_codes_submitted: ["29881", "29877"],
      icd10_codes: ["M23.211", "M17.11"],
      physician_id: "PHY-001",
    };

    const input = fromStructuredFields(structuredFields);

    // Verify defaults
    expect(input.distinct_encounter_documented).toBe(false);
    expect(input.distinct_site_documented).toBe(false);
    expect(input.distinct_practitioner_documented).toBe(false);
    expect(input.non_overlapping_service_documented).toBe(false);
    expect(input.payer_type).toBe("medicare");

    // Should trigger R-3.3.1 + R-3.3.2 (Medicare -59 + no documentation)
    const result = validateModifiers(input);
    const r331 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.1");
    const r332 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.2");
    expect(r331!.trigger_matched).toBe(true);
    expect(r332!.trigger_matched).toBe(true);
  });

  // =========================================================================
  // Test 13: ACC-03 semantic validation (with force-review)
  // =========================================================================
  it("13. produces output that passes ACC-03 validateCodingOutput()", () => {
    // Trigger R-3.3.1 (force-review) — no block
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29881", "29877"],
      modifiers_present: { "29877": ["-59"] },
      distinct_site_documented: true,
    });
    const modResult = validateModifiers(input);
    const fullOutput = buildTestCodingOutput(modResult, { payer_type: "medicare" });

    // Verify force-review semantics are correct
    // ACC-01 §3.0: force-review leaves clean_claim_ready unchanged (true)
    expect(fullOutput.force_review_pending).toBe(true);
    expect(fullOutput.clean_claim_ready).toBe(true);
    expect(fullOutput.confidence).toBe("medium");

    const validation = validateCodingOutput(fullOutput);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  // =========================================================================
  // Test 14: Multiple codes — mixed findings
  // =========================================================================
  it("14. produces separate findings for mixed codes on Medicare", () => {
    // Code A: -XS with documentation (valid)
    // Code B: -59 on Medicare (needs review)
    const input = makeInput({
      payer_type: "medicare",
      cpt_codes_submitted: ["29881", "29877", "20610"],
      modifiers_present: {
        "29877": ["-XS", "-RT"],
        "20610": ["-59", "-RT"],
      },
      distinct_site_documented: true,
    });
    const result = validateModifiers(input);

    expect(result.modifier_findings).toHaveLength(2);

    const finding29877 = result.modifier_findings.find((f) => f.cpt_code === "29877");
    const finding20610 = result.modifier_findings.find((f) => f.cpt_code === "20610");

    expect(finding29877!.status).toBe("valid");
    expect(finding29877!.has_x_modifier).toBe(true);

    expect(finding20610!.status).toBe("needs_review");
    expect(finding20610!.has_59).toBe(true);

    // R-3.3.1 triggered for 20610 only
    const r331 = result.rule_evaluations.find((re) => re.rule_id === "R-3.3.1");
    expect(r331!.trigger_matched).toBe(true);
    expect(result.force_review_items).toHaveLength(1);
    expect(result.force_review_items[0].code_context).toContain("20610");
  });
});
