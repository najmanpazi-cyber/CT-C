# ACC-04: NCCI PTP Conflict Validator

**Status:** Final v1
**Owner:** Execution Board
**Scope:** Orthopedics v1 Beta — deterministic PTP bundling conflict detection
**Depends on:** ACC-01 (rules R-3.1.1–R-3.1.4), ACC-02 (scenarios ACC02-001–ACC02-020), ACC-03 (schema contract)
**Created:** 2026-02-28

---

## 1. Overview

ACC-04 implements a stateless, deterministic PTP (Procedure-to-Procedure) conflict validator. It takes structured claim fields and returns:

- **Rule evaluations** for all 4 PTP rules (triggered or not)
- **Suppressed codes** for block-action rules
- **Warnings** for warn-action rules

No AI/LLM reasoning — pure data-driven rule matching against a known pair table.

---

## 2. Rule Coverage Matrix

| Rule | Description | Action | Severity | Pairs |
|------|-------------|--------|----------|-------|
| R-3.1.1 | Arthroscopy + open/major, same joint | block | Critical | 6 |
| R-3.1.2 | Injection + arthroscopy, same joint | block | High | 4 |
| R-3.1.3 | Cast/splint + fracture care | warn | Medium | 4 |
| R-3.1.4 | Diagnostic + surgical arthroscopy, same joint | block | Critical | 5 |

**Total conflict pairs:** 19

---

## 3. Input / Output Interfaces

### Input: `PtpValidatorInput`

```typescript
interface PtpValidatorInput {
  laterality: string;                          // "right" | "left" | "bilateral" | "not_specified"
  cpt_codes_submitted: string[];               // CPT codes on the claim
  modifiers_present: Record<string, string[]>; // Per-code modifiers (e.g., {"29881": ["-RT"]})
  payer_type: "commercial" | "medicare" | "unknown";
}
```

### Output: `PtpValidationResult`

```typescript
interface PtpValidationResult {
  rule_evaluations: RuleEvaluation[];      // Exactly 4 (one per PTP rule)
  suppressed_codes: SuppressedCode[];      // Column-2 codes suppressed by block rules
  warnings: DeterministicWarning[];        // Advisory messages from warn rules
}
```

---

## 4. Same-Joint Logic

PTP conflicts only fire when codes are on the **same joint**. Determination uses per-code laterality:

1. Check `modifiers_present[code]` for `-RT`, `-LT`, or `-50`
2. Fall back to top-level `input.laterality`

**`isSameJoint(lat1, lat2)` truth table:**

| lat1 \ lat2 | right | left | bilateral | not_specified |
|-------------|-------|------|-----------|---------------|
| **right** | T | F | T | T |
| **left** | F | T | T | T |
| **bilateral** | T | T | T | T |
| **not_specified** | T | T | T | T |

**Exception:** R-3.1.3 (cast/fracture) fires on code co-presence regardless of laterality.

---

## 5. Suppression Logic

| Rule action | Behavior |
|-------------|----------|
| `block` | Column-2 code added to `suppressed_codes[]`, `suppressed_code` set on evaluation |
| `warn` | No suppression; advisory added to `warnings[]` |

Column-1 = surviving code (higher RVU / more comprehensive). Column-2 = bundled code (suppressed).

---

## 6. Data Format

Pair data: `src/data/ptp/rules.orthopedics.v1.json`

```json
{
  "column1_code": "27447",
  "column2_code": "29881",
  "rule_id": "R-3.1.1",
  "category": "arthroscopy_open_bundling",
  "joint_category": "knee",
  "description": "Knee arthroscopic meniscectomy bundled into TKA"
}
```

Joint categories: `knee`, `shoulder`, `hip`, `ankle`, `wrist_forearm`, `lower_leg`

---

## 7. Traceability

All triggered evaluations include:
- `policy_anchor`: "NCCI PTP Edits Q1 2026"
- `evidence_fields`: array of `"code1+code2 (joint_category)"` strings
- `suppressed_code`: the column-2 code (block rules only)

---

## 8. Extensibility Guide

**Adding new PTP pairs:**
1. Add entries to `src/data/ptp/rules.orthopedics.v1.json`
2. No code changes needed — the validator reads pairs dynamically

**Adding new PTP rules (e.g., R-3.1.5):**
1. Add the rule to `RULE_DOMAIN_MAP` and `RULE_ACTION_MAP` in `validateRuleEvaluation.ts`
2. Add to `PTP_RULE_IDS`, `SEVERITY_MAP`, `RULE_DESCRIPTIONS` in `ptpValidator.ts`
3. Add pair data with the new `rule_id`

**Adding new joint categories:**
1. Add pairs with the new `joint_category` value — no code changes needed

---

## 9. Test Summary

13 test cases in `src/test/validators/ptpValidator.test.ts`:

| # | Test | Key Assertion |
|---|------|---------------|
| 1 | No conflict — different laterality (ACC02-005) | All 4 rules `trigger_matched: false` |
| 2 | No conflict — different joint categories (ACC02-009) | No PTP conflict |
| 3 | R-3.1.1 block — scope+open same joint (ACC02-001) | `trigger_matched: true`, suppressed 29881 |
| 4 | R-3.1.2 block — injection+scope same joint (ACC02-006) | Suppressed 20610 |
| 5 | R-3.1.3 warn — cast+fracture (ACC02-011) | `action_type: "warn"`, no suppression, 1 warning |
| 6 | R-3.1.4 block — diagnostic+surgical scope (ACC02-015) | Suppressed 29870 |
| 7 | Multiple simultaneous conflicts | 2+ rules triggered |
| 8 | Suppressed code cross-reference | `suppressed_by_rule` matches triggered rule |
| 9 | ACC-03 semantic validation | `validateCodingOutput()` returns `valid: true` |
| 10 | Laterality not_specified = same-joint | Conflict fires |
| 11 | R-3.1.3 ignores laterality | Warn fires regardless |
| 12 | getCodeLaterality unit tests | Per-code modifier overrides top-level |
| 13 | isSameJoint unit tests | Matrix: R+R=T, R+L=F, bilateral+any=T, not_specified+any=T |

---

## 10. Limitations

- **Orthopedics only:** 19 pairs covering common ortho PTP conflicts. Not exhaustive NCCI.
- **No modifier bypass logic:** Does not handle -59/X-modifier override (that's MODIFIER domain, R-3.3.x).
- **No MUE integration:** Unit limits are separate (ACC-05 scope).
- **No payer-specific pair differences:** Same pairs for commercial/Medicare (payer divergence handled at modifier level).
- **Stateless:** No claim history or prior authorization context.

---

## 11. File Inventory

| File | Purpose |
|------|---------|
| `src/data/ptp/rules.orthopedics.v1.json` | 19 PTP conflict pairs |
| `src/validators/ptpValidator.ts` | Core validator logic |
| `src/utils/applyPtpValidation.ts` | Integration wrapper + test utility |
| `src/test/validators/ptpValidator.test.ts` | 13 test cases |
| `docs/ACC-04-PTP-VALIDATOR.md` | This document |
