# ACC-05: MUE Unit Limit Validator

**Status:** Final v1
**Owner:** Execution Board
**Scope:** Orthopedics v1 Beta — deterministic MUE unit limit validation
**Depends on:** ACC-01 (rules R-3.2.1, R-3.2.2), ACC-02 (scenarios ACC02-021–ACC02-032, cross-domain), ACC-03 (schema contract)
**Created:** 2026-02-28

---

## 1. Overview

ACC-05 implements a stateless, deterministic MUE (Medically Unlikely Edits) validator. For each CPT code on a claim, it compares submitted units against CMS MUE thresholds and produces:

- **Rule evaluations** for R-3.2.1 (block) and R-3.2.2 (warn)
- **MUE findings** — one per code evaluated, with status, limit, MAI, and payer handling
- **Warnings** for at-threshold and unknown-limit codes

What it does NOT do:
- Compute `clean_claim_ready`, `confidence`, or `force_review_pending` (orchestrator responsibility)
- Adjust MUE thresholds based on modifiers (-50, -76, -77, etc.)
- Perform cross-line MAI-aware aggregation

---

## 2. Rule Coverage Matrix

| Rule | Description | Action | Severity | Trigger |
|------|-------------|--------|----------|---------|
| R-3.2.1 | Units exceed MUE limit | block | Critical | Any code's `submitted_units > mue_value` |
| R-3.2.2 | Units at MUE threshold | warn | Low | Any code's `submitted_units == mue_value` (and not exceeding) |

---

## 3. Input / Output Interfaces

### Input: `MueValidatorInput`

```typescript
interface MueValidatorInput {
  cpt_codes_submitted: string[];
  units_of_service: Record<string, number>;  // key = CPT code, value = units billed
  modifiers_present: Record<string, string[]>;
  payer_type: "commercial" | "medicare" | "unknown";
  laterality: string;
}
```

An `fromStructuredFields()` adapter converts full ACC-02 `structured_fields` objects to this interface.

### Output: `MueValidationResult`

```typescript
interface MueValidationResult {
  rule_evaluations: RuleEvaluation[];     // Exactly 2 (R-3.2.1, R-3.2.2)
  suppressed_codes: SuppressedCode[];     // Always empty (MUE doesn't suppress)
  warnings: DeterministicWarning[];       // At-threshold + unknown-limit warnings
  mue_findings: MueFinding[];             // One per code evaluated
}
```

### MueFinding

```typescript
interface MueFinding {
  cpt_code: string;
  submitted_units: number;
  mue_limit: number | null;
  mai: "1" | "2" | "3" | "unknown";
  status: "within_limit" | "at_limit" | "exceeds_limit" | "unknown_limit";
  payer_handling: "medicare_hard" | "commercial_conservative" | "unknown_conservative";
}
```

---

## 4. Per-Code Evaluation Logic

Each code in `units_of_service` is evaluated **independently**:

1. Look up CPT code in `mue.orthopedics.q1-2026.json`
2. If found: compare `submitted_units` to `mue_value`
   - `submitted_units > mue_value` → `exceeds_limit`
   - `submitted_units == mue_value` → `at_limit`
   - `submitted_units < mue_value` → `within_limit`
3. If not found or `mue_value` is null → `unknown_limit` (no block, info warning)

One `MueFinding` is produced per code regardless of status.

---

## 5. Payer Handling

| Payer | `payer_handling` | Behavior |
|-------|-----------------|----------|
| Medicare | `medicare_hard` | MUE is a hard adjudication constraint. Auto-denied. |
| Commercial | `commercial_conservative` | Conservative default. Override possible with documentation. |
| Unknown | `unknown_conservative` | Same as commercial (safe default). |

Payer handling is recorded in findings and influences `payer_note` on R-3.2.1 evaluations. It does NOT change whether rules trigger — R-3.2.1 fires for all payer types when units exceed MUE.

---

## 6. MAI (MUE Adjudication Indicator)

| MAI | Meaning |
|-----|---------|
| 1 | Date of service edit — claim line level |
| 2 | Same day across all claim lines for same provider |
| 3 | Date of service edit — clinical judgment may override |

