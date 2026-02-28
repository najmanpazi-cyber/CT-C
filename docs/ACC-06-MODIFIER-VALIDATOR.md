# ACC-06: Modifier 59/X Validator

**Status:** Final v1
**Owner:** Execution Board
**Scope:** Orthopedics v1 Beta — deterministic modifier 59/X guardrails
**Depends on:** ACC-01 (rules R-3.3.1–R-3.3.3), ACC-02 (scenarios ACC02-033–ACC02-048, cross-domain), ACC-03 (schema contract, ForceReviewItem type)
**Created:** 2026-02-28

---

## 1. Overview

ACC-06 implements a stateless, deterministic modifier validator focused on 59/X behavior. It is the **first validator in the system to produce `force_review_items`**.

What it does:
- Detects Medicare -59 usage and recommends specific X-modifier conversion (R-3.3.1)
- Blocks 59/X modifiers without sufficient documentation evidence (R-3.3.2)
- Warns on commercial -59 and recommends X-modifier specificity (R-3.3.3)
- Validates X-modifier documentation match for codes with XE/XS/XP/XU

What it does NOT do:
- Re-check PTP conflicts (ACC-04 responsibility)
- Coordinate PTP override via -59/X (ACC-12 orchestrator responsibility)
- Validate modifier stacking (e.g., -59 + -LT on same code)
- Perform free-text NLP on clinical notes

---

## 2. Rule Coverage Matrix

| Rule | Description | Action | Severity | Trigger |
|------|-------------|--------|----------|---------|
| R-3.3.1 | Medicare -59 → X-modifier conversion | force-review | High | Medicare + -59 on any code |
| R-3.3.2 | 59/X without documentation support | block | Critical | Any payer + 59/X modifier + insufficient evidence |
| R-3.3.3 | Commercial -59 acceptable | warn | Low | Commercial/unknown + -59 on any code |

---

## 3. Trigger Condition Matrix

| Payer | Modifier | Documentation | Rule(s) | Action | Behavior |
|-------|----------|---------------|---------|--------|----------|
| Medicare | -59 | Any evidence true | R-3.3.1 | force-review | Convert to X-modifier |
| Medicare | -59 | No evidence | R-3.3.1 + R-3.3.2 | force-review + block | Needs X-modifier AND documentation |
| Medicare | XE/XS/XP/XU | Matching evidence | — | — | Valid. No rules trigger. |
| Medicare | XE/XS/XP/XU | No matching evidence | R-3.3.2 | block | Modifier unsupported |
| Commercial | -59 | Any evidence | R-3.3.3 | warn | Accepted, recommend X-modifier |
| Commercial | -59 | No evidence | R-3.3.3 + R-3.3.2 | warn + block | Warn + block for no docs |
| Commercial | XE/XS/XP/XU | Matching evidence | — | — | Valid |
| Commercial | XE/XS/XP/XU | No matching evidence | R-3.3.2 | block | Modifier unsupported |
| Unknown | Any 59/X | Any | Same as commercial | — | Conservative default |

---

## 4. Input / Output Interfaces

### Input: `ModifierValidatorInput`

```typescript
interface ModifierValidatorInput {
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
```

The `fromStructuredFields()` adapter defaults all `distinct_*` fields to `false` when absent — conservative safe default.

### Output: `ModifierValidationResult`

```typescript
interface ModifierValidationResult {
  rule_evaluations: RuleEvaluation[];     // Exactly 3 (R-3.3.1, R-3.3.2, R-3.3.3)
  suppressed_codes: SuppressedCode[];     // Always empty
  warnings: DeterministicWarning[];       // R-3.3.3 warnings
  force_review_items: ForceReviewItem[];  // R-3.3.1 force-review items
  modifier_findings: ModifierFinding[];   // One per code with 59/X modifier
}
```

### ModifierFinding

```typescript
interface ModifierFinding {
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
```

---

## 5. X-Modifier Selection Logic

When R-3.3.1 triggers (Medicare + -59), the validator recommends a specific X-modifier based on documentation evidence fields, using priority order:

| Priority | Modifier | Evidence Field | Meaning |
|----------|----------|---------------|---------|
| 1 (highest) | XP | `distinct_practitioner_documented` | Different practitioner |
| 2 | XE | `distinct_encounter_documented` | Separate encounter |
| 3 | XS | `distinct_site_documented` | Distinct anatomic site |
| 4 (lowest) | XU | `non_overlapping_service_documented` | Non-overlapping service |

- Select the highest priority modifier whose evidence field is `true`
- If multiple evidence fields are true, the highest priority wins
- If no evidence fields are true: `selected_x_modifier = null`, R-3.3.2 also triggers

For X-modifiers already present: validate that the matching evidence field is `true`. Mismatch triggers R-3.3.2.

---

## 6. Documentation Evidence Assessment

