import { useState } from "react";
import { ClipboardList, Loader2, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CodingResult, CodingError } from "@/types/coding";
import { supabase } from "@/integrations/supabase/client";

interface ResultsPanelProps {
  result: CodingResult | null;
  error: CodingError | null;
  isLoading: boolean;
  onRetry: () => void;
}

const ConfidenceBadge = ({ confidence }: { confidence: string }) => {
  const styles = {
    high: "bg-success text-success-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-destructive text-destructive-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[confidence as keyof typeof styles] || styles.low}`}>
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
    </span>
  );
};

const ResultsPanel = ({ result, error, isLoading, onRetry }: ResultsPanelProps) => {
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"positive" | "negative" | null>(null);
  const [correctCode, setCorrectCode] = useState("");
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Empty state
  if (!result && !error && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <ClipboardList className="h-12 w-12 opacity-40" />
        <p className="text-center text-sm">Enter clinical documentation and click Analyze to receive coding suggestions</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin opacity-60" />
        <p className="animate-pulse text-sm">Analyzing documentation...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error.user_message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>Try Again</Button>
      </div>
    );
  }

  if (!result) return null;

  const copyText = [
    `CPT: ${result.primary_code.cpt_code}${result.modifiers.filter(m => m.apply).map(m => m.code).join("")}`,
    result.icd10_codes.map(c => `ICD-10: ${c.code}`).join(" | "),
  ].join(" | ");

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (type: "positive" | "negative") => {
    setFeedbackType(type);
    if (type === "positive") {
      await supabase.from("coding_feedback").insert({
        clinical_input_preview: "",
        suggested_code: result.primary_code.cpt_code,
        feedback_type: "positive",
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 2000);
    }
  };

  const submitNegativeFeedback = async () => {
    await supabase.from("coding_feedback").insert({
      clinical_input_preview: "",
      suggested_code: result.primary_code.cpt_code,
      feedback_type: "negative",
      correct_code: correctCode || null,
      additional_feedback: additionalFeedback || null,
    });
    setFeedbackSent(true);
    setFeedbackType(null);
    setCorrectCode("");
    setAdditionalFeedback("");
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-6">
      {/* Clean Claim Indicator */}
      <div className={`flex items-center gap-2 rounded-lg p-3 ${result.clean_claim_ready ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
        {result.clean_claim_ready ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        <span className="text-sm font-semibold">
          {result.clean_claim_ready ? "Clean Claim Ready" : "Review Required"}
        </span>
      </div>

      {/* Primary Code Card */}
      <div className="rounded-lg border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono-code text-2xl font-bold text-foreground">{result.primary_code.cpt_code}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.primary_code.description}</p>
            <div className="mt-2">
              <ConfidenceBadge confidence={result.primary_code.confidence} />
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => handleFeedback("positive")}
              className={`rounded p-1.5 transition-colors hover:bg-muted ${feedbackType === "positive" ? "text-success" : "text-muted-foreground"}`}
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleFeedback("negative")}
              className={`rounded p-1.5 transition-colors hover:bg-muted ${feedbackType === "negative" ? "text-destructive" : "text-muted-foreground"}`}
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        {feedbackSent && feedbackType !== "negative" && (
          <p className="mt-2 text-xs text-success">Thank you for your feedback!</p>
        )}
        {feedbackType === "negative" && !feedbackSent && (
          <div className="mt-3 flex flex-col gap-2 border-t pt-3">
            <Input
              placeholder="What is the correct code? (e.g., 27446)"
              value={correctCode}
              onChange={e => setCorrectCode(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Additional feedback (optional)"
              value={additionalFeedback}
              onChange={e => setAdditionalFeedback(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button size="sm" variant="outline" onClick={submitNegativeFeedback}>Submit Feedback</Button>
          </div>
        )}
      </div>

      {/* Diagnosis Codes */}
      {result.icd10_codes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Diagnosis Codes (ICD-10)</h3>
          <div className="flex flex-col gap-2">
            {result.icd10_codes.map((code, i) => (
              <div key={i} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  <span className="font-mono-code font-semibold">{code.code}</span>
                  <span className="ml-2 text-muted-foreground">{code.description}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Medical Necessity:</span> {code.necessity}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modifiers */}
      {result.modifiers.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Modifiers</h3>
          <div className="flex flex-wrap gap-2">
            {result.modifiers.map((mod, i) => (
              <Badge key={i} variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground">
                {mod.code} {mod.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Coding Rationale</h3>
        <div className="rounded-lg border border-info-border bg-info p-4">
          <p className="text-sm leading-relaxed text-foreground">{result.rationale}</p>
        </div>
      </div>

      {/* Missing Information */}
      {result.missing_information.length > 0 && (
        <div className="flex flex-col gap-2">
          {result.missing_information.map((info, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border-l-4 border-destructive bg-destructive/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-foreground">{info}</p>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {result.warnings.map((w, i) => {
            const colors = {
              error: "border-destructive bg-destructive/5",
              warning: "border-warning bg-warning/5",
              info: "border-primary bg-info",
            };
            return (
              <div key={i} className={`rounded-lg border-l-4 p-3 ${colors[w.type]}`}>
                <p className="text-sm text-foreground">{w.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <Collapsible open={altOpen} onOpenChange={setAltOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm">
              Show Alternatives ({result.alternatives.length})
              {altOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 flex flex-col gap-2">
            {result.alternatives.map((alt, i) => (
              <div key={i} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  <span className="font-mono-code font-semibold">{alt.cpt_code}</span>
                  <span className="ml-2 text-muted-foreground">{alt.description}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Consider when:</span> {alt.why_consider}
                </p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Verification Footer */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="verify"
            checked={verified}
            onCheckedChange={(v) => setVerified(v === true)}
          />
          <label htmlFor="verify" className="text-sm text-foreground">
            I have reviewed and verified these coding suggestions
          </label>
        </div>
        <Button
          onClick={handleCopy}
          disabled={!verified}
          className="mt-3 w-full"
          variant="outline"
        >
          {copied ? (
            <><Check className="mr-2 h-4 w-4" /> Copied!</>
          ) : (
            <><Copy className="mr-2 h-4 w-4" /> Copy Codes</>
          )}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Paste into your billing system or practice management software
        </p>
      </div>
    </div>
  );
};

export default ResultsPanel;
