import { useState } from "react";
import { ClipboardList, Loader2, AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CodingResult, CodingError } from "@/types/coding";
import { supabase } from "@/integrations/supabase/client";

import CleanClaimIndicator from "@/components/results/CleanClaimIndicator";
import PrimaryCodeCard from "@/components/results/PrimaryCodeCard";
import DiagnosisCodes from "@/components/results/DiagnosisCodes";
import ModifierBadges from "@/components/results/ModifierBadges";
import RationaleCard from "@/components/results/RationaleCard";
import FeedbackForm from "@/components/results/FeedbackForm";

interface ResultsPanelProps {
  result: CodingResult | null;
  error: CodingError | null;
  isLoading: boolean;
  onRetry: () => void;
  sessionId: string;
  clinicalInputPreview: string;
}

const ResultsPanel = ({ result, error, isLoading, onRetry, sessionId, clinicalInputPreview }: ResultsPanelProps) => {
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"positive" | "negative" | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (!result && !error && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <ClipboardList className="h-12 w-12 opacity-40" />
        <p className="text-center text-sm">Enter clinical documentation and click Analyze to receive coding suggestions</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin opacity-60" />
        <p className="animate-pulse text-sm">Analyzing documentation...</p>
      </div>
    );
  }

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
      try {
        await supabase.from("coding_feedback").insert({
          clinical_input_preview: clinicalInputPreview,
          suggested_code: result.primary_code.cpt_code,
          feedback_type: "positive",
          session_id: sessionId,
        });
      } catch (err) {
        console.error("Feedback insert failed:", err);
      }
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-6">
      <CleanClaimIndicator ready={result.clean_claim_ready} />

      <PrimaryCodeCard
        code={result.primary_code}
        feedbackType={feedbackType}
        onFeedback={handleFeedback}
      />
      {feedbackSent && feedbackType !== "negative" && (
        <p className="text-xs text-success">Thank you for your feedback!</p>
      )}
      {feedbackType === "negative" && !feedbackSent && (
        <FeedbackForm
          suggestedCode={result.primary_code.cpt_code}
          sessionId={sessionId}
          clinicalInputPreview={clinicalInputPreview}
          onSubmitted={() => {
            setFeedbackSent(true);
            setFeedbackType(null);
          }}
        />
      )}

      <DiagnosisCodes codes={result.icd10_codes} />
      <ModifierBadges modifiers={result.modifiers} />
      <RationaleCard rationale={result.rationale} />

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
          <Checkbox id="verify" checked={verified} onCheckedChange={(v) => setVerified(v === true)} />
          <label htmlFor="verify" className="text-sm text-foreground">
            I have reviewed and verified these coding suggestions
          </label>
        </div>
        <Button onClick={handleCopy} disabled={!verified} className="mt-3 w-full" variant="outline">
          {copied ? <><Check className="mr-2 h-4 w-4" /> Copied!</> : <><Copy className="mr-2 h-4 w-4" /> Copy Codes</>}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Paste into your billing system or practice management software
        </p>
      </div>
    </div>
  );
};

export default ResultsPanel;
