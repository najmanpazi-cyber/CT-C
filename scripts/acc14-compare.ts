// ACC-14: Compare committed vs current scenarios
import * as fs from "fs";

const committed = fs.readFileSync("scripts/acc02-committed-baseline.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
const current = fs.readFileSync("specs/ACC-02-scenarios.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));

let changed = 0;
let expectChanged = 0;
const fieldOnlyIds: string[] = [];

for (let i = 0; i < committed.length; i++) {
  const c = committed[i];
  const n = current[i];
  if (JSON.stringify(c) === JSON.stringify(n)) continue;
  changed++;

  const expDiff =
    c.expected_action !== n.expected_action ||
    JSON.stringify(c.expected_rule_hits) !== JSON.stringify(n.expected_rule_hits) ||
    c.expected_clean_claim_ready !== n.expected_clean_claim_ready ||
    c.expected_confidence !== n.expected_confidence;
  if (expDiff) {
    expectChanged++;
    console.log(
      `${n.id}: expectations changed: action=${c.expected_action}->${n.expected_action} rules=${JSON.stringify(c.expected_rule_hits)}->${JSON.stringify(n.expected_rule_hits)} ccr=${c.expected_clean_claim_ready}->${n.expected_clean_claim_ready}`
    );
  } else {
    fieldOnlyIds.push(n.id);
  }
}
console.log(`\nTotal scenarios changed: ${changed}`);
console.log(`Expectations changed: ${expectChanged}`);
console.log(`Structured fields only: ${changed - expectChanged}`);
console.log(`Field-only IDs: ${fieldOnlyIds.join(", ")}`);
