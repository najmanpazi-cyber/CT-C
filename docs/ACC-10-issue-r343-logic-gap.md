# ACC-10 Issue: R-3.4.3 Validator Logic Gap

## Problem

R-3.4.3 ("Decision-for-surgery E/M without -57") has a boolean short-circuit that conflicts with the intent of 4 ACC-02 test scenarios.

### Current behavior

In `globalValidator.ts` lines 408-410:

```typescript
if (codeHasAnyModifier(emCode, ruleConfig343.sufficient_modifiers, input)) continue;
if (input.decision_for_surgery_documented) continue;  // ← short-circuit
```

The rule fires only when ALL of:
1. E/M + major surgery same day
2. No -57 modifier on E/M
3. `decision_for_surgery_documented` is `false`

If `decision_for_surgery_documented` is `true`, the rule silently passes regardless of modifier status.

### Conflict with scenario intent

ACC02-057, -058, -059, -060 all describe situations where:
- The decision for surgery **IS** documented in the clinical note
- Modifier -57 is **MISSING** from the claim
- The expected outcome is **force-review** (R-3.4.3) — the coder should be prompted to add -57

Setting `decision_for_surgery_documented: true` (which is clinically accurate) would SUPPRESS R-3.4.3, turning these correct force-reviews into false passes.

The boolean was designed as "documentation is sufficient, no review needed" but the scenarios need it to mean "documentation exists, modifier is still missing."

### Root cause

The boolean and the modifier check are OR'd (either one skips the rule) when they should interact differently. The decision-for-surgery documentation is a prerequisite for -57, not a substitute for it. If anything, having the documentation confirmed but -57 absent is a STRONGER signal that -57 should be added.

R-3.4.2 has the same structural pattern with `em_separately_identifiable`, though its affected scenarios are less clear-cut.

## Candidate Fixes

### Option A: Split the boolean into evidence + modifier gate

```typescript
// Only skip if BOTH documentation exists AND modifier is present
if (input.decision_for_surgery_documented &&
    codeHasAnyModifier(emCode, ruleConfig343.sufficient_modifiers, input)) continue;

// If documentation exists but modifier missing → force-review (add -57)
// If documentation absent and modifier missing → force-review (document + add -57)
// If modifier present → skip (already handled)
```

This makes `decision_for_surgery_documented: true` without -57 still trigger the rule, but changes the messaging (the coder already documented the decision, they just need to add the modifier).

### Option B: Invert the boolean semantics for force-review

```typescript
if (codeHasAnyModifier(emCode, ruleConfig343.sufficient_modifiers, input)) continue;

// If decision IS documented but -57 missing → definitely needs -57
// If decision NOT documented → can't determine, still force-review but different message
trigger343 = true;
const message = input.decision_for_surgery_documented
  ? `Decision for surgery documented but -57 modifier missing on E/M ${emCode}.`
  : `E/M ${emCode} billed with major surgery. If this is the decision-for-surgery visit, add -57.`;
```

This removes the boolean skip entirely. Documentation status affects the message, not whether the rule fires.

## Recommendation

**Option B** is simpler and safer. The modifier check alone is sufficient to determine whether review is needed. The boolean becomes informational context for the force-review message rather than a gate.

## Affected Scenarios

| Scenario | Vignette | Decision documented? | -57 present? | Expected |
|----------|----------|---------------------|-------------|----------|
| ACC02-057 | E/M day-of R TKA, "decision to proceed" | Yes | No | force-review |
| ACC02-058 | E/M day-before L THA, "decision for surgery documented" | Yes | No | force-review |
| ACC02-059 | E/M day-of R shoulder arthroplasty, "moderate MDM" | Implied | No | force-review |
| ACC02-060 | E/M day-before R ACL recon, "surgical decision made" | Yes | No | force-review |
| ACC02-108 | E/M day-of R TKA, "decision made during E/M" | Yes | Yes (-57) | pass (modifier gate handles) |

## Impact

- 4 scenarios currently stuck as FALSE_FAIL partly due to R-3.4.2/R-3.4.3 interaction
- Fix would also apply to R-3.4.2's `em_separately_identifiable` boolean (same structural pattern)
- No risk to passing scenarios — -57/-25 modifier gate is checked first
- Should be implemented AFTER P1/P2 scenario patches are validated
