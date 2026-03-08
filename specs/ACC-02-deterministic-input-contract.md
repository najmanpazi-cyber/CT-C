# ACC-02 Deterministic Input Contract

> Which `structured_fields` each validator needs for deterministic evaluation.
> Fields marked **required** must be present for the rule to evaluate at all.
> Fields marked *defaulted* have a fallback but the default may cause false results.

## Common Fields (all validators)

| Field | Type | Notes |
|-------|------|-------|
| `laterality` | `string` | `"left"` / `"right"` / `"bilateral"` / `"not_specified"` |
| `payer_type` | `string` | `"commercial"` / `"medicare"` |
| `cpt_codes_submitted` | `string[]` | CPT codes on the claim |
| `modifiers_present` | `Record<string, string[]>` | Per-CPT modifier arrays |
| `icd10_codes` | `string[]` | Diagnosis codes |
| `setting` | `string` | `"office"` / `"outpatient"` / `"ASC"` / `"inpatient"` |

## PTP Validator (R-3.1.1 through R-3.1.4)

| Field | Required | Default | Impact if missing |
|-------|----------|---------|-------------------|
| `cpt_codes_submitted` | **required** | — | No evaluation possible |
| `laterality` | **required** | `"not_specified"` | Same-laterality gate skipped |
| `modifiers_present` | **required** | `{}` | Modifier-based bypass missed |
| `payer_type` | **required** | `"unknown"` | Payer-specific logic skipped |

## MUE Validator (R-3.2.1, R-3.2.2)

| Field | Required | Default | Impact if missing |
|-------|----------|---------|-------------------|
| `cpt_codes_submitted` | **required** | — | No evaluation possible |
| `units_of_service` | **required** | `1` per code | At-limit/over-limit detection fails |
| `modifiers_present` | **required** | `{}` | Bilateral MUE doubling missed |
| `payer_type` | **required** | `"unknown"` | MAI source selection wrong |
| `laterality` | *defaulted* | `"not_specified"` | Bilateral unit doubling missed |

## Modifier Validator (R-3.3.1 through R-3.3.3)

| Field | Required | Default | Impact if missing |
|-------|----------|---------|-------------------|
| `cpt_codes_submitted` | **required** | — | No evaluation possible |
| `modifiers_present` | **required** | `{}` | No modifier to validate |
| `payer_type` | **required** | `"unknown"` | Medicare -59 rule skipped |
| `distinct_encounter_documented` | *defaulted* | `false` | R-3.3.2 over-fires (false fail) |
| `distinct_site_documented` | *defaulted* | `false` | R-3.3.2 over-fires (false fail) |
| `distinct_practitioner_documented` | *defaulted* | `false` | R-3.3.2 over-fires (false fail) |
| `non_overlapping_service_documented` | *defaulted* | `false` | R-3.3.2 over-fires (false fail) |

## Global Period Validator (R-3.4.1 through R-3.4.4)

| Field | Required | Default | Impact if missing |
|-------|----------|---------|-------------------|
| `cpt_codes_submitted` | **required** | — | No evaluation possible |
| `global_period_status` | **required** | `"none"` | Global period logic skipped entirely |
| `global_period_surgery_date` | **required** | today | Date arithmetic wrong |
| `global_period_surgery_cpt` | **required** | — | Day count lookup fails |
| `encounter_date` | *defaulted* | today | Date delta incorrect |
| `prior_surgery_related` | *defaulted* | `true` | R-3.4.1 over-fires |
| `em_separately_identifiable` | *defaulted* | `false` | R-3.4.2 over-fires (false fail) |
| `decision_for_surgery_documented` | *defaulted* | `false` | R-3.4.3 over-fires (false fail) |

## Documentation Sufficiency Validator (R-3.5.1 through R-3.5.5)

| Field | Required | Default | Impact if missing |
|-------|----------|---------|-------------------|
| `cpt_codes_submitted` | **required** | — | No evaluation possible |
| `laterality` | **required** | `"not_specified"` | R-3.5.1 fires on every non-E/M code |
| `icd10_codes` | **required** | `[]` | R-3.5.2 mismatch check skipped |
| `setting` | **required** | `"office"` | R-3.5.4 outpatient gate affected |
| `diagnosis_text` | **required** | `null` | R-3.5.4 cannot evaluate — **false pass** |
| `anatomic_site` | *defaulted* | `null` | R-3.5.5 fires on every non-E/M code |
| `approach` | *defaulted* | `null` | R-3.5.3 fires on every fracture code |

## Summary: Fields That Cause False Results When Missing

| Field | Missing → | Affected rules | Severity |
|-------|-----------|---------------|----------|
| `diagnosis_text` | **false pass** (block missed) | R-3.5.4 | Critical |
| `distinct_*_documented` | false fail (block added) | R-3.3.2 | High |
| `em_separately_identifiable` | false fail (block added) | R-3.4.2 | High |
| `decision_for_surgery_documented` | false fail (block added) | R-3.4.3 | High |
| `anatomic_site` | extra warn (noise) | R-3.5.5 | Low |
| `approach` | extra warn (noise) | R-3.5.3 | Low |
