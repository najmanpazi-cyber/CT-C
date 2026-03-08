import { useState } from "react";
import {
  ClipboardList, AlertTriangle, ChevronDown, ChevronUp,
  Copy, Check, FileText, Stethoscope, ShieldCheck, Download, Printer,
  ShieldAlert, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CodingResult, CodingError } from "@/types/coding";
import type { DeterministicCodingOutput } from "@/types/ruleEngine";
import { supabase } from "@/integrations/supabase/client";

import { logger } from "@/lib/logger";
import CleanClaimIndicator from "@/components/results/CleanClaimIndicator";
import { CptTooltip } from "@/components/CptTooltip";
import { downloadCsv, openPrintView } from "@/utils/exportUtils";
import type { CodingRequest } from "@/types/coding";
import PrimaryCodeCard from "@/components/results/PrimaryCodeCard";
import AddOnCodes from "@/components/results/AddOnCodes";
import DiagnosisCodes from "@/components/results/DiagnosisCodes";
import ModifierBadges from "@/components/results/ModifierBadges";
import RationaleCard from "@/components/results/RationaleCard";
import FeedbackForm from "@/components/results/FeedbackForm";
import AuditTrailPanel from "@/components/results/AuditTrailPanel";
import {
  useResultGatingState,
  resolveGatingState,
  type ResultGatingState,
} from "@/hooks/useResultGatingState";

interface ResultsPanelProps {
  result: CodingResult | null;
  error: CodingError | null;
  isLoading: boolean;
  onRetry: () => void;
  sessionId: string;
  clinicalInputPreview: string;
  lastRequest: CodingRequest | null;
  /** Optional deterministic output for ACC-11 gating. When present, enables three-state gating. */
  deterministicOutput?: DeterministicCodingOutput | null;
}

// Loading steps to show while analyzing
const LOADING_STEPS = [
  { icon: FileText,      text: "Reading clinical documentation..." },
  { icon: Stethoscope,  text: "Identifying procedure and diagnosis..." },
  { icon: ShieldCheck,  text: "Checking NCCI bundling rules..." },
  { icon: ClipboardList, text: "Evaluating modifiers and payer rules..." },
];

// Shimmer skeleton bar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`rounded bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer ${className ?? ""}`} />
);

