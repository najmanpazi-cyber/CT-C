# ACC-07: Global Period Validator

**Status:** Final v1
**Owner:** Execution Board
**Scope:** Orthopedics v1 Beta — deterministic global period guardrails
**Depends on:** ACC-01 (rules R-3.4.1–R-3.4.4), ACC-02 (scenarios ACC02-049–ACC02-064, cross-domain), ACC-03 (schema contract, ForceReviewItem type)
**Created:** 2026-02-28

---

## 1. Overview

ACC-07 implements a stateless, deterministic validator for global surgical period rules. It is the **second validator to produce `force_review_items`** (after ACC-06).

What it does:
- Blocks E/M during active 90-day global without modifier -24/-25/-79 (R-3.4.1)
- Force-reviews same-day E/M + procedure without modifier -25 (R-3.4.2)
- Force-reviews decision-for-surgery E/M without modifier -57 (R-3.4.3)
- Blocks procedures during active global period without modifier -58/-78/-79 (R-3.4.4)
- Computes days since surgery for evidence traceability
- Identifies E/M codes via numeric range detection

What it does NOT do:
- Track actual global period calendars across claims (single-encounter evaluation)
- Validate modifier medical necessity (e.g., whether -78 return-to-OR is clinically justified)
- Perform free-text NLP on operative notes
- Coordinate with PTP/modifier validators (ACC-12 orchestrator responsibility)

---

## 2. Rule Coverage Matrix

| Rule | Description | Action | Severity | Trigger |
|------|-------------|--------|----------|---------|
| R-3.4.1 | E/M during active 90-day global without modifier | block | Critical | active_90 + E/M + no -24/-25/-79 + related surgery |
| R-3.4.2 | Same-day E/M + procedure without -25 | force-review | High | E/M + procedure codes + no -25 on E/M |
| R-3.4.3 | Decision-for-surgery E/M without -57 | force-review | High | E/M + major surgery + no -57 on E/M |
| R-3.4.4 | Procedure during active global without modifier | block | High | active_10/active_90 + procedure + no -58/-78/-79 |

---

## 3. Trigger Condition Matrix

| Status | Code Type | Modifier | Rule(s) | Action |
|--------|-----------|----------|---------|--------|
| active_90 | E/M | No -24/-25/-79 | R-3.4.1 | block |
| active_90 | E/M | -24 or -25 or -79 | — | Valid |
| any | E/M + procedure | No -25 on E/M | R-3.4.2 | force-review |
| any | E/M + procedure | -25 on E/M | — | Valid |
| any | E/M + major surgery | No -57 on E/M | R-3.4.3 | force-review |
| any | E/M + major surgery | -57 on E/M | — | Valid |
| active_10/90 | Procedure | No -58/-78/-79 | R-3.4.4 | block |
| active_10/90 | Procedure | -58 or -78 or -79 | — | Valid |
| none | Any | Any | — | No global rules fire |

---

## 4. Input / Output Interfaces

### Input: `GlobalValidatorInput`

```typescript
interface GlobalValidatorInput {
  laterality: string;
  payer_type: "commercial" | "medicare" | "unknown";
  cpt_codes_submitted: string[];
  modifiers_present: Record<string, string[]>;
  patient_type: string;
  setting: string;
  physician_id: string;
  global_period_status: GlobalStatus; // "none" | "active_0" | "active_10" | "active_90"
  global_period_surgery_date: string | null;
  global_period_surgery_cpt: string | null;
  encounter_date: string;
  prior_surgery_related: boolean;
  decision_for_surgery_documented: boolean;
  em_separately_identifiable: boolean;
}
```

The `fromStructuredFields()` adapter maps ACC-02 format (`active_90day` → `active_90`) and defaults:
- `prior_surgery_related` → `true` (conservative)
- `decision_for_surgery_documented` → `false` (conservative)
- `em_separately_identifiable` → `false` (conservative)

### Output: `GlobalValidationResult`

```typescript
interface GlobalValidationResult {
  rule_evaluations: RuleEvaluation[];     // Exactly 4 (R-3.4.1–R-3.4.4)
  suppressed_codes: SuppressedCode[];     // Always empty (global rules don't suppress)
  warnings: DeterministicWarning[];       // Date inconsistency, unknown CPT warnings
  force_review_items: ForceReviewItem[];  // R-3.4.2 + R-3.4.3 force-review items
  global_findings: GlobalFinding[];       // One per code evaluated in global context
}
```

### GlobalFinding

```typescript
interface GlobalFinding {
  cpt_code: string;
  is_em_code: boolean;
  procedure_global_days: 0 | 10 | 90 | null;
  active_global_status: GlobalStatus;
  days_since_surgery: number | null;
  required_modifier: "24" | "25" | "57" | "58" | "78" | "79" | null;
  submitted_modifiers: string[];
  modifier_status: "present" | "missing" | "not_applicable";
  relationship_assessment: "related" | "unrelated" | "unknown";
  payer_handling: "medicare_strict" | "commercial_standard" | "unknown_conservative";
  status: "valid" | "needs_review" | "blocked" | "not_applicable";
}
```

---

## 5. E/M Code Identification

E/M codes are identified by numeric range (not data lookup):

| Range | Description |
|-------|-------------|
| 99202–99215 | Office/outpatient visits (new + established) |
| 99221–99236 | Hospital inpatient visits |
| 99281–99285 | Emergency department visits |
| 99241–99255 | Consultation codes |

---

## 6. Major Surgery Detection

