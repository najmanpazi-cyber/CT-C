// ACC-12: Collapsible Audit Trail panel
// Shows rule evaluations, version metadata, and payer context from DeterministicCodingOutput.

import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Clock, FileCheck } from "lucide-react";
import type { DeterministicCodingOutput, RuleEvaluation } from "@/types/ruleEngine";

interface AuditTrailPanelProps {
  output: DeterministicCodingOutput;
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "text-destructive bg-destructive/10 border-destructive/20",
  High: "text-[#D97706] bg-[#D97706]/10 border-[#D97706]/20",
  Medium: "text-[#2563EB] bg-[#2563EB]/10 border-[#2563EB]/20",
  Low: "text-muted-foreground bg-muted/50 border-border",
};

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  block: { label: "Block", className: "text-destructive" },
  "force-review": { label: "Force Review", className: "text-[#D97706]" },
  warn: { label: "Warn", className: "text-[#2563EB]" },
};

function TriggeredRule({ rule }: { rule: RuleEvaluation }) {
  const [expanded, setExpanded] = useState(false);
  const sevColor = SEVERITY_COLORS[rule.severity] ?? SEVERITY_COLORS.Low;
  const action = ACTION_LABELS[rule.action_type] ?? ACTION_LABELS.warn;

  return (
    <div className="rounded-md border border-border bg-background/50">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="font-mono text-xs font-bold text-foreground">
          {rule.rule_id}
        </span>
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${sevColor}`}>
          {rule.severity}
        </span>
        <span className={`text-[10px] font-semibold uppercase ${action.className}`}>
          {action.label}
        </span>
        <span className="ml-auto text-muted-foreground">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1.5">
          {rule.message_user && (
            <p className="text-xs text-foreground/80">{rule.message_user}</p>
          )}
          {rule.evidence_fields.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Evidence</span>
              <ul className="mt-0.5 space-y-0.5">
                {rule.evidence_fields.map((e, i) => (
                  <li key={i} className="text-xs font-mono text-foreground/70">{e}</li>
                ))}
              </ul>
            </div>
          )}
          {rule.missing_info_keys.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Missing</span>
              <p className="text-xs font-mono text-foreground/70">{rule.missing_info_keys.join(", ")}</p>
            </div>
          )}
          {rule.policy_anchor && (
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Policy</span>
              <p className="text-xs text-foreground/70">{rule.policy_anchor}</p>
            </div>
          )}
          {rule.payer_context && (
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Payer Context</span>
              <p className="text-xs text-foreground/70">{rule.payer_context}</p>
            </div>
          )}
          {rule.payer_note && (
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Payer Note</span>
              <p className="text-xs text-foreground/70">{rule.payer_note}</p>
            </div>
          )}
          {rule.suppressed_code && (
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Suppressed</span>
              <p className="text-xs font-mono text-destructive">{rule.suppressed_code}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const AuditTrailPanel = ({ output }: AuditTrailPanelProps) => {
  const [open, setOpen] = useState(false);

  const triggeredRules = output.rule_evaluations.filter((r) => r.trigger_matched);
  const passedCount = output.rule_evaluations.length - triggeredRules.length;
  const vm = output.version_metadata;

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Audit Trail</span>
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {triggeredRules.length} triggered / {passedCount} passed
        </span>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-4">
          {/* Triggered Rules */}
          {triggeredRules.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Rule Evaluations</span>
              </div>
              <div className="space-y-1.5">
                {triggeredRules.map((rule) => (
                  <TriggeredRule key={rule.rule_id} rule={rule} />
                ))}
              </div>
            </div>
          )}

          {triggeredRules.length === 0 && (
            <p className="text-xs text-muted-foreground">
              All {passedCount} rules passed — no issues detected.
            </p>
          )}

          {/* Payer Context */}
          <div>
            <span className="text-xs font-semibold text-foreground">Payer Context</span>
            <div className="mt-1 rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-4 text-xs text-foreground/70">
                <span>
                  <span className="font-medium text-foreground">Type:</span>{" "}
                  {output.payer_context_applied.payer_type}
                </span>
                <span>
                  <span className="font-medium text-foreground">Safe defaults:</span>{" "}
                  {output.payer_context_applied.safe_defaults_used ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Version Metadata */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Version Metadata</span>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/70">
                <span><span className="font-medium text-foreground">PTP:</span> {vm.ncci_ptp_edition}</span>
                <span><span className="font-medium text-foreground">MUE:</span> {vm.mue_edition}</span>
                <span><span className="font-medium text-foreground">CPT:</span> {vm.cpt_edition}</span>
                <span><span className="font-medium text-foreground">ICD-10:</span> {vm.icd10_edition}</span>
                <span><span className="font-medium text-foreground">Ruleset:</span> {vm.ruleset_version}</span>
                <span><span className="font-medium text-foreground">Schema:</span> {vm.schema_version}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Generated: {new Date(vm.generated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailPanel;
