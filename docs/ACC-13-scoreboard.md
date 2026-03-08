# ACC-13 — Evaluation Scoreboard

> Generated: 2026-03-08T00:38:52.929Z
> Commit: 7c20abb148fea0e0a6ba551fd7901dfd3d361373
> Ruleset: orthopedics-v1-beta

## Beta Go/No-Go Gates

| Gate | Name | Threshold | Actual | Status |
|------|------|-----------|--------|--------|
| G1 | Critical conflict visibility | 100% | 100.0% (21/21) | **PASS** |
| G2 | Silent false-pass rate | 0 | 0 | **PASS** |
| G3 | Schema compliance | 100% | 100.0% (109/109) | **PASS** |
| G4 | Doc-gap detection | >=80% | 100.0% (30/30) | **PASS** |
| G5 | Overall pass rate | >=85% | 100.0% (109/109) | **PASS** |
| G6 | Rule-data version pinned | yes | yes | **PASS** |

**Overall: GO**

## Run Metadata

| Field | Value |
|-------|-------|
| run_timestamp | 2026-03-08T00:38:52.929Z |
| git_commit_sha | 7c20abb148fea0e0a6ba551fd7901dfd3d361373 |
| scenario_pack_path | specs/ACC-02-scenarios.jsonl |
| scenario_count_loaded | 109 |
| harness_file_path | scripts/evaluate-acc13.ts |
| validator_files_used | src/validators/ptpValidator.ts, src/validators/mueValidator.ts, src/validators/modifierValidator.ts, src/validators/globalValidator.ts, src/validators/documentationValidator.ts |
| rule_engine_version | orthopedics-v1-beta |
| test_pack_version | ACC-02 v1 |
| environment | bun 1.3.10, win32 |

## Classification Summary

| Classification | Count | Pct |
|----------------|-------|-----|
| PASS | 109 | 100.0% |
| FALSE_PASS | 0 | 0.0% |
| FALSE_FAIL | 0 | 0.0% |
| WRONG_ACTION | 0 | 0.0% |
| PARTIAL | 0 | 0.0% |
| UNEVALUABLE | 0 | 0.0% |
| **Total** | **109** | |

## Domain Scoreboard

| Domain | Total | PASS | FALSE_PASS | FALSE_FAIL | WRONG_ACTION | PARTIAL | UNEVALUABLE | Pass% |
|--------|-------|------|------------|------------|--------------|---------|-------------|-------|
| PTP | 28 | 28 | 0 | 0 | 0 | 0 | 0 | 100.0% |
| MUE | 20 | 20 | 0 | 0 | 0 | 0 | 0 | 100.0% |
| MODIFIER | 21 | 21 | 0 | 0 | 0 | 0 | 0 | 100.0% |
| GLOBAL | 23 | 23 | 0 | 0 | 0 | 0 | 0 | 100.0% |
| DOC_SUFFICIENCY | 30 | 30 | 0 | 0 | 0 | 0 | 0 | 100.0% |

## Schema Compliance

All outputs pass schema validation.

## Non-PASS Scenarios

All scenarios passed.

## Version Metadata

| Edition | Value |
|---------|-------|
| NCCI PTP | Q1 2026 |
| MUE | Q1 2026 |
| CPT | 2026 |
| ICD-10 | FY2026 |
| Ruleset | orthopedics-v1-beta |
| Schema | 1.0.0 |