For v1, MAI is **informational only** — recorded in findings and evidence fields but does not change trigger behavior. MAI-aware adjudication logic is a future enhancement.

---

## 7. MUE Data Format

File: `src/data/mue/mue.orthopedics.q1-2026.json`

```json
{
  "cpt_code": "27447",
  "mue_value": 1,
  "mai": "3",
  "adjudication_note": "TKA — 1 per encounter. Bilateral requires separate lines with -LT/-RT or -50.",
  "effective_date": "2026-01-01",
  "edition": "Q1 2026"
}
```

47 CPT codes covering all codes appearing in ACC-02 `units_of_service` fields.

### Quarterly MUE Data Refresh

To update for a new quarter:
1. Create `mue.orthopedics.q2-2026.json` (or appropriate quarter)
2. Update the import in `mueValidator.ts` to reference the new file
3. Update `POLICY_ANCHOR` constant
4. Run tests to verify no regressions

ACC-16 (MUE Refresh Pipeline) will automate this process with:
- CMS MUE file parsing
- Delta detection (changed limits, new codes, removed codes)
- Automated test generation for changed limits
- Version metadata updates

---

## 8. Test Coverage Summary

11 test cases in `src/test/validators/mueValidator.test.ts`:

| # | Test | Key Assertion |
|---|------|---------------|
| 1 | Below MUE — no trigger | Both rules `trigger_matched: false`, `within_limit` |
| 2 | At MUE — R-3.2.2 warn (ACC02-031) | R-3.2.2 triggered, `at_limit`, 1 warning |
| 3 | Exceed MUE — R-3.2.1 block (ACC02-021) | R-3.2.1 triggered, `exceeds_limit` |
| 4 | Medicare exceed (ACC02-022) | `medicare_hard`, payer_note references auto-adjudication |
| 5 | Commercial exceed (ACC02-021) | `commercial_conservative`, payer_note references conservative |
| 6 | Unknown payer exceed | `unknown_conservative` |
| 7 | Unknown MUE — code not in data | No trigger, `unknown_limit`, info warning |
| 8 | Multiple codes — mixed results | R-3.2.1 + R-3.2.2 both triggered |
| 9 | ACC-02 structured_fields adapter | Full ACC02-021 object via `fromStructuredFields()` |
| 10 | ACC-03 semantic validation | `validateCodingOutput()` returns `valid: true` |
| 11 | Per-code independent evaluation | 27447 at_limit + 29881 exceeds = 2 findings |

---

## 9. Known Limitations

1. **Modifier-based MUE adjustment not implemented:** Modifiers (-50 bilateral, -76 repeat, -77 repeat by different physician, -59/X distinct service) can legitimately increase allowable units. V1 compares raw units directly. Bilateral procedures billed as 2 units on a single line will trigger R-3.2.1 (correct behavior — proper billing uses separate lines).

2. **MAI-aware adjudication not implemented:** MAI=2 requires cross-line aggregation (total units for same code across all claim lines for same provider on same date). V1 evaluates per-line only.

3. **No claim-level (cross-line) MUE aggregation:** Each code is evaluated independently against its line-level units. Multi-line claims with the same code on different lines are not aggregated.

4. **Static data file:** MUE values are embedded in a JSON file. Quarterly refreshes require manual file updates until ACC-16 automates the pipeline.

---

## 10. Dependencies

- **ACC-06 (Modifier Validator):** Will need MUE findings to detect modifier-based unit adjustments
- **ACC-12 (Orchestrator):** Consumes `MueValidationResult` and derives `clean_claim_ready`/`confidence`
- **ACC-16 (MUE Refresh Pipeline):** Will automate quarterly data updates to `mue.orthopedics.*.json`

---

## 11. File Inventory

| File | Purpose |
|------|---------|
| `src/data/mue/mue.orthopedics.q1-2026.json` | 47 MUE reference entries |
| `src/validators/mueValidator.ts` | Core validator logic |
| `src/utils/applyMueValidation.ts` | Integration wrapper + test utility |
| `src/test/validators/mueValidator.test.ts` | 11 test cases |
| `docs/ACC-05-MUE-VALIDATOR.md` | This document |