A code is classified as major surgery when:
- Its `category` in `global.orthopedics.v1.json` is `"major_surgery"`, OR
- Its `global_days` is `90`

Minor procedures (0-day global, endoscopy) do NOT trigger R-3.4.3.

---

## 7. Global Period Status Mapping

ACC-02 scenarios use a different naming convention. The adapter maps:

| ACC-02 Value | Internal Value |
|-------------|----------------|
| `active_90day` | `active_90` |
| `active_10day` | `active_10` |
| `active_0day` | `active_0` |
| `none` | `none` |

---

## 8. Rule Interaction Notes

- **R-3.4.1 + R-3.4.2:** Can co-trigger when E/M + procedure in 90-day global. R-3.4.1's finding (blocked) takes precedence; R-3.4.2 adds force-review item but no duplicate finding.
- **R-3.4.2 + R-3.4.3:** Can co-trigger when E/M + major surgery without -25 and -57. R-3.4.2's finding is created first; R-3.4.3 adds force-review item but no duplicate finding.
- **ACC-06 independence:** Global period modifiers (-24/-25/-57/-58/-78/-79) are distinct from modifier 59/X. No interaction between ACC-06 and ACC-07.
- **Suppression:** Global rules never suppress codes. They block or force-review based on missing modifiers.

---

## 9. Data Format

### Global CPT Reference: `src/data/global/global.orthopedics.v1.json`

48 entries mapping CPT codes to global days and categories:
```json
{ "cpt_code": "27447", "global_days": 90, "description": "Total knee arthroplasty", "category": "major_surgery" }
```

Categories: `major_surgery`, `minor_surgery`, `endoscopy`, `em_only`

### Rule Configurations: `src/data/global/global.rules.orthopedics.v1.json`

4 rule configurations with trigger conditions and sufficient modifiers:
```json
{
  "rule_id": "R-3.4.1",
  "action": "block",
  "trigger_global_status": ["active_90"],
  "trigger_code_type": "em",
  "sufficient_modifiers": ["24", "25", "79"],
  "missing_info_keys": ["modifier_24_or_25_on_em"]
}
```

---

## 10. Test Coverage Summary

20 test cases in `src/test/validators/globalValidator.test.ts`:

| # | Test | Key Assertion |
|---|------|---------------|
| 1 | E/M in 90-day global without modifier (ACC02-049) | R-3.4.1 trigger, status=blocked, days_since_surgery=28 |
| 2 | E/M in 90-day global WITH -24 | No trigger, status=valid, modifier_status=present |
| 3 | prior_surgery_related=false | No trigger, modifier_status=not_applicable |
| 4 | Same-day E/M + procedure, no -25 (ACC02-053) | R-3.4.2 trigger, force_review_items[0], status=needs_review |
| 5 | E/M + procedure WITH -25 | No trigger, no findings |
| 6 | em_separately_identifiable=true | No trigger |
| 7 | E/M + major surgery, no -57 (ACC02-057) | R-3.4.3 trigger, isolated from R-3.4.2 |
| 8 | E/M + major surgery WITH -57 | No trigger |
| 9 | decision_for_surgery_documented=true | No trigger |
| 10 | E/M + minor procedure (0-day) | R-3.4.3 does NOT fire |
| 11 | Procedure in 90-day global (ACC02-061) | R-3.4.4 trigger, status=blocked, days=42 |
| 12 | Procedure in 10-day global | R-3.4.4 trigger, active_10 |
| 13 | Procedure WITH -78 | No trigger, status=valid |
| 14 | Same CPT as original surgery (ACC02-064) | R-3.4.4 fires correctly |
| 15 | E/M + procedure in 90-day global | R-3.4.1 + R-3.4.2 + R-3.4.4 combined |
| 16 | E/M + major surgery outside global | R-3.4.2 + R-3.4.3 combined |
| 17 | E/M only, no global | All 4 rules not triggered |
| 18 | isEmCode + daysSinceSurgery helpers | Unit tests for helper functions |
| 19 | fromStructuredFields adapter | active_90day→active_90, conservative defaults |
| 20 | ACC-03 validateCodingOutput | Block + force-review both valid=true |

---

## 11. Known Limitations

1. **Single-encounter evaluation:** Does not track global period calendars across multiple claims/encounters.
2. **No modifier medical necessity validation:** Accepts -78 at face value without verifying return-to-OR clinical context.
3. **Documentation evidence from upstream:** The `prior_surgery_related`, `decision_for_surgery_documented`, and `em_separately_identifiable` fields must be populated by upstream processing.
4. **No free-text NLP:** Does not parse operative notes or clinical documentation.
5. **E/M identification by range only:** Does not cover all E/M code families (e.g., prolonged services, telehealth-specific codes).

---

## 12. Dependencies

- **ACC-12 (Orchestrator):** Will coordinate global period validation with PTP and modifier results. A procedure blocked by R-3.4.4 that also has a PTP conflict may have overlapping resolution paths.
- **ACC-06 (Modifier 59/X):** Independent — different modifier families. No coordination needed.

---

## 13. File Inventory

| File | Purpose |
|------|---------|
| `src/data/global/global.orthopedics.v1.json` | 48 CPT global period entries |
| `src/data/global/global.rules.orthopedics.v1.json` | 4 rule configurations |
| `src/validators/globalValidator.ts` | Core validator logic |
| `src/utils/applyGlobalValidation.ts` | Integration wrapper + test utility (force-review aware) |
| `src/test/validators/globalValidator.test.ts` | 20 test cases |
| `docs/ACC-07-GLOBAL-VALIDATOR.md` | This document |
