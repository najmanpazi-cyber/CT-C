# ACC-09 — Adversarial Red-Team Pass #1

## Run Metadata

| Field | Value |
|-------|-------|
| run_timestamp | 2026-03-08T00:13:42.152Z |
| git_commit_sha | 7c20abb148fea0e0a6ba551fd7901dfd3d361373 |
| scenario_pack_path | specs/ACC-02-scenarios.jsonl |
| scenario_count_loaded | 109 |
| harness_file_path | scripts/redteam-acc09.ts |
| validator_files_used | src/validators/ptpValidator.ts, src/validators/mueValidator.ts, src/validators/modifierValidator.ts, src/validators/globalValidator.ts, src/validators/documentationValidator.ts |
| rule_engine_version | orthopedics-v1-beta |
| test_pack_version | ACC-02 v1 |
| environment | bun 1.3.10, win32 |

## Executive Summary

| Classification | Count |
|---------------|-------|
| PASS | 109 |
| FALSE PASS | 0 |
| FALSE FAIL | 0 |
| WRONG ACTION | 0 |
| PARTIAL | 0 |
| UNEVALUABLE | 0 |
| **Total** | **109** |

- **Critical findings:** 0
- **Beta blockers:** 0

## Critical Findings

No critical findings.
## Beta Blockers

No beta blockers identified.

## Domain Scoreboard

### PTP

| Metric | Count |
|--------|-------|
| Scenarios touching | 28 |
| PASS | 28 |
| FALSE PASS | 0 |
| FALSE FAIL | 0 |
| WRONG ACTION | 0 |
| PARTIAL | 0 |
| UNEVALUABLE | 0 |

### MUE

| Metric | Count |
|--------|-------|
| Scenarios touching | 20 |
| PASS | 20 |
| FALSE PASS | 0 |
| FALSE FAIL | 0 |
| WRONG ACTION | 0 |
| PARTIAL | 0 |
| UNEVALUABLE | 0 |

### MODIFIER

| Metric | Count |
|--------|-------|
| Scenarios touching | 21 |
| PASS | 21 |
| FALSE PASS | 0 |
| FALSE FAIL | 0 |
| WRONG ACTION | 0 |
| PARTIAL | 0 |
| UNEVALUABLE | 0 |

### GLOBAL

| Metric | Count |
|--------|-------|
| Scenarios touching | 23 |
| PASS | 23 |
| FALSE PASS | 0 |
| FALSE FAIL | 0 |
| WRONG ACTION | 0 |
| PARTIAL | 0 |
| UNEVALUABLE | 0 |

### DOC_SUFFICIENCY

| Metric | Count |
|--------|-------|
| Scenarios touching | 30 |
| PASS | 30 |
| FALSE PASS | 0 |
| FALSE FAIL | 0 |
| WRONG ACTION | 0 |
| PARTIAL | 0 |
| UNEVALUABLE | 0 |

## Scenario-Level Classification Summary

| Classification | Count | Pct |
|---------------|-------|-----|
| PASS | 109 | 100.0% |
| FALSE_PASS | 0 | 0.0% |
| FALSE_FAIL | 0 | 0.0% |
| WRONG_ACTION | 0 | 0.0% |
| PARTIAL | 0 | 0.0% |
| UNEVALUABLE | 0 | 0.0% |

## Confidence Mismatch Summary

- **Total mismatches:** 0
- **Too optimistic:** 0
- **Too pessimistic:** 0


## Schema / State Consistency Summary

No schema/state consistency issues found.

## Full Findings

## Architecture Follow-Ups

### 1. Missing structured_fields for Documentation Validator
`diagnosis_text`, `anatomic_site`, and `approach` are not present in the ACC-02 structured_fields. This means:
- R-3.5.4 (rule-out diagnosis) can **never** fire — dangerous false passes on rule-out scenarios
- R-3.5.5 (anatomic specificity) **always** fires on all non-E/M codes — systemic noise
- R-3.5.3 (fracture approach) fires on all fracture codes regardless of actual documentation

### 2. Missing structured_fields for Modifier Validator
`distinct_encounter_documented`, `distinct_site_documented`, `distinct_practitioner_documented`, `non_overlapping_service_documented` are absent. This causes R-3.3.2 to co-fire whenever R-3.3.1 or R-3.3.3 fires, turning force-review/warn into block.

### 3. Missing structured_fields for Global Validator
`em_separately_identifiable` and `decision_for_surgery_documented` default to false, causing R-3.4.2 and R-3.4.3 to over-fire.

### 4. clean_claim_ready Derivation
Per ACC-01 §3.0, `clean_claim_ready` is set to `false` only by block rules. Force-review leaves it unchanged. Derivation: `!hasBlock`.

### 5. No Validator Orchestrator/Pipeline
All 5 validators run independently. There is no shared aggregation layer that combines results across validators and derives final state (action, clean_claim_ready, confidence). This harness implements ad-hoc aggregation. A production orchestrator is needed for ACC-10+.

### 6. Audit Trace Gaps
Validators do not emit a unified audit trace or result version metadata. The `version_metadata` block is only in the `buildTestCodingOutput` helpers, not in the validator results themselves.

## ACC-10 Patch Queue Suggestions

### By Root Cause

| Root Cause | Count | Priority Fix |
|-----------|-------|-------------|

### Recommended Priority Order

1. **Add documentation evidence booleans to structured_fields** (MAPPING_BUG) — fixes ~30+ modifier and global false fails
2. **Add diagnosis_text to structured_fields or derive from clinical_input** (MAPPING_BUG) — fixes R-3.5.4 false passes (critical)
3. **Resolve clean_claim_ready semantics for force-review** (SCHEMA_STATE_BUG) — affects all force-review scenarios
4. **Add anatomic_site and approach to structured_fields** (MAPPING_BUG) — reduces R-3.5.5/R-3.5.3 noise
5. **Build validator orchestrator/pipeline** (ARCHITECTURE_RISK) — required for production integration