// ---------------------------------------------------------------------------
// Review Required Banner
// ---------------------------------------------------------------------------
function ReviewBanner({
  gating,
}: {
  gating: NonNullable<ReturnType<typeof useResultGatingState>>;
}) {
  return (
    <div className="rounded-lg border border-[#D97706]/30 bg-[#D97706]/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#92400E]">
            Review Required
          </h3>
          <p className="mt-1 text-xs text-[#92400E]/80">
            {gating.bannerMessage}
          </p>

          {/* Force review checklist */}
          {gating.reviewItems.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {gating.reviewItems.map((item, i) => (
                <label
                  key={`${item.rule_id}-${i}`}
                  className="flex items-start gap-2 cursor-pointer rounded-md border border-[#D97706]/20 bg-white/60 p-2.5"
                >
                  <Checkbox
                    checked={gating.checklistState[i] ?? false}
                    onCheckedChange={() => gating.toggleChecklistItem(i)}
                    disabled={gating.reviewAcknowledged}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-semibold text-[#92400E]">
                      {item.rule_id}
                    </span>
                    <p className="text-xs text-[#92400E]/80 leading-relaxed">
                      {item.message}
                    </p>
                    {item.code_context.length > 0 && (
                      <p className="mt-0.5 text-xs text-[#92400E]/60">
                        Codes: {item.code_context.join(", ")}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Acknowledgment button */}
          {!gating.reviewAcknowledged && (
            <Button
              onClick={gating.acknowledgeReview}
              disabled={!gating.allItemsChecked}
              size="sm"
              className="mt-3 text-xs bg-[#D97706] text-white hover:bg-[#B45309] disabled:opacity-50"
            >
              {gating.reviewItems.length > 0
                ? "Acknowledge Review Items"
                : "Acknowledge and Continue"}
            </Button>
          )}

          {/* Acknowledged status */}
          {gating.reviewAcknowledged && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#92400E]/70">
              <Check className="h-3 w-3" />
              Review acknowledged — actions unlocked for this session
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocked Banner / Overlay
// ---------------------------------------------------------------------------
function BlockedBanner({
  gating,
}: {
  gating: NonNullable<ReturnType<typeof useResultGatingState>>;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-destructive">
            Claim Blocked
          </h3>
          <p className="mt-1 text-xs text-destructive/80">
            {gating.bannerMessage}
          </p>

          {/* Blocked rules list */}
          {gating.blockedRules.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {gating.blockedRules.map((rule) => (
                <div
                  key={rule.rule_id}
                  className="rounded-md border border-destructive/20 bg-white/60 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-destructive">
                      {rule.rule_id}
                    </span>
                    <span className="text-xs rounded-full border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
                      {rule.severity}
                    </span>
                  </div>
                  {rule.message_user && (
                    <p className="mt-1 text-xs text-destructive/80 leading-relaxed">
                      {rule.message_user}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Suppressed codes */}
          {gating.suppressedCodes.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-destructive/70 mb-1.5">
                Suppressed Codes
              </h4>
              <div className="flex flex-col gap-1.5">
                {gating.suppressedCodes.map((sc, i) => (
                  <div key={i} className="rounded-md border border-destructive/10 bg-white/40 p-2">
                    <span className="font-mono text-xs font-bold text-destructive">
                      {sc.cpt_code}
                    </span>
                    <span className="ml-2 text-xs text-destructive/70">
                      {sc.description}
                    </span>
                    <p className="mt-0.5 text-xs text-destructive/60">
                      Suppressed by {sc.suppressed_by_rule}: {sc.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Do Not Bill overlay for PrimaryCodeCard
// ---------------------------------------------------------------------------
function DoNotBillOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-destructive/5 border-2 border-dashed border-destructive/30">
      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive">
        Do Not Bill
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const ResultsPanel = ({
  result, error, isLoading, onRetry, sessionId, clinicalInputPreview, lastRequest,
  deterministicOutput,
}: ResultsPanelProps) => {
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState<"all" | "cpt" | "icd" | null>(null);
  const [csvExported, setCsvExported] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"positive" | "negative" | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // ACC-11: Centralized gating state
  const gating = useResultGatingState(deterministicOutput ?? null);

  // Determine if gating is active (deterministicOutput provided and gating resolved)
  const gatingActive = gating !== null;

  // Cycle through loading steps
  if (isLoading && loadingStep < LOADING_STEPS.length - 1) {
    setTimeout(() => setLoadingStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 2200);
  }

  if (!result && !error && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground animate-fade-in-scale">
        <ClipboardList className="h-12 w-12 opacity-30" />
        <div className="text-center">
          <p className="text-sm font-medium">Ready to analyze</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste documentation, fill in context fields, and click Analyze
          </p>
          <p className="mt-1 text-xs text-muted-foreground opacity-70">
            Tip: use <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">⌘ Enter</kbd> to submit quickly
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    const step = LOADING_STEPS[loadingStep];
    const StepIcon = step.icon;
    return (
      <div className="flex flex-col gap-4 p-6 animate-fade-in-scale">
        {/* Skeleton: clean claim indicator */}
        <ShimmerBar className="h-12 rounded-lg" />

        {/* Skeleton: primary code card */}
        <div className="rounded-lg border border-border/50 p-5 space-y-3">
          <ShimmerBar className="h-8 w-32" />
          <ShimmerBar className="h-4 w-64" />
          <div className="flex gap-2">
            <ShimmerBar className="h-6 w-28 rounded-full" />
            <ShimmerBar className="h-6 w-24 rounded-full" />
          </div>
        </div>

        {/* Skeleton: ICD-10 rows */}
        <div className="space-y-2">
          <ShimmerBar className="h-4 w-40" />
          <ShimmerBar className="h-16 rounded-lg" />
          <ShimmerBar className="h-16 rounded-lg" />
        </div>

        {/* Skeleton: modifier */}
        <div className="space-y-2">
          <ShimmerBar className="h-4 w-24" />
          <ShimmerBar className="h-14 rounded-lg" />
        </div>

        {/* Active step indicator */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <div key={loadingStep} className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up">
            <StepIcon className="h-4 w-4 text-primary" />
            {step.text}
          </div>
          <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 animate-fade-in-scale">
        <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error.user_message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>Try Again</Button>
      </div>
    );
  }

  if (!result) return null;

  // --- Gating-aware action disabled check ---
  // When gating is active, actions are controlled by the gating state.
  // When gating is not active, fall back to legacy behavior (copy gated by verified checkbox).
  const actionsLocked = gatingActive ? gating.actionsDisabled : false;

  // Copy text builders
  const buildFullCopyText = () => {
    const lines: string[] = [];
    const modCodes = result.modifiers.filter(m => m.apply).map(m => m.code).join("");
    lines.push(`CPT: ${result.primary_code.cpt_code}${modCodes} — ${result.primary_code.description}`);
    if (result.add_on_codes?.length > 0) {
      result.add_on_codes.forEach(a => lines.push(`Add-on CPT: ${a.cpt_code} — ${a.description}`));
    }
    result.icd10_codes.forEach((c, i) => lines.push(`ICD-10 (${i + 1}): ${c.code} — ${c.description}`));
    lines.push(`Confidence: ${result.primary_code.confidence}`);
    if (result.rationale) lines.push(`Rationale: ${result.rationale}`);
    if (result.missing_information?.length > 0) {
      lines.push(`Missing info: ${result.missing_information.join("; ")}`);
    }
    return lines.join("\n");
  };

  const buildCptOnly = () => {
    const modCodes = result.modifiers.filter(m => m.apply).map(m => m.code).join("");
    const addOns = result.add_on_codes?.length > 0
      ? " | " + result.add_on_codes.map(a => a.cpt_code).join(", ")
      : "";
    return `${result.primary_code.cpt_code}${modCodes}${addOns}`;
  };

  const buildIcdOnly = () =>
    result.icd10_codes.map(c => c.code).join(", ");

  const handleExportCsv = () => {
    if (!result || actionsLocked) return;
    downloadCsv(result, lastRequest);
    setCsvExported(true);
    setTimeout(() => setCsvExported(false), 2500);
  };

  const handlePrint = () => {
    if (!result || actionsLocked) return;
    openPrintView(result, lastRequest);
  };

  const handleCopy = (type: "all" | "cpt" | "icd") => {
    if (actionsLocked) return;
    const text = type === "all" ? buildFullCopyText()
      : type === "cpt" ? buildCptOnly()
      : buildIcdOnly();
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFeedback = async (type: "positive" | "negative") => {
    setFeedbackType(type);
    if (type === "positive") {
      try {
        await supabase.from("coding_feedback").insert({
          clinical_input_preview: clinicalInputPreview,
          suggested_code: result.primary_code.cpt_code,
          feedback_type: "positive",
          session_id: sessionId,
        });
      } catch (err) { logger.error("Feedback insert failed", { code: result.primary_code.cpt_code, err }); }
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 2000);
    }
  };

  // Stagger delay helper
  const stagger = (i: number) => ({ animationDelay: `${i * 80}ms`, animationFillMode: "both" as const });

  // Determine the indicator subtext
  const indicatorSubtext = gatingActive && gating.reviewAcknowledged
    ? "Review acknowledged"
    : !gatingActive && !result.clean_claim_ready && (result.missing_information?.length ?? 0) > 0
    ? `${result.missing_information!.length} documentation gap${result.missing_information!.length > 1 ? "s" : ""} — see below`
    : null;

  // Dim class for content in review-required state before acknowledgment
  const contentDimClass =
    gatingActive && gating.uiState === "STATE_REVIEW_REQUIRED" && !gating.reviewAcknowledged
      ? "opacity-75 pointer-events-auto"
      : "";

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-6">
      {/* Clean Claim Indicator */}
      <div className="animate-fade-in-up" style={stagger(0)}>
        {gatingActive ? (
          <CleanClaimIndicator
            gatingState={gating.uiState}
            label={gating.indicatorLabel}
            subtext={indicatorSubtext}
          />
        ) : (
          <CleanClaimIndicator
            gatingState={result.clean_claim_ready ? "STATE_READY" : "STATE_BLOCKED"}
            label={result.clean_claim_ready ? "Ready for Review" : "Review Required"}
            subtext={indicatorSubtext}
          />
        )}
      </div>

      {/* ACC-11: Blocked Banner */}
      {gatingActive && gating.uiState === "STATE_BLOCKED" && (
        <div className="animate-fade-in-up" style={stagger(0)}>
          <BlockedBanner gating={gating} />
        </div>
      )}

      {/* ACC-11: Review Required Banner */}
      {gatingActive && gating.uiState === "STATE_REVIEW_REQUIRED" && (
        <div className="animate-fade-in-up" style={stagger(0)}>
          <ReviewBanner gating={gating} />
        </div>
      )}

      {/* Primary Code — with "Do Not Bill" overlay when blocked */}
      <div className="animate-fade-in-up relative" style={stagger(1)}>
        <PrimaryCodeCard code={result.primary_code} feedbackType={feedbackType} onFeedback={handleFeedback} />
        {gatingActive && gating.uiState === "STATE_BLOCKED" && <DoNotBillOverlay />}
        {feedbackSent && feedbackType !== "negative" && (
          <p className="mt-1 text-xs text-success">✓ Thank you for your feedback!</p>
        )}
        {feedbackType === "negative" && !feedbackSent && (
          <FeedbackForm
            suggestedCode={result.primary_code.cpt_code}
            sessionId={sessionId}
            clinicalInputPreview={clinicalInputPreview}
            onSubmitted={() => { setFeedbackSent(true); setFeedbackType(null); }}
          />
        )}
      </div>

      {/* Result content — readable in all states, slightly dimmed when review not acknowledged */}
      <div className={contentDimClass}>
        {/* Add-On Codes */}
        {result.add_on_codes?.length > 0 && (
          <div className="animate-fade-in-up mb-4" style={stagger(2)}>
            <AddOnCodes codes={result.add_on_codes} />
          </div>
        )}

        {/* ICD-10 Diagnosis Codes */}
        <div className="animate-fade-in-up mb-4" style={stagger(3)}>
          <DiagnosisCodes codes={result.icd10_codes} />
        </div>

        {/* Modifiers */}
        <div className="animate-fade-in-up mb-4" style={stagger(4)}>
          <ModifierBadges modifiers={result.modifiers} />
        </div>

        {/* Rationale */}
        <div className="animate-fade-in-up mb-4" style={stagger(5)}>
          <RationaleCard rationale={result.rationale} />
        </div>

        {/* Missing Information */}
        {result.missing_information?.length > 0 && (
          <div className="animate-fade-in-up flex flex-col gap-2 mb-4" style={stagger(6)}>
            <h3 className="text-sm font-semibold text-destructive">Missing Documentation</h3>
            {result.missing_information.map((info, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border-l-4 border-destructive bg-destructive/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-foreground">{info}</p>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {result.warnings?.length > 0 && (
          <div className="animate-fade-in-up flex flex-col gap-2 mb-4" style={stagger(6)}>
            {result.warnings.map((w, i) => {
              const colors = {
                error:   "border-destructive bg-destructive/5 text-destructive",
                warning: "border-warning bg-modifier text-modifier-foreground",
                info:    "border-primary bg-info text-info-foreground",
              };
              return (
                <div key={i} className={`rounded-lg border-l-4 p-3 ${colors[w.type]}`}>
                  <p className="text-sm">{w.message}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Alternatives */}
        {result.alternatives?.length > 0 && (
          <div className="animate-fade-in-up mb-4" style={stagger(7)}>
            <button
              onClick={() => setAltOpen(o => !o)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted/80 transition-colors"
            >
              <span>Alternative Codes ({result.alternatives.length})</span>
              {altOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {altOpen && (
              <div className="mt-2 flex flex-col gap-2">
                {result.alternatives.map((alt, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">
                      <span className="font-mono font-semibold text-foreground">
                        <CptTooltip code={alt.cpt_code}>{alt.cpt_code}</CptTooltip>
                      </span>
                      <span className="ml-2 text-muted-foreground">{alt.description}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">Consider when:</span> {alt.why_consider}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ACC-12: Audit Trail — only when deterministic output is available */}
      {gatingActive && deterministicOutput && (
        <div className="animate-fade-in-up" style={stagger(8)}>
          <AuditTrailPanel output={deterministicOutput} />
        </div>
      )}

      {/* Verification + Actions Footer */}
      <div className="animate-fade-in-up border-t pt-4" style={stagger(9)}>
        {/* Verification checkbox — only when gating is not active (legacy path) */}
        {!gatingActive && (
          <div className="flex items-center gap-2 mb-3">
            <Checkbox id="verify" checked={verified} onCheckedChange={(v) => setVerified(v === true)} />
            <label htmlFor="verify" className="text-sm text-foreground cursor-pointer">
              I have reviewed and verified these coding suggestions
            </label>
          </div>
        )}

        {/* Export / Print row */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={actionsLocked}
          >
            {csvExported
              ? <><Check className="mr-1 h-3 w-3 animate-check-bounce text-success" /> Exported!</>
              : <><Download className="mr-1 h-3 w-3" /> Export CSV</>
            }
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={actionsLocked}
          >
            <Printer className="mr-1 h-3 w-3" /> Print / Save PDF
          </Button>
        </div>

        {/* Three copy options */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => handleCopy("cpt")}
            disabled={actionsLocked || (!gatingActive && !verified)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {copied === "cpt"
              ? <><Check className="mr-1 h-3 w-3 animate-check-bounce text-success" /> Copied</>
              : <><Copy className="mr-1 h-3 w-3" /> CPT Only</>
            }
          </Button>
          <Button
            onClick={() => handleCopy("icd")}
            disabled={actionsLocked || (!gatingActive && !verified)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {copied === "icd"
              ? <><Check className="mr-1 h-3 w-3 animate-check-bounce text-success" /> Copied</>
              : <><Copy className="mr-1 h-3 w-3" /> ICD-10 Only</>
            }
          </Button>
          <Button
            onClick={() => handleCopy("all")}
            disabled={actionsLocked || (!gatingActive && !verified)}
            size="sm"
            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {copied === "all"
              ? <><Check className="mr-1 h-3 w-3 animate-check-bounce" /> Copied</>
              : <><Copy className="mr-1 h-3 w-3" /> Copy All</>
            }
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Paste into your billing system or practice management software
        </p>
      </div>
    </div>
  );
};

export default ResultsPanel;