Evidence is assessed via structured boolean fields, NOT free-text NLP:

| Value | Condition |
|-------|-----------|
| `sufficient` | At least one `distinct_*` field is true AND matches modifier |
| `insufficient` | No `distinct_*` field is true, OR evidence doesn't match modifier |
| `unknown` | No 59/X modifier present on the code |

When `fromStructuredFields()` is used without explicit evidence fields, all default to `false` → conservative "insufficient" assessment.

---

## 7. Payer Handling

| Payer | `payer_handling` | Behavior |
|-------|-----------------|----------|
| Medicare | `medicare_strict` | CMS requires X-modifier specificity. -59 triggers force-review. |
| Commercial | `commercial_flexible` | -59 accepted. X-modifier recommended for audit protection. |
| Unknown | `unknown_conservative` | Same as commercial (safe default). |

---

## 8. PTP Interaction Note

This validator operates independently from ACC-04 PTP detection:
- ACC-04 detects PTP conflicts and suppresses column-2 codes
- ACC-06 validates modifier usage on codes that have 59/X modifiers
- The orchestrator (ACC-12) will coordinate: if a code has -59/X AND is in a PTP pair, the modifier may override PTP suppression

This coordination is NOT implemented in ACC-06 — it belongs in ACC-12.

---

## 9. Modifier Rule Data Format

File: `src/data/modifiers/modifier59x.rules.orthopedics.v1.json`

```json
{
  "rule_id": "R-3.3.1",
  "trigger_payer": ["medicare"],
  "trigger_modifier": ["59"],
  "action": "force-review",
  "description": "Medicare -59 requires conversion to specific X-modifier",
  "payer_note": "CMS requires X-modifier specificity...",
  "x_modifier_mapping": {
    "XP": { "evidence_field": "distinct_practitioner_documented", "priority": 1 },
    ...
  }
}
```

---

## 10. Test Coverage Summary

14 test cases in `src/test/validators/modifierValidator.test.ts`:

| # | Test | Key Assertion |
|---|------|---------------|
| 1 | Medicare + -59 → R-3.3.1 force-review | force_review_items[0].resolved=false, status=needs_review |
| 2 | Commercial + -59 → R-3.3.3 warn | Warning emitted, no force_review_items |
| 3 | X-modifier + no documentation → R-3.3.2 block | missing_info_keys populated, status=unsupported |
| 4 | Valid XS with sufficient evidence | No rules trigger, status=valid |
| 5 | XP selection — distinct practitioner | selected_x_modifier=XP |
| 6 | XE selection — distinct encounter | selected_x_modifier=XE |
| 7 | XU fallback — non-overlapping | selected_x_modifier=XU |
| 8 | No evidence → null + R-3.3.1 + R-3.3.2 | Both trigger, selected_x_modifier=null |
| 9 | Priority order — XP beats XS | XP selected when both true |
| 10 | Unknown payer = commercial | R-3.3.3 triggered, unknown_conservative |
| 11 | No 59/X modifier — no finding | No findings, no triggers |
| 12 | ACC-02 adapter defaults | distinct_* all false from structured_fields |
| 13 | ACC-03 semantic validation | validateCodingOutput valid with force_review_pending |
| 14 | Multiple codes — mixed findings | Separate findings, R-3.3.1 on -59 code only |

---

## 11. Known Limitations

1. **No PTP-modifier coordination:** ACC-06 doesn't know about PTP conflicts. -59/X on a PTP pair doesn't override suppression here — ACC-12 orchestrator will handle that.
2. **Documentation evidence from upstream:** The `distinct_*` fields must be populated by upstream processing (clinical note parser, user input, structured encounter data). No free-text NLP in v1.
3. **No modifier stacking validation:** E.g., -59 + -LT on the same code is not flagged as potentially redundant.
4. **X-modifier selection is evidence-based only:** Does not validate clinical appropriateness of the selected X-modifier.
5. **No modifier frequency analysis:** Doesn't track modifier usage patterns across claims for audit risk assessment.

---

## 12. Dependencies

- **ACC-07 (Global Period Validator):** Next validator in the pipeline. Will handle -24/-25/-57/-58/-78/-79 modifiers in global period context.
- **ACC-12 (Orchestrator):** Will coordinate PTP + modifier interaction. If a PTP-conflicting code has -59/X with sufficient documentation, the orchestrator may un-suppress the code.

---

## 13. File Inventory

| File | Purpose |
|------|---------|
| `src/data/modifiers/modifier59x.rules.orthopedics.v1.json` | 3 modifier rule configurations |
| `src/validators/modifierValidator.ts` | Core validator logic |
| `src/utils/applyModifierValidation.ts` | Integration wrapper + test utility (force-review aware) |
| `src/test/validators/modifierValidator.test.ts` | 14 test cases |
| `docs/ACC-06-MODIFIER-VALIDATOR.md` | This document |
